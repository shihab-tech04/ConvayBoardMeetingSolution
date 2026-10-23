import { getVisibleNav } from "../data/navigation";
import { useRouteNav } from "./useRouteNav";

export function useBreadcrumbs() {
  const { activeMain, activeSub, activeThird } = useRouteNav();

  const visibleNav = getVisibleNav();
  const activeMainItem = visibleNav.find((n) => n.id === activeMain) ?? visibleNav[0];

  function getNavLabel(_mainId: string, _subId?: string, thirdId?: string, fallback?: string): string {
    if (thirdId) return fallback || thirdId;
    return fallback || _subId || _mainId;
  }

  // Avoid "Home → Home" duplication when on the Home section
  const breadcrumbs: string[] = activeMainItem.id === "home"
    ? ["Home"]
    : ["Home", getNavLabel(activeMainItem.id, undefined, undefined, activeMainItem.label)];

  if (activeSub) {
    const subItem = activeMainItem.children.find((c) => c.id === activeSub);
    if (subItem) {
      breadcrumbs.push(getNavLabel(activeMainItem.id, subItem.id, undefined, subItem.label));
    }
    if (activeThird && subItem?.children) {
      const thirdItem = subItem.children.find((c) => c.id === activeThird);
      if (thirdItem) {
        breadcrumbs.push(getNavLabel(activeMainItem.id, subItem.id, thirdItem.id, thirdItem.label));
      }
    }
  }

  return { breadcrumbs, activeMainItem, getNavLabel };
}
