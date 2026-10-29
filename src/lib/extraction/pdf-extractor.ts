
import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import type { ExtractionResult } from './types';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  typeof window === 'undefined'
    ? new URL(
        '../../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).href
    : pdfWorkerUrl;

export async function extractPdfFile(
  file: Blob,
): Promise<ExtractionResult> {
  if (file.type !== 'application/pdf') {
    throw new Error('Expected a PDF file.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
  });

  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .filter((item): item is TextItem => 'str' in item)
        .map((item) => item.str)
        .join(' ');

      pages.push(pageText);
    }

    return {
      text: pages.join('\n\n'),
      mimeType: 'application/pdf',
      method: 'pdf',
      pageCount: pdf.numPages,
      extractedAt: Date.now(),
    };
  } finally {
    await loadingTask.destroy();
  }
}
