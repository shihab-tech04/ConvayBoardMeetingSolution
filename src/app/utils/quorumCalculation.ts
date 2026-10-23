/**
 * Shared quorum calculation used by:
 *  - ParticipantSelectorStep / QuorumAndAccessPanel
 *  - MeetingReviewPanel
 *  - Meeting row enrichment (drawer + list)
 *
 * Single source of truth — do not add another quorum calculation anywhere else.
 */

import type { MeetingParticipantLink, GovernanceBody, QuorumRule } from "../data/boardMeetingData";
import type { DraftParticipantLink } from "../components/forms/ParticipantSelectorStep";

export type QuorumStatus =
  | "expected"
  | "at_risk"
  | "not_expected"
  | "not_configured";

export interface QuorumResult {
  status: QuorumStatus;
  eligibleCount: number;
  requiredCount: number;
  requiredPercent: number;
  selectedEligibleCount: number;
  totalParticipants: number;
  requiredRoles: string[];
  missingRoles: string[];
  reasons: string[];
}

export interface QuorumInput {
  /** ID of the governance body (Board/Committee). */
  boardCommitteeId: string;
  boardCommitteeName?: string;
  /** Canonical participant links from registry (used in row enrichment). */
  participantLinks?: MeetingParticipantLink[];
  /** Draft participant links from wizard values (used in steps 1–4). */
  draftLinks?: DraftParticipantLink[];
  governanceBodies: GovernanceBody[];
  quorumRules: QuorumRule[];
}

export function calculateMeetingQuorum(input: QuorumInput): QuorumResult {
  const {
    boardCommitteeId,
    boardCommitteeName,
    participantLinks = [],
    draftLinks = [],
    governanceBodies,
    quorumRules,
  } = input;

  // Resolve the governance body
  const body = governanceBodies.find(b =>
    b.id === boardCommitteeId ||
    b.body_id === boardCommitteeId ||
    b.body_name === boardCommitteeId ||
    b.body_name === boardCommitteeName,
  );

  // Find the active quorum rule for this body
  const govRule = body
    ? quorumRules.find(r =>
        (r.governance_body_id === body.id || r.governance_body_id === body.body_id) &&
        r.status === "Active",
      ) ?? null
    : null;

  if (!govRule) {
    return {
      status: "not_configured",
      eligibleCount: 0,
      requiredCount: 0,
      requiredPercent: 0,
      selectedEligibleCount: 0,
      totalParticipants: participantLinks.length + draftLinks.length,
      requiredRoles: [],
      missingRoles: [],
      reasons: ["No active quorum rule configured for this governance body"],
    };
  }

  const requiredCount  = parseInt(govRule.minimum_members, 10) || 0;
  const requiredPct    = parseFloat(govRule.quorum_percent) || 0;

  // Required roles from governance rule
  const requiredRoles: string[] = (() => {
    const rv = (govRule as { required_roles?: string | string[] }).required_roles;
    if (!rv) return [];
    if (Array.isArray(rv)) return rv as string[];
    if (typeof rv === "string" && rv) return rv.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  })();

  // Count quorum-eligible participants
  const totalParticipants = draftLinks.length > 0 ? draftLinks.length : participantLinks.length;
  const eligibleCount =
    draftLinks.length > 0
      ? draftLinks.filter(l => l.quorum_eligible).length
      : participantLinks.filter(l => l.quorum_eligible).length;

  // Check missing required roles
  const assignedRoles = draftLinks.length > 0
    ? draftLinks.map(l => l.participant_type)
    : participantLinks.map(l => l.participant_type);
  const missingRoles = requiredRoles.filter(r => !assignedRoles.includes(r));

  // Calculate status
  const meetsFixed = requiredCount > 0 ? eligibleCount >= requiredCount : true;
  const meetsPct   = requiredPct > 0 && totalParticipants > 0
    ? (eligibleCount / totalParticipants) * 100 >= requiredPct
    : true;
  const hasMissingRoles = missingRoles.length > 0;

  const reasons: string[] = [];
  if (!meetsFixed)      reasons.push(`Needs ${requiredCount} quorum-eligible members (have ${eligibleCount})`);
  if (!meetsPct)        reasons.push(`Needs ${requiredPct}% quorum-eligible (have ${totalParticipants > 0 ? Math.round((eligibleCount / totalParticipants) * 100) : 0}%)`);
  if (hasMissingRoles)  reasons.push(`Missing required roles: ${missingRoles.join(", ")}`);

  let status: QuorumStatus;
  if (meetsFixed && meetsPct && !hasMissingRoles) {
    status = "expected";
  } else {
    // At risk: within 1 member or 5% of threshold
    const closeFixed = requiredCount > 0 ? eligibleCount >= requiredCount - 1 : true;
    const closePct   = requiredPct > 0 && totalParticipants > 0
      ? (eligibleCount / totalParticipants) * 100 >= requiredPct - 5
      : true;
    status = (closeFixed && closePct && !hasMissingRoles) ? "at_risk" : "not_expected";
  }

  return {
    status,
    eligibleCount,
    requiredCount,
    requiredPercent: requiredPct,
    selectedEligibleCount: eligibleCount,
    totalParticipants,
    requiredRoles,
    missingRoles,
    reasons,
  };
}

/** Map QuorumResult status to a human-readable forecast string for the meeting row. */
export function quorumStatusLabel(result: QuorumResult): string {
  if (result.status === "not_configured") return "Not Configured";
  const { eligibleCount, requiredCount } = result;
  if (result.status === "expected") return `Met (${eligibleCount}/${requiredCount})`;
  if (result.status === "at_risk")  return `At Risk (${eligibleCount}/${requiredCount})`;
  return `Not Met (${eligibleCount}/${requiredCount})`;
}
