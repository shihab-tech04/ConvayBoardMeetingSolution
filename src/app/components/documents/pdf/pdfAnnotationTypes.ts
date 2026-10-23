/** Shared type definitions for PDF annotation metadata. */

export type PdfAnnotationType =
  | "highlight"
  | "underline"
  | "strikeout"
  | "sticky"
  | "free-text"
  | "ink"
  | "rectangle"
  | "arrow";

export interface PdfAnnotation {
  id: string;
  document_id: string;
  version_id?: string;
  page: number;
  type: PdfAnnotationType;
  /** Normalised bounding rect (0–1 relative to page width/height). */
  rect?: { x: number; y: number; width: number; height: number };
  color?: string;
  text?: string;
  author: string;
  created_at: string;
  updated_at?: string;
  status: "active" | "removed";
}
