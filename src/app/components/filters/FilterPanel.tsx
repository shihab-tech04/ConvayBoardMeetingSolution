import type { FilterDef } from "../../pages/modulePageUtils";
import { AppTextField } from "../forms/AppTextField";
import { AppSelectField } from "../forms/AppSelectField";
import { AppDateField } from "../forms/AppDateField";
import { PrimaryButton } from "../buttons/PrimaryButton";
import { SecondaryButton } from "../buttons/SecondaryButton";

interface FilterPanelProps {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export function FilterPanel({ filters, values, onChange, onApply, onReset }: FilterPanelProps) {
  return (
    <div>
      <div role="group" aria-label="Filters" className="filter-grid">
        {filters.map(f => {
          const label = f.label;
          const id = `filter-${f.key}`;

          if (f.type === "select") {
            const opts = (f.options ?? []).map(o => ({ value: o, label: o }));
            return (
              <AppSelectField
                key={f.key}
                id={id}
                label={label}
                value={values[f.key] ?? ""}
                onChange={v => onChange(f.key, v)}
                options={opts}
                compact
              />
            );
          }

          if (f.type === "date") {
            return (
              <AppDateField
                key={f.key}
                id={id}
                label={label}
                value={values[f.key] ?? ""}
                onChange={v => onChange(f.key, v)}
                compact
              />
            );
          }

          return (
            <AppTextField
              key={f.key}
              id={id}
              label={label}
              value={values[f.key] ?? ""}
              onChange={v => onChange(f.key, v)}
              compact
            />
          );
        })}
      </div>
      <div className="filter-actions">
        <SecondaryButton size="sm" onClick={onReset} aria-label="Reset filters">
          Reset
        </SecondaryButton>
        <PrimaryButton size="sm" onClick={onApply} aria-label="Apply filters">
          Apply Filters
        </PrimaryButton>
      </div>
    </div>
  );
}
