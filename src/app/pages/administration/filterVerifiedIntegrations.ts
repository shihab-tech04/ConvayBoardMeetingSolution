/** NI-14 search/status/category intersection on server-projected integration cards. */
import type { IntegrationConnectionStatus } from "./integrationKpiSummary";

export interface VerifiedIntegrationFilter {
  category: string;
  status: "All" | IntegrationConnectionStatus;
  search: string;
}

export function filterVerifiedIntegrations<T extends {
  category: string;
  status: IntegrationConnectionStatus | "Unverified";
  name: string;
  description: string;
}>(items: readonly T[], { category, status, search }: VerifiedIntegrationFilter): T[] {
  const term = search.trim().toLocaleLowerCase();
  return items.filter(item =>
    (category === "All" || item.category === category) &&
    (status === "All" || item.status === status) &&
    (!term || [item.name, item.description, item.category]
      .some(value => value.toLocaleLowerCase().includes(term))),
  );
}
