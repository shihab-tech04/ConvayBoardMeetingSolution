/** Prevent stale asynchronous document loads from overwriting another document. */
export async function runScopedEditorLoad<T>(
  load: () => Promise<T>,
  isCurrent: () => boolean,
  accept: (result: T) => void,
  onFailure: () => void,
  onSettled: () => void,
): Promise<void> {
  try {
    const result = await load();
    if (isCurrent()) accept(result);
  } catch {
    if (isCurrent()) onFailure();
  } finally {
    if (isCurrent()) onSettled();
  }
}
