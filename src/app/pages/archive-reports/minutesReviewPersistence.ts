/** MN-11/12/15: bind a confirmed workflow intent to one authorized SQL revision. */
type ReviewIdentity = { id: string; minutes_id: string; meeting_id: string; version: string; approval_status: string };
type Selection = Partial<Record<keyof ReviewIdentity | "source_revision", unknown>>;
type WorkflowPatch = { approval_status: string; version?: string };
const IDENTITY_KEYS = ["id", "minutes_id", "meeting_id"] as const;

export async function persistMinutesReviewTransition<T extends ReviewIdentity>(
  selection: Selection,
  buildPatch: (record: T) => WorkflowPatch,
  gateway: {
    list(): Promise<readonly { payload: T; revision: number }[]>;
    update(record: T, expectedRevision: number): Promise<number | undefined>;
    assertCurrent(): void;
  },
): Promise<T> {
  const revision = selection.source_revision;
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 1 || revision >= Number.MAX_SAFE_INTEGER ||
      [...IDENTITY_KEYS, "version", "approval_status"].some(key => typeof selection[key as keyof Selection] !== "string" || !String(selection[key as keyof Selection]).trim())) {
    throw new Error("Minutes selection is invalid. Reopen the record before confirming.");
  }
  const read = async () => {
    gateway.assertCurrent();
    const rows = await gateway.list();
    gateway.assertCurrent();
    const matches = rows.filter(row => row.payload.id === selection.id);
    if (matches.length !== 1 || IDENTITY_KEYS.some(key => matches[0].payload[key] !== selection[key]) ||
        rows.some(row => row.payload.id !== selection.id && row.payload.minutes_id === selection.minutes_id)) {
      throw new Error("Minutes identity is missing or ambiguous. Reopen before confirming.");
    }
    return matches[0];
  };
  const before = await read();
  if (before.revision !== revision || before.payload.version !== selection.version || before.payload.approval_status !== selection.approval_status) {
    throw new Error("Minutes revision or review stage changed. Reopen before confirming.");
  }
  const patch = buildPatch(before.payload);
  const intended = { ...before.payload, ...patch };
  gateway.assertCurrent();
  // Never resend a possibly committed write. Without a trusted acknowledgement
  // do not attribute a matching concurrent transition to this reviewer.
  let failure: unknown;
  let acknowledged: number | undefined;
  try { acknowledged = await gateway.update(intended, revision); }
  catch (error) { failure = error; }
  const after = await read();
  if (after.revision === revision + 1 && after.payload.version === intended.version &&
      after.payload.approval_status === intended.approval_status &&
      failure === undefined && acknowledged === revision + 1) return after.payload;
  if (failure !== undefined) throw failure;
  throw new Error("Minutes transition could not be verified. Reopen before retrying.");
}
