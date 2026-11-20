/** RP-05: retain only explicit, meaningful financial impact values from an
 * authorized decision-registry SQL read. Do not assume a missing impact is 0.
 * The value is display text (e.g., ৳50,000,000), not a computed financial total.
 */
export function hasReportableFinancialImpact(impact: unknown): impact is string {
  if (typeof impact !== "string") return false;
  const value = impact.trim();
  return value !== "" && value.toLocaleLowerCase() !== "n/a";
}
