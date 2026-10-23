import { Suspense, startTransition } from "react";
import { Outlet, useNavigate } from "react-router";
import { PageLoader } from "../components/shared/PageLoader";
import { TabBar } from "../components/tabs/TabBar";
import { getVisibleNav } from "../data/navigation";
import { useRouteNav } from "../hooks/useRouteNav";

export function MainContentArea() {
  const { activeMain, activeSub, activeThird } = useRouteNav();
  const navigate = useNavigate();
  const mainItem = getVisibleNav().find(n => n.id === activeMain);
  const subItem = mainItem?.children.find(c => c.id === activeSub);
  const tabs = subItem?.children;

  const handleTabChange = (tabId: string) => {
    startTransition(() => navigate(`/${activeMain}/${activeSub}/${tabId}`));
  };

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
        <Outlet />
      </Suspense>
    </main>
  );
}
