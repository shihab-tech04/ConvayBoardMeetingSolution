import { GenPage } from "../../../components/pages/GeneratedTablePage";
import type { PageCfg, TableRow } from "../../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../../data/modulePageConfigs";
import { buildPageKpis } from "../../../utils/buildPageKpis";
import {
  NOTIFICATION_RULE_FORM_FIELDS, TEMPLATE_FORM_FIELDS,
  WORKFLOW_FORM_FIELDS, INTEGRATION_FORM_FIELDS,
} from "../../boardMeetingFormFields";
import {
  useNotificationRuleRegistry, useMeetingTemplateRegistry,
  useDeliveryRecordRegistry, useWorkflowRegistry, generateId,
} from "../../../data/boardMeetingData";

export function LitigationCasePage({ caseType }: { caseType?: string }) {
  const notifReg    = useNotificationRuleRegistry();
  const templateReg = useMeetingTemplateRegistry();
  const deliveryReg = useDeliveryRecordRegistry();
  const workflowReg = useWorkflowRegistry();

  const third = caseType && ["arrear-approval","writ-case-approval","dept-case-approval","taxpayer-case-approval"].includes(caseType)
    ? caseType : "arrear-approval";

  const labelMap: Record<string, string> = {
    "arrear-approval":       "Notification Rules",
    "writ-case-approval":    "Message Templates",
    "dept-case-approval":    "Delivery Logs",
    "taxpayer-case-approval":"Workflows",
  };

  const titleKeyMap: Record<string, string> = {
    "arrear-approval":       "litigationArrearApproval",
    "writ-case-approval":    "litigationWritApproval",
    "dept-case-approval":    "litigationDeptApproval",
    "taxpayer-case-approval":"litigationTaxpayerApproval",
  };

  // Map registry items to a unified row shape per caseType
  function buildRows(): TableRow[] {
    if (third === "arrear-approval") {
      return notifReg.items.map(r => ({
        ...r, id: r.id,
        meeting_title:    r.rule_name,
        committee:        r.entity_type,
        action_no:        r.rule_id,
        action_date:      r.created_at.slice(0, 10),
        assigned_to:      r.recipients,
        financial_impact: r.timing,
        action_status:    r.status,
      }));
    }
    if (third === "writ-case-approval") {
      return templateReg.items.map(t => ({
        ...t, id: t.id,
        meeting_title:    t.template_name,
        committee:        t.committee,
        action_no:        t.template_id,
        action_date:      t.created_at.slice(0, 10),
        assigned_to:      t.meeting_type,
        financial_impact: t.default_duration,
        action_status:    t.status,
      }));
    }
    if (third === "dept-case-approval") {
      return deliveryReg.items.map(d => ({
        ...d, id: d.id,
        meeting_title:    d.rule_name,
        committee:        d.entity_type,
        action_no:        d.record_id,
        action_date:      d.sent_at.slice(0, 10),
        assigned_to:      d.recipient,
        financial_impact: d.channel,
        action_status:    d.delivery_status,
      }));
    }
    // taxpayer-case-approval → Workflows
    return workflowReg.items.map(w => ({
      ...w, id: w.id,
      meeting_title:    w.workflow_name,
      committee:        w.entity_type,
      action_no:        w.workflow_id,
      action_date:      w.created_at.slice(0, 10),
      assigned_to:      w.trigger_event,
      financial_impact: w.steps,
      action_status:    w.status,
    }));
  }

  const rows = buildRows();

  const kpis = buildPageKpis(rows, {
    totalLabel: "Total Items",
    statusField: "action_status",
    statuses: [
      { value: "Active",    label: "Active",    tone: "success" },
      { value: "In Progress",label: "In Progress",tone: "primary" },
      { value: "Pending",   label: "Pending",   tone: "warning" },
      { value: "Delivered", label: "Delivered", tone: "success" },
      { value: "Failed",    label: "Failed",    tone: "error" },
    ],
  });

  const formFieldsMap: Record<string, PageCfg["formFields"]> = {
    "arrear-approval":       NOTIFICATION_RULE_FORM_FIELDS,
    "writ-case-approval":    TEMPLATE_FORM_FIELDS,
    "dept-case-approval":    undefined,
    "taxpayer-case-approval":WORKFLOW_FORM_FIELDS,
  };

  const entryBtnMap: Record<string, string | undefined> = {
    "arrear-approval":       "Add Notification Rule",
    "writ-case-approval":    "Add Message Template",
    "dept-case-approval":    undefined,
    "taxpayer-case-approval":"Add Workflow",
  };

  const cfg: PageCfg = {
    title:    labelMap[third],
    titleKey: `${titleKeyMap[third]}.title`,
    desc:     `Manage ${labelMap[third].toLowerCase()} and track their configuration.`,
    descKey:  `${titleKeyMap[third]}.desc`,
    cols: [
      fc("meeting_title",    "Name",          { headerKey: "headers.meetingTitle" }),
      fc("committee",        "Entity / Type", { headerKey: "headers.committee" }),
      fc("action_no",        "Reference No.", { headerKey: "headers.caseNo" }),
      fc("action_date",      "Date",          { headerKey: "headers.caseDate" }),
      fc("assigned_to",      "Recipients",    { headerKey: "headers.court" }),
      fc("financial_impact", "Details",       { headerKey: "headers.amount" }),
      BADGE("action_status", "Status"),
    ],
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    rows,
    kpis,
    entryBtn:  entryBtnMap[third],
    formFields:formFieldsMap[third],
    onRowCreate: third === "arrear-approval" ? (values) => {
      const rId = generateId("NR", notifReg.items.map(r => r.rule_id));
      notifReg.add({
        id: rId, rule_id: rId,
        rule_name:     String(values.rule_name    ?? values.meeting_title ?? ""),
        entity_type:   String(values.entity_type  ?? values.committee ?? ""),
        trigger_event: String(values.trigger_event ?? ""),
        channels:      String(values.channels      ?? "Email"),
        recipients:    String(values.recipients    ?? values.assigned_to ?? ""),
        timing:        String(values.timing        ?? "Immediately"),
        template:      String(values.template      ?? ""),
        status:        "Active",
        created_at:    new Date().toISOString(),
      } as never);
    } : third === "taxpayer-case-approval" ? (values) => {
      const wId = generateId("WF", workflowReg.items.map(w => w.workflow_id));
      workflowReg.add({
        id: wId, workflow_id: wId,
        workflow_name: String(values.workflow_name ?? values.meeting_title ?? ""),
        entity_type:   String(values.entity_type   ?? values.committee ?? ""),
        steps:         String(values.steps         ?? "Draft → Approved"),
        trigger_event: String(values.trigger_event ?? ""),
        status:        "Active",
        created_at:    new Date().toISOString(),
      } as never);
    } : undefined,
  };
  return <GenPage cfg={cfg} />;
}
