import type { PDFPageProxy } from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

export async function renderPdfPageToCanvas(
  page: PDFPageProxy,
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement('canvas');

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create canvas context.');
  }

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  return canvas;
}


export async function extractScannedPdfPage(
  page: PDFPageProxy,
): Promise<string> {
  // Render the PDF page as an image
  const canvas = await renderPdfPageToCanvas(page);

  // Initialize Tesseract OCR
  const worker = await createWorker('eng');

  try {
    // Recognize text directly from the canvas
    const result = await worker.recognize(canvas);

    return result.data.text.trim();
  } finally {
    // Release OCR worker resources
    await worker.terminate();

    // Release canvas memory
    canvas.width = 0;
    canvas.height = 0;
  }
}
