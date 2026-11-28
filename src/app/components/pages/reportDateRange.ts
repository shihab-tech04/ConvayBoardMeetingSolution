/** Civil dates use the stored date portion, without converting to the browser timezone. */
function isCivilDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return y > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

export function isValidReportDateRange(from?: string, to?: string): boolean {
  return (!from || isCivilDate(from)) && (!to || isCivilDate(to)) && (!from || !to || from <= to);
}

export function reportDateMatchesRange(value: unknown, from?: string, to?: string): boolean {
  if (!isValidReportDateRange(from, to)) return false;
  if (!from && !to) return true;
  if (typeof value !== "string") return false;
  const date = value.slice(0, 10);
  if (!isCivilDate(date) || (value.length !== 10 && !/^T\d{2}:\d{2}/.test(value.slice(10)))) return false;
  return (!from || date >= from) && (!to || date <= to);
}
