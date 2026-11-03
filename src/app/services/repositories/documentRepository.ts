import type { DocumentRepository } from "../types/documents";
import { LocalDocumentRepository } from "./localDocumentRepository";
import { SupabaseDocumentRepository } from "./supabaseDocumentRepository";

let _instance: DocumentRepository | null = null;

/**
 * Returns the active DocumentRepository implementation.
 */
export function getDocumentRepository(): DocumentRepository {
  if (!_instance) {
    _instance = import.meta.env.MODE === "test" ? new LocalDocumentRepository() : new SupabaseDocumentRepository();
  }
  return _instance;
}

export type { DocumentRepository };
