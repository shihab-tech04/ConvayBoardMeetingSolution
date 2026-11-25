/** Saved wizard indices are zero-based. Never open a nonexistent step. */
export function readDraftWizardStep(value: unknown, stepCount: number): { index: number; recovered: boolean } {
  if (!Number.isSafeInteger(stepCount) || stepCount < 1) throw new Error("The draft wizard is unavailable.");
  if (value === undefined || value === null || value === "") return { index: 0, recovered: false };
  const index = typeof value === "number" ? value
    : typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(index) && index >= 0 && index < stepCount
    ? { index, recovered: false } : { index: 0, recovered: true };
}
