
import type { ExtractionResult } from './types';

export async function extractTextFile(
  file: Blob,
): Promise<ExtractionResult> {
  if (file.type !== 'text/plain') {
    throw new Error('Expected a TXT file.');
  }

  const text = await file.text();

  return {
    text,
    mimeType: 'text/plain',
    method: 'direct',
    extractedAt: Date.now(),
  };
}
