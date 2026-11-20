/** AC-01: A background access snapshot refresh must never erase a user's role draft.
 * Initialize once per open editor identity, or when an existing role first loads.
 */
export function shouldHydrateRoleDraft(args: {
  open: boolean;
  roleId: string | null;
  roleExists: boolean;
  hydratedKey: string | null;
}): boolean {
  if (!args.open) return false;
  if (args.roleId && !args.roleExists) return false;
  return args.hydratedKey !== (args.roleId ?? "__new__");
}
