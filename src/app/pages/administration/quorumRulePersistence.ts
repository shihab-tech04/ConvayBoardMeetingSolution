/** AD-06 / MT-04: single-organization quorum-policy setup with immutable versions.
 * The database enforces the policy; this is preflight and readback only.
 * Multi-tenant SaaS remains disabled until independent tenant isolation is verified.
 */
import type { GovernanceBody, QuorumRule } from "../../data/boardMeetingData";

export type VersionedQuorumRule = QuorumRule & {
  rule_name: string;
  policy_version: number;
  policy_created_by?: string;
};

export interface QuorumRuleGateway {
  list: () => Promise<VersionedQuorumRule[]>;
  create: (rule: VersionedQuorumRule) => Promise<boolean>;
  update: (id: string, patch: Partial<VersionedQuorumRule>) => Promise<boolean>;
}

const textValue = (value: unknown) => typeof value === "string" ? value.trim() : "";
const numericValue = (value: unknown) => value === undefined || value === "" ? 0 : Number(value);

export function prepareVersionedQuorumRule(
  values: Record<string, unknown>,
  identity: { id: string; created_at: string },
  bodies: readonly GovernanceBody[],
  existing: readonly VersionedQuorumRule[],
): VersionedQuorumRule {
  const bodyId = textValue(values.governance_body_id);
  const body = bodies.find(b => b.id === bodyId && b.status === "Active");
  if (!body) throw new Error("Select an active governance body from the verified list.");
  const name = textValue(values.rule_name);
  if (!name) throw new Error("Enter a quorum rule name.");
  const ruleType = textValue(values.rule_type) || "percentage";
  if (!["fixed_number", "percentage"].includes(ruleType))
    throw new Error("Choose a supported fixed-number or percentage quorum policy.");
  const members = numericValue(values.minimum_members_count);
  const percentage = numericValue(values.minimum_percentage);
  if (!Number.isInteger(members) || members < 0 || members > 100000 ||
      !Number.isFinite(percentage) || percentage < 0 || percentage > 100 ||
      Math.round(percentage * 100) !== percentage * 100 ||
      (members === 0 && percentage === 0) ||
      (ruleType === "fixed_number" && members === 0) ||
      (ruleType === "percentage" && percentage === 0)) {
    throw new Error("Enter a valid minimum member count and/or percentage threshold.");
  }
  const bodyRules = existing.filter(r => r.governance_body_id === bodyId);
  if (bodyRules.some(r => r.status === "Active"))
    throw new Error("This governance body already has an active rule. Archive it before creating another version.");
  const nextVersion = Math.max(0, ...bodyRules.map(r => Number(r.policy_version) || 1)) + 1;
  if (!identity.id.trim()) throw new Error("Missing quorum rule identity.");
  return {
    id: identity.id, rule_id: identity.id, rule_name: name,
    policy_version: nextVersion,
    governance_body_id: bodyId, body_name: body.body_name,
    rule_type: ruleType as "fixed_number" | "percentage",
    minimum_members_count: members, minimum_percentage: percentage,
    minimum_members: String(members), quorum_percent: `${percentage}%`,
    calculation_basis: ruleType === "percentage" ? "Voting Members Only" : "Total Registered Members",
    exception_rules: "",
    count_virtual_attendance: values.count_virtual_attendance !== false,
    count_alternate_members: values.count_alternate_members === true,
    exclude_recused_members: values.exclude_recused_members !== false,
    lost_quorum_action: "pause",
    status: "Active", created_at: identity.created_at,
  };
}

export async function createVersionedQuorumRule(
  values: Record<string, unknown>,
  identity: { id: string; created_at: string },
  bodies: readonly GovernanceBody[],
  gateway: QuorumRuleGateway,
): Promise<VersionedQuorumRule> {
  const before = await gateway.list();
  const intended = prepareVersionedQuorumRule(values, identity, bodies, before);
  if (!await gateway.create(intended)) throw new Error("The quorum policy was not acknowledged by SQL.");
  const after = await gateway.list();
  const saved = after.find(r => r.id === intended.id);
  if (!saved || saved.rule_id !== intended.rule_id || saved.governance_body_id !== intended.governance_body_id ||
      saved.policy_version !== intended.policy_version || saved.status !== "Active" ||
      saved.minimum_members_count !== intended.minimum_members_count ||
      saved.minimum_percentage !== intended.minimum_percentage) {
    throw new Error("The quorum rule SQL readback was inconsistent. Refresh before retrying.");
  }
  return saved;
}

export async function deactivateQuorumRule(
  id: string, gateway: QuorumRuleGateway,
): Promise<boolean> {
  const before = await gateway.list();
  const existing = before.find(r => r.id === id);
  if (!existing || existing.status !== "Active")
    throw new Error("The quorum policy is no longer active. Refresh before retrying.");
  if (!await gateway.update(id, { status: "Inactive" } as Partial<VersionedQuorumRule>))
    throw new Error("The quorum policy was not deactivated by SQL.");
  const readback = await gateway.list();
  if (readback.find(r => r.id === id)?.status !== "Inactive")
    throw new Error("Quorum rule deactivation was not confirmed by SQL.");
  return true;
}
