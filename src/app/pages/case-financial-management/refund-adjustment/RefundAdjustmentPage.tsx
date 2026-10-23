import { GenPage } from "../../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef } from "../../modulePageUtils";
import {
  refundRows,
  fc,
  BADGE,
  BASE_FILTERS,
} from "../../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../../data/modulePageConfigs";
import { STATUS_CONFIG_FORM_FIELDS } from "../../boardMeetingFormFields";

export function RefundAdjustmentPage() {
  const kpis: KpiDef[] = [
    { label: "Total Configurations", value: String(refundRows.length), tone: "primary" },
    { label: "Active Statuses", value: String(refundRows.filter(r => r.adjustment_status === "Approved").length), tone: "success" },
    { label: "Numbering Formats", value: String(refundRows.filter(r => r.adjustment_type === "Numbering").length || 4), tone: "neutral" },
    { label: "Recently Updated", value: String(refundRows.filter(r => r.adjustment_status === "Pending").length), tone: "warning" },
  ];

  const cfg: PageCfg = {
    title: "Statuses & Numbering",
    titleKey: "statusesNumbering.title",
    desc: "Configure meeting and document statuses, numbering sequences, and format patterns.",
    descKey: "statusesNumbering.desc",
    cols: [
      fc("adjustment_no", "Config Name", { headerKey: "headers.configName" }),
      fc("adjustment_type", "Config Type", { headerKey: "headers.configType" }),
      fc("name", "Applied To", { headerKey: "headers.appliedTo" }),
      fc("adjustment_amount", "Format / Prefix", { headerKey: "headers.formatPrefix" }),
      fc("request_date", "Last Updated", { headerKey: "headers.lastUpdated" }),
      BADGE("adjustment_status", "Status"),
    ],
    mobileCardMapping: { primary: "adjustment_no", meta: ["adjustment_type", "name"], status: "adjustment_status", date: "request_date" },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    rows: refundRows,
    kpis,
    entryBtn: "Add Configuration",
    formFields: STATUS_CONFIG_FORM_FIELDS,
  };

  return <GenPage cfg={cfg} />;
}
