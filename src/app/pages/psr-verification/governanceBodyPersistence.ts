/**
 * GV-10 governance bodies: save acknowledgement plus independent SQL readback.
 * This is NOT a tenant-level unique-index or authorization substitute; WS0
 * owns the server uniqueness, actor/tenant and immutable audit contracts.
 */
import type { GovernanceBody } from "../../data/boardMeetingData";

export interface GovernanceBodyGateway {
  list: () => Promise<GovernanceBody[]>;
  create: (body: GovernanceBody) => Promise<boolean>;
  update: (id: string, patch: Partial<GovernanceBody>) => Promise<boolean>;
}
export type GovernanceBodyValues = Record<string, unknown>;

const BODY_FIELDS = [
  "body_name", "body_type", "chairperson", "secretary",
  "member_count", "quorum_requirement", "voting_method",
  "establishment_date", "mandate", "status",
] as const;
const STATUSES = new Set(["Active", "Inactive", "Suspended", "Dissolved"]);
const BODY_TYPES = new Set(["Board", "Committee", "Sub-Committee", "Advisory Panel", "Working Group"]);
const required = (value: string): boolean => value.trim().length > 0;
const norm = (value: string): string => value.trim().normalize("NFKC").toLocaleLowerCase();
function toPatch(values: GovernanceBodyValues): Partial<GovernanceBody> {
  const patch: Record<string, string> = {};
  for (const field of BODY_FIELDS) {
    const value = values[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== "string" && typeof value !== "number")
        throw new Error("Governance body fields must contain text or numbers.");
      patch[field] = String(value).trim();
    }
  }
  return patch as Partial<GovernanceBody>;
}
function hasCharter(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true; // Never silently discard a File/FileList/unknown attachment.
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}
function validate(values: GovernanceBodyValues, patch: Partial<GovernanceBody>) {
  if (hasCharter(values.charter))
    throw new Error("Charter upload is not connected to authorized Storage. Remove the attachment before saving.");
  for (const field of ["body_name", "body_type", "chairperson"] as const)
    if (patch[field] !== undefined && !required(patch[field]!))
      throw new Error("Governance body name, type and chairperson are required.");
  if (patch.body_type !== undefined && !BODY_TYPES.has(patch.body_type))
    throw new Error("Unsupported governance body type.");
  if (patch.status !== undefined && !STATUSES.has(patch.status))
    throw new Error("Unsupported governance body status.");
  if (patch.establishment_date && !validDate(patch.establishment_date))
    throw new Error("Invalid establishment date.");
}
function duplicates(rows: GovernanceBody[], name: string, kind: string, ignoreId?: string) {
  return rows.some((existing) =>
    existing.id !== ignoreId &&
    norm(existing.body_name) === norm(name) &&
    norm(existing.body_type) === norm(kind));
}
function assertReadback(actual: GovernanceBody | undefined, expected: Partial<GovernanceBody>) {
  if (!actual || Object.entries(expected).some(([field, value]) =>
    actual[field as keyof GovernanceBody] !== value))
    throw new Error("Governance body SQL readback is missing or inconsistent. Refresh before retrying.");
}
export async function createGovernanceBody(
  values: GovernanceBodyValues, identity: { id: string; created_at: string }, gateway: GovernanceBodyGateway,
): Promise<GovernanceBody> {
  const patch = toPatch(values);
  validate(values, patch);
  if (!required(identity.id) || !required(patch.body_name ?? "") ||
      !required(patch.body_type ?? "") || !required(patch.chairperson ?? ""))
    throw new Error("A unique body ID, name, type and chairperson are required.");
  const current = await gateway.list();
  if (current.some((row) => row.id === identity.id || row.body_id === identity.id) ||
      duplicates(current, patch.body_name!, patch.body_type!))
    throw new Error("That governance body or reference already exists. Refresh before retrying.");

  const body: GovernanceBody = {
    id: identity.id, body_id: identity.id, body_name: patch.body_name!,
    body_type: patch.body_type!, chairperson: patch.chairperson!,
    secretary: patch.secretary ?? "", member_count: patch.member_count ?? "0",
    quorum_requirement: patch.quorum_requirement ?? "", voting_method: patch.voting_method ?? "",
    establishment_date: patch.establishment_date ?? "", mandate: patch.mandate ?? "",
    status: patch.status ?? "Active", created_at: identity.created_at,
  };
  if (await gateway.create(body) !== true) {
    // A second administrator may have saved the same name/type between our
    // preflight read and the server write. Re-read before giving recovery advice.
    const latest = await gateway.list().catch(() => [] as GovernanceBody[]);
    if (latest.some(row => row.id === body.id || row.body_id === body.id) ||
        duplicates(latest, body.body_name, body.body_type)) {
      throw new Error("This governance body already exists. Refresh the list instead of creating a duplicate.");
    }
    throw new Error("The governance body was not saved by SQL.");
  }
  const readback = await gateway.list();
  assertReadback(readback.find((item) => item.id === body.id), body);
  return body;
}
export async function updateGovernanceBody(
  id: string, values: GovernanceBodyValues, gateway: GovernanceBodyGateway,
): Promise<boolean> {
  if (!required(id)) throw new Error("A governance body record ID is required.");
  const patch = toPatch(values);
  validate(values, patch);
  const current = await gateway.list();
  const previous = current.find((row) => row.id === id);
  if (!previous) throw new Error("Governance body not found. Refresh before retrying.");
  if (!Object.keys(patch).length) return true;
  if (duplicates(current, patch.body_name ?? previous.body_name, patch.body_type ?? previous.body_type, id))
    throw new Error("Another governance body already has that name and type.");
  if (await gateway.update(id, patch) !== true) {
    const latest = await gateway.list().catch(() => [] as GovernanceBody[]);
    if (duplicates(latest, patch.body_name ?? previous.body_name, patch.body_type ?? previous.body_type, id)) {
      throw new Error("Another governance body already has that name and type. Refresh the list.");
    }
    throw new Error("The governance body update was not confirmed by SQL.");
  }
  const readback = await gateway.list();
  assertReadback(readback.find((row) => row.id === id), { id, ...patch });
  return true;
}
