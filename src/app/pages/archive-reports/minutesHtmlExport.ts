import type { Minutes } from "../../data/boardMeetingData";

/**
 * MN-16: a local, Unicode-safe export of an already authorized SQL readback.
 * No network, provider signature or synthetic approval is created here.
 * The caller must recheck arc_view and refresh the server registry first.
 */
type MinutesExportRecord = Minutes & {
  approved_by?: string;
  approved_at?: string;
  signed_by?: string;
  signed_at?: string;
  archived_by?: string;
  archived_at?: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}
function safeName(value: string): string {
  const cleaned = value.replace(/[^\p{L}\p{N}_.-]+/gu, "-").replace(/^[.-]+|[.-]+$/g, "");
  return cleaned.slice(0, 80) || "minutes";
}
function row(label: string, value: unknown): string {
  return `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}
function paragraph(title: string, value: unknown): string {
  return `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(value)}</p></section>`;
}
export interface MinutesHtmlExport {
  filename: string;
  mimeType: "text/html;charset=utf-8";
  content: string;
  version: string;
  status: string;
}
export function buildMinutesHtmlExport(record: MinutesExportRecord): MinutesHtmlExport {
  if (!record || !record.id || !record.minutes_id || !record.meeting_id ||
      !record.meeting_title || !record.version || !record.approval_status) {
    throw new Error("The minutes record is incomplete. Refresh before exporting.");
  }
  const ctx = record.meeting_context;
  const sourceRows = ctx ? [
    row("Governance Body", ctx.committee),
    row("Meeting Type", ctx.meeting_type),
    row("Mode", ctx.mode),
    row("Venue", ctx.venue),
    row("Time Zone", ctx.time_zone),
    row("Confidentiality", ctx.confidentiality),
  ].join("") : "";
  const isFinal = ["Approved", "Signed", "Archived"].includes(record.approval_status);
  const classification = isFinal
    ? "Internal record export. Approval/signature status is copied from the source registry; this file is not a qualified digital signature or an independently certified document."
    : "DRAFT / IN REVIEW — not an approved or signed board minutes record.";
  const content = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"/>
<title>${escapeHtml(record.minutes_id)} — Minutes v${escapeHtml(record.version)}</title>
<style>body{font:15px/1.55 system-ui,"Noto Sans Bengali","Noto Sans",sans-serif;max-width:840px;margin:30px auto;padding:0 24px;color:#202938}h1{font-size:23px}h2{font-size:17px;margin:24px 0 6px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dce2ea;text-align:left;vertical-align:top;padding:9px}th{width:33%;background:#f7f9fc}p{white-space:pre-wrap;overflow-wrap:anywhere}.notice{padding:12px;border:1px solid #b9c5d3;background:#f8fafc}footer{margin-top:30px;font-size:12px;color:#586172}@media print{body{margin:0;max-width:none}section{break-inside:avoid}}</style>
</head><body>
<h1>${escapeHtml(record.meeting_title)}</h1>
<p class="notice">${escapeHtml(classification)}</p>
<table>
${row("Minutes reference",record.minutes_id)}
${row("Meeting reference",record.meeting_id)}
${row("Meeting date",record.meeting_date)}
${row("Version",record.version)}
${row("Current recorded status",record.approval_status)}
${row("Minute taker",record.minute_taker)}
${row("Co-authors",record.co_authors)}
${row("Template",record.minutes_template)}
${row("Created at",record.created_at)}
${sourceRows}
</table>
${paragraph("Quorum statement",record.quorum_statement)}
${paragraph("Discussion summary",record.discussion_summary)}
${paragraph("Additional notes",record.notes)}
${paragraph("Next meeting date",record.next_meeting_date)}
${paragraph("Closing time",record.closing_time)}
<h2>Internal lifecycle evidence</h2>
<table>
${row("Approved by",record.approved_by)}
${row("Approved at",record.approved_at)}
${row("Signed by",record.signed_by)}
${row("Signed at",record.signed_at)}
${row("Archived by",record.archived_by)}
${row("Archived at",record.archived_at)}
</table>
<footer>Generated from the latest authorized registry readback. For official verification, compare the source record and server audit history.</footer>
</body></html>`;
  return {
    filename: `${safeName(record.minutes_id)}-v${safeName(record.version)}.html`,
    mimeType: "text/html;charset=utf-8",
    content,
    version: record.version,
    status: record.approval_status,
  };
}
