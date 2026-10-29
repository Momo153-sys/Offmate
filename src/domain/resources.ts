
export type ResourceKind = 'note' | 'document';

export type ExtractionStatus =
  | 'pending'
  | 'completed'
  | 'failed';

export interface Resource {
  id: string;
  title: string;
  kind: ResourceKind;

  // Notes content or extracted document text
  content?: string;

  // Original uploaded document
  file?: Blob;
  mimeType?: string;

  // Document extraction metadata
  extractionStatus?: ExtractionStatus;
  extractedAt?: number;

  // Resource timestamps
  createdAt: number;
  updatedAt: number;
}

export interface Note extends Resource {
  kind: 'note';
  content: string;
}

export interface DocumentResource extends Resource {
  kind: 'document';
  file?: Blob;
  mimeType?: string;
}

export type CreateResourceInput = Pick<
  Resource,
  'title' | 'kind'
> &
  Partial<
    Pick<
      Resource,
      | 'content'
      | 'file'
      | 'mimeType'
      | 'extractionStatus'
      | 'extractedAt'
    >
  >;

export type UpdateResourceInput = Partial<
  Pick<
    Resource,
    | 'title'
    | 'content'
    | 'file'
    | 'mimeType'
    | 'extractionStatus'
    | 'extractedAt'
  >
>;
