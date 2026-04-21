export type TargetFormat = 'excel' | 'word' | 'docx' | 'pptx' | 'ppt' | 'slides' | 'txt' | 'markdown' | 'html' | 'pdf';

export interface DocStyle {
  highlight_bg?: string;
  text_color?: string;
  bold?: boolean;
  italic?: boolean;
  table_header_bg?: string;
  alt_row_bg?: string;
}

export type ElementType = 'heading' | 'paragraph' | 'list' | 'table' | 'diagram';
export type DiagramType = 'flowchart' | 'sequence' | 'mindmap' | 'gantt';

export interface DocElement {
  type: ElementType;
  text?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  diagram_type?: DiagramType;
  mermaid_code?: string;
  style?: DocStyle;
}

export interface DocMetadata {
  title: string;
  summary: string;
  notes: string;
}

export interface DocResponse {
  detected_mode: 'prompt' | 'content';
  target_format: TargetFormat;
  metadata: DocMetadata;
  content: {
    elements: DocElement[];
  };
}
