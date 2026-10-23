import { memo, useMemo, useCallback } from "react";
import { StatusBadge } from "../badges/StatusBadge";
import type { ColDef, RowAction, TableRow, TableCellValue } from "../../pages/modulePageUtils";
import { isAttachmentArray } from "../attachments/attachmentTypes";

// Support both report columns and standard columns
type ReportCol =
  | { type: "simple"; key: string; label: string }
  | { type: "group"; label: string; children: { key: string; label: string }[] };

interface UnifiedMobileCardProps {
  row: TableRow;
  cols?: ColDef[];
  columns?: ReportCol[];
  onCardClick?: () => void;
  hasActions?: boolean;
  onView?: (row: TableRow, trigger: HTMLElement) => void;
  actions?: RowAction[];
  onActionClick?: (actionId: string) => void;
  mobileCardMapping?: {
    primary?: string;
    identifier?: string;
    meta?: string[];
    status?: string;
    date?: string;
    amount?: string;
  };
}

interface FieldData {
  key: string;
  label: string;
  value: TableCellValue;
}

const hasValue = (val: unknown): boolean => {
  if (val === null || val === undefined || val === "" || val === "—") return false;
  if (isAttachmentArray(val)) return false; // skip attachment arrays in mobile cards
  return true;
};

export const UnifiedMobileCard = memo(function UnifiedMobileCard({
  row,
  cols,
  columns,
  onCardClick,
  actions,
  onActionClick,
  mobileCardMapping,
}: UnifiedMobileCardProps) {
  const resolveLabel = (_label: string, _headerKey?: string): string => _label;

  const combinedFields = useMemo<FieldData[]>(() => {
    const allFields: FieldData[] = (cols ?? []).flatMap(col => {
      if (col.type === "col") {
        return [{ key: col.col.key, label: resolveLabel(col.col.label, col.col.headerKey), value: row[col.col.key] }];
      }
      return col.group.cols.map(c => ({ key: c.key, label: resolveLabel(c.label, c.headerKey), value: row[c.key] }));
    }).filter(f => hasValue(f.value));

    const reportFields: FieldData[] = (columns ?? []).flatMap(col => {
      if (col.type === "simple") {
        return [{ key: col.key, label: col.label, value: row[col.key] }];
      }
      return col.children.map(c => ({ key: c.key, label: c.label, value: row[c.key] }));
    }).filter(f => hasValue(f.value));

    return [...allFields, ...reportFields];
  }, [cols, columns, row, resolveLabel]);

  const findField = useCallback((
    patterns: string[],
    exclude: (FieldData | undefined)[] = []
  ): FieldData | undefined => {
    const excl = new Set(exclude.filter(Boolean).map(f => f!.key));
    return combinedFields.find(f =>
      !excl.has(f.key) &&
      patterns.some(p => f.key === p || f.key.includes(p))
    );
  }, [combinedFields]);

  const { nameField, identifierField, metaFields, statusField, dateField, amountField } =
    useMemo(() => {
      let nameField: FieldData | undefined;
      let identifierField: FieldData | undefined;
      let metaFields: FieldData[] = [];
      let statusField: FieldData | undefined;
      let dateField: FieldData | undefined;
      let amountField: FieldData | undefined;

      if (mobileCardMapping) {
        if (mobileCardMapping.primary)
          nameField = combinedFields.find(f => f.key === mobileCardMapping.primary);
        if (mobileCardMapping.identifier)
          identifierField = combinedFields.find(f => f.key === mobileCardMapping.identifier);
        if (Array.isArray(mobileCardMapping.meta) && mobileCardMapping.meta.length)
          metaFields = mobileCardMapping.meta
            .map(key => combinedFields.find(f => f.key === key))
            .filter(Boolean) as FieldData[];
        if (mobileCardMapping.status)
          statusField = combinedFields.find(f => f.key === mobileCardMapping.status);
        if (mobileCardMapping.date)
          dateField = combinedFields.find(f => f.key === mobileCardMapping.date);
        if (mobileCardMapping.amount)
          amountField = combinedFields.find(f => f.key === mobileCardMapping.amount);
      }

      if (!nameField) {
        nameField = findField([
          "meeting_title", "agenda_title", "resolution_title", "decision_title",
          "document_name", "action_title", "body_name", "workflow_name",
          "template_name", "notification_title", "name", "user_name",
          "full_name", "employee_name", "officer_name",
        ]);
      }
      if (!identifierField) {
        identifierField = findField([
          "meeting_id", "meeting_ref", "agenda_no", "resolution_no", "action_id",
          "document_no", "body_id", "decision_no", "matter_no", "user_id",
          "employee_id", "ref_no", "tracking_no", "register_no", "id",
        ], [nameField]);
      }
      if (metaFields.length === 0) {
        const yearField = findField(["meeting_year", "year", "period", "fiscal_year"], [nameField, identifierField]);
        const contextField = findField([
          "governance_body", "committee", "meeting_type", "department",
          "board_type", "agenda_type", "document_type", "resolution_type",
          "action_type", "role", "designation", "priority", "category",
        ], [nameField, identifierField, yearField]);
        const extraField = findField([
          "assigned_to", "responsible_party", "prepared_by", "submitted_by",
          "chairperson", "secretary", "venue", "location",
        ], [nameField, identifierField, yearField, contextField]);
        metaFields = [yearField, contextField, extraField].filter(Boolean) as FieldData[];
      }
      if (!statusField)
        statusField = combinedFields.find(f => f.key === "status" || f.key.endsWith("_status"));
      if (!dateField) {
        dateField = findField([
          "meeting_date", "due_date", "submission_date", "scheduled_date",
          "start_date", "end_date", "approval_date", "publication_date",
          "created_at", "updated_at", "deadline", "target_date",
          "completion_date", "archive_date", "last_updated", "date",
        ], [statusField, amountField]);
      }
      if (!amountField) {
        amountField = findField([
          "amount", "total_amount", "budget", "financial_impact",
          "estimated_cost", "approved_amount", "outstanding", "balance",
        ], [statusField, dateField]);
      }

      return { nameField, identifierField, metaFields, statusField, dateField, amountField };
    }, [combinedFields, mobileCardMapping, findField]);

  const metaRows = useMemo(() => {
    const seen = new Set<string>();
    return [identifierField, ...metaFields]
      .filter((f): f is FieldData => !!f && !seen.has(f.key) && (seen.add(f.key), true))
      .slice(0, 5);
  }, [identifierField, metaFields]);

  const primaryName = nameField ?? identifierField;
  const displayMeta = nameField ? metaRows : metaRows.filter(f => f !== identifierField);
  const footerRight = dateField ?? amountField;
  const hasFooter = !!(statusField || footerRight);

  const cardLabel = [primaryName?.value, identifierField?.value]
    .filter(Boolean).join(" — ") || undefined;

  const handleCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (onCardClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onCardClick();
    }
  }, [onCardClick]);

  return (
    <article
      role="listitem"
      className="mobile-table-card"
      aria-label={cardLabel}
      onClick={onCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={onCardClick ? 0 : undefined}
    >
      <div className="mobile-table-card__header">
        <div className="mobile-table-card__primary-info">
          {primaryName && (
            <p className="mobile-table-card__name">
              {String(primaryName.value)}
            </p>
          )}
          {displayMeta.length > 0 && (
            <dl className="mobile-table-card__meta">
              {displayMeta.map(f => (
                <div key={f.key} className="mobile-table-card__meta-item">
                  <dt className="mobile-table-card__meta-label">{f.label}:</dt>
                  <dd className="mobile-table-card__meta-value">{String(f.value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {hasFooter && (
        <>
          <div className="mobile-table-card__divider" aria-hidden="true" />
          <div className="mobile-table-card__footer">
            <div className="mobile-table-card__status">
              {statusField && <StatusBadge value={String(statusField.value)} />}
            </div>
            {footerRight && (
              <span className="mobile-table-card__date">
                <span className="sr-only">{footerRight.label}: </span>
                {String(footerRight.value)}
              </span>
            )}
          </div>
        </>
      )}

    </article>
  );
});
