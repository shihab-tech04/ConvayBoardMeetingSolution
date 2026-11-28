import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { convayAuth } from "../services/supabase/convayAuth";
import { hasAccess, reloadAccessSnapshot } from "../services/supabase/convayAccess";
import type { ParticipationEvidenceRow } from "../services/reports/participationEvidence";

interface ReportState { userId: string | null; items: ParticipationEvidenceRow[]; loading: boolean; error: string | null }
const empty = (userId: string | null): ReportState => ({ userId, items: [], loading: true, error: null });

/** No cached cross-account results. RLS is the authoritative record boundary;
 * the report additionally rechecks both existing report and source grants. */
export function useScopedParticipationReport() {
  const { userId, isAuthenticated } = useAuth();
  const [state, setState] = useState<ReportState>(() => empty(userId));
  const epoch = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++epoch.current;
    setState(empty(userId));
    if (!isAuthenticated || !userId) return;
    const current = () => request === epoch.current;
    try {
      const access = await reloadAccessSnapshot();
      if (!current()) return;
      if (!hasAccess("rep_attendance", access) || !hasAccess("mtg_view", access)) throw new Error("Participation report permission denied.");
      const items = await convayAuth.participationEvidence();
      if (!current()) return;
      const readback = await reloadAccessSnapshot();
      if (!current()) return;
      if (!hasAccess("rep_attendance", readback) || !hasAccess("mtg_view", readback)) throw new Error("Participation report permission changed.");
      setState({ userId, items, loading: false, error: null });
    } catch (error) {
      if (current()) setState({ userId, items: [], loading: false, error: error instanceof Error ? error.message : "Participation report could not be loaded." });
    }
  }, [userId, isAuthenticated]);
  useEffect(() => {
    const invalidate = () => { epoch.current += 1; setState(empty(userId)); };
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("convay:entity-cache-cleared", invalidate);
    document.addEventListener("visibilitychange", visible);
    void refresh();
    return () => {
      epoch.current += 1;
      window.removeEventListener("convay:entity-cache-cleared", invalidate);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh, userId]);
  return { ...(isAuthenticated && state.userId === userId ? state : empty(userId)), refresh };
}
