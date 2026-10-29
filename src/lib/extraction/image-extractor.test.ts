
/**
 * @vitest-environment jsdom
 */

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { extractImageFile } from './image-extractor';
import { createWorker } from 'tesseract.js';

// Mock the OCR worker
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(),
}));

const mockedCreateWorker = vi.mocked(createWorker);

describe('Image OCR Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts text from a PNG image', async () => {
    const recognize = vi.fn().mockResolvedValue({
      data: {
        text: 'OFFMATE TEST',
      },
    });

    const terminate = vi.fn().mockResolvedValue(undefined);

    mockedCreateWorker.mockResolvedValue({
      recognize,
      terminate,
    } as unknown as Awaited<ReturnType<typeof createWorker>>);

    const file = new Blob(
      ['Simulated PNG data'],
      { type: 'image/png' },
    );

    const result = await extractImageFile(file);

    expect(mockedCreateWorker).toHaveBeenCalledWith('eng');
    expect(recognize).toHaveBeenCalledOnce();
    expect(terminate).toHaveBeenCalledOnce();

    expect(result.method).toBe('ocr');
    expect(result.mimeType).toBe('image/png');
    expect(result.text).toBe('OFFMATE TEST');
    expect(result.extractedAt).toEqual(
      expect.any(Number),
    );
  });

  it('rejects unsupported file types', async () => {
    const file = new Blob(
      ['Plain text'],
      { type: 'text/plain' },
    );

    await expect(
      extractImageFile(file),
    ).rejects.toThrow('Expected a JPG or PNG image.');

    expect(mockedCreateWorker).not.toHaveBeenCalled();
  });

  it('terminates the worker when OCR fails', async () => {
    const recognize = vi.fn().mockRejectedValue(
      new Error('OCR recognition failed'),
    );

    const terminate = vi.fn().mockResolvedValue(undefined);

    mockedCreateWorker.mockResolvedValue({
      recognize,
      terminate,
    } as unknown as Awaited<ReturnType<typeof createWorker>>);

    const file = new Blob(
      ['Simulated image data'],
      { type: 'image/png' },
    );

    await expect(
      extractImageFile(file),
    ).rejects.toThrow('OCR recognition failed');

    expect(terminate).toHaveBeenCalledOnce();
  });
});
