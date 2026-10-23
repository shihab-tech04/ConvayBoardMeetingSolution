import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Autocomplete,
  Chip,
  TextField as MuiTextField,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
} from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { AppTextField } from "./AppTextField";
import { AppSelectField } from "./AppSelectField";
import { AppDateField } from "./AppDateField";
import { AppTextArea } from "./AppTextArea";
import { AppFileUpload } from "./AppFileUpload";
import { AppNumberField } from "./AppNumberField";
import { PrimaryButton } from "../buttons/PrimaryButton";
import { SecondaryButton } from "../buttons/SecondaryButton";

export type EntryFieldType =
  | "text" | "email" | "phone" | "number" | "date" | "time" | "datetime"
  | "textarea" | "select" | "multiselect" | "searchable-select"
  | "radio" | "checkbox" | "toggle" | "file"
  | "readonly" | "repeatable-group" | "conditional-group";

export type EntryFormValue = string | string[] | boolean | File[];

export interface FormField {
  key?: string;
  label: string;
  type: EntryFieldType;
  options?: Array<string | { value: string; label: string }>;
  span?: boolean;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  defaultValue?: string | string[] | boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string[];
  multiple?: boolean;
  rows?: number;
  disabled?: boolean;
  readOnly?: boolean;
  condition?: { field: string; value: string | string[] | boolean };
  subFields?: FormField[];
  minRows?: number;
  maxRows?: number;
  /** Step index this field belongs to (0-based). Used with formSteps. */
  step?: number;
  /** For repeatable-group: singular label for each item card (e.g. "Participant", "Agenda Item"). */
  itemLabel?: string;
  /** For radio: "segmented" renders compact icon+label buttons instead of radio circles. */
  variant?: "segmented";
  /** For segmented radio: icon component for each option (same order as options). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionIcons?: React.ElementType<any>[];
}

/** Section definition for the opt-in meeting-wizard section layout. */
export interface SectionDef {
  id: string;
  step: number;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ElementType<any>;
  description?: string;
  /** Keys of FormField entries that belong to this section. */
  fieldKeys: string[];
  /** Optional content rendered after the mode selector field and before the remaining fields. */
  extraContent?: (
    values: Record<string, EntryFormValue>,
    onChange: (patch: Record<string, EntryFormValue>) => void
  ) => React.ReactNode;
}

export interface EntryFormProps {
  fields: FormField[];
  onClose: () => void;
  onSubmit?: (values: Record<string, EntryFormValue>) => void;
  submitLabel?: string;
  initialValues?: Record<string, EntryFormValue>;
  onSaveDraft?: (values: Record<string, EntryFormValue>) => void;
  externalErrors?: Record<string, string>;
  hideFooter?: boolean;
  isLoading?: boolean;
  /** If set, only render fields whose step === visibleStep (or step is undefined) */
  visibleStep?: number;
  onNext?: (values: Record<string, EntryFormValue>) => void;
  onBack?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  /**
   * When provided, the <form> element receives this id and the internal footer
   * is suppressed. Place submit buttons with form={formId} in the parent
   * AppModal footer slot instead.
   */
  formId?: string;
  /** When provided, groups visible fields into section cards (opt-in meeting wizard layout). */
  sections?: SectionDef[];
  /** When set, renders custom content at the top of the current step (e.g. a review summary panel).
   *  Receives current allValues and a stable setter so the renderer can push values back into the form. */
  customStepRenderer?: (
    values: Record<string, EntryFormValue>,
    onValuesChange: (patch: Record<string, EntryFormValue>) => void,
  ) => React.ReactNode;
  /** Called on every allValues change so parent can read latest form state without a ref. */
  onValuesSync?: (values: Record<string, EntryFormValue>) => void;
}

function fieldId(f: FormField, i: number): string {
  return f.key ?? `entry-field-${i}`;
}

function optionValue(o: string | { value: string; label: string }): string {
  return typeof o === "string" ? o : o.value;
}

function optionLabel(o: string | { value: string; label: string }): string {
  return typeof o === "string" ? o : o.label;
}

function initStrValues(
  fields: FormField[],
  initial?: Record<string, EntryFormValue>
): Record<string, string> {
  const out: Record<string, string> = {};
  fields.forEach((f, i) => {
    const id = fieldId(f, i);
    if (f.type === "file" || f.type === "multiselect" || f.type === "toggle" || f.type === "checkbox" || f.type === "repeatable-group" || f.type === "conditional-group") return;
    const existing = initial?.[id] ?? initial?.[f.key ?? ""];
    out[id] = (existing as string | undefined) ?? (f.defaultValue as string | undefined) ?? "";
    if (f.subFields) {
      Object.assign(out, initStrValues(f.subFields, initial));
    }
  });
  return out;
}

function initBoolValues(
  fields: FormField[],
  initial?: Record<string, EntryFormValue>
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  fields.forEach((f, i) => {
    if (f.type !== "toggle" && f.type !== "checkbox") return;
    const id = fieldId(f, i);
    const existing = initial?.[id] ?? initial?.[f.key ?? ""];
    out[id] = (existing as boolean | undefined) ?? (f.defaultValue as boolean | undefined) ?? false;
  });
  return out;
}

function initMultiValues(
  fields: FormField[],
  initial?: Record<string, EntryFormValue>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  fields.forEach((f, i) => {
    if (f.type !== "multiselect") return;
    const id = fieldId(f, i);
    const existing = initial?.[id] ?? initial?.[f.key ?? ""];
    out[id] = (existing as string[] | undefined) ?? (f.defaultValue as string[] | undefined) ?? [];
  });
  return out;
}

export function EntryForm({
  fields,
  onClose,
  onSubmit,
  submitLabel,
  initialValues,
  onSaveDraft,
  externalErrors,
  hideFooter,
  isLoading,
  visibleStep,
  onNext,
  onBack,
  isFirstStep,
  isLastStep,
  formId,
  sections,
  customStepRenderer,
  onValuesSync,
}: EntryFormProps) {

  const [strValues, setStrValues] = useState<Record<string, string>>(() =>
    initStrValues(fields, initialValues)
  );
  const [boolValues, setBoolValues] = useState<Record<string, boolean>>(() =>
    initBoolValues(fields, initialValues)
  );
  const [multiValues, setMultiValues] = useState<Record<string, string[]>>(() =>
    initMultiValues(fields, initialValues)
  );
  const [filesByField, setFilesByField] = useState<Record<string, File[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [repeatRows, setRepeatRows] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    fields.forEach((f, i) => {
      if (f.type === "repeatable-group") out[fieldId(f, i)] = f.minRows ?? 1;
    });
    return out;
  });

  // Stable setter for external components (e.g. custom step renderers) to push values into the form.
  const handleExternalChange = useCallback((patch: Record<string, EntryFormValue>) => {
    const strPatch: Record<string, string>    = {};
    const boolPatch: Record<string, boolean>  = {};
    const multiPatch: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (typeof v === "boolean") boolPatch[k] = v;
      else if (Array.isArray(v) && (v.length === 0 || typeof v[0] === "string")) multiPatch[k] = v as string[];
      else if (v !== undefined && v !== null) strPatch[k] = String(v);
    }
    if (Object.keys(strPatch).length  > 0) setStrValues  (p => ({ ...p, ...strPatch  }));
    if (Object.keys(boolPatch).length > 0) setBoolValues  (p => ({ ...p, ...boolPatch  }));
    if (Object.keys(multiPatch).length> 0) setMultiValues (p => ({ ...p, ...multiPatch }));
  }, []);

  const setStr = useCallback((id: string, v: string) => {
    setStrValues(p => ({ ...p, [id]: v }));
    setErrors(p => { const n = { ...p }; delete n[id]; return n; });
  }, []);

  const setBool = useCallback((id: string, v: boolean) =>
    setBoolValues(p => ({ ...p, [id]: v })), []);

  const setMulti = useCallback((id: string, v: string[]) =>
    setMultiValues(p => ({ ...p, [id]: v })), []);

  const allValues = useMemo((): Record<string, EntryFormValue> => {
    const out: Record<string, EntryFormValue> = { ...strValues };
    Object.assign(out, boolValues);
    Object.assign(out, multiValues);
    Object.keys(filesByField).forEach(k => { out[k] = filesByField[k]; });
    return out;
  }, [strValues, boolValues, multiValues, filesByField]);

  // Sync latest allValues to parent so it can read current form state for Save Draft
  const onValuesSyncRef = useRef(onValuesSync);
  onValuesSyncRef.current = onValuesSync;
  useEffect(() => {
    onValuesSyncRef.current?.(allValues);
  }, [allValues]);

  const conditionMet = useCallback((f: FormField): boolean => {
    if (!f.condition) return true;
    const srcVal = allValues[f.condition.field];
    const cond = f.condition.value;
    if (Array.isArray(cond)) return cond.includes(srcVal as string);
    return srcVal === cond;
  }, [allValues]);

  const visibleFields = useMemo(() =>
    fields.filter(f => {
      if (!conditionMet(f)) return false;
      if (visibleStep !== undefined && f.step !== undefined && f.step !== visibleStep) return false;
      return true;
    }), [fields, conditionMet, visibleStep]);

  const validate = useCallback((fieldsToValidate: FormField[]): boolean => {
    const errs: Record<string, string> = { ...(externalErrors ?? {}) };
    fieldsToValidate.forEach((f, i) => {
      if (!conditionMet(f)) return;
      const id = fieldId(f, i);
      if (!f.required) return;
      const req = "This field is required";
      if (f.type === "file") {
        if (!filesByField[id]?.length) errs[id] = req;
      } else if (f.type === "multiselect") {
        if (!multiValues[id]?.length) errs[id] = req;
      } else if (f.type === "toggle" || f.type === "checkbox") {
        // booleans are always set
      } else if (f.type === "repeatable-group") {
        // validate sub-rows individually
      } else {
        if (!strValues[id]?.trim()) errs[id] = req;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [conditionMet, filesByField, multiValues, strValues, externalErrors]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(visibleFields)) return;
    if (isLastStep === false && onNext) {
      onNext(allValues);
      return;
    }
    onSubmit?.(allValues);
    onClose();
  };

  const handleSaveDraft = () => {
    onSaveDraft?.(allValues);
  };

  const renderField = (f: FormField, i: number) => {
    const id = fieldId(f, i);
    const cls = f.span ? "entry-form__field entry-form__field--span" : "entry-form__field";
    const err = errors[id] ?? "";

    switch (f.type) {
      case "select":
        return (
          <div key={id} className={cls}>
            <AppSelectField
              id={id}
              label={f.label}
              value={strValues[id] ?? ""}
              onChange={v => setStr(id, v)}
              options={f.options ?? []}
              required={f.required}
              helper={f.helper}
              emptyMessage={(f as { emptyMessage?: string }).emptyMessage}
              error={err}
              disabled={f.disabled}
            />
          </div>
        );

      case "searchable-select": {
        const ssOpts = (f.options ?? []).map(o =>
          typeof o === "string" ? { value: o, label: o } : o
        );
        const ssValue = ssOpts.find(o => o.value === strValues[id]) ?? null;
        return (
          <div key={id} className={cls}>
            <Autocomplete
              options={ssOpts}
              value={ssValue}
              onChange={(_, v) => setStr(id, v?.value ?? "")}
              getOptionLabel={o => o.label}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              renderInput={(params) => (
                <MuiTextField
                  {...params}
                  label={f.label}
                  placeholder={f.placeholder}
                  required={f.required}
                  error={!!err}
                  helperText={err || f.helper}
                  size="small"
                />
              )}
            />
          </div>
        );
      }

      case "multiselect": {
        const msOpts = (f.options ?? []).map(o =>
          typeof o === "string" ? { value: o, label: o } : o
        );
        const msValues = (multiValues[id] ?? []).map(
          v => msOpts.find(o => o.value === v) ?? { value: v, label: v }
        );
        return (
          <div key={id} className={cls}>
            <Autocomplete
              multiple
              options={msOpts}
              value={msValues}
              onChange={(_, v) => setMulti(id, v.map(o => o.value))}
              getOptionLabel={o => o.label}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    label={option.label}
                    size="small"
                    key={option.value}
                  />
                ))
              }
              renderInput={(params) => (
                <MuiTextField
                  {...params}
                  label={f.label}
                  placeholder={msValues.length ? undefined : f.placeholder}
                  required={f.required}
                  error={!!err}
                  helperText={err || f.helper}
                  size="small"
                />
              )}
            />
          </div>
        );
      }

      case "radio":
        if (f.variant === "segmented") {
          return (
            <div key={id} className={cls}>
              <div className="seg-radio__group">
                <span className="seg-radio__label">
                  {f.label}{f.required && <span className="seg-radio__req" aria-hidden="true"> *</span>}
                </span>
                <div className="seg-radio" role="radiogroup" aria-label={f.label} aria-required={f.required}>
                  {(f.options ?? []).map((o, oi) => {
                    const val = optionValue(o);
                    const lbl = optionLabel(o);
                    const Icon = f.optionIcons?.[oi];
                    const isActive = (strValues[id] ?? f.defaultValue) === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        className={`seg-radio__btn${isActive ? " seg-radio__btn--active" : ""}`}
                        onClick={() => setStr(id, val)}
                      >
                        {Icon && <Icon size={14} strokeWidth={2} aria-hidden="true" />}
                        {lbl}
                      </button>
                    );
                  })}
                </div>
                {(err || f.helper) && <div className="seg-radio__helper">{err || f.helper}</div>}
              </div>
            </div>
          );
        }
        return (
          <div key={id} className={cls}>
            <FormControl error={!!err} required={f.required}>
              <FormLabel sx={{ fontSize: 12, mb: 0.5 }}>{f.label}</FormLabel>
              <RadioGroup
                row
                value={strValues[id] ?? ""}
                onChange={e => setStr(id, e.target.value)}
              >
                {(f.options ?? []).map(o => (
                  <FormControlLabel
                    key={optionValue(o)}
                    value={optionValue(o)}
                    label={optionLabel(o)}
                    control={<Radio size="small" />}
                    sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }}
                  />
                ))}
              </RadioGroup>
              {(err || f.helper) && <FormHelperText>{err || f.helper}</FormHelperText>}
            </FormControl>
          </div>
        );

      case "checkbox":
        return (
          <div key={id} className={cls}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={boolValues[id] ?? false}
                  onChange={e => setBool(id, e.target.checked)}
                />
              }
              label={f.label}
              sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }}
            />
            {f.helper && <FormHelperText>{f.helper}</FormHelperText>}
          </div>
        );

      case "toggle":
        return (
          <div key={id} className={cls}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={boolValues[id] ?? false}
                  onChange={e => setBool(id, e.target.checked)}
                />
              }
              label={f.label}
              sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }}
            />
            {f.helper && <FormHelperText>{f.helper}</FormHelperText>}
          </div>
        );

      case "textarea":
        return (
          <div key={id} className={cls}>
            <AppTextArea
              id={id}
              label={f.label}
              value={strValues[id] ?? ""}
              onChange={v => setStr(id, v)}
              placeholder={f.placeholder}
              required={f.required}
              helper={f.helper}
              error={err}
              rows={f.rows ?? 4}
            />
          </div>
        );

      case "date":
        return (
          <div key={id} className={cls}>
            <AppDateField
              id={id}
              label={f.label}
              value={strValues[id] ?? ""}
              onChange={v => setStr(id, v)}
              required={f.required}
              helper={f.helper}
              error={err}
            />
          </div>
        );

      case "time":
        return (
          <div key={id} className={cls}>
            <MuiTextField
              id={id}
              type="time"
              label={f.label}
              value={strValues[id] ?? ""}
              onChange={e => setStr(id, e.target.value)}
              required={f.required}
              error={!!err}
              helperText={err || f.helper}
              placeholder={f.placeholder}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
              fullWidth
            />
          </div>
        );

      case "datetime":
        return (
          <div key={id} className={cls}>
            <MuiTextField
              id={id}
              type="datetime-local"
              label={f.label}
              value={strValues[id] ?? ""}
              onChange={e => setStr(id, e.target.value)}
              required={f.required}
              error={!!err}
              helperText={err || f.helper}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
              fullWidth
            />
          </div>
        );

      case "number":
        return (
          <div key={id} className={cls}>
            <AppNumberField
              id={id}
              label={f.label}
              value={strValues[id] ?? ""}
              onChange={v => setStr(id, v)}
              placeholder={f.placeholder}
              required={f.required}
              helper={f.helper}
              error={err}
            />
          </div>
        );

      case "email":
        return (
          <div key={id} className={cls}>
            <MuiTextField
              id={id}
              type="email"
              label={f.label}
              value={strValues[id] ?? ""}
              onChange={e => setStr(id, e.target.value)}
              placeholder={f.placeholder}
              required={f.required}
              helperText={err || f.helper}
              error={!!err}
              size="small"
              fullWidth
              variant="outlined"
            />
          </div>
        );

      case "phone":
        return (
          <div key={id} className={cls}>
            <MuiTextField
              id={id}
              type="tel"
              label={f.label}
              value={strValues[id] ?? ""}
              onChange={e => setStr(id, e.target.value)}
              placeholder={f.placeholder ?? "+880..."}
              required={f.required}
              helperText={err || f.helper}
              error={!!err}
              size="small"
              fullWidth
              variant="outlined"
            />
          </div>
        );

      case "readonly":
        return (
          <div key={id} className={cls}>
            <div className="entry-form__readonly">
              <span className="entry-form__readonly-label">{f.label}</span>
              <span className="entry-form__readonly-value">{strValues[id] || f.placeholder || "—"}</span>
            </div>
          </div>
        );

      case "file":
        return (
          <div key={id} className={cls}>
            <AppFileUpload
              id={id}
              label={f.label}
              value={filesByField[id] ?? []}
              onChange={files => {
                setFilesByField(prev => ({ ...prev, [id]: files }));
                setErrors(p => { const n = { ...p }; delete n[id]; return n; });
              }}
              required={f.required}
              helper={errors[id] ?? f.helper}
              maxFiles={f.maxFiles ?? 5}
              maxSizeMB={f.maxSizeMB ?? 2}
              accept={f.accept}
            />
          </div>
        );

      case "repeatable-group": {
        const count = repeatRows[id] ?? (f.minRows ?? 1);
        const max = f.maxRows ?? 10;
        const min = f.minRows ?? 1;
        const itemLbl = f.itemLabel ?? "Row";
        return (
          <div key={id} className="entry-form__field entry-form__field--span">
            {count === 0 && (
              <p className="repeat-card__empty">No {itemLbl.toLowerCase()} details added yet.</p>
            )}
            {Array.from({ length: count }).map((_, ri) => (
              <div key={ri} className="repeat-card">
                <div className="repeat-card__header">
                  <span className="repeat-card__title">{itemLbl} {ri + 1}</span>
                  {count > min && (
                    <button
                      type="button"
                      className="repeat-card__remove"
                      onClick={() => setRepeatRows(p => ({ ...p, [id]: Math.max(min, (p[id] ?? 1) - 1) }))}
                      aria-label={`Remove ${itemLbl} ${ri + 1}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div className="repeat-card__body">
                  <div className="entry-form__grid entry-form__repeat-grid">
                    {(f.subFields ?? []).map((sf, si) => {
                      const sid = `${id}__${ri}__${sf.key ?? si}`;
                      return renderSubField(sf, sid);
                    })}
                  </div>
                </div>
              </div>
            ))}
            {count < max && (
              <button
                type="button"
                className="repeat-card__add"
                onClick={() => setRepeatRows(p => ({ ...p, [id]: Math.min(max, (p[id] ?? 1) + 1) }))}
              >
                <Plus size={13} /> Add {itemLbl}
              </button>
            )}
          </div>
        );
      }

      case "conditional-group":
        if (!conditionMet(f)) return null;
        return (
          <div key={id} className="entry-form__field entry-form__field--span entry-form__conditional-group">
            <div className="entry-form__grid">
              {(f.subFields ?? []).map((sf, si) => renderSubField(sf, `${id}__${si}`))}
            </div>
          </div>
        );

      default:
        return (
          <div key={id} className={cls}>
            <AppTextField
              id={id}
              label={f.label}
              value={strValues[id] ?? ""}
              onChange={v => setStr(id, v)}
              placeholder={f.placeholder}
              required={f.required}
              helper={f.helper}
              error={err}
            />
          </div>
        );
    }
  };

  const renderSubField = (sf: FormField, sid: string) => {
    const cls = sf.span ? "entry-form__field entry-form__field--span" : "entry-form__field";
    const err = errors[sid] ?? "";
    return (
      <div key={sid} className={cls}>
        {sf.type === "select" ? (
          <AppSelectField
            id={sid}
            label={sf.label}
            value={strValues[sid] ?? ""}
            onChange={v => setStr(sid, v)}
            options={sf.options ?? []}
            required={sf.required}
            error={err}
          />
        ) : sf.type === "number" ? (
          <AppNumberField
            id={sid}
            label={sf.label}
            value={strValues[sid] ?? ""}
            onChange={v => setStr(sid, v)}
            placeholder={sf.placeholder}
            required={sf.required}
            error={err}
          />
        ) : sf.type === "date" ? (
          <AppDateField
            id={sid}
            label={sf.label}
            value={strValues[sid] ?? ""}
            onChange={v => setStr(sid, v)}
            required={sf.required}
            error={err}
          />
        ) : sf.type === "toggle" ? (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={boolValues[sid] ?? false}
                onChange={e => setBool(sid, e.target.checked)}
              />
            }
            label={sf.label}
            sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }}
          />
        ) : (
          <AppTextField
            id={sid}
            label={sf.label}
            value={strValues[sid] ?? ""}
            onChange={v => setStr(sid, v)}
            placeholder={sf.placeholder}
            required={sf.required}
            error={err}
          />
        )}
      </div>
    );
  };

  if (hideFooter || formId) {
    const stepSections = (sections ?? []).filter(s => s.step === (visibleStep ?? -1));
    const useSections = stepSections.length > 0;

    if (useSections) {
      const claimedKeys = new Set(stepSections.flatMap(s => s.fieldKeys));
      return (
        <form id={formId} noValidate onSubmit={handleSubmit}>
          <div className="wiz-form-body">
            {customStepRenderer && customStepRenderer(allValues, handleExternalChange)}
            {stepSections.map(sec => {
              const SectionIcon = sec.icon;
              const sectionFields = sec.fieldKeys
                .map(key => visibleFields.find(f => f.key === key))
                .filter((f): f is FormField => f !== undefined);
              if (sectionFields.length === 0 && !sec.extraContent) return null;
              // Split fields: "mode" (first selector) renders first, extra content after it, rest after that
              const modeIdx = sectionFields.findIndex(f => f.key === "mode");
              const beforeExtra = modeIdx >= 0 ? sectionFields.slice(0, modeIdx + 1) : sectionFields;
              const afterExtra  = modeIdx >= 0 ? sectionFields.slice(modeIdx + 1) : [];
              return (
                <div key={sec.id} className="wiz-section">
                  <div className="wiz-section__header">
                    <span className="wiz-section__icon" aria-hidden="true">
                      <SectionIcon size={14} strokeWidth={2} />
                    </span>
                    <div>
                      <div className="wiz-section__title">{sec.title}</div>
                      {sec.description && <div className="wiz-section__desc">{sec.description}</div>}
                    </div>
                  </div>
                  <div className="wiz-section__body">
                    {beforeExtra.length > 0 && (
                      <div className="entry-form__grid">
                        {beforeExtra.map(f => renderField(f, fields.indexOf(f)))}
                      </div>
                    )}
                    {sec.extraContent?.(allValues, handleExternalChange)}
                    {afterExtra.length > 0 && (
                      <div className="entry-form__grid" style={{ marginTop: "1rem" }}>
                        {afterExtra.map(f => renderField(f, fields.indexOf(f)))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(() => {
              const unclaimed = visibleFields.filter(f => f.key && !claimedKeys.has(f.key));
              return unclaimed.length > 0 ? (
                <div className="entry-form__grid">
                  {unclaimed.map(f => renderField(f, fields.indexOf(f)))}
                </div>
              ) : null;
            })()}
          </div>
        </form>
      );
    }

    return (
      <form id={formId} noValidate onSubmit={handleSubmit}>
        {customStepRenderer && (
          <div className="wiz-form-body">{customStepRenderer(allValues, handleExternalChange)}</div>
        )}
        <div className="entry-form__grid">
          {visibleFields.map((f, i) => renderField(f, i))}
        </div>
      </form>
    );
  }

  const isMultiStep = visibleStep !== undefined;
  const showBack = isMultiStep && !isFirstStep;
  const showNext = isMultiStep && !isLastStep;
  const showSubmit = !isMultiStep || isLastStep;

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="entry-form__grid">
        {visibleFields.map((f, i) => renderField(f, i))}
      </div>
      <div className="entry-form__footer">
        <SecondaryButton type="button" onClick={onClose}>
          Cancel
        </SecondaryButton>
        {showBack && (
          <SecondaryButton type="button" onClick={onBack}>
            Back
          </SecondaryButton>
        )}
        {onSaveDraft && (
          <SecondaryButton type="button" onClick={handleSaveDraft}>
            Save Draft
          </SecondaryButton>
        )}
        {showNext && (
          <PrimaryButton type="submit" disabled={isLoading}>
            Next
          </PrimaryButton>
        )}
        {showSubmit && (
          <PrimaryButton type="submit" disabled={isLoading}>
            {submitLabel ?? "Submit"}
          </PrimaryButton>
        )}
      </div>
    </form>
  );
}
