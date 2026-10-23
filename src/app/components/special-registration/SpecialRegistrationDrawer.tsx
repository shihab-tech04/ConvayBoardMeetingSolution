import { useState, useCallback } from "react";
import { AlertTriangle, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveOverlay } from "../shared/ResponsiveOverlay";
import { StatusBadge } from "../badges/StatusBadge";
import { CopyValueButton } from "../shared/CopyValueButton";
import { AttachmentList } from "../attachments/AttachmentList";
import { AppModal } from "../modals/AppModal";
import { AppTextArea } from "../forms/AppTextArea";
import { Button } from "../buttons/Button";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  getDocumentsByCategory,
  type SpecialRegistrationApplication,
} from "../../services/repositories/specialRegistrationRepository";

interface DrawerProps {
  application: SpecialRegistrationApplication;
  onClose: () => void;
  onEdit: () => void;
  onApprove: (
    appId: string,
    payload: { officerId: string; officerName: string; officerDesignation: string; approvalNote?: string }
  ) => Promise<void>;
  onReject: (
    appId: string,
    payload: { officerId: string; officerName: string; officerDesignation: string; rejectionReason: string }
  ) => Promise<void>;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Completeness check ────────────────────────────────────────────────────────

interface CompletenessResult {
  complete: boolean;
  missingFields: string[];
  missingDocuments: string[];
}

function checkCompleteness(
  app: SpecialRegistrationApplication,
): CompletenessResult {
  const missingFields: string[] = [];
  const missingDocuments: string[] = [];

  if (!app.applicantName)   missingFields.push("Full Name");
  if (!app.organization)    missingFields.push("Organisation");
  if (!app.country)         missingFields.push("Country");
  if (!app.address)         missingFields.push("Correspondence Address");
  if (!app.phone)           missingFields.push("Phone Number");
  if (!app.email)           missingFields.push("Email Address");
  if (!app.declarationAccepted) missingFields.push("Declaration");

  const hasIdDoc = app.documents.some(d => d.category === "ID_DOCUMENT");
  if (!hasIdDoc) missingDocuments.push("Identification Document");

  return {
    complete: missingFields.length === 0 && missingDocuments.length === 0,
    missingFields,
    missingDocuments,
  };
}

// ── Section component ─────────────────────────────────────────────────────────

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <div className="detail-section">
      <div className="detail-section__head detail-section__head--static">
        {title}
      </div>
      <div className="detail-section__body">
        {children}
      </div>
    </div>
  );
}

// ── Field component ───────────────────────────────────────────────────────────

interface DrawerFieldProps {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}

function DrawerField({ label, wide, children }: DrawerFieldProps) {
  return (
    <div className={`drawer-field${wide ? " drawer-field--wide" : ""}`}>
      <span className="drawer-field__label">{label}</span>
      <span className="drawer-field__value">{children}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SpecialRegistrationDrawer({ application, onClose, onEdit, onApprove, onReject }: DrawerProps) {
  const currentUser = useCurrentUser();

  const [approveOpen, setApproveOpen]   = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [approvingBusy, setApprovingBusy] = useState(false);

  const [rejectOpen, setRejectOpen]         = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError]   = useState("");
  const [rejectingBusy, setRejectingBusy]     = useState(false);

  const isPending  = application.status === "PENDING_REVIEW";
  const isApproved = application.status === "APPROVED";
  const isRejected = application.status === "REJECTED";

  const completeness = isPending
    ? checkCompleteness(application)
    : { complete: true, missingFields: [], missingDocuments: [] };

  // ── Document helpers ──────────────────────────────────────────────────────
  const idAttachments = getDocumentsByCategory(application, "ID_DOCUMENT");

  // ── Approve handlers ──────────────────────────────────────────────────────
  const handleApproveConfirm = useCallback(async () => {
    setApprovingBusy(true);
    try {
      await onApprove(application.id, {
        officerId:           currentUser.employeeId,
        officerName:         currentUser.name,
        officerDesignation:  currentUser.designation,
        approvalNote:        approvalNote.trim() || undefined,
      });
      setApproveOpen(false);
      setApprovalNote("");
    } catch {
      toast.error("Approval failed. Please try again.");
    } finally {
      setApprovingBusy(false);
    }
  }, [application.id, approvalNote, currentUser, onApprove]);

  // ── Reject handlers ───────────────────────────────────────────────────────
  const handleRejectChange = useCallback((v: string) => {
    setRejectionReason(v);
    if (rejectionError) setRejectionError("");
  }, [rejectionError]);

  const handleRejectConfirm = useCallback(async () => {
    const trimmed = rejectionReason.trim();
    if (!trimmed) { setRejectionError("A rejection reason is required."); return; }
    if (trimmed.length < 10) { setRejectionError("Rejection reason must be at least 10 characters."); return; }

    setRejectingBusy(true);
    try {
      await onReject(application.id, {
        officerId:           currentUser.employeeId,
        officerName:         currentUser.name,
        officerDesignation:  currentUser.designation,
        rejectionReason:     trimmed,
      });
      setRejectOpen(false);
      setRejectionReason("");
      setRejectionError("");
    } catch {
      toast.error("Rejection failed. Please try again.");
    } finally {
      setRejectingBusy(false);
    }
  }, [application.id, rejectionReason, currentUser, onReject]);

  const statusDisplay = application.status === "PENDING_REVIEW" ? "pending review"
                      : application.status === "APPROVED" ? "approved"
                      : "rejected";

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = isPending ? (
    <div className="drawer-action-footer">
      <div className="drawer-action-footer__row drawer-action-footer__row--single">
        <Button variant="secondary" size="md" leadingIcon={Pencil} onClick={onEdit} disabled={approvingBusy || rejectingBusy}>
          {"Edit"}
        </Button>
      </div>
      <div className="drawer-action-footer__divider" />
      <div className="drawer-action-footer__row">
        <Button variant="destructive-subtle" size="md" onClick={() => setRejectOpen(true)} disabled={approvingBusy || rejectingBusy}>
          {"Reject Application"}
        </Button>
        <Button variant="primary" size="lg" onClick={() => setApproveOpen(true)} disabled={!completeness.complete || approvingBusy || rejectingBusy}>
          {"Approve Application"}
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <ResponsiveOverlay
        open
        onClose={onClose}
        title={"Application Details"}
        footer={footer}
        desktopWidth="480px"
        describedBy="sr-drawer-desc"
      >
        <div id="sr-drawer-desc">

          {/* Summary block */}
          <div className="drawer-summary">
            <div className="drawer-summary__main">
              <p className="drawer-summary__name">{application.applicantName}</p>
              <p className="drawer-summary__id">
                <span className="drawer-summary__id-label">{"Application Number"}: </span>
                {application.applicationNumber}
                <CopyValueButton value={application.applicationNumber} label={"Copy application number"} />
              </p>
              <p className="drawer-summary__meta">{formatDate(application.submittedAt)}</p>
            </div>
            <div className="drawer-summary__status">
              <StatusBadge value={statusDisplay} />
            </div>
          </div>

          {/* Incomplete warning */}
          {isPending && !completeness.complete && (
            <div className="sr-drawer__incomplete" role="alert">
              <div className="sr-drawer__incomplete-header">
                <AlertTriangle size={16} aria-hidden="true" />
                <strong>{"Incomplete Application"}</strong>
              </div>
              <p>{"This application is missing required information or documents. Approval is disabled until all required fields are present."}</p>
              {completeness.missingFields.length > 0 && (
                <div>
                  <p className="sr-drawer__incomplete-sub">{"Missing required fields"}:</p>
                  <ul>{completeness.missingFields.map(f => <li key={f}>{f}</li>)}</ul>
                </div>
              )}
              {completeness.missingDocuments.length > 0 && (
                <div>
                  <p className="sr-drawer__incomplete-sub">{"Missing required documents"}:</p>
                  <ul>{completeness.missingDocuments.map(d => <li key={d}>{d}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Application Information */}
          <DetailSection title={"Application Information"}>
            <div className="drawer-field-grid">
              <DrawerField label={"Application Number"}>
                <div className="drawer-field__value-row">
                  <span>{application.applicationNumber}</span>
                  <CopyValueButton value={application.applicationNumber} />
                </div>
              </DrawerField>
              <DrawerField label={"Submission Date and Time"}>
                {formatDate(application.submittedAt)}
              </DrawerField>
              <DrawerField label={"Current Status"}>
                <StatusBadge value={statusDisplay} />
              </DrawerField>
            </div>
          </DetailSection>

          {/* Section 2: Participant Information */}
          <DetailSection title="Participant Information">
            <div className="drawer-field-grid">
              <DrawerField label={"Full Name"}>
                {application.applicantName}
              </DrawerField>
              <DrawerField label={"Organisation"}>
                {application.organization || "—"}
              </DrawerField>
              <DrawerField label={"Designation"}>
                {application.designation || "—"}
              </DrawerField>
            </div>
          </DetailSection>

          {/* Section 3: Contact Details */}
          <DetailSection title={"Contact Details"}>
            <div className="drawer-field-grid">
              <DrawerField label={"Country"}>
                {application.country}
              </DrawerField>
              <DrawerField label={"Phone Number"}>
                <div className="drawer-field__value-row">
                  <span>{application.phone}</span>
                  <CopyValueButton value={application.phone} label={"Copy phone"} />
                </div>
              </DrawerField>
              <DrawerField label={"Email Address"} wide>
                <div className="drawer-field__value-row">
                  <span>{application.email}</span>
                  <CopyValueButton value={application.email} label={"Copy email"} />
                </div>
              </DrawerField>
              <DrawerField label={"Correspondence Address"} wide>
                {application.address}
              </DrawerField>
            </div>
          </DetailSection>

          {/* Section 4: Documents */}
          <DetailSection title={"Identification Document"}>
            <div className="sr-drawer__doc-list">
              <AttachmentList
                attachments={idAttachments}
                title={`${"Identification Document"} · ${"Required"}`}
                emptyText={"No document submitted"}
              />
            </div>
          </DetailSection>

          {/* Section 6: Declaration */}
          <DetailSection title={"Applicant Declaration"}>
            <div className="drawer-field-grid">
              <DrawerField label={"Declaration"} wide>
                {"I confirm that the information and documents provided are correct. I authorize Convay to verify my email against my Meeting ID and process this application."}
              </DrawerField>
              <DrawerField label={"Accepted"}>
                {application.declarationAccepted ? (
                  <span className="sr-drawer__accepted">
                    <Check size={14} aria-hidden="true" />
                    {"Yes"}
                  </span>
                ) : "—"}
              </DrawerField>
              {application.declarationTimestamp && (
                <DrawerField label={"Declaration Timestamp"}>
                  {formatDate(application.declarationTimestamp)}
                </DrawerField>
              )}
            </div>
          </DetailSection>

          {/* Section 7: Review Information */}
          <DetailSection title={"Review Information"}>
            {isPending ? (
              <div className="drawer-field-grid">
                <DrawerField label={"Final Decision"} wide>
                  <span style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                    {"Not yet reviewed."}
                  </span>
                </DrawerField>
              </div>
            ) : (
              <div className="drawer-field-grid">
                <DrawerField label={"Current Status"}>
                  <StatusBadge value={statusDisplay} />
                </DrawerField>
                <DrawerField label={"Reviewed By"}>
                  {application.reviewedByName || "—"}
                </DrawerField>
                <DrawerField label={"Designation"}>
                  {application.reviewedByDesignation || "—"}
                </DrawerField>
                <DrawerField label={"Review Date and Time"}>
                  {formatDate(application.reviewedAt || "")}
                </DrawerField>
                {isApproved && application.approvalNote && (
                  <DrawerField label={"Approval Note"} wide>
                    {application.approvalNote}
                  </DrawerField>
                )}
                {isRejected && application.rejectionReason && (
                  <DrawerField label={"Rejection Reason"} wide>
                    {application.rejectionReason}
                  </DrawerField>
                )}
              </div>
            )}
          </DetailSection>

          {/* Section 8: Decision History */}
          <DetailSection title={"Decision History"}>
            <div className="sr-drawer__history">
              {application.decisionHistory.map((item, i) => (
                <div key={i} className="sr-drawer__history-item">
                  <div className="sr-drawer__history-event">
                    {item.decisionType === "SUBMITTED" && "Application Submitted"}
                    {item.decisionType === "APPROVED"  && "Application Approved"}
                    {item.decisionType === "REJECTED"  && "Application Rejected"}
                    {item.decisionType === "EDITED"    && "Application Updated"}
                  </div>
                  <div className="sr-drawer__history-meta">
                    <span>{item.officerName}</span>
                    {item.officerDesignation !== "Applicant" && (
                      <span className="sr-drawer__history-designation"> · {item.officerDesignation}</span>
                    )}
                  </div>
                  <div className="sr-drawer__history-date">{formatDate(item.timestamp)}</div>
                  {item.note && (
                    <div className="sr-drawer__history-note">{item.note}</div>
                  )}
                </div>
              ))}
            </div>
          </DetailSection>

        </div>
      </ResponsiveOverlay>

      {/* Approve modal */}
      <AppModal
        open={approveOpen}
        title={"Approve Application"}
        onClose={() => !approvingBusy && setApproveOpen(false)}
        layer="top"
        size="md"
        footer={
          <div className="sr-modal-footer">
            <Button variant="ghost" size="lg" onClick={() => setApproveOpen(false)} disabled={approvingBusy}>{"Cancel"}</Button>
            <Button variant="primary" size="lg" onClick={handleApproveConfirm} loading={approvingBusy} disabled={approvingBusy} loadingText="Approving…">
              {"Confirm Approval"}
            </Button>
          </div>
        }
      >
        <div className="sr-modal-body">
          <div className="sr-modal-info-row">
            <span className="sr-modal-info-label">{"Applicant"}</span>
            <span className="sr-modal-info-value">{application.applicantName}</span>
          </div>
          <div className="sr-modal-info-row">
            <span className="sr-modal-info-label">{"Application Number"}</span>
            <span className="sr-modal-info-value">{application.applicationNumber}</span>
          </div>
          <div className="sr-modal-info-row">
            <span className="sr-modal-info-label">{"Email Address"}</span>
            <span className="sr-modal-info-value">{application.email}</span>
          </div>
          <p className="sr-modal-effect">
            {"After approval, the applicant may receive registration instructions or an OTP through the verified email address."}
          </p>
          <AppTextArea
            id="approve-note"
            label={"Internal Approval Note"}
            value={approvalNote}
            onChange={setApprovalNote}
            placeholder={"Optional note for internal records"}
            rows={3}
            disabled={approvingBusy}
          />
        </div>
      </AppModal>

      {/* Reject modal */}
      <AppModal
        open={rejectOpen}
        title={"Reject Application"}
        onClose={() => !rejectingBusy && setRejectOpen(false)}
        layer="top"
        size="md"
        footer={
          <div className="sr-modal-footer">
            <Button variant="ghost" size="lg" onClick={() => setRejectOpen(false)} disabled={rejectingBusy}>{"Cancel"}</Button>
            <Button variant="destructive" size="sm" onClick={handleRejectConfirm} loading={rejectingBusy} disabled={rejectingBusy || rejectionReason.trim().length < 10} loadingText="Rejecting…">
              {"Confirm Rejection"}
            </Button>
          </div>
        }
      >
        <div className="sr-modal-body">
          <div className="sr-modal-info-row">
            <span className="sr-modal-info-label">{"Applicant"}</span>
            <span className="sr-modal-info-value">{application.applicantName}</span>
          </div>
          <div className="sr-modal-info-row">
            <span className="sr-modal-info-label">{"Application Number"}</span>
            <span className="sr-modal-info-value">{application.applicationNumber}</span>
          </div>
          <p className="sr-modal-char-count" aria-live="polite">
            {rejectionReason.trim().length}/500
          </p>
          <AppTextArea
            id="reject-reason"
            label={"Rejection Reason"}
            value={rejectionReason}
            onChange={handleRejectChange}
            placeholder={"State the reason for rejection clearly (minimum 10 characters)."}
            helper={"Required. Minimum 10 characters, maximum 500."}
            error={rejectionError}
            required
            rows={4}
            disabled={rejectingBusy}
          />
        </div>
      </AppModal>
    </>
  );
}
