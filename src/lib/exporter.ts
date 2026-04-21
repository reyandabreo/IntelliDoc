import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx-js-style';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table as DocxTable, 
  TableRow as DocxRow, 
  TableCell as DocxCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  Footer,
  ImageRun
} from 'docx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import pptxgen from 'pptxgenjs';
import mermaid from 'mermaid';
import { DocResponse, DocElement } from '../types';

mermaid.initialize({ 
  startOnLoad: false, 
  theme: 'neutral',
  securityLevel: 'loose',
  suppressErrorRendering: true,
  fontFamily: 'Inter, sans-serif'
});

const THEME_BLUE = "2563EB";
const THEME_HEADER_BG = "F3F4F6";
const THEME_TEXT_MAIN = "111827";
const THEME_TEXT_MUTED = "6B7280";

const sanitizeText = (text: string) => {
  if (!text) return '';
  
  // Convert any accidental <br> or <br/> tags to newlines before stripping other HTML
  let t = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Strip any remaining HTML tags
  t = t.replace(/<\/?[^>]+(>|$)/g, "");

  // Replace superscript numbers and special symbols with ASCII equivalents
  t = t
    .replace(/¹/g, '1')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/•/g, '-')
    .replace(/₹/g, 'Rs.');
  
  // Normalize horizontal spaces but PRESERVE NEWLINES
  return t.replace(/[ \t]+/g, ' ').trim();
};

const renderDiagramToImage = async (code: string): Promise<{ dataUrl: string, width: number, height: number } | null> => {
  if (typeof window === 'undefined') return null;
  try {
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
    const { svg } = await mermaid.render(id, code);
    
    // Create a temporary container to measure SVG size correctly
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.visibility = 'hidden';
    container.innerHTML = svg;
    document.body.appendChild(container);
    
    const svgEl = container.querySelector('svg');
    if (!svgEl) {
      document.body.removeChild(container);
      return null;
    }

    const bbox = svgEl.getBBox();
    const width = bbox.width || 800;
    const height = bbox.height || 600;
    
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 3; // Professional print quality (300 DPI equivalent) while maintaining tiny file sizes
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Use high-quality interpolation
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          URL.revokeObjectURL(url);
          document.body.removeChild(container);
          resolve({ dataUrl, width, height });
        } else {
          document.body.removeChild(container);
          resolve(null);
        }
      };
      img.onerror = () => {
        document.body.removeChild(container);
        resolve(null);
      };
      img.src = url;
    });
  } catch (err) {
    console.error("Mermaid render error:", err);
    return null;
  }
};

export async function exportDocument(doc: DocResponse) {
  const { target_format, metadata, content } = doc;
  const fileName = `${metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'document'}_${new Date().getTime()}`;

  switch (target_format) {
    case 'excel':
      await exportExcel(doc, fileName);
      break;
    case 'word':
    case 'docx':
      await exportWord(doc, fileName);
      break;
    case 'pdf':
      await exportPDF(doc, fileName);
      break;
    case 'pptx':
    case 'slides':
    case 'ppt':
      await exportPPT(doc, fileName);
      break;
    case 'markdown':
      exportText(generateMarkdown(doc), `${fileName}.md`);
      break;
    case 'txt':
      exportText(generateTxt(doc), `${fileName}.txt`);
      break;
    case 'html':
      exportText(generateHtml(doc), `${fileName}.html`);
      break;
    default:
      console.warn('Format not supported for download yet:', target_format);
  }
}

function exportText(content: string, fullFileName: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, fullFileName);
}

async function exportExcel(doc: DocResponse, fileName: string) {
  const wb = XLSX.utils.book_new();
  const MASTER_WIDTH = 120;
  
  // 1. Create a "Full Analysis Report" sheet with margin at Column A
  const reportData: any[][] = [
    [null, { v: sanitizeText(doc.metadata.title).toUpperCase(), s: { 
      font: { bold: true, sz: 22, color: { rgb: THEME_BLUE }, name: 'Helvetica' },
      alignment: { horizontal: 'left', vertical: 'center' }
    } }],
    [null, { v: `OPERATIONAL SUMMARY`, s: {
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      fill: { fgColor: { rgb: "334155" } }
    } }],
    [null, { v: sanitizeText(doc.metadata.summary), s: { 
      font: { italic: true, sz: 11, color: { rgb: "1E293B" } },
      alignment: { wrapText: true, vertical: 'top', horizontal: 'left' }
    } }],
    [], // Spacer
  ];

  const rowHeights: any[] = [{ hpt: 50 }, { hpt: 25 }, { hpt: 70 }, { hpt: 15 }];

  doc.content.elements.forEach((el) => {
    if (el.type === 'heading') {
      reportData.push([null, { 
        v: el.text ? sanitizeText(el.text).toUpperCase() : '', 
        s: { 
          font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, 
          fill: { fgColor: { rgb: "0F172A" } },
          alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
          border: { bottom: { style: 'medium', color: { rgb: THEME_BLUE } } }
        } 
      }]);
      rowHeights.push({ hpt: 30 });
    } else if (el.type === 'paragraph') {
      reportData.push([null, { 
        v: sanitizeText(el.text || ''), 
        s: { 
          alignment: { wrapText: true, vertical: 'top', horizontal: 'left' },
          font: { sz: 11, color: { rgb: "1E293B" } }
        } 
      }]);
      rowHeights.push({ hpt: 60 });
    } else if (el.type === 'list' && el.items) {
      el.items.forEach(item => {
        reportData.push([null, { 
          v: `• ${sanitizeText(item)}`, 
          s: { 
            font: { sz: 11, color: { rgb: "334155" } }, 
            alignment: { vertical: 'center', horizontal: 'left', indent: 2 } 
          } 
        }]);
        rowHeights.push({ hpt: 20 });
      });
    } else if (el.type === 'table' && el.headers && el.rows) {
      // Table Header
      reportData.push([null, ...el.headers.map(h => ({
        v: sanitizeText(h).toUpperCase(),
        s: { 
          font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, 
          fill: { fgColor: { rgb: THEME_BLUE } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
          }
        }
      }))]);
      rowHeights.push({ hpt: 25 });
      
      // Table Data
      el.rows.forEach((row, i) => {
        reportData.push([null, ...row.map(cell => ({
          v: sanitizeText(cell),
          s: { 
            fill: { fgColor: { rgb: i % 2 === 0 ? "FFFFFF" : "F8FAFC" } },
            font: { sz: 10 },
            border: {
              top: { style: 'thin', color: { rgb: "E2E8F0" } },
              bottom: { style: 'thin', color: { rgb: "E2E8F0" } },
              left: { style: 'thin', color: { rgb: "E2E8F0" } },
              right: { style: 'thin', color: { rgb: "E2E8F0" } }
            },
            alignment: { vertical: 'center', horizontal: 'left', wrapText: true, indent: 1 }
          }
        }))]);
        rowHeights.push({ hpt: 22 });
      });
    } else if (el.type === 'diagram') {
      reportData.push([null, { 
        v: `[ LOGIC FLOW ARCHITECTURE: ${el.diagram_type?.toUpperCase()} ]`, 
        s: { 
          font: { bold: true, color: { rgb: THEME_BLUE }, sz: 12 },
          fill: { fgColor: { rgb: "F1F5F9" } },
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
        } 
      }]);
      rowHeights.push({ hpt: 30 });
    }
    reportData.push([]); 
    rowHeights.push({ hpt: 15 });
  });

  const wsMain = XLSX.utils.aoa_to_sheet(reportData);
  
  // Set Column Widths: A=5 (Gutter), B=Main Content
  wsMain['!cols'] = [{ wch: 5 }, { wch: MASTER_WIDTH }];
  // Add widths for table columns that might extend past B
  for(let c = 2; c < 20; c++) wsMain['!cols'].push({ wch: 25 });
  
  wsMain['!rows'] = rowHeights;
  
  // Merges (starting from column B at index 1)
  const merges: any[] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 6 } }, // Title
    { s: { r: 1, c: 1 }, e: { r: 1, c: 6 } }, // Summary Header
    { s: { r: 2, c: 1 }, e: { r: 2, c: 6 } }  // Summary Content
  ];

  // Dynamic content merges for headings/paragraphs
  let currentRow = 4;
  doc.content.elements.forEach(el => {
    if (el.type === 'heading' || el.type === 'paragraph' || el.type === 'diagram') {
      merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 6 } });
      currentRow += 2;
    } else if (el.type === 'list' && el.items) {
      el.items.forEach(() => {
        merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 6 } });
        currentRow++;
      });
      currentRow++; 
    } else if (el.type === 'table' && el.rows) {
      currentRow += el.rows.length + 2;
    }
  });

  wsMain['!merges'] = merges;
  XLSX.utils.book_append_sheet(wb, wsMain, 'Detailed Analysis');

  let tableCount = 0;
  doc.content.elements.forEach((el) => {
    if (el.type === 'table' && el.headers && el.rows) {
      tableCount++;
      const data = [
        el.headers.map(h => ({ 
          v: h.toUpperCase(), 
          s: { 
            font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, 
            fill: { fgColor: { rgb: "0F172A" } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: { bottom: { style: 'thick', color: { rgb: THEME_BLUE } } }
          } 
        })),
        ...el.rows.map(row => row.map(c => ({ 
          v: sanitizeText(c), 
          s: { 
            font: { sz: 10 }, 
            alignment: { vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: "E2E8F0" } },
              bottom: { style: 'thin', color: { rgb: "E2E8F0" } },
              left: { style: 'thin', color: { rgb: "E2E8F0" } },
              right: { style: 'thin', color: { rgb: "E2E8F0" } }
            }
          } 
        })))
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = el.headers.map(() => ({ wch: 25 }));
      XLSX.utils.book_append_sheet(wb, ws, `Data Set ${tableCount}`);
    }
  });

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, `${fileName}.xlsx`);
}

async function exportWord(doc: DocResponse, fileName: string) {
  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: sanitizeText(doc.metadata.title).toUpperCase(),
          bold: true,
          size: 48,
          color: THEME_BLUE,
          font: "Helvetica"
        }),
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "INTELLIDOC ENGINE ANALYSIS REPORT",
          size: 18,
          color: THEME_TEXT_MUTED,
          characterSpacing: 2
        }),
      ],
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: sanitizeText(doc.metadata.summary),
          italics: true,
          color: "475569",
        }),
      ],
      spacing: { after: 600 }
    }),
  ];

  for (const el of doc.content.elements) {
    if (el.type === 'heading') {
      children.push(new Paragraph({ 
        children: [
          new TextRun({
            text: sanitizeText(el.text || '').toUpperCase(),
            bold: true,
            size: 28,
            color: "1E293B"
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        keepNext: true, // Orphan protection: ensures heading stays with the content below it
        spacing: { before: 800, after: 400 },
        border: {
          bottom: {
            color: THEME_BLUE,
            space: 4,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      }));
    } else if (el.type === 'paragraph') {
      const lines = sanitizeText(el.text || '').split('\n');
      children.push(new Paragraph({ 
        children: lines.map((line, i) => new TextRun({ 
          text: line, 
          size: 22, 
          color: "334155",
          break: i > 0 ? 1 : undefined
        })),
        spacing: { after: 300, line: 300 } 
      }));
    } else if (el.type === 'list' && el.items) {
      el.items.forEach(item => {
        const lines = sanitizeText(item).split('\n');
        children.push(new Paragraph({ 
          children: lines.map((line, i) => new TextRun({ 
            text: line, 
            size: 22, 
            color: "334155",
            break: i > 0 ? 1 : undefined
          })),
          bullet: { level: 0 },
          spacing: { after: 150 }
        }));
      });
      children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
    } else if (el.type === 'table' && el.headers && el.rows) {
      const table = new DocxTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new DocxRow({
            children: el.headers.map(h => new DocxCell({ 
              children: [new Paragraph({ 
                children: [new TextRun({ text: sanitizeText(h).toUpperCase(), bold: true, color: "FFFFFF", size: 20 })],
                alignment: AlignmentType.CENTER
              })],
              shading: { fill: THEME_BLUE, type: ShadingType.CLEAR, color: "auto" },
              verticalAlign: AlignmentType.CENTER,
              margins: { top: 100, bottom: 100 }
            }))
          }),
          ...el.rows.map((row, i) => new DocxRow({
            children: row.map(cell => new DocxCell({ 
              children: [new Paragraph({ 
                children: [new TextRun({ text: sanitizeText(cell), size: 18 })] 
              })],
              shading: i % 2 !== 0 ? { fill: "F8FAFC", type: ShadingType.CLEAR, color: "auto" } : undefined,
              margins: { top: 80, bottom: 80, left: 100 }
            }))
          }))
        ]
      });
      children.push(table);
      children.push(new Paragraph({ text: "", spacing: { after: 500 } }));
    } else if (el.type === 'diagram') {
      children.push(new Paragraph({ 
        children: [
          new TextRun({ text: `SYSTEM ARCHITECTURE / LOGIC FLOW: ${el.diagram_type?.toUpperCase()}`, bold: true, color: "FFFFFF", size: 16 }),
        ],
        shading: { fill: "334155", type: ShadingType.CLEAR, color: "auto" },
        spacing: { before: 400, after: 200 },
        alignment: AlignmentType.CENTER
      }));

      const result = await renderDiagramToImage(el.mermaid_code || '');
      if (result) {
        const base64Data = result.dataUrl.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Calculate dimensions to maintain aspect ratio with a max width of 550
        const maxWidth = 550;
        let finalWidth = maxWidth;
        let finalHeight = (result.height * finalWidth) / result.width;

        // Cap height to prevent blurriness from extreme scaling
        if (finalHeight > 450) {
          finalHeight = 450;
          finalWidth = (result.width * finalHeight) / result.height;
        }

        children.push(new Paragraph({
          children: [
            new ImageRun({
              data: binaryData,
              type: 'png',
              transformation: { width: finalWidth, height: finalHeight },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }));
      } else {
        children.push(new Paragraph({ 
          children: [
            new TextRun({ text: el.mermaid_code || '', size: 18, color: "E2E8F0", font: "Courier New" })
          ],
          shading: { fill: "1E293B", type: ShadingType.CLEAR, color: "auto" },
          spacing: { before: 200, after: 400 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "334155" },
          }
        }));
      }
    }
  }

  const docx = new Document({ 
    sections: [{ 
      properties: {},
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Generated by IntelliDoc Engine • Page ", size: 18, color: THEME_TEXT_MUTED }),
                new TextRun({ children: ["PAGE_NUMBER"], size: 18, color: THEME_TEXT_MUTED }),
              ],
              alignment: AlignmentType.RIGHT
            })
          ]
        })
      },
      children 
    }] 
  });
  const blob = await Packer.toBlob(docx);
  saveAs(blob, `${fileName}.docx`);
}

async function exportPDF(doc: DocResponse, fileName: string) {
  const pdf = new jsPDF();
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  const contentWidth = 170;
  const FONT_FAMILY = 'helvetica';
  let y = 30;

  // Strict global resets for consistent text rendering
  pdf.setCharSpace(0);
  pdf.setLineHeightFactor(1.15);
  pdf.setFont(FONT_FAMILY, 'normal');

  const addFooter = (p: jsPDF, pageNumber: number) => {
    p.setFont(FONT_FAMILY, 'normal');
    p.setFontSize(9);
    p.setTextColor(160, 160, 160);
    p.setCharSpace(0);
    p.text(`INTELLIDOC ANALYSIS REPORT • Page ${pageNumber}`, 105, pageHeight - 10, { align: 'center', charSpace: 0 });
  };

  let currentPage = 1;

  // Header Branding
  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(37, 99, 235);
  pdf.text("OFFICIAL SYSTEM ANALYSIS REPORT", margin, 15);
  
  // Title
  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(22);
  pdf.setCharSpace(0);
  pdf.setTextColor(0, 0, 0); 
  const wrappedTitle: string[] = pdf.splitTextToSize(sanitizeText(doc.metadata.title).toUpperCase(), contentWidth);
  wrappedTitle.forEach(line => {
    if (y > 270) { 
      pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage); 
      pdf.setFont(FONT_FAMILY, 'bold'); pdf.setFontSize(22); pdf.setCharSpace(0); 
    }
    pdf.text(line, margin, y, { charSpace: 0 });
    y += 10;
  });
  y += 5;

  // Visual Separator
  pdf.setDrawColor(37, 99, 235);
  pdf.setLineWidth(1);
  pdf.line(margin, y, 90, y);
  y += 12;

  // Summary Block
  pdf.setFont(FONT_FAMILY, 'italic');
  pdf.setFontSize(11);
  pdf.setCharSpace(0);
  pdf.setTextColor(60, 60, 60);
  const summaryLines: string[] = pdf.splitTextToSize(sanitizeText(doc.metadata.summary), contentWidth);
  summaryLines.forEach(line => {
    if (y > 275) { 
      pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage); 
      pdf.setFont(FONT_FAMILY, 'italic'); pdf.setFontSize(11); pdf.setCharSpace(0); 
    }
    pdf.text(line, margin, y, { charSpace: 0 });
    y += 6.5;
  });
  y += 10;

  addFooter(pdf, currentPage);

  // Group elements so headings are anchored to their next content block
  for (let i = 0; i < doc.content.elements.length; i++) {
    const el = doc.content.elements[i];
    const nextEl = doc.content.elements[i + 1];

    if (el.type === 'heading') {
      // Estimate heading height (lines + line line)
      const headingText = sanitizeText(el.text || '').toUpperCase();
      const headingLines = pdf.splitTextToSize(headingText, contentWidth);
      const headingHeight = (headingLines.length * 8) + 15; // padding + line + spacing

      // Lookahead: Estimate next element's height
      let nextHeight = 0;
      if (nextEl) {
        if (nextEl.type === 'paragraph') {
          const pLines = pdf.splitTextToSize(sanitizeText(nextEl.text || ''), contentWidth);
          nextHeight = pLines.length * 7;
        } else if (nextEl.type === 'list' && nextEl.items) {
          nextHeight = nextEl.items.length * 8; // simplified
        } else if (nextEl.type === 'table' && nextEl.rows) {
          nextHeight = (nextEl.rows.length + 1) * 10; // estimate
        } else if (nextEl.type === 'diagram') {
          nextHeight = 100; // conservative estimate for diagram
        }
      }

      // If heading + at least some of next content doesn't fit, jump page
      if (y + headingHeight + Math.min(nextHeight, 40) > 275) {
        pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage);
      }
      
      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.setFontSize(15);
      pdf.setCharSpace(0);
      pdf.setTextColor(0, 0, 0);
      
      headingLines.forEach(line => {
        if (y > 270) { pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage); pdf.setFont(FONT_FAMILY, 'bold'); pdf.setFontSize(15); }
        pdf.text(line, margin, y, { charSpace: 0 });
        y += 8;
      });
      y += 2;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y, 190, y);
      y += 8;
    } else if (el.type === 'paragraph') {
      if (y > 270) { 
        pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage);
      }
      pdf.setFont(FONT_FAMILY, 'normal');
      pdf.setFontSize(11);
      pdf.setCharSpace(0);
      const color = el.style?.text_color ? hexToRgb(el.style.text_color) : [30, 30, 30];
      pdf.setTextColor(color[0], color[1], color[2]);
      
      const rawText = sanitizeText(el.text || '');
      const segments = rawText.split('\n');
      
      segments.forEach(segment => {
        const lines: string[] = pdf.splitTextToSize(segment, contentWidth);
        lines.forEach(line => {
          if (y > 275) { 
            pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage); 
            pdf.setFont(FONT_FAMILY, 'normal'); pdf.setFontSize(11); pdf.setCharSpace(0); 
          }
          pdf.text(line, margin, y, { charSpace: 0 });
          y += 6.8;
        });
      });
      y += 4;
    } else if (el.type === 'list' && el.items) {
      if (y > 270) { 
        pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage);
      }
      pdf.setFont(FONT_FAMILY, 'normal');
      pdf.setFontSize(11);
      pdf.setCharSpace(0);
      el.items.forEach(item => {
        const segments = sanitizeText(item).split('\n');
        segments.forEach((segment, segmentIndex) => {
          if (y > 270) { 
            pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage); 
            pdf.setFont(FONT_FAMILY, 'normal'); pdf.setFontSize(11); pdf.setCharSpace(0); 
          }
          
          if (segmentIndex === 0) {
            pdf.setTextColor(37, 99, 235);
            pdf.text('-', margin, y + 0.5, { charSpace: 0 }); 
          }
          
          pdf.setTextColor(30, 30, 30);
          const wrappedItem: string[] = pdf.splitTextToSize(segment, contentWidth - 8);
          wrappedItem.forEach(line => {
            if (y > 275) { 
              pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage); 
              pdf.setFont(FONT_FAMILY, 'normal'); pdf.setFontSize(11); pdf.setCharSpace(0); 
            }
            pdf.text(line, margin + 6, y, { charSpace: 0 });
            y += 6.8;
          });
        });
        y += 1;
      });
      y += 4;
    } else if (el.type === 'table' && el.headers && el.rows) {
      // Orphan protection for tables: If starting very low, jump page
      if (y > 240) {
        pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage);
      }

      const headerBg = [219, 234, 254];
      const altBg = [248, 250, 252];

      autoTable(pdf, {
        startY: y,
        head: [el.headers.map(h => sanitizeText(h).toUpperCase())],
        body: el.rows.map(row => row.map(cell => sanitizeText(cell))),
        theme: 'grid',
        styles: { 
          font: FONT_FAMILY, 
          fontSize: 9, 
          cellPadding: 5,
          textColor: [40, 40, 40],
          lineColor: [210, 210, 210],
          lineWidth: 0.1,
          halign: 'left',
          valign: 'middle',
          fontStyle: 'normal'
        },
        headStyles: { 
          fillColor: headerBg as [number, number, number],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 0.2
        },
        alternateRowStyles: { 
          fillColor: altBg as [number, number, number] 
        },
        margin: { left: margin, right: margin }
      });
      y = (pdf as any).lastAutoTable.finalY + 12;
    } else if (el.type === 'diagram') {
      const result = await renderDiagramToImage(el.mermaid_code || '');
      
      if (result) {
        let imgWidth = contentWidth;
        let imgHeight = (result.height * imgWidth) / result.width;
        
        const maxAllowedHeight = 180;
        if (imgHeight > maxAllowedHeight) {
          imgHeight = maxAllowedHeight;
          imgWidth = (result.width * imgHeight) / result.height;
        }

        // Title + padding check
        const totalNeededHeight = imgHeight + 16; 
        if (y + totalNeededHeight > 275) { 
          pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage); 
        }
        
        // Print title NOW because we know we have space
        pdf.setFont(FONT_FAMILY, 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(37, 99, 235);
        pdf.text(`DIAGRAM / ARCHITECTURE: ${el.diagram_type?.toUpperCase()}`, margin, y);
        y += 6;

        const xPos = margin + (contentWidth - imgWidth) / 2;
        // Use JPEG with quality optimization for diagrams to keep PDF size under 5MB
        pdf.addImage(result.dataUrl, 'JPEG', xPos, y, imgWidth, imgHeight, undefined, 'MEDIUM', 0);
        y += imgHeight + 10;
      } else {
        // Fallback to text if image rendering fails
        const code = el.mermaid_code || '';
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(71, 85, 105);
        const codeLines = pdf.splitTextToSize(code, contentWidth - 10);
        const rectHeight = (codeLines.length * 5) + 6;
        pdf.setFillColor(241, 245, 249);
        pdf.rect(margin, y, contentWidth, rectHeight, 'F');
        codeLines.forEach(line => {
          if (y > 275) { pdf.addPage(); currentPage++; y = 30; addFooter(pdf, currentPage); pdf.setFont('courier', 'normal'); pdf.setFontSize(9); }
          pdf.text(line, margin + 5, y + 5);
          y += 5;
        });
        y += 10;
      }
      pdf.setFont(FONT_FAMILY, 'normal'); // Reset font
    }
  }

  pdf.save(`${fileName}.pdf`);
}

async function exportPPT(doc: DocResponse, fileName: string) {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  // 1. Title Slide - Forensic / High-Tech Theme
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "0F172A" }; // Deep Slate / Dark Tech
  
  // Technical Grid/Border
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0.15, y: 0.15, w: 9.7, h: 5.3,
    line: { color: THEME_BLUE, width: 0.5, dashType: 'dash' }
  });

  // Forensic Corner Markers
  const cornerSize = 0.4;
  titleSlide.addShape(pptx.ShapeType.line, { x: 0.15, y: 0.15, w: cornerSize, h: 0, line: { color: THEME_BLUE, width: 2 } });
  titleSlide.addShape(pptx.ShapeType.line, { x: 0.15, y: 0.15, w: 0, h: cornerSize, line: { color: THEME_BLUE, width: 2 } });
  titleSlide.addShape(pptx.ShapeType.line, { x: 9.85 - cornerSize, y: 0.15, w: cornerSize, h: 0, line: { color: THEME_BLUE, width: 2 } });
  titleSlide.addShape(pptx.ShapeType.line, { x: 9.85, y: 0.15, w: 0, h: cornerSize, line: { color: THEME_BLUE, width: 2 } });

    // Main Title - Top Aligned with Safe Margins
  titleSlide.addText(sanitizeText(doc.metadata.title).toUpperCase(), {
    x: 0.5, y: 0.5, w: 9.0, h: 3.5,
    fontSize: 34, color: "FFFFFF", align: 'center', bold: true,
    fontFace: 'Helvetica',
    valign: 'top',
    margin: [0, 0, 0, 0]
  });

  // Decoration Line - Strategic placement
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 2.5, y: 4.6, w: 5.0, h: 0.015,
    fill: { color: THEME_BLUE }
  });

  // Footer / Classification - Absolute Bottom Zone
  titleSlide.addText("CLASSIFIED DOCUMENT // FORENSIC ANALYSIS CORE", {
    x: 0.5, y: 4.8, w: 9.0, h: 0.3,
    fontSize: 9, color: THEME_BLUE, align: 'center',
    charSpacing: 10, fontFace: 'Courier New', bold: true
  });

  titleSlide.addText(sanitizeText(doc.metadata.summary.substring(0, 180)) + "...", {
    x: 1.5, y: 5.1, w: 7.0, h: 0.4,
    fontSize: 8, color: "94A3B8", align: 'center', italic: true,
    valign: 'middle'
  });

  // 2. Summary Slide
  const summarySlide = pptx.addSlide();
  summarySlide.addText("EXECUTIVE SUMMARY", {
    x: 0, y: 0.5, w: '100%', h: 0.8,
    fontSize: 28, color: THEME_BLUE, bold: true, align: 'center'
  });
  
  summarySlide.addText(sanitizeText(doc.metadata.summary), {
    x: 0.75, y: 1.5, w: 8.5, h: 3,
    fontSize: 18, color: "334155", italic: true,
    valign: 'top', lineSpacing: 28, align: 'justify'
  });

  // 3. Content Slides (Grouped by Heading)
  let currentSlide: any = null;
  let currentY = 1.0;

  const addNewSlideWithTitle = (title: string) => {
    currentSlide = pptx.addSlide();
    currentSlide.background = { color: "FFFFFF" };
    
    // Technical Header / Slide Title
    currentSlide.addText(sanitizeText(title).toUpperCase(), { 
      x: 0.5, y: 0.25, w: 9.0, h: 0.6, 
      fontSize: 22, color: THEME_BLUE, bold: true, align: 'left', valign: 'middle'
    });
    
    currentSlide.addShape(pptx.ShapeType.line, {
      x: 0.5, y: 0.85, w: 9.0, h: 0,
      line: { color: THEME_BLUE, width: 1.5 }
    });

    // Forensic Footer Watermark
    currentSlide.addText(`PROPRIETARY SYSTEM AUDIT // REF: ${new Date().getFullYear()}-${Math.random().toString(36).substring(7).toUpperCase()}`, {
      x: 0.5, y: 5.3, w: 9.0, h: 0.2,
      fontSize: 8, color: "CBD5E1", align: 'right', fontFace: 'Courier New'
    });
    
    currentY = 1.2;
  };

  for (const el of doc.content.elements) {
    if (el.type === 'heading') {
      addNewSlideWithTitle(el.text || 'Section');
    } else {
      if (!currentSlide) addNewSlideWithTitle('Analysis Content');
      
      // Overflow protection
      if (currentY > 4.5) {
        addNewSlideWithTitle("Continuation");
      }

      if (el.type === 'paragraph') {
        const text = sanitizeText(el.text || '');
        const lines = text.split('\n').length;
        const estimatedHeight = Math.max(0.4, (text.length / 80) * 0.25 + (lines * 0.2));
        
        currentSlide.addText(text, { 
          x: 0.75, y: currentY, w: 8.5, h: estimatedHeight, 
          fontSize: 14, color: "111827", valign: 'top', align: 'left',
          lineSpacing: 22
        });
        currentY += estimatedHeight + 0.3;
      } else if (el.type === 'list' && el.items) {
        const listHeight = Math.max(0.5, el.items.length * 0.4);
        currentSlide.addText(
          el.items.map(item => ({ text: sanitizeText(item), options: { bullet: true, color: THEME_BLUE } })),
          { x: 0.75, y: currentY, w: 8.5, h: listHeight, fontSize: 14, color: "111827", lineSpacing: 24 }
        );
        currentY += listHeight + 0.3;
      } else if (el.type === 'table' && el.headers && el.rows) {
        // If a table is about to start and we're low on space, start a fresh slide
        if (currentY > 3.0) {
          addNewSlideWithTitle("Data Table (Cont.)");
        }

        const headerRow = el.headers.map(h => ({ 
          text: sanitizeText(h).toUpperCase(), 
          options: { fill: { color: THEME_BLUE }, color: "FFFFFF", bold: true, align: 'center' } 
        }));
        const bodyRows = el.rows.map((row, i) => 
          row.map(cell => ({ 
            text: sanitizeText(cell), 
            options: { fill: { color: i % 2 !== 0 ? "F8FAFC" : "FFFFFF" }, color: "334155", align: 'left' } 
          }))
        );
        
        currentSlide.addTable([headerRow, ...bodyRows], {
          x: 0.5, y: currentY, w: 9, 
          border: { type: 'solid', pt: 0.5, color: "E2E8F0" },
          fontSize: 11,
          valign: 'middle'
        });
        currentY += 2.5; 
      } else if (el.type === 'diagram') {
        if (currentY > 3.0) addNewSlideWithTitle("Infrastructure / Flow (Cont.)");

        currentSlide.addText(`TECHNICAL WORKFLOW / LOGIC (${el.diagram_type?.toUpperCase()}):`, { 
          x: 0, y: currentY, w: '100%', h: 0.3, fontSize: 11, color: THEME_BLUE, bold: true, align: 'center' 
        });
        currentY += 0.4;

        const result = await renderDiagramToImage(el.mermaid_code || '');
        if (result) {
          // Calculate natural width in inches (assuming ~96 DPI) but cap at max width
          const naturalInches = result.width / 96;
          const displayWidth = Math.min(8.0, naturalInches);
          const displayHeight = (result.height * displayWidth) / result.width;
          
          // Overflow protection: cap height to 3.5 inches
          let finalWidth = displayWidth;
          let finalHeight = displayHeight;
          
          if (finalHeight > 3.5) {
            finalHeight = 3.5;
            finalWidth = (result.width * finalHeight) / result.height;
          }

          // Center horizontally
          const xPos = (10 - finalWidth) / 2;

          currentSlide.addImage({
            data: result.dataUrl,
            x: xPos, y: currentY, w: finalWidth, h: finalHeight,
            sizing: { type: 'contain', w: finalWidth, h: finalHeight }
          });
          currentY += finalHeight + 0.4;
        } else {
          currentSlide.addText(el.mermaid_code || '', {
            x: 0.75, y: currentY, w: 8.5, h: 3,
            fontSize: 10, color: "1E293B", fontFace: 'Courier New',
            fill: { color: "F8FAFC" },
            valign: 'top',
            border: { type: 'solid', color: THEME_BLUE, pt: 1 }
          });
          currentY += 3.2;
        }
      }
    }
  }

  await pptx.writeFile({ fileName: `${fileName}.pptx` });
}

// Helpers for color conversion
function hexToRgb(hex: string): number[] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16)
  ];
}

function hexToRgbArray(hex: string): number[] {
  try {
    const h = hex.replace('#', '');
    if (h.length === 3) {
      return [
        parseInt(h[0] + h[0], 16),
        parseInt(h[1] + h[1], 16),
        parseInt(h[2] + h[2], 16)
      ];
    }
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16)
    ];
  } catch {
    return [240, 240, 240];
  }
}

function generateMarkdown(doc: DocResponse): string {
  let md = `# ${sanitizeText(doc.metadata.title)}\n\n> ${sanitizeText(doc.metadata.summary)}\n\n`;
  doc.content.elements.forEach(el => {
    if (el.type === 'heading') md += `## ${sanitizeText(el.text || '')}\n\n`;
    else if (el.type === 'paragraph') md += `${sanitizeText(el.text || '')}\n\n`;
    else if (el.type === 'list') md += el.items?.map(i => `* ${sanitizeText(i)}`).join('\n') + '\n\n';
    else if (el.type === 'table') {
      md += `| ${el.headers?.map(h => sanitizeText(h)).join(' | ')} |\n`;
      md += `| ${el.headers?.map(() => '---').join(' | ')} |\n`;
      md += el.rows?.map(row => `| ${row.map(cell => sanitizeText(cell)).join(' | ')} |`).join('\n') + '\n\n';
    } else if (el.type === 'diagram') {
      md += `### ${el.diagram_type?.toUpperCase()} DIAGRAM\n\n\`\`\`mermaid\n${el.mermaid_code}\n\`\`\`\n\n`;
    }
  });
  return md;
}

function asciiFlowchart(code: string): string {
  if (!code) return '';
  const lines = code.split('\n');
  const trimmedCode = code.trim();

  // Handle Mindmaps separately
  if (trimmedCode.startsWith('mindmap')) {
    let output = 'STRATEGIC MINDMAP (ASCII)\n';
    output += '='.repeat(25) + '\n\n';
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'mindmap') return;
      
      const indent = line.search(/\S/);
      const label = trimmed.replace(/^root\({2}|root\s*|\({2}|\){2}|\[|\]|\{|\}/g, '').trim();
      
      // Create visual tree structure based on indent
      const prefix = indent > 0 ? ' '.repeat(indent) + '└── ' : '';
      output += `${prefix}${label}\n`;
    });
    return output;
  }

  // Standard Flowchart Parser
  const relations: { from: string, to: string, label?: string }[] = [];
  const nodes: { [id: string]: string } = {};

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('graph') || trimmed.startsWith('flowchart')) return;

    // Detect node definitions: ID[Label] or ID(Label) or ID((Label)) or ID{Label}
    const nodeDefMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*[\[\(\{\(]+([^\]\)\}\)]+)[\]\)\}\)]+$/);
    if (nodeDefMatch) {
      nodes[nodeDefMatch[1]] = nodeDefMatch[2];
      return;
    }

    // Detect relations: A --> B or A -- label --> B
    const relMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*(?:--\s*([^>]+)\s*-->|-->)\s*([a-zA-Z0-9_-]+)$/);
    if (relMatch) {
      relations.push({
        from: relMatch[1],
        to: relMatch[3],
        label: relMatch[2]?.trim()
      });
      if (!nodes[relMatch[1]]) nodes[relMatch[1]] = relMatch[1];
      if (!nodes[relMatch[3]]) nodes[relMatch[3]] = relMatch[3];
    }
  });

  if (relations.length === 0) {
    // If we recognize it's mermaid but can't map it, give a clean summary instead of raw code
    return `\n[ ${lines[0].trim().toUpperCase()} DIAGRAM ]\n(Complex structure: See visual PDF/Word export for full rendering)\n`;
  }

  let output = 'ARCHITECTURE VISUALIZATION (ASCII)\n';
  output += '='.repeat(30) + '\n\n';

  relations.forEach(rel => {
    const fromLabel = nodes[rel.from] || rel.from;
    const toLabel = nodes[rel.to] || rel.to;
    const box1 = `[ ${fromLabel} ]`;
    const box2 = `[ ${toLabel} ]`;
    const arrow = rel.label ? `--(${rel.label})-->` : '-------->';
    
    output += `${box1}\n`;
    output += `   |\n`;
    output += `   V  ${arrow}\n`;
    output += `${box2}\n\n`;
  });

  return output;
}

function generateTxt(doc: DocResponse): string {
  let txt = `${sanitizeText(doc.metadata.title).toUpperCase()}\n${'='.repeat(doc.metadata.title.length)}\n\n`;
  txt += `SUMMARY: ${sanitizeText(doc.metadata.summary)}\n\n`;
  
  doc.content.elements.forEach(el => {
    if (el.type === 'heading') {
      const heading = sanitizeText(el.text || '').toUpperCase();
      txt += `\n[ ${heading} ]\n${'-'.repeat(heading.length + 4)}\n`;
    } else if (el.type === 'paragraph') {
      txt += `${sanitizeText(el.text || '')}\n`;
    } else if (el.type === 'list') {
      txt += el.items?.map(i => `• ${sanitizeText(i)}`).join('\n') + '\n';
    } else if (el.type === 'table' && el.headers && el.rows) {
      const headers = el.headers.map(h => sanitizeText(h));
      const rows = el.rows.map(row => row.map(cell => sanitizeText(cell)));
      
      // Calculate column widths
      const colWidths = headers.map((h, i) => {
        let max = h.length;
        rows.forEach(row => {
          if (row[i] && row[i].length > max) max = row[i].length;
        });
        return max + 2; // Add padding
      });

      const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
      const borderLine = '+' + colWidths.map(w => '-'.repeat(w)).join('+') + '+';

      txt += `\n${borderLine}\n`;
      txt += '|' + headers.map((h, i) => pad(' ' + h, colWidths[i])).join('|') + '|\n';
      txt += `${borderLine}\n`;
      
      rows.forEach(row => {
        txt += '|' + row.map((cell, i) => pad(' ' + cell, colWidths[i])).join('|') + '|\n';
      });
      txt += `${borderLine}\n`;
    } else if (el.type === 'diagram') {
      txt += `\n${asciiFlowchart(el.mermaid_code || '')}\n`;
    }
  });
  return txt;
}

function generateHtml(doc: DocResponse): string {
  const title = sanitizeText(doc.metadata.title);
  const summary = sanitizeText(doc.metadata.summary);
  
  return `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Inter', sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #1f2937; }
          h1 { color: #111827; border-bottom: 4px solid #2563eb; padding-bottom: 12px; }
          h2 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 40px; }
          .summary { font-style: italic; color: #4b5563; background: #f9fafb; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          th, td { border: 1px solid #e5e7eb; padding: 12px 15px; text-align: left; }
          th { background: #2563eb; color: white; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em; }
          tr:nth-child(even) { background: #f8fafc; }
          .diagram-box { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="summary">${summary}</div>
        ${doc.content.elements.map(el => {
          if (el.type === 'heading') return `<h2>${sanitizeText(el.text || '')}</h2>`;
          if (el.type === 'paragraph') return `<p>${sanitizeText(el.text || '')}</p>`;
          if (el.type === 'list') return `<ul>${el.items?.map(i => `<li>${sanitizeText(i)}</li>`).join('')}</ul>`;
          if (el.type === 'table') return `
            <table>
              <thead><tr>${el.headers?.map(h => `<th>${sanitizeText(h)}</th>`).join('')}</tr></thead>
              <tbody>${el.rows?.map(row => `<tr>${row.map(c => `<td>${sanitizeText(c)}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          `;
          if (el.type === 'diagram') return `
            <div class="diagram-box">
              <strong>${el.diagram_type?.toUpperCase()} DIAGRAM</strong><br/>
              <small>(Code: ${el.mermaid_code})</small>
            </div>
          `;
          return '';
        }).join('')}
      </body>
    </html>
  `;
}
