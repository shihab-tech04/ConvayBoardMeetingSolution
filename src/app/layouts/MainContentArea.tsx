import { useAccessSnapshot, reloadAccessSnapshot, mayVisitPath } from "../services/supabase/convayAccess";
import { Suspense, startTransition, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { PageLoader } from "../components/shared/PageLoader";
import { TabBar } from "../components/tabs/TabBar";
import { getVisibleNav } from "../data/navigation";
import { useRouteNav } from "../hooks/useRouteNav";

export function MainContentArea() {
  const location = useLocation();
  const access = useAccessSnapshot();
  useEffect(() => {
    void reloadAccessSnapshot().catch(() => {});
  }, [location.pathname]);
  useEffect(() => {
    // Another browser session can change this user's role or permissions.
    // Refresh when this application returns to the foreground.
    const refresh = () => { void reloadAccessSnapshot().catch(() => {}); };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const { activeMain, activeSub, activeThird } = useRouteNav();
  const navigate = useNavigate();
  const mainItem = getVisibleNav().find(n => n.id === activeMain);
  const subItem = mainItem?.children.find(c => c.id === activeSub);
  const tabs = subItem?.children;

  const handleTabChange = (tabId: string) => {
    startTransition(() => navigate(`/${activeMain}/${activeSub}/${tabId}`));
  };

  const authorized = mayVisitPath(location.pathname, access);
  return (
    <main id="main-content" tabIndex={-1} className="app-page-content app-page-content--workspace">
      {tabs && tabs.length > 0 && (
        <div className="app-content-tabs">
          <TabBar
            tabs={tabs.map(tab => ({ id: tab.id, label: tab.label }))}
            active={activeThird || tabs[0].id}
            onChange={handleTabChange}
          />
        </div>
      )}
      <Suspense fallback={<PageLoader />}>
        {authorized ? <Outlet /> : <div className="table-page" role="alert"><h1>Access denied</h1><p>Your role does not have permission to open this feature.</p></div>}
      </Suspense>
    </main>
  );
}
