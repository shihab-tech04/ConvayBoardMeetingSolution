import { useRef, useEffect, useCallback } from "react";

interface TabBarProps {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll active tab into view when it changes (horizontal tab bars on mobile)
  useEffect(() => {
    const idx = tabs.findIndex(t => t.id === active);
    if (idx >= 0) {
      btnRefs.current[idx]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
  }, [active, tabs]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, idx: number) => {
    let next = idx;
    if      (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft")  next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home")       next = 0;
    else if (e.key === "End")        next = tabs.length - 1;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(tabs[idx].id);
      return;
    } else { return; }
    e.preventDefault();
    btnRefs.current[next]?.focus();
    onChange(tabs[next].id);
  }, [tabs, onChange]);

  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((tab, idx) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={el => { btnRefs.current[idx] = el; }}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={e => handleKeyDown(e, idx)}
            className={`tab-bar__tab${isActive ? " tab-bar__tab--active" : ""}`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="tab-bar__count">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
