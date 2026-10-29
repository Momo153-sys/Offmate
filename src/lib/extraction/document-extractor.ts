
import type { ExtractionResult } from './types';

import { extractTextFile } from './text-extractor';
import { extractPdfFile } from './pdf-extractor';
import { extractWordFile } from './word-extractor';
import { extractImageFile } from './image-extractor';

export async function extractDocument(
  file: Blob,
): Promise<ExtractionResult> {
  switch (file.type) {
    case 'text/plain':
      return extractTextFile(file);

    case 'application/pdf':
      return extractPdfFile(file);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractWordFile(file);

    case 'image/jpeg':
    case 'image/png':
      return extractImageFile(file);

    default:
      throw new Error(
        `Unsupported document type: ${file.type || 'unknown'}`,
      );
  }
}
