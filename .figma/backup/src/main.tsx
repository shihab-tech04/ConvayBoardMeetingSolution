import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

const RECOVERY_KEY = "bms-version-15-runtime-restored-v1";

function removeBrokenPrototypeState() {
  const root = document.documentElement;

  // Remove stale classes previously added by the document-only prototype.
  root.classList.remove("dark", "light");

  // Remove only generic prototype theme variables that may remain inline
  // after hot reload. Do not remove the Board Meeting Solution --color-* tokens.
  [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--destructive",
    "--border",
    "--input",
    "--ring",
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-border",
    "--sidebar-ring",
  ].forEach((property) => root.style.removeProperty(property));

  // Remove only storage created by the temporary prototype.
  // Preserve all canonical bms.*, gov_ui_*, nbr.*, document content,
  // versions, relationships, settings, authentication, and user data.
  const prototypePrefixes = [
    "bms_reg_",
    "bms_doc_reg_",
    "bms_doc_content_",
  ];

  const prototypeExactKeys = new Set([
    "sidebar_state",
    "next-themes",
    "theme",
  ]);

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    const isPrototypeKey =
      prototypePrefixes.some((prefix) => key.startsWith(prefix)) ||
      prototypeExactKeys.has(key);

    if (isPrototypeKey) {
      localStorage.removeItem(key);
    }
  }

  // Remove the old document-prototype hash route.
  if (
    window.location.hash === "#library" ||
    window.location.hash.startsWith("#workspace/")
  ) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }
}

if (!sessionStorage.getItem(RECOVERY_KEY)) {
  removeBrokenPrototypeState();
  sessionStorage.setItem(RECOVERY_KEY, "done");

  // Force a complete document and stylesheet reload rather than another
  // hot-module replacement.
  window.location.reload();
} else {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Application root element was not found.");
  }

  createRoot(rootElement).render(<App />);
}
