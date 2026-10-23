import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { QUESTION_DRAWER_COLS, NOTE_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { buildPageKpis } from "../../utils/buildPageKpis";
import { QUESTION_FORM_FIELDS, NOTE_FORM_FIELDS } from "../boardMeetingFormFields";
import {
  useQuestionRegistry,
  usePrivateNoteRegistry,
  generateId,
  type BoardQuestion,
  type PrivateNote,
} from "../../data/boardMeetingData";

export function Register5Page({ isApproval }: { isApproval?: boolean }) {
  const questionReg = useQuestionRegistry();
  const noteReg = usePrivateNoteRegistry();

  const rows = isApproval
    ? noteReg.items.map((n: PrivateNote) => ({
        id: n.id,
        note_id: n.note_id,
        note_title: n.note_title,
        related_meeting: n.related_meeting,
        agenda_item: n.agenda_item,
        document_ref: n.document_ref,
        page_reference: n.page_reference,
        tags: n.tags,
        bookmarked: n.bookmarked,
        shared_with: n.shared_with,
        created_by: n.created_by,
        created_at: n.created_at,
        approval_status: n.bookmarked === "Yes" ? "Bookmarked" : "Active",
      }))
    : questionReg.items.map((q: BoardQuestion) => ({
        id: q.id,
        question_id: q.question_id,
        question_text: q.question_text,
        related_meeting: q.related_meeting,
        agenda_item: q.agenda_item,
        document_ref: q.document_ref,
        directed_to: q.directed_to,
        asked_by: q.asked_by,
        priority: q.priority,
        visibility: q.visibility,
        written_response_required: q.written_response_required,
        deadline: q.deadline,
        response_text: q.response_text,
        responded_by: q.responded_by,
        response_date: q.response_date,
        approval_status: q.current_status,
        created_at: q.created_at,
      }));

  const kpis = isApproval
    ? buildPageKpis(rows, {
        totalLabel: "Total Notes",
        statusField: "bookmarked",
        statuses: [
          { value: "Yes", label: "Bookmarked", tone: "warning" },
          { value: "No", label: "Not Bookmarked", tone: "neutral" },
        ],
      })
    : buildPageKpis(rows, {
        totalLabel: "Total Questions",
        statusField: "approval_status",
        statuses: [
          { value: "Open", label: "Open", tone: "warning" },
          { value: "Resolved", label: "Resolved", tone: "success" },
          { value: "Assigned", label: "Assigned", tone: "neutral" },
        ],
      });

  const colsQ: PageCfg["cols"] = [
    fc("question_text",  "Question",        { headerKey: "headers.title" }),
    fc("related_meeting","Related Meeting", { headerKey: "headers.meetingTitle" }),
    fc("directed_to",    "Directed To",     { headerKey: "headers.submittedBy" }),
    fc("priority",       "Priority",        { headerKey: "headers.amount" }),
    fc("deadline",       "Deadline",        { headerKey: "headers.date" }),
    BADGE("approval_status", "Status"),
  ];

  const colsN: PageCfg["cols"] = [
    fc("note_title",     "Note Title",      { headerKey: "headers.title" }),
    fc("related_meeting","Related Meeting", { headerKey: "headers.meetingTitle" }),
    fc("document_ref",   "Document",        { headerKey: "headers.type" }),
    fc("page_reference", "Page Reference",  { headerKey: "headers.amount" }),
    fc("created_at",     "Created",         { headerKey: "headers.date" }),
    BADGE("bookmarked",  "Bookmarked"),
  ];

  const cfg: PageCfg = {
    title: isApproval ? "My Notes" : "Questions & Clarifications",
    titleKey: isApproval ? "register5Approval.title" : "register5.title",
    desc: isApproval
      ? "Record and manage personal notes linked to meetings, agenda items, and documents."
      : "Submit and track questions arising from board papers and agenda items.",
    descKey: isApproval ? "register5Approval.desc" : "register5.desc",
    cols: isApproval ? colsN : colsQ,
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: isApproval ? "Note Details" : "Question Details",
    drawerCols: isApproval ? NOTE_DRAWER_COLS : QUESTION_DRAWER_COLS,
    rows,
    kpis,
    entryBtn: isApproval ? "Add Note" : "Add Question",
    formFields: isApproval ? NOTE_FORM_FIELDS : QUESTION_FORM_FIELDS,
    onRowCreate: (data) => {
      if (isApproval) {
        const existingIds = noteReg.items.map((n: PrivateNote) => n.note_id);
        const newId = generateId("NOTE", existingIds);
        noteReg.add({
          id: String(Date.now()),
          note_id: newId,
          note_title: String(data.note_title ?? ""),
          note_content: String(data.note_content ?? ""),
          related_meeting: String(data.related_meeting ?? ""),
          agenda_item: String(data.agenda_item ?? ""),
          document_ref: String(data.document ?? ""),
          page_reference: String(data.page_reference ?? ""),
          tags: String(data.tags ?? ""),
          bookmarked: data.private ? "No" : "No",
          shared_with: "",
          created_by: "Current User",
          created_at: new Date().toISOString(),
        });
      } else {
        const existingIds = questionReg.items.map((q: BoardQuestion) => q.question_id);
        const newId = generateId("QST", existingIds);
        questionReg.add({
          id: String(Date.now()),
          question_id: newId,
          question_text: String(data.question_text ?? ""),
          related_meeting: String(data.related_meeting ?? ""),
          agenda_item: String(data.agenda_item ?? ""),
          document_ref: String(data.document ?? ""),
          directed_to: String(data.directed_to ?? ""),
          asked_by: "Current User",
          priority: String(data.priority ?? "Normal"),
          visibility: String(data.visibility ?? "Board Members Only"),
          written_response_required: data.written_response ? "Yes" : "No",
          deadline: String(data.response_deadline ?? ""),
          response_text: "",
          responded_by: "",
          response_date: "",
          current_status: "Open",
          created_at: new Date().toISOString(),
        });
      }
    },
  };

  return <GenPage cfg={cfg} />;
}
