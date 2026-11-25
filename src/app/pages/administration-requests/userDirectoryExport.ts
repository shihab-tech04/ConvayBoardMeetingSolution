// Treat untrusted exported text as data, never as spreadsheet formulas.
export function userDirectoryCsvCell(value: unknown): string {
  const text = String(value ?? "");
  const unsafe = /^[\t\r\n]/.test(text) || /^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(text);
  const literal = unsafe ? "'" + text : text;
  return '"' + literal.replace(/"/g, '""') + '"';
}
