import { createEntityRegistry } from "../hooks/useEntityRegistry";
import type { EntityRecord } from "../hooks/useEntityRegistry";

export type MembershipRole =
  | "chair"
  | "vice_chair"
  | "secretary"
  | "member"
  | "observer"
  | "alternate";

export type MembershipStatus = "active" | "pending" | "expired" | "terminated";

export interface GovernanceMembership extends EntityRecord {
  user_id:           string;
  gov_body_id:       string;
  gov_body_name:     string;
  membership_role:   MembershipRole;
  is_voting_member:  boolean;
  counts_for_quorum: boolean;
  start_date:        string;
  end_date?:         string;
  appointed_by?:     string;
  appointed_by_name?: string;
  status:            MembershipStatus;
  notes?:            string;
}

const MEMBERSHIPS_KEY   = "bms.governance_memberships";
const MEMBERSHIPS_EVENT = "bms:governance-memberships-updated";

export const useGovernanceMembershipRegistry = createEntityRegistry<GovernanceMembership>(
  MEMBERSHIPS_KEY,
  MEMBERSHIPS_EVENT,
  [],
);

export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
  chair:       "Chair",
  vice_chair:  "Vice Chair",
  secretary:   "Secretary",
  member:      "Member",
  observer:    "Observer",
  alternate:   "Alternate",
};
