
import * as mammoth from 'mammoth/mammoth.browser';
import type { ExtractionResult } from './types';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function extractWordFile(
  file: Blob,
): Promise<ExtractionResult> {
  // Validate document format
  if (file.type !== DOCX_MIME) {
    throw new Error('Expected a DOCX file.');
  }

  // Read the document using browser-compatible APIs
  const arrayBuffer = await file.arrayBuffer();

  // Extract text from the Word document
  const result = await mammoth.extractRawText({
    arrayBuffer,
  });

  return {
    text: result.value.trim(),
    mimeType: DOCX_MIME,
    method: 'docx',
    extractedAt: Date.now(),
  };
}
