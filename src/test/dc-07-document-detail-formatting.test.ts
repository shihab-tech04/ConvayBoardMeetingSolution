import { describe, expect, it } from "vitest";
import { documentAcknowledgementLabel, formatDocumentBytes, formatDocumentDate } from "../app/components/documents/documentDetailFormatting";

describe("DC-07 document detail display", () => {
  it("shows a valid empty file as 0 B", () => expect(formatDocumentBytes(0)).toBe("0 B"));
  it("does not invent a size if missing", () => expect(formatDocumentBytes(undefined)).toBe("—"));
  it("does not show misleading negative sizes", () => expect(formatDocumentBytes(-1)).toBe("—"));
  it("shows KB and MB using existing units", () => {
    expect(formatDocumentBytes(1536)).toBe("1.5 KB");
    expect(formatDocumentBytes(1048576)).toBe("1.0 MB");
  });
  it("distinguishes invalid date from missing date", () => {
    expect(formatDocumentDate(undefined)).toBe("—");
    expect(formatDocumentDate("not a date")).toBe("not a date");
  });
  it("formats a valid ISO date", () => expect(formatDocumentDate("2026-11-07T00:00:00Z")).toContain("2026"));
  it("normalizes boolean and legacy Yes variants to required", () => {
    expect(documentAcknowledgementLabel(true)).toBe("Required");
    expect(documentAcknowledgementLabel(" yes ")).toBe("Required");
  });
  it("preserves negative acknowledgement values", () => {
    expect(documentAcknowledgementLabel(false)).toBe("Not required");
    expect(documentAcknowledgementLabel("No")).toBe("Not required");
  });
  it("does not invent unknown acknowledgement metadata", () => {
    expect(documentAcknowledgementLabel(undefined)).toBeUndefined();
    expect(documentAcknowledgementLabel("not a field value")).toBeUndefined();
  });
});
