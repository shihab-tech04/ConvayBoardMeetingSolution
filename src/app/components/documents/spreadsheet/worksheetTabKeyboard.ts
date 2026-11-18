/** Keyboard behavior for the existing spreadsheet worksheet tabs. */
export function shouldActivateWorksheetTab(key: string, keyOriginIsTab: boolean): boolean {
  return keyOriginIsTab && (key === "Enter" || key === " ");
}

/** Empty names cancel rename instead of passing an invalid workbook sheet name. */
export function normalizeWorksheetRename(value: string): string | null {
  const name = value.trim();
  return name || null;
}
