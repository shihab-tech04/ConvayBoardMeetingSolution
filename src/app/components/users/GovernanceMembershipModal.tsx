import { useState } from "react";
import { createPortal } from "react-dom";
import { Landmark, X } from "lucide-react";
import type { BmsUser } from "../../data/bmsUsers";
import type { MembershipRole } from "../../data/governanceMemberships";
import { MEMBERSHIP_ROLE_LABELS } from "../../data/governanceMemberships";
import { useGovernanceRegistry } from "../../data/boardMeetingData";
import { useGovernanceMembershipRegistry } from "../../data/governanceMemberships";
import { AppSelectField } from "../forms/AppSelectField";
import { AppDateField } from "../forms/AppDateField";
import { AppCheckbox } from "../forms/AppCheckbox";

interface GovernanceMembershipModalProps {
  user:      BmsUser;
  onConfirm: (membership: {
    govBodyId:        string;
    govBodyName:      string;
    membershipRole:   MembershipRole;
    isVotingMember:   boolean;
    countsForQuorum:  boolean;
    startDate:        string;
    endDate?:         string;
    appointedByName?: string;
    notes?:           string;
  }) => void;
  onClose: () => void;
}

const ROLE_OPTIONS = Object.entries(MEMBERSHIP_ROLE_LABELS).map(([value, label]) => ({ value, label }));

export function GovernanceMembershipModal({ user, onConfirm, onClose }: GovernanceMembershipModalProps) {
  const govReg    = useGovernanceRegistry();
  const govMemReg = useGovernanceMembershipRegistry();

  const [govBodyId,      setGovBodyId]      = useState("");
  const [membershipRole, setMembershipRole] = useState<MembershipRole>("member");
  const [isVoting,       setIsVoting]       = useState(true);
  const [countsQuorum,   setCountsQuorum]   = useState(true);
  const [startDate,      setStartDate]      = useState("");
  const [endDate,        setEndDate]        = useState("");
  const [appointedBy,    setAppointedBy]    = useState("");
  const [notes,          setNotes]          = useState("");

  const govOptions = [
    { value: "", label: "— Select Governance Body —" },
    ...govReg.items.map((g) => ({ value: g.id, label: g.body_name ?? g.id })),
  ];

  const selectedBody = govReg.items.find((g) => g.id === govBodyId);

  // Block duplicate active membership for the same user + body + role
  const isDuplicate = govBodyId !== "" && govMemReg.items.some(
    m => m.user_id === user.id && m.gov_body_id === govBodyId
      && m.membership_role === membershipRole && m.status === "active",
  );

  const canConfirm = govBodyId !== "" && startDate !== "" && !isDuplicate;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Landmark size={20} className="text-primary" />
            <div>
              <p className="font-semibold text-foreground">Add Governance Membership</p>
              <p className="text-xs text-muted-foreground">{user.display_name ?? user.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <AppSelectField
            id="gm-body"
            label="Governance Body"
            value={govBodyId}
            onChange={setGovBodyId}
            options={govOptions}
            required
          />

          {selectedBody && (
            <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
              {selectedBody.mandate ?? "Board / committee body"}
            </div>
          )}

          <AppSelectField
            id="gm-role"
            label="Membership Role"
            value={membershipRole}
            onChange={(v) => setMembershipRole(v as MembershipRole)}
            options={ROLE_OPTIONS}
            required
          />

          {isDuplicate && (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3">
              <span className="text-xs text-red-700 dark:text-red-300">
                This user already has an active <strong>{membershipRole}</strong> membership in this governance body.
              </span>
            </div>
          )}

          <div className="flex gap-6">
            <AppCheckbox id="gm-voting" label="Voting Member"      checked={isVoting}     onChange={setIsVoting} />
            <AppCheckbox id="gm-quorum" label="Counts for Quorum"  checked={countsQuorum} onChange={setCountsQuorum} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AppDateField id="gm-start" label="Start Date" value={startDate} onChange={setStartDate} required customPicker />
            <AppDateField id="gm-end"   label="End Date"   value={endDate}   onChange={setEndDate}   customPicker />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1" htmlFor="gm-appointed">Appointed By</label>
            <input
              id="gm-appointed"
              type="text"
              value={appointedBy}
              onChange={(e) => setAppointedBy(e.target.value)}
              placeholder="Name or title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1" htmlFor="gm-notes">Notes</label>
            <textarea
              id="gm-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => canConfirm && onConfirm({
              govBodyId,
              govBodyName:     selectedBody?.body_name ?? govBodyId,
              membershipRole,
              isVotingMember:  isVoting,
              countsForQuorum: countsQuorum,
              startDate,
              endDate:         endDate || undefined,
              appointedByName: appointedBy || undefined,
              notes:           notes || undefined,
            })}
            disabled={!canConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Add Membership
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
