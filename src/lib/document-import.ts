
import { saveResource, updateResource } from './db';
import { extractDocument } from './extraction/document-extractor';
import type { Resource } from '../domain/resources';

// Maximum allowed file size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Supported document and image formats
const SUPPORTED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

export async function importDocument(
  file: File,
): Promise<Resource> {
  // Validate file type
  if (!SUPPORTED_TYPES.includes(file.type)) {
    throw new Error(
      'Unsupported file type. Please select PDF, TXT, DOCX, JPG, or PNG.',
    );
  }

  // Reject empty files
  if (file.size === 0) {
    throw new Error('Cannot import an empty file.');
  }

  // Reject oversized files
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds the 10 MB limit.');
  }

  // Save the original document before extracting its text
  const resource = await saveResource({
    title: file.name,
    kind: 'document',
    file,
    mimeType: file.type,
    extractionStatus: 'pending',
  });

  try {
    // Extract text using the appropriate extraction engine
    const result = await extractDocument(file);

    // Store extracted text alongside the original document
    return await updateResource(resource.id, {
      content: result.text,
      extractionStatus: 'completed',
      extractedAt: result.extractedAt,
    });
  } catch (error) {
    console.error('Document extraction failed:', error);

    // Preserve the original file even when extraction fails
    try {
      return await updateResource(resource.id, {
        extractionStatus: 'failed',
      });
    } catch (updateError) {
      console.error(
        'Failed to update extraction status:',
        updateError,
      );

      // The original document was already saved
      return resource;
    }
  }
}

export async function retryDocumentExtraction(
  resource: Resource,
): Promise<Resource> {
  if (resource.kind !== 'document' || !resource.file) {
    throw new Error('This resource has no document to extract.');
  }

  await updateResource(resource.id, {
    extractionStatus: 'pending',
  });

  try {
    const result = await extractDocument(resource.file);

    return await updateResource(resource.id, {
      content: result.text,
      extractionStatus: 'completed',
      extractedAt: result.extractedAt,
    });
  } catch (error) {
    await updateResource(resource.id, {
      extractionStatus: 'failed',
    });

    throw error;
  }
}