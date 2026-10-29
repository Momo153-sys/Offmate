
export type SupportedDocumentType =
  | 'application/pdf'
  | 'text/plain'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'image/jpeg'
  | 'image/png';

export interface ExtractionResult {
  text: string;
  mimeType: SupportedDocumentType;
  method: 'direct' | 'pdf' | 'docx' | 'ocr';
  pageCount?: number;
  extractedAt: number;
}

export interface DocumentExtractor {
  extract(file: Blob): Promise<ExtractionResult>;
}
