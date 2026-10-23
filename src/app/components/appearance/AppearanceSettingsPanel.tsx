import { createPortal } from "react-dom";
import { Palette, X } from "lucide-react";
import { ThemeOptionCard, type ThemeId, type ThemeConfig } from "./ThemeOptionCard";
import { FontOptionCard, type FontId, type FontConfig } from "./FontOptionCard";
import { FontSizeOptionCard, type FontSizeId, type FontSizeConfig } from "./FontSizeOptionCard";
import { useSettings } from "../../hooks/useSettings";
import { useAppearance } from "../../hooks/useAppearance";
import { THEMES, THEME_ORDER } from "../../data/themes";
import { FONTS, FONT_ORDER, FONT_SIZES, FONT_SIZE_ORDER } from "../../data/fonts";

// Suppress unused-import warnings for types exported by appearance files
export type { ThemeId, ThemeConfig, FontId, FontConfig, FontSizeId, FontSizeConfig };

interface AppearanceSettingsPanelProps {
  onClose: () => void;
  isMobile: boolean;
}

export function AppearanceSettingsPanel({ onClose, isMobile }: AppearanceSettingsPanelProps) {
  const { themeId, fontId, fontSizeId } = useSettings();
  const { setThemeId, setFontId, setFontSizeId } = useAppearance();

  const panelContent = (
    <div
      role="dialog"
      aria-label="Appearance Settings"
      className={`${isMobile ? "mobile-modal-wrapper mobile-modal-drawer" : ""} appearance-panel ${isMobile ? "appearance-panel--mobile" : "appearance-panel--desktop"}`}
    >
      {/* Fixed header */}
      <div className={`${isMobile ? "mobile-modal-header" : ""} appearance-panel__header`}>
        <div className="flex items-center gap-2.5">
          <div className="modal-form-header__icon">
            <Palette size={14} strokeWidth={2} />
          </div>
          <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            Appearance
          </span>
        </div>
        <button
          onClick={onClose}
          className={`${isMobile ? "mobile-modal-close" : ""} modal-form-header__close`}
          aria-label="Close appearance panel"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className={`${isMobile ? "mobile-modal-body" : ""} appearance-panel__body px-5 py-4 space-y-6`}>
        {/* Color Theme */}
        <div>
          <div className="appearance-panel__section-divider">
            <h3 className="appearance-panel__section-label">Color Theme</h3>
            <div className="appearance-panel__divider-line" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {THEME_ORDER.map((tid) => (
              <ThemeOptionCard key={tid} theme={THEMES[tid]} selected={themeId === tid} onSelect={setThemeId} />
            ))}
          </div>
        </div>

        {/* Font */}
        <div>
          <div className="appearance-panel__section-divider">
            <h3 className="appearance-panel__section-label">Font</h3>
            <div className="appearance-panel__divider-line" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FONT_ORDER.map((fid) => (
              <FontOptionCard key={fid} font={FONTS[fid]} selected={fontId === fid} onSelect={setFontId} />
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <div className="appearance-panel__section-divider">
            <h3 className="appearance-panel__section-label">Font Size</h3>
            <div className="appearance-panel__divider-line" />
          </div>
          <div className="flex flex-col gap-2">
            {FONT_SIZE_ORDER.map((fsid) => (
              <FontSizeOptionCard key={fsid} config={FONT_SIZES[fsid]} selected={fontSizeId === fsid} onSelect={setFontSizeId} />
            ))}
          </div>
        </div>

        <div className="pt-1 pb-1">
          <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            Changes apply immediately across the application.
          </p>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              className="mobile-modal-backdrop fixed inset-0"
              style={{ backgroundColor: "rgba(0,0,0,0.42)", zIndex: 200 }}
              onClick={onClose}
              aria-hidden="true"
            />
            {panelContent}
          </>,
          document.body
        )
      : null;
  }

  return panelContent;
}
