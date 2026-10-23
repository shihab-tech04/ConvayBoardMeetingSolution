import { useMemo } from "react";
import {
  Mail, MailOpen, CheckCircle2, XCircle, Clock,
  RefreshCw, Send, Ban, AlertCircle, Copy, Check,
} from "lucide-react";
import { useState } from "react";
import type { BmsUser, InvitationStatus } from "../../data/bmsUsers";
import { useUserInvitationRegistry } from "../../data/bmsUsers";
import { format } from "date-fns";

interface InvitationPanelProps {
  user:             BmsUser;
  onSend:           () => void;
  onResend:         () => void;
  onCancel:         () => void;
  onSimulateOpen:   () => void;
  onSimulateActivate: () => void;
  canSend:          boolean;
  canResend:        boolean;
  canCancel:        boolean;
}

const STATUS_META: Record<InvitationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  not_sent:        { label: "Not Sent",        color: "text-muted-foreground", icon: <Mail size={14} /> },
  pending:         { label: "Pending",         color: "text-amber-600",       icon: <Clock size={14} /> },
  sent:            { label: "Sent",            color: "text-blue-600",        icon: <Send size={14} /> },
  opened:          { label: "Opened",          color: "text-indigo-600",      icon: <MailOpen size={14} /> },
  accepted:        { label: "Accepted",        color: "text-emerald-600",     icon: <CheckCircle2 size={14} /> },
  declined:        { label: "Declined",        color: "text-red-500",         icon: <XCircle size={14} /> },
  expired:         { label: "Expired",         color: "text-orange-500",      icon: <AlertCircle size={14} /> },
  activated:       { label: "Activated",       color: "text-emerald-600",     icon: <CheckCircle2 size={14} /> },
  cancelled:       { label: "Cancelled",       color: "text-muted-foreground",icon: <Ban size={14} /> },
  delivery_failed: { label: "Delivery Failed", color: "text-red-600",         icon: <AlertCircle size={14} /> },
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try { return format(new Date(iso), "d MMM yyyy, HH:mm"); } catch { return iso; }
}

function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}

export function InvitationPanel({
  user, onSend, onResend, onCancel,
  onSimulateOpen, onSimulateActivate,
  canSend, canResend, canCancel,
}: InvitationPanelProps) {
  const invReg = useUserInvitationRegistry();
  const [copied, setCopied] = useState(false);

  const invitations = useMemo(
    () => invReg.items.filter((i) => i.user_id === user.id).sort((a, b) =>
      String(b.sent_at ?? b.created_at ?? "").localeCompare(String(a.sent_at ?? a.created_at ?? "")),
    ),
    [invReg.items, user.id],
  );

  const latest     = invitations[0];
  const invStatus  = (user.invitation_status ?? "not_sent") as InvitationStatus;
  const meta       = STATUS_META[invStatus] ?? STATUS_META.not_sent;

  const mockLink = `https://app.bms.local/activate?token=demo-${user.id.slice(-6)}`;

  const canSimulateOpen     = invStatus === "sent";
  const canSimulateActivate = ["sent", "opened"].includes(invStatus);

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={meta.color}>{meta.icon}</span>
          <div>
            <p className="text-xs text-muted-foreground">Invitation Status</p>
            <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
          </div>
        </div>
        {latest?.expires_at && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Expires</p>
            <p className="text-xs font-medium text-foreground">{fmtDate(latest.expires_at)}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      {latest && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timeline</p>
          {[
            { label: "Created",   value: latest.created_at },
            { label: "Sent",      value: latest.sent_at },
            { label: "Opened",    value: (latest as typeof latest & { opened_at?: string }).opened_at },
            { label: "Activated", value: latest.activated_at },
          ]
            .filter((r) => r.value)
            .map((r) => (
              <div key={r.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="text-foreground font-mono">{fmtDate(r.value as string | undefined)}</span>
              </div>
            ))}
        </div>
      )}

      {/* Activation link */}
      {["sent", "opened"].includes(invStatus) && (
        <div className="rounded-lg border border-border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Activation Link (demo)</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-foreground flex-1 truncate">{mockLink}</code>
            <button
              onClick={() => copyToClipboard(mockLink, setCopied)}
              className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground"
              title="Copy link"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {canSend && (
          <button
            onClick={onSend}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            <Send size={13} /> Send Invitation
          </button>
        )}
        {canResend && (
          <button
            onClick={onResend}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <RefreshCw size={13} /> Resend
          </button>
        )}
        {canCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
          >
            <Ban size={13} /> Cancel Invitation
          </button>
        )}
      </div>

      {/* Simulate section (dev helper, always visible in demo) */}
      <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Simulate Invitation Flow</p>
        <div className="flex gap-2">
          <button
            onClick={onSimulateOpen}
            disabled={!canSimulateOpen}
            className="text-xs px-2.5 py-1.5 rounded border border-border text-foreground bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Simulate Open
          </button>
          <button
            onClick={onSimulateActivate}
            disabled={!canSimulateActivate}
            className="text-xs px-2.5 py-1.5 rounded border border-border text-foreground bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Simulate Activation
          </button>
        </div>
        <p className="text-xs text-muted-foreground italic">
          These controls simulate the user clicking the invitation link. Available in all environments.
        </p>
      </div>

      {/* History */}
      {invitations.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Previous Invitations</p>
          {invitations.slice(1).map((inv) => {
            const s = (inv.status ?? "not_sent") as InvitationStatus;
            const m = STATUS_META[s] ?? STATUS_META.not_sent;
            return (
              <div key={inv.id} className="flex items-center justify-between text-xs border-b border-border pb-1">
                <span className={`flex items-center gap-1 ${m.color}`}>{m.icon} {m.label}</span>
                <span className="text-muted-foreground font-mono">{fmtDate((inv.sent_at ?? inv.created_at) as string | undefined)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
