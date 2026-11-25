/** Keep the displayed user count aligned with the authoritative directory read state. */
export function userDirectoryCountLabel(statsUnavailable: boolean, loading: boolean, total: number): string {
  const count = statsUnavailable
    ? loading ? "Loading users" : "User count unavailable"
    : `${total} users`;
  return `${count} · Manage system users and access`;
}
