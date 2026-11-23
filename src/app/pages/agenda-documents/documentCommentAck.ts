/**
 * DC-14: only a strict SQL-backed registry acknowledgement can complete a
 * comment post or resolution. A denied, cancelled or stale session returns
 * false from the existing EntityRegistry; 2xx alone is not sufficient.
 */
export async function requireDocumentCommentAck(
  mutate: () => boolean | Promise<boolean>,
  operation: "post" | "resolve",
): Promise<void> {
  const accepted = await mutate();
  if (accepted !== true) {
    throw new Error(operation === "post"
      ? "Comment was not confirmed by the server. Refresh before retrying."
      : "Resolution was not confirmed by the server. Refresh before retrying.");
  }
}
