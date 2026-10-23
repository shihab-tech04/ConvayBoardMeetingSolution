import type { FormField } from "../components/forms/EntryForm";

type OptionEntry = string | { value: string; label: string };

/**
 * Patch static form field arrays with live registry-derived options.
 * An explicit override (even an empty array) replaces the static options so
 * the field can render its disabled/empty state.  Omitting the key entirely
 * leaves the original field untouched.
 * Does not mutate the original fields array.
 */
export function patchFormOptions(
  fields: FormField[],
  overrides: Partial<Record<string, OptionEntry[]>>,
): FormField[] {
  return fields.map(f => {
    if (f.key === undefined || !(f.key in overrides)) return f;
    return { ...f, options: overrides[f.key] };
  });
}
