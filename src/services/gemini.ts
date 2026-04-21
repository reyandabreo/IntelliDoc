import { GoogleGenAI, Type } from "@google/genai";
import { DocResponse } from "../types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it to your secrets.");
    }
    aiInstance = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return aiInstance;
}

const SYSTEM_PROMPT = `You are a high-fidelity document generation engine. You operate in two distinct modes:

1. PROMPT MODE:
   - When a user provides a query or instruction, adopt the specific persona and domain expertise requested.
   - STRICT ENTITY GROUNDING: You must generate the report for the EXACT entity (Company, Sport, Person, etc.) mentioned in the main request.
   - INCONSISTENCY HANDLING: If sub-bullets provide technical details that belong to a different industry (e.g., asking for a Bank but providing Power Sector metrics like "hydro" or "NTPC"), you must PRIORITIZE the main entity (the Bank) and intelligently adapt the metrics to that entity's industry.
   - Never default to previously discussed entities like NHPC unless explicitly mentioned in the current prompt.

2. CONTENT MODE:
   - When a user provides raw text, reports, or data, your goal is to structure and format that EXACT information.
   - HIGH FIDELITY EXTRACTION: You MUST preserve 100% of the semantic information provided in the input regardless of the target format (Word, Excel, PDF, TXT, PPTX). Do not summarize, truncate, or omit details unless explicitly requested. This is CRITICAL for Excel: ensure every paragraph and detail is represented as a row in the master sheet.
   - TONALITY: Adopt a "Forensic Investigator" tone where applicable, using technical, precise, and systematic language (e.g., "Observation", "Technical Trace", "Risk Vector").
   - GRANULARITY: Every slide in the input MUST be a "heading" followed by its specific content (lists, paragraphs).
   - CREDENTIAL HANDLING: Never hardcode specific emails, phone numbers, or social links in your persona. Extract these EXCLUSIVELY from the user provided content.
   - FORBIDDEN SYNTAX: Do NOT use HTML tags like <br>, <div>, or <span> for line breaks or formatting.
   - CONTACT INFORMATION: All contact details, credentials (Email, Mobile, LinkedIn, Repo, etc.), and distinct metadata points MUST be structured as the "list" element type. This ensures perfect line separation in all export formats (PPTX, Word, Excel, PDF).
   - NEWLINE PROTOCOL: Use standard newlines (\n) for internal paragraph breaks only. For distinct items, prefer separate "paragraph" or "list" elements.
   - For structured content (like Slides or Spreadsheet rows), map the input logically to the appropriate schema elements.
   - Do not invent new facts. Your role is purely editorial and architectural.
   - Transform the raw content into a professional document using tables for data and diagrams for logic flows based strictly on the provided text.

RICH FORMATTING RULES:
- Use TABLES for comparisons, structured data, or matrices. 
- Use DIAGRAMS (flowchart, sequence, mindmap, gantt). 
  - IMPORTANT: Use strictly VALID Mermaid syntax. 
  - All keywords (graph, TD, subgraph, sequenceDiagram, end, etc.) MUST be lowercase where required by Mermaid standards. 
  - DIRECTION: Always include a SPACE or NEWLINE after the diagram type and direction keyword (e.g., 'graph TD ' or 'graph TD\n'). NEVER run them into the next node ID (e.g., avoid 'graph tdA1').
  - NODE IDS: Always use short alphanumeric IDs (e.g., A1, B2, START, ID1) for nodes.
  - RESERVED KEYWORDS: NEVER use reserved keywords (like "end", "graph", "subgraph") as node IDs. 
  - NODE LABELS: Always wrap node labels in double quotes (e.g., A1["The Label"]) to prevent parsing errors with special characters.
  - Use NEWLINES (\n) to separate diagram lines, NOT semicolons. 
  - Every 'subgraph' MUST be closed with 'end'.
- Use HIGHLIGHTS (hex codes) for key indicators or critical takeaways.
- Use TEXT COLORS for semantic grouping (positive/growth: green, risk/urgent: red, info/neutral: blue).

CONSTRAINTS:
- Output ONLY valid JSON according to the schema.
- No markdown code fences. No preamble.
- Max 100 elements (for long documents). Max 15 diagram nodes.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detected_mode: { type: Type.STRING, enum: ["prompt", "content"] },
    target_format: { type: Type.STRING, enum: ["excel", "word", "docx", "pptx", "slides", "txt", "markdown", "html", "pdf"] },
    metadata: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        notes: { type: Type.STRING }
      },
      required: ["title", "summary", "notes"]
    },
    content: {
      type: Type.OBJECT,
      properties: {
        elements: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["heading", "paragraph", "list", "table", "diagram"] },
              text: { type: Type.STRING },
              items: { type: Type.ARRAY, items: { type: Type.STRING } },
              headers: { type: Type.ARRAY, items: { type: Type.STRING } },
              rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } },
              diagram_type: { type: Type.STRING, enum: ["flowchart", "sequence", "mindmap", "gantt"] },
              mermaid_code: { type: Type.STRING },
              style: {
                type: Type.OBJECT,
                properties: {
                  highlight_bg: { type: Type.STRING },
                  text_color: { type: Type.STRING },
                  bold: { type: Type.BOOLEAN },
                  italic: { type: Type.BOOLEAN },
                  table_header_bg: { type: Type.STRING },
                  alt_row_bg: { type: Type.STRING }
                }
              }
            },
            required: ["type"]
          }
        }
      },
      required: ["elements"]
    }
  },
  required: ["detected_mode", "target_format", "metadata", "content"]
};

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;
    
    const errorMessage = String(error?.message || error || "");
    const isRetryable = 
      errorMessage.includes("Rpc failed") || 
      errorMessage.includes("xhr") ||
      errorMessage.includes("500") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("network");

    if (isRetryable) {
      console.warn(`Gemini API call failed (transient). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    
    throw error;
  }
}

export async function generateDocument(input: string, format: string, mode: 'prompt' | 'content'): Promise<DocResponse> {
  const ai = getAI();
  const prompt = `MODE: ${mode}\nUser Input: ${input}\nRequested Target Format: ${format}`;
  
  try {
    const response = await retry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA as any,
        },
      });
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as DocResponse;
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    
    // Provide a more user-friendly error message for specific failures
    const errorMessage = String(error?.message || "");
    if (errorMessage.includes("Rpc failed") || errorMessage.includes("xhr")) {
      throw new Error("The AI service is experiencing a temporary network issue. Please try again in a few seconds.");
    }
    
    throw error;
  }
}
