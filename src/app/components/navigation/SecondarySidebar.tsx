import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getVisibleNav } from "../../data/navigation";
import { useSecNavWidth } from "../../hooks/useUI";
import { useRouteNav } from "../../hooks/useRouteNav";

type LucideIcon = React.ComponentType<{
  size?: number; strokeWidth?: number; style?: React.CSSProperties; className?: string;
}>;

interface ThirdNavDef {
  id: string;
  label: string;
  labelKey?: string;
  icon?: LucideIcon;
}

interface SubNavDef {
  id: string;
  label: string;
  labelKey?: string;
  icon?: LucideIcon;
  children?: ThirdNavDef[];
}

interface MainNavDef {
  id: string;
  label: string;
  labelKey?: string;
  icon: LucideIcon;
  children: SubNavDef[];
}

interface SecondarySidebarProps {
  onSubNavClick: (mainIdOrSubId: string, subId?: string) => void;
  onThirdNavClick: (thirdId: string, parentId: string, mainId?: string) => void;
  onMobileClose: () => void;
}

// ── NavTooltip ────────────────────────────────────────────────────────────────
function NavTooltip({ label, triggerRect }: { label: string; triggerRect: DOMRect }) {
  if (typeof document === "undefined") return null;
  const top = triggerRect.top + triggerRect.height / 2;
  const left = triggerRect.right + 10;
  return createPortal(
    <div
      className="nav-tooltip"
      style={{ top: `${top}px`, left: `${left}px`, transform: "translateY(-50%)" }}
    >
      <div className="nav-tooltip__arrow" />
      <div className="nav-tooltip__bubble">{label}</div>
    </div>,
    document.body
  );
}

// ── CompactNavItem ────────────────────────────────────────────────────────────
function CompactNavItem({
  id, label, icon: Icon, active, onClick,
}: {
  id: string; label: string; icon?: LucideIcon; active: boolean; onClick: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={[
          "secondary-sidebar__compact-item",
          active ? "secondary-sidebar__compact-item--active" : "",
        ].join(" ")}
        onMouseEnter={() => {
          if (btnRef.current) setTooltipRect(btnRef.current.getBoundingClientRect());
        }}
        onMouseLeave={() => setTooltipRect(null)}
        onFocus={() => {
          if (btnRef.current) setTooltipRect(btnRef.current.getBoundingClientRect());
        }}
        onBlur={() => setTooltipRect(null)}
      >
        {Icon
          ? <Icon size={16} strokeWidth={active ? 2.5 : 1.75} />
          : <span className={`secondary-sidebar__compact-item-dot${active ? "--active" : ""}`} aria-hidden="true" />
        }
      </button>
      {tooltipRect && <NavTooltip label={label} triggerRect={tooltipRect} />}
    </>
  );
}

// ── SubNavRow ─────────────────────────────────────────────────────────────────
// Items with children navigate to their first child; third-level appears as tabs in content area.
function SubNavRow({
  item, activeSubId, activeThirdId, onSelect, onThirdSelect, parentId, translate,
}: {
  item: SubNavDef;
  activeSubId: string | null; activeThirdId: string | null;
  onSelect: (id: string) => void;
  onThirdSelect: (thirdId: string, parentId: string) => void;
  parentId: string;
  translate: (key: string, fallback: string) => string;
}) {
  const hasChildren = !!(item.children && item.children.length > 0);
  const isParentOfActive = hasChildren && item.children!.some((c) => c.id === activeThirdId);
  const isActive = !hasChildren && activeSubId === item.id;
  const ItemIcon = item.icon;

  const getLabel = () => {
    if (item.labelKey) return translate(item.labelKey, item.label);
    const parentKey = parentId.replace(/-./g, (m) => m[1].toUpperCase());
    const childKey = item.id.replace(/-./g, (m) => m[1].toUpperCase());
    return translate(`${parentKey}.${childKey}`, item.label);
  };

  return (
    <div className="secondary-sidebar__sub-row">
      <button
        onClick={() => {
          if (hasChildren) {
            onThirdSelect(item.children![0].id, item.id);
          } else {
            onSelect(item.id);
          }
        }}
        className={[
          "secondary-sidebar__sub-button",
          isActive ? "secondary-sidebar__sub-button--active" : "",
          isParentOfActive ? "secondary-sidebar__sub-button--parent-active" : "",
        ].join(" ")}
        aria-current={isActive || isParentOfActive ? "page" : undefined}
      >
        {ItemIcon && (
          <span className="secondary-sidebar__sub-icon-wrapper" aria-hidden="true">
            <ItemIcon
              size={14}
              strokeWidth={isActive || isParentOfActive ? 2.5 : 1.75}
              className={[
                "secondary-sidebar__sub-icon",
                isActive ? "secondary-sidebar__sub-icon--active" : "",
                isParentOfActive ? "secondary-sidebar__sub-icon--parent" : "",
              ].join(" ")}
            />
          </span>
        )}
        <span className="secondary-sidebar__sub-label">{getLabel()}</span>
      </button>
    </div>
  );
}

// ── SecondarySidebar ──────────────────────────────────────────────────────────
// Active state and accordion expansion derived entirely from URL via useRouteNav.
export function SecondarySidebar({
  onSubNavClick,
  onThirdNavClick,
  onMobileClose,
}: SecondarySidebarProps) {
  const { activeMain, activeSub, activeThird } = useRouteNav();
  const { secNavWidth, secNavCompact } = useSecNavWidth();

  const visibleNav = getVisibleNav();
  const activeMainItem = visibleNav.find(n => n.id === activeMain) ?? visibleNav[0];

  const translate = (_key: string, fallback: string): string => fallback;

  const getNavLabel = (_parentId: string, _childId: string, _labelKey: string | undefined, fallback: string): string => fallback;

  const sectionLabel = activeMainItem.labelKey
    ? translate(activeMainItem.labelKey, activeMainItem.label)
    : activeMainItem.label;

  return (
    <div
      className="secondary-sidebar__container"
      style={{ width: secNavWidth, minWidth: secNavWidth }}
    >
      {secNavCompact ? (
        /* ── Compact (icon-only) mode ── */
        <div className="secondary-sidebar__compact">
          <nav
            className="secondary-sidebar__compact-nav"
            aria-label={`${sectionLabel} navigation`}
          >
            {activeMainItem.children.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const hasSingleChild = hasChildren && item.children!.length === 1;
              const isActive = hasChildren
                ? (hasSingleChild && activeThird === item.children![0].id) || item.children!.some(c => c.id === activeThird)
                : activeSub === item.id;

              return (
                <CompactNavItem
                  key={item.id}
                  id={item.id}
                  label={getNavLabel(activeMainItem.id, item.id, item.labelKey, item.label)}
                  icon={item.icon}
                  active={isActive}
                  onClick={() => {
                    if (hasSingleChild) {
                      onThirdNavClick(item.children![0].id, item.id);
                    } else if (hasChildren) {
                      onThirdNavClick(item.children![0].id, item.id);
                    } else {
                      onSubNavClick(item.id);
                    }
                  }}
                />
              );
            })}
          </nav>
        </div>
      ) : (
        /* ── Expanded mode ── */
        <div className="secondary-sidebar__expanded">
          <div className="secondary-sidebar__expanded-header">
            <div className="secondary-sidebar__header-content">
              <div className="secondary-sidebar__header-icon" aria-hidden="true">
                {(() => { const NavIcon = activeMainItem.icon; return <NavIcon size={15} strokeWidth={1.75} />; })()}
              </div>
              <h2 className="secondary-sidebar__header-title">{sectionLabel}</h2>
            </div>
          </div>
          <nav
            className="secondary-sidebar__expanded-nav"
            aria-label={`${sectionLabel} navigation`}
          >
            {activeMainItem.children.map((item) => (
              <SubNavRow
                key={item.id}
                item={item}
                activeSubId={activeSub}
                activeThirdId={activeThird}
                onSelect={onSubNavClick}
                onThirdSelect={onThirdNavClick}
                parentId={activeMainItem.id}
                translate={translate}
              />
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
