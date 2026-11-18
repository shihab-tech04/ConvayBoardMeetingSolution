/**
 * NI-15 controller integration hook.
 * Additive only: NI-14 owner must integrate it into IntegrationsPage after
 * resolving the existing status-filter patch and SQL read contract.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccessSnapshot } from "../../services/supabase/convayAccess";
import {
  loadProviderConnectionRead,
} from "./integrationConnectionRead";
import {
  summarizeIntegrationConnectionRead,
  type ConnectionReadState,
} from "./integrationKpiSummary";

export function useIntegrationConnectionKpis(catalogueIds: readonly string[]) {
  const snapshot = useAccessSnapshot();
  // Caller supplies the stable IDs from existing INTEGRATIONS catalogue.
  const idsKey = catalogueIds.join("\u0000");
  const stableIds = useMemo(() => idsKey.split("\u0000").filter(Boolean), [idsKey]);
  const [read, setRead] = useState<ConnectionReadState>({ state: "loading" });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  // NI-14/15 is non-delegable: a granted admin_integrations code is not root authority.
  const allowed = snapshot.loaded && snapshot.is_super_admin;

  useEffect(() => {
    if (!snapshot.loaded) {
      setRead(snapshot.error
        ? { state: "error", error: snapshot.error } : { state: "loading" });
      return;
    }
    if (!allowed) {
      setRead({ state: "error", error: "Not authorized to view integrations" });
      return;
    }
    let active = true;
    setRead({ state: "loading" });
    void loadProviderConnectionRead(stableIds).then(result => {
      if (active) setRead(result);
    });
    return () => { active = false; };
  }, [snapshot.loaded, snapshot.error, allowed, stableIds, revision]);

  const kpis = useMemo(() => summarizeIntegrationConnectionRead(read), [read]);
  return { read, kpis, refresh, allowed, accessReady: snapshot.loaded };
}
