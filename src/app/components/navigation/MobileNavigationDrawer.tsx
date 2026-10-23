import { useState } from "react";
import { ChevronRight, Palette } from "lucide-react";
import { getVisibleNav } from "../../data/navigation";
import { useRouteNav } from "../../hooks/useRouteNav";
import { SidebarLogo } from "./SidebarLogo";
import { AppearanceSettingsPanel } from "../appearance/AppearanceSettingsPanel";

type LucideIcon = React.ComponentType<{
  size?: number; strokeWidth?: number; style?: React.CSSProperties; className?: string;
}>;

interface SubNavDef {
  id: string;
  label: string;
  labelKey?: string;
  icon?: LucideIcon;
  children?: { id: string; label: string; labelKey?: string; icon?: LucideIcon }[];
}

interface MobileNavigationDrawerProps {
  onLogoClick: () => void;
  onMainNavClick: (id: string) => void;
  onSubNavClick: (mainId: string, subId: string) => void;
  onThirdNavClick: (thirdId: string, parentId: string, mainId: string) => void;
  onClose: () => void;
}

// Active state and accordion expansion derived entirely from URL via useRouteNav.
export function MobileNavigationDrawer({
  onLogoClick,
  onMainNavClick,
  onSubNavClick,
  onThirdNavClick,
  onClose,
}: MobileNavigationDrawerProps) {
  const { activeMain, activeSub, activeThird } = useRouteNav();

  const visibleNav = getVisibleNav();
  const [expandedMain, setExpandedMain] = useState<string | null>(activeMain);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const getMainLabel = (item: typeof visibleNav[0]): string => item.label;

  const getSubLabel = (_parentId: string, _childId: string, _labelKey: string | undefined, fallback: string): string => fallback;

  const handleMainItemClick = (mainItem: typeof visibleNav[0]) => {
    const hasChildren = mainItem.children && mainItem.children.length > 0;
    if (hasChildren) {
      setExpandedMain(prev => prev === mainItem.id ? null : mainItem.id);
    } else {
      onMainNavClick(mainItem.id);
      onClose();
    }
  };

  const handleSubItemClick = (mainId: string, subItem: SubNavDef) => {
    const hasChildren = subItem.children && subItem.children.length > 0;
    if (hasChildren) {
      // Navigate to first child; tabs appear in content area
      onThirdNavClick(subItem.children![0].id, subItem.id, mainId);
      onClose();
    } else {
      onSubNavClick(mainId, subItem.id);
      onClose();
    }
  };

  return (
    <div className="mobile-nav-drawer">
      {/* Logo / Header */}
      <div className="mobile-nav-drawer__header">
        <SidebarLogo onLogoClick={onLogoClick} />
      </div>

      {/* Navigation List */}
      <nav className="mobile-nav-drawer__nav" aria-label="Mobile Navigation">
        {visibleNav.map((mainItem) => {
          const MainIcon = mainItem.icon;
          const isMainActive = activeMain === mainItem.id;
          const hasChildren = mainItem.children && mainItem.children.length > 0;
          const isExpanded = expandedMain === mainItem.id;
          const submenuId = `mobile-nav-sub-${mainItem.id}`;

          return (
            <div key={mainItem.id} className="mobile-nav-drawer__section">
              {/* 1st Layer - Main Navigation Item */}
              <button
                onClick={() => handleMainItemClick(mainItem)}
                className={[
                  "mobile-nav-drawer__main-item",
                  isMainActive ? "mobile-nav-drawer__main-item--active" : "",
                ].join(" ")}
                aria-expanded={hasChildren ? isExpanded : undefined}
                aria-controls={hasChildren ? submenuId : undefined}
                aria-current={isMainActive ? "page" : undefined}
              >
                <div className="mobile-nav-drawer__main-item-content">
                  <MainIcon
                    size={20}
                    strokeWidth={isMainActive ? 2.5 : 1.75}
                    className="mobile-nav-drawer__main-item-icon"
                    aria-hidden="true"
                  />
                  <span className="mobile-nav-drawer__main-item-label">
                    {getMainLabel(mainItem)}
                  </span>
                </div>
                {hasChildren && (
                  <ChevronRight
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                    className={[
                      "mobile-nav-drawer__chevron",
                      isExpanded ? "mobile-nav-drawer__chevron--expanded" : "",
                    ].join(" ")}
                  />
                )}
              </button>

              {/* 2nd Layer - Submenu Items */}
              {isExpanded && hasChildren && (
                <div id={submenuId} className="mobile-nav-drawer__submenu">
                  {mainItem.children.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const hasSubChildren = subItem.children && subItem.children.length > 0;

                    const isSubActive = hasSubChildren
                      ? subItem.children!.some((c) => c.id === activeThird)
                      : activeSub === subItem.id;

                    return (
                      <div key={subItem.id} className="mobile-nav-drawer__sub-section">
                        <button
                          onClick={() => handleSubItemClick(mainItem.id, subItem)}
                          className={[
                            "mobile-nav-drawer__sub-item",
                            isSubActive ? "mobile-nav-drawer__sub-item--active" : "",
                          ].join(" ")}
                          aria-current={isSubActive ? "page" : undefined}
                        >
                          <div className="mobile-nav-drawer__sub-item-content">
                            {SubIcon && (
                              <SubIcon
                                size={16}
                                strokeWidth={isSubActive ? 2.5 : 1.75}
                                className="mobile-nav-drawer__sub-item-icon"
                                aria-hidden="true"
                              />
                            )}
                            <span className="mobile-nav-drawer__sub-item-label">
                              {getSubLabel(mainItem.id, subItem.id, subItem.labelKey, subItem.label)}
                            </span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer: Appearance */}
      <div className="mobile-nav-drawer__footer">
        <button
          onClick={() => setAppearanceOpen(true)}
          className="mobile-nav-drawer__main-item"
          aria-label="Appearance settings"
        >
          <div className="mobile-nav-drawer__main-item-content">
            <Palette size={20} strokeWidth={1.75} className="mobile-nav-drawer__main-item-icon" aria-hidden="true" />
            <span className="mobile-nav-drawer__main-item-label">Appearance</span>
          </div>
        </button>
      </div>

      {appearanceOpen && (
        <AppearanceSettingsPanel isMobile onClose={() => setAppearanceOpen(false)} />
      )}
    </div>
  );
}
