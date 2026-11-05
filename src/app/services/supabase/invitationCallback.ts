export interface SupabaseInvitationCallback {
  accessToken: string;
  type: string;
  error: string;
}

export function readSupabaseInvitationCallback(search: string, hash: string): SupabaseInvitationCallback {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    accessToken: query.get("access_token") || fragment.get("access_token") || "",
    type: query.get("type") || fragment.get("type") || "",
    error: query.get("error_description") || fragment.get("error_description") || "",
  };
}

export function isSupabaseInvitationCallback(search: string, hash: string): boolean {
  const callback = readSupabaseInvitationCallback(search, hash);
  return callback.type === "invite" && Boolean(callback.accessToken);
}
