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
  /** If provided, only these assigned users are currently present; the denominator remains all assigned eligible members. */
  presentUserIds?: ReadonlySet<string>;
  governanceBodies: GovernanceBody[];
  quorumRules: QuorumRule[];
}

export function calculateMeetingQuorum(input: QuorumInput): QuorumResult {
  const {
    boardCommitteeId,
    boardCommitteeName,
    participantLinks = [],
    draftLinks = [],
    presentUserIds,
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

  const minimum = govRule.minimum_members_count ?? (parseInt(govRule.minimum_members, 10) || 0);
  const requiredPct = govRule.minimum_percentage ?? (parseFloat(govRule.quorum_percent) || 0);

  // Required roles from governance rule
  const requiredRoles: string[] = (() => {
    const rv = (govRule as { required_roles?: string | string[] }).required_roles;
    if (!rv) return [];
    if (Array.isArray(rv)) return rv.map(r => r.trim()).filter(Boolean);
    if (typeof rv === "string" && rv) return rv.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  })();

  // Match the hosted SQL denominator: distinct assigned quorum-eligible users.
  // Filtering by attendance before counting would incorrectly make every present
  // subset 100% of the membership, and invitees must not dilute the threshold.
  const links = draftLinks.length > 0 ? draftLinks : participantLinks;
  const totalParticipants = links.length;
  const eligibleUsers = new Set(links.filter(l => l.quorum_eligible && l.user_id).map(l => l.user_id));
  const presentLinks = presentUserIds === undefined ? links : links.filter(l => presentUserIds.has(l.user_id));
  const eligibleCount = new Set(presentLinks.filter(l => l.quorum_eligible && l.user_id).map(l => l.user_id)).size;
  const selectedEligibleCount = eligibleUsers.size;
  const validThreshold = Number.isInteger(minimum) && minimum >= 0 && minimum <= 100000 &&
    Number.isFinite(requiredPct) && requiredPct >= 0 && requiredPct <= 100;
  const requiredCount = validThreshold ? Math.max(minimum, Math.ceil(selectedEligibleCount * requiredPct / 100)) : 0;

  // Required governance roles must be present, not merely invited, when attendance is supplied.
  const assignedRoles = presentLinks.map(l => l.participant_type);
  const missingRoles = requiredRoles.filter(r => !assignedRoles.includes(r));
  const reasons: string[] = [];
  const unresolvedRolePolicy = govRule.rule_type === "role_based";
  if (!validThreshold) reasons.push("Invalid configured quorum limits");
  if (unresolvedRolePolicy) reasons.push("Required role IDs require authoritative role mapping");
  if (selectedEligibleCount === 0) reasons.push("No quorum-eligible members assigned");
  if (validThreshold && requiredCount === 0) reasons.push("No positive quorum threshold configured");
  if (eligibleCount < requiredCount) reasons.push(`Needs ${requiredCount} quorum-eligible members (have ${eligibleCount})`);
  if (missingRoles.length > 0) reasons.push(`Missing required roles: ${missingRoles.join(", ")}`);

  let status: QuorumStatus = "not_expected";
  if (validThreshold && !unresolvedRolePolicy && selectedEligibleCount > 0 && requiredCount > 0 && missingRoles.length === 0) {
    if (eligibleCount >= requiredCount) status = "expected";
    else if (eligibleCount >= requiredCount - 1 &&
      (requiredPct === 0 || eligibleCount / selectedEligibleCount * 100 >= requiredPct - 5)) status = "at_risk";
  }

  return {
    status,
    eligibleCount,
    requiredCount,
    requiredPercent: requiredPct,
    selectedEligibleCount,
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
