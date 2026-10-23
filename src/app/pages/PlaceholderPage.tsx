import { useRouteNav } from "../hooks/useRouteNav";
import { getVisibleNav } from "../data/navigation";

export function PlaceholderPage() {
  const { activeMain } = useRouteNav();

  const activeMainItem = getVisibleNav().find((n) => n.id === activeMain);
  const mainLabel = activeMainItem?.label || "Section";

  return (
    <div className="placeholder-page">
      <div className="placeholder-page__content">
        <div className="placeholder-page__icon">
          {activeMainItem?.icon && (() => {
            const Icon = activeMainItem.icon;
            return <Icon size={48} strokeWidth={1.5} className="placeholder-page__icon-svg" />;
          })()}
        </div>
        <h1 className="placeholder-page__title">
          {mainLabel}
        </h1>
        <p className="placeholder-page__message">
          Please select a page from the sidebar to continue.
        </p>
      </div>
    </div>
  );
}
