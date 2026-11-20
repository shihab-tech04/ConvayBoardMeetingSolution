/**
 * DC-02/DC-12 — private document upload persistence stages.
 *
 * The live Storage RLS policy requires an existing bms.documents record before
 * it permits an object upload. Never upload the original first. This adapter
 * retains a checkpoint across retries within the composer; it never reports
 * a completed document until SQL metadata, original content and version all
 * receive their own authoritative acknowledgement.
 *
 * This is NOT a cross-service transaction or an authorization substitute.
 * A partially created Draft remains on the server if upload/version fails.
 */
export interface DocumentUploadCheckpoint {
  documentId: string;
  metadataSaved: boolean;
  originalSaved: boolean;
  versionSaved: boolean;
}

export interface DocumentUploadWrites {
  createMetadata(): boolean | Promise<boolean>;
  saveOriginal(): Promise<string>;
  createVersion(): boolean | Promise<boolean>;
}

export async function persistUploadedDocument(
  checkpoint: DocumentUploadCheckpoint,
  writes: DocumentUploadWrites,
): Promise<string> {
  if (!checkpoint.documentId || checkpoint.documentId.trim() !== checkpoint.documentId) {
    throw new Error("A valid document ID is required.");
  }
  if (!checkpoint.metadataSaved) {
    if (await writes.createMetadata() !== true) {
      throw new Error("Document metadata was not confirmed by SQL.");
    }
    checkpoint.metadataSaved = true;
  }
  if (!checkpoint.originalSaved) {
    const originalId = await writes.saveOriginal();
    if (originalId !== `file:${checkpoint.documentId}:latest`) {
      throw new Error("The private original file was not confirmed by Storage/SQL.");
    }
    checkpoint.originalSaved = true;
  }
  if (!checkpoint.versionSaved) {
    if (await writes.createVersion() !== true) {
      throw new Error("The document version was not confirmed by SQL.");
    }
    checkpoint.versionSaved = true;
  }
  return checkpoint.documentId;
}

/**
 * DC-02/DC-18: authored Blank/Template content is subject to the same metadata
 * RLS prerequisite as a binary original. Keep the durable stages retryable.
 */
export interface AuthoredDocumentCheckpoint {
  documentId: string;
  metadataSaved: boolean;
  editorSaved: boolean;
  versionSaved: boolean;
}

export interface AuthoredDocumentWrites {
  createMetadata(): boolean | Promise<boolean>;
  saveEditor(): Promise<string>;
  createVersion(): boolean | Promise<boolean>;
}

export async function persistAuthoredDocument(
  checkpoint: AuthoredDocumentCheckpoint,
  writes: AuthoredDocumentWrites,
): Promise<string> {
  if (!checkpoint.documentId || checkpoint.documentId.trim() !== checkpoint.documentId) {
    throw new Error("A valid document ID is required.");
  }
  if (!checkpoint.metadataSaved) {
    if (await writes.createMetadata() !== true) {
      throw new Error("Document metadata was not confirmed by SQL.");
    }
    checkpoint.metadataSaved = true;
  }
  if (!checkpoint.editorSaved) {
    const contentId = await writes.saveEditor();
    if (contentId !== `editor:${checkpoint.documentId}:live`) {
      throw new Error("The original editor content was not confirmed by SQL.");
    }
    checkpoint.editorSaved = true;
  }
  if (!checkpoint.versionSaved) {
    if (await writes.createVersion() !== true) {
      throw new Error("The document version was not confirmed by SQL.");
    }
    checkpoint.versionSaved = true;
  }
  return checkpoint.documentId;
}
