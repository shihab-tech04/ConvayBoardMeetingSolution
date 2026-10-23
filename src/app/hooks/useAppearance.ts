import { useEffect } from "react";
import { THEMES, type ThemeId } from "../data/themes";
import { FONTS, type FontId, type FontSizeId } from "../data/fonts";
import { rgba } from "../utils/colors";
import { useSettings, useSettingsDispatch } from "./useSettings";
import { setTheme, setFont, setFontSize } from "../store/settingsSlice";

/**
 * useAppearance — reads theme/font/fontSize from the centralized Redux store,
 * syncs DOM side-effects (CSS custom properties, font-family, data attributes),
 * and returns the derived ThemeConfig object plus typed setters.
 *
 * All setter calls automatically persist to localStorage via the Redux middleware.
 */
export function useAppearance() {
  const { themeId, fontId, fontSizeId } = useSettings();
  const dispatch = useSettingsDispatch();

  const t = THEMES[themeId];
  const fontFamily = FONTS[fontId].family;
  const textOnPrimary = "#FFFFFF";

  // Sync font family to document.body
  useEffect(() => {
    document.body.style.fontFamily = fontFamily;
    return () => { document.body.style.fontFamily = ""; };
  }, [fontFamily]);

  // Sync font size to data attribute
  useEffect(() => {
    const root = document.documentElement;
    if (fontSizeId === "standard") {
      root.removeAttribute("data-font-scale");
    } else {
      root.setAttribute("data-font-scale", fontSizeId);
    }
    return () => { root.removeAttribute("data-font-scale"); };
  }, [fontSizeId]);

  // Sync theme colors to CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    const isDark = themeId === "dark-mode";

    root.setAttribute("data-theme", themeId);

    if (isDark) {
      root.classList.add("theme-dark");
    } else {
      root.classList.remove("theme-dark");
    }

    // Base color tokens
    root.style.setProperty("--color-primary", t.primary);
    root.style.setProperty("--color-primary-dark", t.primaryDark);
    root.style.setProperty("--color-primary-light", t.primaryLight);
    root.style.setProperty("--color-secondary", t.secondary);
    root.style.setProperty("--color-accent", t.accent);
    root.style.setProperty("--color-background", t.background);
    root.style.setProperty("--color-surface", t.surface);
    root.style.setProperty("--color-border", t.border);
    root.style.setProperty("--color-text-primary", t.textPrimary);
    root.style.setProperty("--color-text-secondary", t.textSecondary);
    root.style.setProperty("--color-success", t.success);
    root.style.setProperty("--color-warning", t.warning);
    root.style.setProperty("--color-error", t.error);

    // Derived tokens — dark vs light
    if (isDark) {
      // Surface ladder
      root.style.setProperty("--color-background-subtle",   "#191B23");
      root.style.setProperty("--color-background-zebra",    "#20232D");
      root.style.setProperty("--color-surface-secondary",   "#20232D");
      root.style.setProperty("--color-surface-raised",      "#272B36");
      root.style.setProperty("--color-surface-overlay",     "#2D323F");
      root.style.setProperty("--color-surface-high",        "#343A49");
      root.style.setProperty("--color-surface-hover",       "#2B303C");
      root.style.setProperty("--color-surface-selected",    "#303752");
      // Borders
      root.style.setProperty("--color-border-subtle",       "#292D38");
      root.style.setProperty("--color-border-strong",       "#4A5060");
      root.style.setProperty("--color-divider",             "rgba(255,255,255,0.10)");
      // Text
      root.style.setProperty("--color-text-muted",          "#8D95A3");
      root.style.setProperty("--color-text-disabled",       "#626977");
      root.style.setProperty("--color-text-inverse",        "#171922");
      root.style.setProperty("--color-text-on-primary",     "#FFFFFF");
      // Primary hover/active
      root.style.setProperty("--color-primary-hover",       "#0D747D");
      root.style.setProperty("--color-primary-active",      "#0B6269");
      root.style.setProperty("--color-primary-container",   "#0B3034");
      root.style.setProperty("--color-on-primary-container","#BFECEF");
      // Secondary
      root.style.setProperty("--color-secondary-container", "#29394B");
      root.style.setProperty("--color-on-secondary",        "#152231");
      root.style.setProperty("--color-on-secondary-container","#DCEBFA");
      // Semantic containers
      root.style.setProperty("--color-success-container",   "#183C2A");
      root.style.setProperty("--color-on-success",          "#092116");
      root.style.setProperty("--color-on-success-container","#C6F3D7");
      root.style.setProperty("--color-warning-container",   "#49380D");
      root.style.setProperty("--color-on-warning",          "#281B00");
      root.style.setProperty("--color-on-warning-container","#FFE8AE");
      root.style.setProperty("--color-error-container",     "#5B1B1B");
      root.style.setProperty("--color-on-error",            "#3A0907");
      root.style.setProperty("--color-on-error-container",  "#FFDAD6");
      root.style.setProperty("--color-info",                "#8EC8FF");
      root.style.setProperty("--color-info-container",      "#183A59");
      root.style.setProperty("--color-on-info",             "#082137");
      root.style.setProperty("--color-on-info-container",   "#D1E9FF");
      // Inputs
      root.style.setProperty("--color-input-background",    "#20232D");
      root.style.setProperty("--color-input-hover",         "#272B36");
      root.style.setProperty("--color-input-border",        "#414756");
      root.style.setProperty("--color-input-focus",         "#0F828C");
      root.style.setProperty("--color-input-placeholder",   "#858D9B");
      root.style.setProperty("--color-input-disabled",      "#191B23");
      // Interactive state overlays
      root.style.setProperty("--state-hover",               "rgba(255,255,255,0.06)");
      root.style.setProperty("--state-pressed",             "rgba(255,255,255,0.10)");
      root.style.setProperty("--state-selected",            "rgba(15,130,140,0.14)");
      root.style.setProperty("--state-focus",               "rgba(15,130,140,0.62)");
      root.style.setProperty("--state-disabled",            "rgba(255,255,255,0.04)");
      root.style.setProperty("--color-scrim",               "rgba(0,0,0,0.64)");
      // Shadows
      root.style.setProperty("--shadow-sm",  "0 2px 8px rgba(0,0,0,0.28)");
      root.style.setProperty("--shadow-md",  "0 8px 24px rgba(0,0,0,0.38)");
      root.style.setProperty("--shadow-lg",  "0 18px 48px rgba(0,0,0,0.48)");
      // Alpha variants (0F828C = 15,130,140)
      root.style.setProperty("--color-primary-shadow",         "rgba(15,130,140,0.24)");
      root.style.setProperty("--color-primary-alpha-2",        "rgba(15,130,140,0.02)");
      root.style.setProperty("--color-primary-alpha-3",        "rgba(15,130,140,0.03)");
      root.style.setProperty("--color-primary-alpha-4",        "rgba(15,130,140,0.04)");
      root.style.setProperty("--color-primary-alpha-5",        "rgba(15,130,140,0.05)");
      root.style.setProperty("--color-primary-alpha-6",        "rgba(15,130,140,0.06)");
      root.style.setProperty("--color-primary-alpha-8",        "rgba(15,130,140,0.08)");
      root.style.setProperty("--color-primary-alpha-10",       "rgba(15,130,140,0.10)");
      root.style.setProperty("--color-primary-alpha-12",       "rgba(15,130,140,0.12)");
      root.style.setProperty("--color-primary-alpha-20",       "rgba(15,130,140,0.20)");
      // Text alphas (F1F3F7 ≈ 241,243,247)
      root.style.setProperty("--color-text-primary-alpha-2",   "rgba(241,243,247,0.02)");
      root.style.setProperty("--color-text-primary-alpha-3",   "rgba(241,243,247,0.03)");
      root.style.setProperty("--color-text-primary-alpha-12",  "rgba(241,243,247,0.12)");
      // Text-secondary alphas (B7BDC9 ≈ 183,189,201)
      root.style.setProperty("--color-text-secondary-alpha-4", "rgba(183,189,201,0.04)");
      root.style.setProperty("--color-text-secondary-alpha-8", "rgba(183,189,201,0.08)");
      // Border alpha
      root.style.setProperty("--color-border-alpha-5",         "rgba(74,80,96,0.50)");
      // Secondary alpha (A9BED9 ≈ 169,190,217)
      root.style.setProperty("--color-secondary-alpha-12",     "rgba(169,190,217,0.12)");
      // Error alphas (FFB4AB ≈ 255,180,171)
      root.style.setProperty("--color-error-alpha-8",          "rgba(255,180,171,0.08)");
      root.style.setProperty("--color-error-alpha-10",         "rgba(255,180,171,0.10)");
      root.style.setProperty("--color-error-alpha-15",         "rgba(255,180,171,0.15)");
      root.style.setProperty("--color-error-alpha-30",         "rgba(255,180,171,0.30)");
      // Warning alphas (F2C76D ≈ 242,199,109)
      root.style.setProperty("--color-warning-alpha-8",        "rgba(242,199,109,0.08)");
      root.style.setProperty("--color-warning-alpha-10",       "rgba(242,199,109,0.10)");
      root.style.setProperty("--color-warning-alpha-15",       "rgba(242,199,109,0.15)");
      root.style.setProperty("--color-warning-alpha-20",       "rgba(242,199,109,0.20)");
      root.style.setProperty("--color-warning-alpha-30",       "rgba(242,199,109,0.30)");
      // Semantic bg shorthands
      root.style.setProperty("--color-success-bg",  "#183C2A");
      root.style.setProperty("--color-warning-bg",  "#49380D");
      root.style.setProperty("--color-error-bg",    "#5B1B1B");
    } else {
      root.style.setProperty("--color-background-subtle", rgba(t.primary, 0.035));
      root.style.setProperty("--color-background-zebra", rgba(t.textPrimary, 0.015));
      root.style.setProperty("--color-surface-secondary", rgba(t.primary, 0.045));
      root.style.setProperty("--color-surface-hover", rgba(t.primary, 0.06));
      root.style.setProperty("--color-border-subtle", rgba(t.border, 0.55));
      root.style.setProperty("--color-text-muted", rgba(t.textSecondary, 0.75));
      root.style.setProperty("--color-text-on-primary", "#FFFFFF");
      root.style.setProperty("--color-primary-shadow", rgba(t.primary, 0.24));
      root.style.setProperty("--color-primary-alpha-3", rgba(t.primary, 0.03));
      root.style.setProperty("--color-primary-alpha-6", rgba(t.primary, 0.06));
      root.style.setProperty("--color-primary-alpha-10", rgba(t.primary, 0.10));
      root.style.setProperty("--color-primary-alpha-12", rgba(t.primary, 0.12));
      root.style.setProperty("--color-text-secondary-alpha-8", rgba(t.textSecondary, 0.08));
      root.style.setProperty("--color-text-secondary-alpha-4", rgba(t.textSecondary, 0.04));
      root.style.setProperty("--color-text-primary-alpha-2", rgba(t.textPrimary, 0.02));
      root.style.setProperty("--color-text-primary-alpha-12", rgba(t.textPrimary, 0.12));
      root.style.setProperty("--color-border-alpha-5", rgba(t.border, 0.5));
      root.style.setProperty("--color-secondary-alpha-12", rgba(t.secondary, 0.12));
      root.style.setProperty("--color-error-alpha-8", rgba(t.error, 0.08));
      root.style.setProperty("--color-error-alpha-10", rgba(t.error, 0.10));
      root.style.setProperty("--color-error-alpha-15", rgba(t.error, 0.15));
      root.style.setProperty("--color-error-alpha-30", rgba(t.error, 0.30));
      root.style.setProperty("--color-warning-alpha-8", rgba(t.warning, 0.08));
      root.style.setProperty("--color-warning-alpha-10", rgba(t.warning, 0.10));
      root.style.setProperty("--color-warning-alpha-15", rgba(t.warning, 0.15));
      root.style.setProperty("--color-warning-alpha-20", rgba(t.warning, 0.20));
      root.style.setProperty("--color-warning-alpha-30", rgba(t.warning, 0.30));
      root.style.setProperty("--color-primary-alpha-2", rgba(t.primary, 0.02));
      root.style.setProperty("--color-primary-alpha-4", rgba(t.primary, 0.04));
      root.style.setProperty("--color-primary-alpha-8", rgba(t.primary, 0.08));
      root.style.setProperty("--color-text-primary-alpha-3", rgba(t.textPrimary, 0.03));
      root.style.setProperty("--color-success-bg", rgba(t.success, 0.12));
      root.style.setProperty("--color-warning-bg", rgba(t.warning, 0.12));
      root.style.setProperty("--color-error-bg", rgba(t.error, 0.12));
    }

    // Scrollbar tokens
    root.style.setProperty("--scrollbar-track", t.background);
    root.style.setProperty("--scrollbar-thumb", rgba(t.primary, 0.35));
    root.style.setProperty("--scrollbar-thumb-hover", t.primaryDark);

    // Tooltip tokens (always dark regardless of theme for readability)
    root.style.setProperty("--color-tooltip-bg", "#1e293b");
    root.style.setProperty("--color-tooltip-text", "#f8fafc");
  }, [t, themeId]);

  return {
    themeId,
    setThemeId: (id: ThemeId) => dispatch(setTheme(id)),
    fontId,
    setFontId: (id: FontId) => dispatch(setFont(id)),
    fontSizeId,
    setFontSizeId: (id: FontSizeId) => dispatch(setFontSize(id)),
    t,
    fontFamily,
    textOnPrimary,
  };
}
