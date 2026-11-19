/** DC-07 display-only formatting: preserve canonical metadata without inventing values. */
export function formatDocumentBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function formatDocumentDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function documentAcknowledgementLabel(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (value === true || value === 1) return "Required";
  if (value === false || value === 0) return "Not required";
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (["yes", "true", "1"].includes(normalized)) return "Required";
  if (["no", "false", "0"].includes(normalized)) return "Not required";
  return undefined;
}
