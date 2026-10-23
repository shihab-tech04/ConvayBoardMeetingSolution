export type ThemeId = "indigo-blue" | "gov-blue" | "slate-purple" | "plum-executive" | "fresh-teal" | "dark-mode";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  "indigo-blue": {
    id: "indigo-blue",
    name: "Indigo Blue",
    primary: "#4B5694",
    primaryDark: "#343D73",
    primaryLight: "#EEF0FA",
    secondary: "#7C8BD6",
    accent: "#F2B880",
    background: "#F7F8FC",
    surface: "#FFFFFF",
    border: "#E2E5F0",
    textPrimary: "#202338",
    textSecondary: "#626981",
    success: "#2E7D32",
    warning: "#EF8F22",
    error: "#C62828",
  },
  "gov-blue": {
    id: "gov-blue",
    name: "Convay Blue",
    primary: "#382C83",
    primaryDark: "#2A2164",
    primaryLight: "#EFEDFA",
    secondary: "#7569B3",
    accent: "#F4C95D",
    background: "#F8F7FC",
    surface: "#FFFFFF",
    border: "#E2DEF0",
    textPrimary: "#211D33",
    textSecondary: "#625D73",
    success: "#238636",
    warning: "#D97706",
    error: "#C62828",
  },
  "slate-purple": {
    id: "slate-purple",
    name: "Slate Purple",
    primary: "#4A4466",
    primaryDark: "#332F4A",
    primaryLight: "#F0EEF7",
    secondary: "#7E78A6",
    accent: "#D9A76C",
    background: "#F8F7FB",
    surface: "#FFFFFF",
    border: "#E3E0EC",
    textPrimary: "#221F2F",
    textSecondary: "#686174",
    success: "#2F7D46",
    warning: "#C98122",
    error: "#B3261E",
  },
  "plum-executive": {
    id: "plum-executive",
    name: "Plum Executive",
    primary: "#744577",
    primaryDark: "#57305A",
    primaryLight: "#F5EAF6",
    secondary: "#B06AB3",
    accent: "#F2A65A",
    background: "#FBF7FC",
    surface: "#FFFFFF",
    border: "#EBDDEC",
    textPrimary: "#2F2133",
    textSecondary: "#725F76",
    success: "#2F7D46",
    warning: "#D97706",
    error: "#B3261E",
  },
  "fresh-teal": {
    id: "fresh-teal",
    name: "Fresh Teal",
    primary: "#3F7F85",
    primaryDark: "#2D666B",
    primaryLight: "#EFF6F7",
    secondary: "#7FAEB2",
    accent: "#A8D2D5",
    background: "#F8FAFB",
    surface: "#FFFFFF",
    border: "#DEE7E9",
    textPrimary: "#243438",
    textSecondary: "#68777B",
    success: "#2F7D46",
    warning: "#D97706",
    error: "#C62828",
  },
  "dark-mode": {
    id: "dark-mode",
    name: "Dark Mode",
    primary: "#0F828C",
    primaryDark: "#0B6269",
    primaryLight: "#0B3034",
    secondary: "#A9BED9",
    accent: "#F2C76D",
    background: "#121319",
    surface: "#191B23",
    border: "#373C49",
    textPrimary: "#F1F3F7",
    textSecondary: "#B7BDC9",
    success: "#7ED6A3",
    warning: "#F2C76D",
    error: "#FFB4AB",
  },
};

export const THEME_ORDER: ThemeId[] = [
  "gov-blue",
  "indigo-blue",
  "slate-purple",
  "plum-executive",
  "fresh-teal",
  "dark-mode",
];
