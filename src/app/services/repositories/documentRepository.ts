import type { DocumentRepository } from "../types/documents";
import { LocalDocumentRepository } from "./localDocumentRepository";

let _instance: DocumentRepository | null = null;

/**
 * Returns the active DocumentRepository implementation.
 */
export function getDocumentRepository(): DocumentRepository {
  if (!_instance) {
    _instance = new LocalDocumentRepository();
  }
  return _instance;
}

export type { DocumentRepository };
