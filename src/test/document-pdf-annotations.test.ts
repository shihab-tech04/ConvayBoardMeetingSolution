/**
 * Phase 8: PDF annotation types and coordinate normalization tests.
 */
import { describe, it, expect } from "vitest";
import type { PdfAnnotation, PdfAnnotationType } from "../app/components/documents/pdf/pdfAnnotationTypes";

// ── Annotation type set ───────────────────────────────────────────────────────

const ALL_ANNOTATION_TYPES: PdfAnnotationType[] = [
  "highlight", "underline", "strikeout", "sticky",
  "free-text", "ink", "rectangle", "arrow",
];

describe("PdfAnnotationType", () => {
  it("includes all eight annotation types", () => {
    expect(ALL_ANNOTATION_TYPES).toHaveLength(8);
  });

  it("includes highlight", () => {
    expect(ALL_ANNOTATION_TYPES).toContain("highlight");
  });

  it("includes sticky note type", () => {
    expect(ALL_ANNOTATION_TYPES).toContain("sticky");
  });
});

// ── Annotation coordinate normalization ──────────────────────────────────────
// Coordinates are stored as 0–1 fractions of the page dimensions.

function normalizeRect(
  pixelRect: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: pixelRect.x / pageWidth,
    y: pixelRect.y / pageHeight,
    width: pixelRect.width / pageWidth,
    height: pixelRect.height / pageHeight,
  };
}

function denormalizeRect(
  normRect: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: normRect.x * pageWidth,
    y: normRect.y * pageHeight,
    width: normRect.width * pageWidth,
    height: normRect.height * pageHeight,
  };
}

describe("annotation coordinate normalization", () => {
  const pageW = 595, pageH = 842;

  it("normalizes pixel rect to 0–1 fractions", () => {
    const norm = normalizeRect({ x: 59.5, y: 84.2, width: 119, height: 168.4 }, pageW, pageH);
    expect(norm.x).toBeCloseTo(0.1);
    expect(norm.y).toBeCloseTo(0.1);
    expect(norm.width).toBeCloseTo(0.2);
    expect(norm.height).toBeCloseTo(0.2);
  });

  it("all normalized values are in [0, 1]", () => {
    const norm = normalizeRect({ x: 0, y: 0, width: pageW, height: pageH }, pageW, pageH);
    expect(norm.x).toBe(0);
    expect(norm.y).toBe(0);
    expect(norm.width).toBe(1);
    expect(norm.height).toBe(1);
  });

  it("round-trips through normalize → denormalize", () => {
    const original = { x: 100, y: 200, width: 50, height: 30 };
    const norm = normalizeRect(original, pageW, pageH);
    const back = denormalizeRect(norm, pageW, pageH);
    expect(back.x).toBeCloseTo(original.x);
    expect(back.y).toBeCloseTo(original.y);
    expect(back.width).toBeCloseTo(original.width);
    expect(back.height).toBeCloseTo(original.height);
  });
});

// ── Annotation factory ────────────────────────────────────────────────────────

function makeAnnotation(overrides: Partial<PdfAnnotation> = {}): PdfAnnotation {
  return {
    id: `ann-${Date.now()}`,
    document_id: "doc-001",
    page: 1,
    type: "highlight",
    color: "#FFEB3B",
    author: "test_user",
    created_at: new Date().toISOString(),
    status: "active",
    ...overrides,
  };
}

describe("annotation creation", () => {
  it("creates a valid highlight annotation", () => {
    const ann = makeAnnotation({ type: "highlight", page: 3 });
    expect(ann.type).toBe("highlight");
    expect(ann.page).toBe(3);
    expect(ann.status).toBe("active");
  });

  it("removed annotation has status removed", () => {
    const ann = makeAnnotation({ status: "removed" });
    expect(ann.status).toBe("removed");
  });

  it("annotation can have optional rect", () => {
    const ann = makeAnnotation({
      rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
    });
    expect(ann.rect?.x).toBe(0.1);
  });

  it("annotation created_at is ISO date string", () => {
    const ann = makeAnnotation();
    expect(() => new Date(ann.created_at)).not.toThrow();
    expect(new Date(ann.created_at).getTime()).not.toBeNaN();
  });
});

// ── Annotation list filtering ──────────────────────────────────────────────────

function activeAnnotations(anns: PdfAnnotation[], page: number): PdfAnnotation[] {
  return anns.filter(a => a.status === "active" && a.page === page);
}

describe("annotation list filtering", () => {
  const anns: PdfAnnotation[] = [
    makeAnnotation({ id: "a1", page: 1, status: "active" }),
    makeAnnotation({ id: "a2", page: 1, status: "removed" }),
    makeAnnotation({ id: "a3", page: 2, status: "active" }),
    makeAnnotation({ id: "a4", page: 1, status: "active" }),
  ];

  it("returns only active annotations for a page", () => {
    expect(activeAnnotations(anns, 1)).toHaveLength(2);
  });

  it("does not include removed annotations", () => {
    const result = activeAnnotations(anns, 1);
    expect(result.every(a => a.status === "active")).toBe(true);
  });

  it("returns empty for page with no active annotations", () => {
    expect(activeAnnotations(anns, 99)).toHaveLength(0);
  });

  it("page 2 has one active annotation", () => {
    expect(activeAnnotations(anns, 2)).toHaveLength(1);
  });
});
