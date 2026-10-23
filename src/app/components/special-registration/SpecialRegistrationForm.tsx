import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, AlertTriangle } from "lucide-react";
import { AppTextField } from "../forms/AppTextField";
import { AppDateField } from "../forms/AppDateField";
import { AppPhoneField } from "../forms/AppPhoneField";
import { AppTextArea } from "../forms/AppTextArea";
import { AppCheckbox } from "../forms/AppCheckbox";
import { AppCountryAutocomplete } from "../forms/AppCountryAutocomplete";
import { SRDocumentRow } from "./SRDocumentRow";
import { type CountryCode, type CountryOption } from "../../data/countryOptions";
import { getCountryCallingCode } from "libphonenumber-js/max";
import {
  validatePhoneForCountry,
  normalizePhoneDigits,
  parsePastedPhone,
  getPhoneLengthRule,
} from "../../utils/phoneNumber";

// ── Constants ─────────────────────────────────────────────────────────────────

export const PUBLIC_ACCEPT = [".pdf", ".jpg", ".jpeg", ".png"];
export const MAX_MB = 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Form state ────────────────────────────────────────────────────────────────

export interface FormState {
  fullName: string;
  organization: string;
  designation: string;
  countryCode: CountryCode | "";
  country: string;
  address: string;
  phoneNational: string;
  email: string;
  idFiles: File[];
  declaration: boolean;
}

export const INITIAL_FORM: FormState = {
  fullName: "",
  organization: "",
  designation: "",
  countryCode: "",
  country: "",
  address: "",
  phoneNational: "",
  email: "",
  idFiles: [],
  declaration: false,
};

export type FieldErrors = Partial<Record<keyof FormState, string>>;

// ── Shared validator ──────────────────────────────────────────────────────────

export function validateSpecialRegistrationForm(
  form: FormState,
  options: { requireDeclaration: boolean },
): FieldErrors {
  const errs: FieldErrors = {};
  const req = "This field is required.";

  if (!form.fullName.trim()) errs.fullName = req;
  else if (form.fullName.trim().length > 120) errs.fullName = "Name must not exceed 120 characters.";

  if (!form.organization.trim()) errs.organization = req;

  if (!form.countryCode) {
    errs.countryCode = req;
  }

  // Phone validation
  if (form.countryCode) {
    const dial = `+${getDialCode(form.countryCode)}`;
    const phoneResult = validatePhoneForCountry(
      form.phoneNational,
      form.countryCode as CountryCode,
      form.country,
      dial,
    );
    if (!phoneResult.ok) errs.phoneNational = phoneResult.error;
  } else if (!form.phoneNational.trim()) {
    errs.phoneNational = req;
  }

  if (!form.address.trim()) errs.address = req;

  const emailTrimmed = form.email.trim();
  if (!emailTrimmed) {
    errs.email = req;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
    errs.email = "Please enter a valid email address.";
  }

  if (form.idFiles.length === 0) errs.idFiles = "An identification document is required.";

  if (options.requireDeclaration && !form.declaration) {
    errs.declaration = "You must accept the declaration before submitting.";
  }

  return errs;
}

// ── applicationToFormState ────────────────────────────────────────────────────

export function applicationToFormState(params: {
  applicantName: string;
  organization: string;
  designation: string;
  countryCode: CountryCode | "";
  country: string;
  address: string;
  phoneNational: string;
  email: string;
  idFiles: File[];
}): FormState {
  return {
    fullName:      params.applicantName,
    organization:  params.organization,
    designation:   params.designation,
    countryCode:   params.countryCode,
    country:       params.country,
    address:       params.address,
    phoneNational: params.phoneNational,
    email:         params.email,
    idFiles:       params.idFiles,
    declaration:   true,
  };
}

// ── Section → field mapping for auto-expand on error ─────────────────────────

const SECTION_FIELDS: Record<string, (keyof FormState)[]> = {
  participant: ["fullName", "organization", "designation"],
  contact:     ["countryCode", "phoneNational", "address", "email"],
  documents:   ["idFiles"],
};

// ── CollapsibleFormSection ────────────────────────────────────────────────────

interface CollapsibleFormSectionProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleFormSection({ id, title, open, onToggle, children }: CollapsibleFormSectionProps) {
  return (
    <div className="sr-form-section">
      <button
        type="button"
        className="sr-form-section__toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-body`}
      >
        <span className="sr-form-section__title">{title}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`sr-form-section__chevron${open ? " sr-form-section__chevron--open" : ""}`}
        />
      </button>
      {open && (
        <div id={`${id}-body`} className="sr-form-section__body" role="region" aria-label={title}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SpecialRegistrationFormProps {
  form: FormState;
  errors: FieldErrors;
  onChange: (field: keyof FormState, value: string | boolean | File[]) => void;
  onFilesChange: (field: "idFiles", files: File[]) => void;
  onDeclarationChange: (value: boolean) => void;
  onCountryChange: (country: CountryOption | null) => void;
  submitError?: string;
  isAdminMode?: boolean;
  resetKey?: string | number;
  language?: "en" | "bn";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SpecialRegistrationForm({
  form,
  errors,
  onChange,
  onFilesChange,
  onDeclarationChange,
  onCountryChange,
  submitError,
  isAdminMode,
  resetKey,
  language = "en",
}: SpecialRegistrationFormProps) {
  type SectionKey = "participant" | "contact" | "documents";

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    participant: true, contact: true, documents: true,
  });

  // Auto-expand sections that contain errors
  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    setOpen(prev => {
      const next = { ...prev };
      for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
        if (fields.some(f => errors[f as keyof FormState])) {
          next[section as SectionKey] = true;
        }
      }
      return next;
    });
  }, [errors]);

  // Reopen all sections when resetKey changes
  useEffect(() => {
    if (resetKey === undefined) return;
    setOpen({ participant: true, contact: true, documents: true });
  }, [resetKey]);

  const toggle = (key: SectionKey) =>
    setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  // Phone prefix
  const phonePrefix = form.countryCode ? (
    <>{`${getFlag(form.countryCode)} +${getDialCode(form.countryCode)}`}</>
  ) : null;

  const [phoneLengthError, setPhoneLengthError] = useState<string>("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  const revalidatePhone = (national: string, countryCode: string, countryNameOverride?: string) => {
    const name = countryNameOverride ?? form.country;
    const dial = countryCode ? `+${getDialCode(countryCode)}` : undefined;
    const result = validatePhoneForCountry(national, countryCode as CountryCode, name, dial);
    setPhoneLengthError(result.ok ? "" : result.error);
  };

  const handlePhoneChange = (raw: string) => {
    let normalized: string;
    if (raw.startsWith("+") && form.countryCode) {
      const { nationalNumber, countryMatch } = parsePastedPhone(raw, form.countryCode as CountryCode);
      normalized = countryMatch ? nationalNumber : normalizePhoneDigits(raw);
    } else {
      normalized = normalizePhoneDigits(raw);
    }

    const rule = form.countryCode ? getPhoneLengthRule(form.countryCode as CountryCode) : null;
    if (rule && normalized.length > rule.requiredDigits) {
      setPhoneLengthError(`For ${form.country}, enter exactly ${rule.requiredDigits} digits after +${getDialCode(form.countryCode)}. Entered: ${normalized.length}.`);
      return;
    }

    onChange("phoneNational", normalized);
    if (phoneTouched) {
      revalidatePhone(normalized, form.countryCode);
    }
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    revalidatePhone(form.phoneNational, form.countryCode);
  };

  void language; // reserved for future i18n

  return (
    <div className="sr-form">

      {/* ── Section 1: Participant Information ──────────────────────────── */}
      <CollapsibleFormSection
        id="sr-participant"
        title="Participant Information"
        open={open.participant}
        onToggle={() => toggle("participant")}
      >
        <div className="sr-taxpayer-layout">
          <div className="sr-taxpayer-layout__full">
            <AppTextField
              id="sr-full-name"
              label="Full Name"
              value={form.fullName}
              onChange={val => onChange("fullName", val)}
              required
              helper=""
              error={errors.fullName}
              maxLength={120}
            />
          </div>
          <div className="sr-form-grid">
            <AppTextField
              id="sr-organization"
              label="Organisation / Institution"
              value={form.organization}
              onChange={val => onChange("organization", val)}
              required
              error={errors.organization}
              placeholder="e.g. Bangladesh Bank"
            />
            <AppTextField
              id="sr-designation"
              label="Designation"
              value={form.designation}
              onChange={val => onChange("designation", val)}
              error={errors.designation}
              placeholder="e.g. Deputy Governor"
            />
          </div>
        </div>
      </CollapsibleFormSection>

      {/* ── Section 2: Contact Details ───────────────────────────────────── */}
      <CollapsibleFormSection
        id="sr-contact"
        title="Contact Details"
        open={open.contact}
        onToggle={() => toggle("contact")}
      >
        <div className="sr-overseas-layout">
          <div className="sr-form-grid">
            <AppCountryAutocomplete
              id="sr-country"
              label="Country"
              value={form.countryCode}
              language="en"
              onChange={country => {
                onCountryChange(country);
                if (phoneTouched && form.phoneNational) {
                  revalidatePhone(form.phoneNational, country?.iso2 ?? "", country?.englishName ?? "");
                } else {
                  setPhoneLengthError("");
                }
              }}
              required
              error={errors.countryCode}
              disablePortal={isAdminMode}
              placeholder="Search country or calling code"
              noOptionsText="No countries found"
              mobileSheet={!isAdminMode}
            />
            <AppPhoneField
              id="sr-phone"
              label="Phone Number"
              value={form.phoneNational}
              onChange={handlePhoneChange}
              onBlur={handlePhoneBlur}
              required
              helper={form.countryCode ? "" : undefined}
              placeholder={!form.countryCode ? "Select country first" : undefined}
              error={errors.phoneNational || phoneLengthError}
              disabled={!form.countryCode}
              prefix={phonePrefix}
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={form.countryCode ? (getPhoneLengthRule(form.countryCode as CountryCode)?.requiredDigits ?? undefined) : undefined}
            />
          </div>

          <div className="sr-overseas-layout__wide-field">
            <AppTextField
              id="sr-email"
              label="Email Address"
              value={form.email}
              onChange={val => onChange("email", val)}
              required
              helper=""
              error={errors.email}
              autoComplete="email"
            />
          </div>

          <div className="sr-overseas-layout__wide-field">
            <AppTextArea
              id="sr-address"
              label="Correspondence Address"
              value={form.address}
              onChange={val => onChange("address", val)}
              required
              error={errors.address}
              rows={3}
            />
          </div>
        </div>
      </CollapsibleFormSection>

      {/* ── Section 3: Documents ────────────────────────────────────────── */}
      <CollapsibleFormSection
        id="sr-documents"
        title="Identification Document"
        open={open.documents}
        onToggle={() => toggle("documents")}
      >
        <div className="sr-doc-list">
          <SRDocumentRow
            id="sr-id-doc"
            label="Identification Document"
            value={form.idFiles}
            onChange={files => onFilesChange("idFiles", files)}
            required
            helper="Upload a passport bio page, NID, or other government-issued ID. Maximum 2 files."
            maxFiles={2}
            accept={PUBLIC_ACCEPT}
            maxSizeMB={MAX_MB}
            error={errors.idFiles}
            sampleCategory="nid"
          />
        </div>
      </CollapsibleFormSection>

      {/* ── Declaration ─────────────────────────────────────────────────── */}
      <div className="sr-declaration-section">
        {isAdminMode ? (
          <div className="sr-declaration-readonly">
            <Check size={15} aria-hidden="true" className="sr-declaration-readonly__icon" />
            <span className="sr-declaration-readonly__text">{"I confirm that the information and documents provided are correct and I consent to Convay processing this registration for the purpose of meeting attendance."}</span>
          </div>
        ) : (
          <>
            <AppCheckbox
              id="sr-declaration-checkbox"
              label={"I confirm that the information and documents provided are correct and I consent to Convay processing this registration for the purpose of meeting attendance."}
              checked={form.declaration}
              onChange={onDeclarationChange}
            />
            {errors.declaration && (
              <p className="sr-field-error" role="alert">{errors.declaration}</p>
            )}
          </>
        )}
      </div>

      {/* ── Submit error ─────────────────────────────────────────────────── */}
      {submitError && (
        <div className="sr-submit-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      )}
    </div>
  );
}

// ── Internal helpers for phone prefix ────────────────────────────────────────

function getFlag(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function getDialCode(iso2: string): string {
  try {
    return getCountryCallingCode(iso2 as CountryCode);
  } catch {
    return "";
  }
}
