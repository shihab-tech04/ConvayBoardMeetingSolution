import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle2,
  Globe,
  MailCheck,
} from "lucide-react";
import { toast } from "sonner";
import { NCCBankBoardLogo } from "../../components/navigation/NCCBankBoardLogo";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { CopyValueButton } from "../../components/shared/CopyValueButton";
import {
  submitSpecialRegistration,
  type SpecialRegResult,
} from "../../services/specialRegistrationPublicService";
import {
  SpecialRegistrationForm,
  INITIAL_FORM,
  validateSpecialRegistrationForm,
  type FormState,
  type FieldErrors,
} from "../../components/special-registration/SpecialRegistrationForm";
import type { CountryOption } from "../../data/countryOptions";
import { toE164Phone } from "../../utils/phoneNumber";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-BD", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

// ── Success State ─────────────────────────────────────────────────────────────

interface SuccessStateProps {
  result: SpecialRegResult;
  onBackToLogin: () => void;
  onSubmitAnother: () => void;
}

function SuccessState({ result, onSubmitAnother }: SuccessStateProps) {
  return (
    <div className="sr-success" aria-live="polite">
      <div className="sr-success__icon-wrap" aria-hidden="true">
        <CheckCircle2 size={44} strokeWidth={1.5} className="sr-success__icon" />
      </div>

      <h2 className="sr-success__heading">{"Application Submitted"}</h2>
      <p className="sr-success__subheading">{"Your application has been received and is under review."}</p>

      <div className="sr-success__card">
        <div className="sr-success__card-head">
          <span className="sr-success__app-number-label">{"Application Number"}</span>
          <div className="sr-success__app-number-value">
            <code className="sr-success__app-number-code">{result.applicationNumber}</code>
            <CopyValueButton value={result.applicationNumber} label="Application Number" />
          </div>
        </div>

        <div className="sr-success__detail-row">
          <span className="sr-success__detail-label">{"Submitted"}</span>
          <span className="sr-success__detail-value">{formatDateTime(result.submittedAt)}</span>
        </div>
        <div className="sr-success__detail-row">
          <span className="sr-success__detail-label">{"Email Address"}</span>
          <span className="sr-success__detail-value">{result.email}</span>
        </div>
        <div className="sr-success__detail-row">
          <span className="sr-success__detail-label">{"Status"}</span>
          <span className="sr-success__status-badge">{"Pending Review"}</span>
        </div>
      </div>

      <div className="sr-success__note">
        <MailCheck size={15} className="sr-success__note-icon" aria-hidden="true" />
        <p className="sr-success__note-text">
          {"A confirmation email has been sent to your registered email address. You will be notified once your application has been reviewed."}
        </p>
      </div>

      <div className="sr-success__actions">
        <PrimaryButton onClick={onSubmitAnother} fullWidth>
          {"Submit Another Application"}
        </PrimaryButton>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function SpecialRegistrationPublicPage() {
  const navigate = useNavigate();

  const [form, setForm]                 = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors]             = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError]   = useState("");
  const [result, setResult]             = useState<SpecialRegResult | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);

  const pageTopRef = useRef<HTMLDivElement>(null);

  const isFormReady =
    form.fullName.trim().length > 0 &&
    form.organization.trim().length > 0 &&
    form.countryCode.length > 0 &&
    form.country.trim().length > 0 &&
    form.address.trim().length > 0 &&
    form.phoneNational.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.idFiles.length > 0 &&
    form.declaration;

  // ── Form field changes ────────────────────────────────────────────────────

  const handleFieldChange = useCallback(
    (field: keyof FormState, value: string | boolean | File[]) => {
      setForm(prev => ({ ...prev, [field]: value }));
      setErrors(prev => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const handleCountryChange = useCallback((country: CountryOption | null) => {
    setForm(prev => ({
      ...prev,
      countryCode: country?.iso2 ?? "",
      country: country?.englishName ?? "",
      phoneNational: "",
    }));
    setErrors(prev => {
      const next = { ...prev };
      delete next.countryCode;
      delete next.phoneNational;
      return next;
    });
  }, []);

  const scrollToTop = useCallback(() => {
    setTimeout(() => {
      pageTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const errs = validateSpecialRegistrationForm(form, { requireDeclaration: true });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTimeout(() => {
        const firstErr = document.querySelector<HTMLElement>(
          "[aria-invalid='true'], .sr-field-error",
        );
        firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const submittedAt = new Date().toISOString();
      const e164 = form.countryCode ? toE164Phone(form.phoneNational, form.countryCode) : null;
      const res = await submitSpecialRegistration({
        applicantName:  form.fullName.trim(),
        organization:   form.organization.trim(),
        designation:    form.designation.trim(),
        countryCode:    form.countryCode as import("../../data/countryOptions").CountryCode,
        country:        form.country.trim(),
        address:        form.address.trim(),
        phone:          e164 ?? form.phoneNational.trim(),
        email:          form.email.trim().toLowerCase(),
        attachments: {
          id: form.idFiles,
        },
        declarationAccepted: true,
        submittedAt,
      });
      setResult(res);
      toast.success("Application Submitted");
      scrollToTop();
    } catch {
      setSubmitError("Submission failed. Please try again.");
      toast.error("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, scrollToTop]);

  // ── Submit another ────────────────────────────────────────────────────────

  const handleSubmitAnother = useCallback(() => {
    setResult(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitError("");
    setFormResetKey(k => k + 1);
    scrollToTop();
  }, [scrollToTop]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="sr-public"
      style={{ backgroundColor: "var(--color-background)", minHeight: "100vh" }}
    >
      {/* Header */}
      <header className="sr-public__header">
        <div className="sr-public__header-inner">
          <div className="sr-public__brand">
            <NCCBankBoardLogo variant="login" size={48} className="sr-public__logo" />
            <div className="sr-public__brand-text">
              <span className="sr-public__app-name">{"Convay Board Meeting"}</span>
              <span className="sr-public__page-title">{"External Participant Registration"}</span>
            </div>
          </div>
          <div className="sr-public__header-actions" />
        </div>
      </header>

      {/* Main */}
      <main className="sr-public__main">
        <div className="sr-public__card" ref={pageTopRef}>
          <h1 className="sr-only">{"External Participant Registration"}</h1>

          {result ? (
            <SuccessState
              result={result}
              onBackToLogin={() => navigate("/")}
              onSubmitAnother={handleSubmitAnother}
            />
          ) : (
            <>
              {/* Eligibility intro */}
              <div className="sr-intro">
                <Globe size={18} className="sr-intro__icon" aria-hidden="true" />
                <div>
                  <p className="sr-intro__text">
                    {"This form is for external participants attending Convay Board meetings. Please complete all required fields and upload supporting documents."}
                  </p>
                  <p className="sr-intro__support">
                    <span className="sr-intro__support-label">{"Support"}:</span>{" "}
                    <a
                      href="mailto:boardsupport@nccbank.com.bd"
                      className="sr-intro__support-email"
                    >
                      {"boardsupport@nccbank.com.bd"}
                    </a>
                  </p>
                </div>
              </div>

              {/* Form */}
              <SpecialRegistrationForm
                form={form}
                errors={errors}
                onChange={handleFieldChange}
                onFilesChange={(_field, files) => handleFieldChange("idFiles", files)}
                onDeclarationChange={val => handleFieldChange("declaration", val)}
                onCountryChange={handleCountryChange}
                submitError={submitError}
                resetKey={formResetKey}
                language="en"
              />

              {/* Action bar */}
              <div className="sr-action-bar">
                <div />
                <div className="sr-action-bar__right">
                  <PrimaryButton
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={isSubmitting || !isFormReady}
                  >
                    {isSubmitting ? "Submitting…" : "Submit Application"}
                  </PrimaryButton>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
