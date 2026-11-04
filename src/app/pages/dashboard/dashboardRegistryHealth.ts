/**
 * HM-01: A dashboard is not "empty" until ALL of its authoritative registries
 * have loaded successfully. This helper has no React dependency so error,
 * loading, ready and retry behavior can be checked independently.
 */
export interface DashboardDataSource {
  loading?: boolean;
  error?: string | null;
  refresh?: () => Promise<void>;
}

export type DashboardDataState = "loading" | "error" | "ready";

export function resolveDashboardDataState(sources: readonly DashboardDataSource[]): DashboardDataState {
  if (sources.some(source => Boolean(source.error))) return "error";
  if (sources.some(source => source.loading)) return "loading";
  return "ready";
}

export async function retryDashboardSources(sources: readonly DashboardDataSource[]): Promise<void> {
  // Attempt every source, even if another source fails. The registry keeps and
  // publishes the resulting error state; callers never infer success here.
  await Promise.allSettled(
    sources.map(source => source.refresh ? source.refresh() : Promise.resolve()),
  );
}
