/**
 * Non-destructive, one-way compatibility migration from the legacy
 * `bms.memberships` registry (boardMeetingData.ts → GovernanceMembership)
 * to the canonical `bms.governance_memberships` registry
 * (governanceMemberships.ts → GovernanceMembership).
 *
 * Migrates a legacy record only when:
 * - The governance body resolves exactly by name.
 * - The canonical user resolves exactly by name (one unique match).
 * - No equivalent canonical membership already exists for (user_id, gov_body_id).
 *
 * Does NOT mutate registries directly. Returns records to add and a summary.
 */

import type { GovernanceMembership as LegacyMembership } from "../data/boardMeetingData";
import type { GovernanceMembership as CanonicalMembership, MembershipRole } from "../data/governanceMemberships";
import type { BmsUser } from "../data/bmsUsers";
import type { EntityRecord } from "../hooks/useEntityRegistry";

interface GovernanceBody extends EntityRecord {
  id: string;
  body_name: string;
}

export interface MigrationResult {
  toAdd: Omit<CanonicalMembership, keyof EntityRecord>[];
  migratedCount: number;
  skippedCount: number;
  unresolvedCount: number;
  duplicateCount: number;
}

const ROLE_MAP: Record<string, MembershipRole> = {
  Chairperson: "chair",
  Chair:       "chair",
  "Vice Chair": "vice_chair",
  Secretary:   "secretary",
  Member:      "member",
  Observer:    "observer",
  Alternate:   "alternate",
};

function toLegacyRole(role: string): MembershipRole {
  return ROLE_MAP[role] ?? "member";
}

export function migrateGovernanceMemberships(
  legacyRecords: LegacyMembership[],
  canonicalRecords: CanonicalMembership[],
  governanceBodies: GovernanceBody[],
  bmsUsers: BmsUser[],
): MigrationResult {
  const toAdd: Omit<CanonicalMembership, keyof EntityRecord>[] = [];
  let skippedCount    = 0;
  let unresolvedCount = 0;
  let duplicateCount  = 0;

  const activeUsers = bmsUsers.filter(u => {
    const st = (u.account_status ?? u.status ?? "active").toLowerCase();
    return st === "active" || st === "activated";
  });

  for (const legacy of legacyRecords) {
    if ((legacy.status ?? "").toLowerCase() !== "active") {
      skippedCount++;
      continue;
    }

    // Resolve governance body by exact name
    const body = governanceBodies.find(b => b.body_name === legacy.body_name);
    if (!body) {
      unresolvedCount++;
      continue;
    }

    // Resolve user by exact name — skip if ambiguous (multiple matches)
    const matched = activeUsers.filter(u => u.name === legacy.member_name);
    if (matched.length !== 1) {
      unresolvedCount++;
      continue;
    }
    const user = matched[0];

    // Skip if canonical membership already exists for this (user_id, gov_body_id)
    const alreadyExists = canonicalRecords.some(
      c => c.user_id === user.id && c.gov_body_id === body.id,
    );
    if (alreadyExists) {
      duplicateCount++;
      continue;
    }

    const isVoting = legacy.voting_rights?.toLowerCase() === "yes";
    toAdd.push({
      user_id:           user.id,
      gov_body_id:       body.id,
      gov_body_name:     legacy.body_name,
      membership_role:   toLegacyRole(legacy.member_role ?? "Member"),
      is_voting_member:  isVoting,
      counts_for_quorum: isVoting,
      start_date:        legacy.start_date ?? new Date().toISOString().slice(0, 10),
      end_date:          legacy.end_date || undefined,
      status:            "active",
    });
  }

  return {
    toAdd,
    migratedCount:  toAdd.length,
    skippedCount,
    unresolvedCount,
    duplicateCount,
  };
}
