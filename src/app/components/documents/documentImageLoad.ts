/**
 * DC-15: scope async image bytes/object URLs to one mounted viewer.
 * A late file response may never render into a newer document viewer, and
 * every object URL created during a still-active load must be revoked.
 */
export function startScopedDocumentImageLoad<T>(
  load: () => Promise<T>,
  createObjectUrl: (file: T) => string,
  revokeObjectUrl: (url: string) => void,
  onReady: (url: string) => void,
  onError: () => void,
): { cancel: () => void; settled: Promise<void> } {
  let cancelled = false;
  let currentUrl: string | null = null;
  const settled = (async () => {
    try {
      const file = await load();
      if (cancelled) return;
      const url = createObjectUrl(file);
      if (cancelled) {
        revokeObjectUrl(url);
        return;
      }
      currentUrl = url;
      onReady(url);
    } catch {
      if (!cancelled) onError();
    }
  })();

  return {
    cancel: () => {
      cancelled = true;
      if (currentUrl !== null) {
        revokeObjectUrl(currentUrl);
        currentUrl = null;
      }
    },
    settled,
  };
}
