import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Check, ChevronRight } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useReturnFocus } from "../../hooks/useReturnFocus";

export interface AppModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Footer slot — render your action buttons here */
  footer?: React.ReactNode;
  /** Width preset (ignored when fullPage is true) */
  size?: "sm" | "md" | "lg" | "xl";
  /** Icon shown in the header beside the title */
  icon?: React.ReactNode;
  /** ID of element that describes the dialog content (aria-describedby) */
  describedBy?: string;
  /** "top" raises z-index above drawers (use for modals opened from inside a drawer) */
  layer?: "default" | "top";
  /** Full-viewport mode — sticky header, scrollable body, sticky footer */
  fullPage?: boolean;
  /** Warn before close if the form has unsaved changes */
  hasUnsavedChanges?: boolean;
  /** Step labels for multi-step wizard. When provided, renders a stepper below the header. */
  steps?: string[];
  /** Current active step index (0-based). */
  currentStep?: number;
  /** Called when the user clicks a completed step to jump back. */
  onStepClick?: (step: number) => void;
  /** Optional icon component for each step (same order as steps). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stepIcons?: React.ElementType<any>[];
  /** Optional error flag per step — shows error indicator on that card. */
  stepErrors?: boolean[];
  /** Optional subtitle shown below the title in the header. */
  subtitle?: string;
  /** Short visible labels for each step (same order as steps). When provided, displayed in the card; full steps[] names are used as aria-labels. */
  stepShortLabels?: string[];
}

const SIZE_CLASS: Record<string, string> = {
  sm: "app-modal--sm",
  md: "app-modal--md",
  lg: "app-modal--lg",
  xl: "app-modal--xl",
};

export function AppModal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
  icon,
  describedBy,
  layer = "default",
  fullPage = false,
  hasUnsavedChanges = false,
  steps,
  currentStep = 0,
  onStepClick,
  subtitle,
  stepIcons,
  stepErrors,
  stepShortLabels,
}: AppModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to close?")) return;
    }
    onClose();
  };

  useFocusTrap(panelRef, open);
  useReturnFocus(open);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasUnsavedChanges, onClose]);

  // Auto-focus close button
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => closeRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [open]);

  if (!open) return null;

  const panelClass = [
    "app-modal-panel modal-enter",
    fullPage ? "app-modal-panel--fullpage" : SIZE_CLASS[size],
  ].filter(Boolean).join(" ");

  const backdropClass = [
    "app-modal-backdrop overlay-enter",
    layer === "top" ? "app-modal-backdrop--top" : "",
    fullPage ? "app-modal-backdrop--fullpage" : "",
  ].filter(Boolean).join(" ");

  return createPortal(
    <div
      className={backdropClass}
      onClick={fullPage ? undefined : handleClose}
      role="presentation"
      aria-hidden="true"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        aria-describedby={describedBy}
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="app-modal-header">
          <div className="app-modal-header__leading">
            {icon && <span className="app-modal-header__icon" aria-hidden="true">{icon}</span>}
            <div className="app-modal-header__title-group">
              <h2 id="app-modal-title" className="app-modal-header__title">{title}</h2>
              {subtitle && <p className="app-modal-header__subtitle">{subtitle}</p>}
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={handleClose}
            className="app-modal-close"
            type="button"
            aria-label="Close modal"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Card-based stepper */}
        {steps && steps.length > 1 && (
          <nav className="wiz-stepper" aria-label="Form steps">
            {/* Mobile progress bar */}
            <div className="wiz-stepper__mobile" aria-hidden="true">
              <div className="wiz-stepper__mobile-info">
                {stepIcons?.[currentStep] && (() => { const MI = stepIcons[currentStep]; return <MI size={14} strokeWidth={2} />; })()}
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span className="wiz-stepper__mobile-title">&middot; {stepShortLabels?.[currentStep] ?? steps[currentStep]}</span>
              </div>
              <div className="wiz-stepper__mobile-bar">
                <div className="wiz-stepper__mobile-fill" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
              </div>
            </div>
            <ol className="wiz-stepper__rail">
              {steps.map((label, idx) => {
                const isCompleted = idx < currentStep;
                const isActive    = idx === currentStep;
                const isError     = !!(stepErrors?.[idx]);
                const isUpcoming  = idx > currentStep;
                const StepIcon    = stepIcons?.[idx];
                const isPrevDone  = idx > 0 && (idx - 1) < currentStep;
                const cardMod = isActive ? "wiz-stepper__card--active"
                  : isError     ? "wiz-stepper__card--error"
                  : isCompleted ? "wiz-stepper__card--completed"
                  : "wiz-stepper__card--upcoming";
                return (
                  <li key={idx} className="wiz-stepper__item">
                    {idx > 0 && (
                      <span
                        className={`wiz-stepper__conn${isPrevDone ? " wiz-stepper__conn--done" : ""}`}
                        aria-hidden="true"
                      >
                        <span className="wiz-stepper__conn-line" />
                        <ChevronRight size={10} strokeWidth={2.5} />
                        <span className="wiz-stepper__conn-line" />
                      </span>
                    )}
                    <button
                      type="button"
                      className={`wiz-stepper__card ${cardMod}`}
                      onClick={() => (isCompleted || isError) && onStepClick?.(idx)}
                      disabled={isUpcoming}
                      aria-current={isActive ? "step" : undefined}
                      aria-disabled={isUpcoming}
                      aria-label={label}
                    >
                      <span className="wiz-stepper__icon" aria-hidden="true">
                        {isCompleted && !isError
                          ? <Check size={13} strokeWidth={2.5} />
                          : StepIcon
                            ? <StepIcon size={13} strokeWidth={2} />
                            : <span className="wiz-stepper__num">{idx + 1}</span>
                        }
                      </span>
                      <span className="wiz-stepper__body">
                        <span className="wiz-stepper__step-num">Step {idx + 1}</span>
                        <span className="wiz-stepper__title">{stepShortLabels?.[idx] ?? label}</span>
                      </span>
                      {isError && <span className="wiz-stepper__error-dot" aria-label="Has errors" />}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Body */}
        <div className="app-modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="app-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
