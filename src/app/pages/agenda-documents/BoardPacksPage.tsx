import { Eye, Package, Upload, Download, Pencil, Archive } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS, dg } from "../modulePageUtils";
import { useBoardPackRegistry } from "../../data/boardMeetingData";
import { ROW_VIEW } from "../../data/modulePageConfigs";

const DRAWER_COLS = [
  dg("Pack Details", [
    { key: "pack_id",      label: "Pack ID" },
    { key: "pack_title",   label: "Title" },
    { key: "committee",    label: "Governance Body" },
    { key: "version",      label: "Version" },
    { key: "approval_status", label: "Status", badge: true },
  ]),
  dg("Meeting", [
    { key: "related_meeting", label: "Meeting ID" },
    { key: "meeting_title",   label: "Meeting Title" },
    { key: "meeting_date",    label: "Meeting Date" },
    { key: "publication_date", label: "Publication Date" },
  ]),
  dg("Content", [
    { key: "document_count",   label: "Documents" },
    { key: "review_completion", label: "Review Completion" },
    { key: "access_policy",    label: "Access Policy" },
    { key: "change_summary",   label: "Change Summary" },
  ]),
  dg("Authorship", [
    { key: "created_by", label: "Created By" },
    { key: "created_at", label: "Created At" },
  ]),
];

export function BoardPacksPage() {
  const reg = useBoardPackRegistry();
  const rows = reg.items;

  const kpis: KpiDef[] = [
    { label: "Total Packs",      value: String(rows.length),                                              tone: "primary"  },
    { label: "Published",        value: String(rows.filter(r => r.approval_status === "Published").length),   tone: "success"  },
    { label: "Pending Approval", value: String(rows.filter(r => r.approval_status === "Pending Approval").length), tone: "warning" },
    { label: "Draft",            value: String(rows.filter(r => r.approval_status === "Draft").length),       tone: "neutral"  },
  ];

  const cfg: PageCfg = {
    title:   "Board Packs",
    desc:    "Manage board packs — compile, review, approve and publish document bundles for governance meetings.",
    cols: [
      fc("pack_id",          "Pack ID"),
      fc("pack_title",       "Title"),
      fc("committee",        "Governance Body"),
      fc("version",          "Version"),
      fc("document_count",   "Documents"),
      fc("review_completion","Review"),
      fc("publication_date", "Published"),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: {
      primary:    "pack_title",
      identifier: "pack_id",
      meta:       ["committee", "version", "document_count"],
      status:     "approval_status",
      date:       "publication_date",
    },
    filters:    BASE_FILTERS,
    actions:    ROW_VIEW,
    drawerTitle: "Board Pack Details",
    drawerCols:  DRAWER_COLS,
    drawerActions: [
      { id: "edit",    label: "Edit Pack",      icon: Pencil,  color: "#3b82f6" },
      { id: "publish", label: "Publish",         icon: Upload,  color: "#22c55e" },
      { id: "download",label: "Download Pack",   icon: Download,color: "#6b7280" },
      { id: "archive", label: "Archive",         icon: Archive, color: "#ef4444" },
    ],
    rows,
    kpis,
    entryBtn: "Create Board Pack",
    searchPlaceholder: "Search board packs",
  };

  return <GenPage cfg={cfg} />;
}
