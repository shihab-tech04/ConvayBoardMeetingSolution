import type { EntryFormValue, FormField } from "./EntryForm";

export function buildInitialValuesFromRow(
  row: Record<string, unknown>,
  fields: FormField[],
): Record<string, EntryFormValue> {
  const out: Record<string, EntryFormValue> = {};
  fields.forEach((field, index) => {
    if (!field.key) return;
    const id = field.key ?? `entry-field-${index}`;
    const canonicalValue = field.initialValueKey ? row[field.initialValueKey] : undefined;
    const value = canonicalValue !== undefined && canonicalValue !== null && String(canonicalValue).trim() !== ""
      ? canonicalValue
      : row[field.key];
    if (value === undefined || value === null) return;

    if (field.type === "toggle" || field.type === "checkbox") {
      out[id] = value === true || value === "true" || value === "Yes";
    } else if (field.type === "multiselect") {
      out[id] = Array.isArray(value)
        ? value as string[]
        : String(value).split(",").map(item => item.trim()).filter(Boolean);
    } else if (field.type === "file") {
      out[id] = [];
    } else if (field.type === "select" && Array.isArray(field.options) && field.options.length > 0 && typeof field.options[0] === "object") {
      const stringValue = String(value);
      const options = field.options as { value: string; label: string }[];
      if (options.some(option => option.value === stringValue)) {
        out[id] = stringValue;
      } else {
        // Legacy rows may store a display name. Resolve only when that name maps to one option.
        const matches = options.filter(option =>
          option.label === stringValue
          || option.label.startsWith(stringValue + " —")
          || option.label.startsWith(stringValue + " ("),
        );
        out[id] = matches.length === 1 ? matches[0].value : "";
      }
    } else {
      out[id] = String(value);
    }
  });
  return out;
}
