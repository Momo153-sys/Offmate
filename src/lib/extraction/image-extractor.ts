
import { createWorker } from 'tesseract.js';
import type { ExtractionResult } from './types';

export async function extractImageFile(
  file: Blob,
): Promise<ExtractionResult> {
  // Validate supported image formats
  if (
    file.type !== 'image/jpeg' &&
    file.type !== 'image/png'
  ) {
    throw new Error('Expected a JPG or PNG image.');
  }

  // Convert the image into a Base64 data URL
  const imageUrl = await new Promise<string>(
    (resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read image.'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read image.'));
      };

      reader.readAsDataURL(file);
    },
  );

  // Initialize the OCR worker
  const worker = await createWorker('eng');

  try {

    // Recognize text from the image
    const result = await worker.recognize(imageUrl);

    return {
      text: result.data.text.trim(),
      mimeType: file.type as 'image/jpeg' | 'image/png',
      method: 'ocr',
      extractedAt: Date.now(),
    };
  } finally {
    // Release worker resources
    await worker.terminate();
  }
}
