import { TextField, MenuItem } from "@mui/material";
import { muiFieldSx, muiFilterSx } from "./muiFieldSx";

interface SelectOption {
  value: string;
  label: string;
}

interface AppSelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<SelectOption | string>;
  helper?: string;
  /** Message shown (instead of helper) when options is empty. Defaults to "No options available". */
  emptyMessage?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** compact=true → size="small" (filters, topbar). Default → MUI normal size (forms). */
  compact?: boolean;
}

export function AppSelectField({
  id, label, value, onChange, options, helper, emptyMessage, error,
  required, disabled, compact,
}: AppSelectFieldProps) {
  const normalized: SelectOption[] = options.map(o =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  const isEmpty = normalized.length === 0;
  const effectiveDisabled = disabled || isEmpty;
  const helperText = isEmpty
    ? (emptyMessage ?? helper ?? "No options available")
    : (error || helper);

  return (
    <TextField
      id={id}
      select
      label={label || undefined}
      value={isEmpty ? "" : value}
      onChange={(e) => onChange(e.target.value)}
      helperText={helperText}
      error={!!error && !isEmpty}
      required={required}
      disabled={effectiveDisabled}
      variant="outlined"
      size={compact ? "small" : undefined}
      fullWidth
      inputProps={{
        "aria-required": required ? "true" : undefined,
        "aria-describedby": helperText ? `${id}-helper` : undefined,
        "aria-invalid": (!!error && !isEmpty) || undefined,
        "aria-label": !label ? id : undefined,
      }}
      FormHelperTextProps={{ id: `${id}-helper` }}
      sx={compact ? muiFilterSx : muiFieldSx}
    >
      {normalized.map(o => (
        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
      ))}
    </TextField>
  );
}
