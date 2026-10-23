import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface FullScreenWorkspaceShellProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  confirmOnClose?: string;
}

/**
 * Full-screen portal overlay that covers the entire application shell
 * (sidebar, topbar, breadcrumbs, and page content).
 *
 * Use this for immersive workspaces (live meetings, etc.) that must
 * sit above all other UI layers.
 */
export function FullScreenWorkspaceShell({
  open,
  title,
  children,
  onClose,
  confirmOnClose,
}: FullScreenWorkspaceShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmOnClose) {
        if (window.confirm(confirmOnClose)) onClose();
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, confirmOnClose]);

  // Focus management — save previous focus and restore on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      // Defer focus so the portal is painted first
      requestAnimationFrame(() => { containerRef.current?.focus(); });
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes fsw-enter {
          from { opacity: 0; transform: scale(0.985) }
          to   { opacity: 1; transform: scale(1) }
        }
      `}</style>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Workspace"}
        tabIndex={-1}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 60,
          display: "flex",
          flexDirection: "column",
          outline: "none",
          overscrollBehavior: "contain",
          animation: "fsw-enter 200ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
