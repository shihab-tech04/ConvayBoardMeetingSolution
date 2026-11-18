/** Resolve agenda ownership by a stable BMS user record, never by display name.
 *  Conflicting/duplicated identifiers fail closed; RLS remains authoritative. */
export interface AgendaIdentity { id?: string; employeeId?: string; email?: string }
export interface AgendaOwner { id: string; employee_id?: string; email?: string; name?: string }

export function resolveAgendaOwnerUserId(
  users: readonly AgendaOwner[],
  identity: AgendaIdentity,
): string | null {
  const candidates: { kind: string; matches: AgendaOwner[] }[] = [];
  const id = identity.id?.trim();
  const employeeId = identity.employeeId?.trim();
  const email = identity.email?.trim().toLowerCase();
  if (id) candidates.push({ kind: "id", matches: users.filter(u => u.id === id) });
  if (employeeId) candidates.push({ kind: "employeeId", matches: users.filter(u => u.employee_id === employeeId) });
  if (email) candidates.push({ kind: "email", matches: users.filter(u => u.email?.trim().toLowerCase() === email) });

  const observed = candidates.filter(c => c.matches.length > 0);
  if (!observed.length || observed.some(c => c.matches.length !== 1)) return null;
  const resolvedId = observed[0].matches[0].id;
  return observed.every(c => c.matches[0].id === resolvedId) ? resolvedId : null;
}

export function isAgendaOwnedBy(agendaOwnerId: string | undefined, currentOwnerId: string | null): boolean {
  return !!currentOwnerId && !!agendaOwnerId && currentOwnerId === agendaOwnerId;
}
