import { useState, useCallback, useEffect, useRef } from "react";
import { FileEdit } from "lucide-react";
import { AppModal } from "../modals/AppModal";
import { Button } from "../buttons/Button";
import {
  SpecialRegistrationForm,
  applicationToFormState,
  validateSpecialRegistrationForm,
  type FormState,
  type FieldErrors,
} from "./SpecialRegistrationForm";
import {
  SRConflictError,
  type SpecialRegistrationApplication,
  type SpecialRegistrationUpdatePayload,
} from "../../services/repositories/specialRegistrationRepository";
import type { CountryOption, CountryCode } from "../../data/countryOptions";
import { toE164Phone, nationalFromE164 } from "../../utils/phoneNumber";

interface EditModalProps {
  open: boolean;
  application: SpecialRegistrationApplication;
  onClose: () => void;
  onSave: (
    appId: string,
    payload: SpecialRegistrationUpdatePayload,
    editor: { editorId: string; editorName: string; editorDesignation: string }
  ) => Promise<void>;
  editor: { editorId: string; editorName: string; editorDesignation: string };
}

function appToFormState(application: SpecialRegistrationApplication): FormState {
  const countryCode = (application.countryCode || "") as CountryCode | "";
  const phoneNational = countryCode
    ? (nationalFromE164(application.phone, countryCode) ?? application.phone)
    : application.phone;
  return applicationToFormState({
    applicantName: application.applicantName,
    organization:  application.organization,
    designation:   application.designation,
    countryCode,
    country:       application.country,
    address:       application.address,
    phoneNational,
    email:         application.email,
    idFiles:       application.documents.filter(d => d.category === "ID_DOCUMENT").map(d => d.file),
  });
}

export function SpecialRegistrationEditModal({
  open,
  application,
  onClose,
  onSave,
  editor,
}: EditModalProps) {

  const [form, setForm]           = useState<FormState>(() => appToFormState(application));
  const [errors, setErrors]       = useState<FieldErrors>({});
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [resetKey, setResetKey]   = useState(0);

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaveError("");
    setResetKey(k => k + 1);
    setForm(appToFormState(application));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, application.id]);

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

  const handleSave = useCallback(async () => {
    const errs = validateSpecialRegistrationForm(form, { requireDeclaration: false });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTimeout(() => {
        bodyRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], .sr-field-error")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const e164 = form.countryCode ? toE164Phone(form.phoneNational, form.countryCode) : null;
      const payload: SpecialRegistrationUpdatePayload = {
        applicantName: form.fullName.trim(),
        organization:  form.organization.trim(),
        designation:   form.designation.trim(),
        countryCode:   form.countryCode as CountryCode,
        country:       form.country.trim(),
        address:       form.address.trim(),
        phone:         e164 ?? form.phoneNational.trim(),
        email:         form.email.trim().toLowerCase(),
        idFiles:       form.idFiles,
      };
      await onSave(application.id, payload, editor);
      onClose();
    } catch (err) {
      if (err instanceof SRConflictError) {
        setSaveError("This application has already been processed and can no longer be edited.");
      } else {
        setSaveError("Failed to update application. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }, [form, application.id, editor, onSave, onClose]);

  const footer = (
    <div className="modal-form-footer">
      <Button variant="ghost" size="lg" onClick={onClose} disabled={saving}>{"Cancel"}</Button>
      <div style={{ flex: 1 }} />
      <Button variant="primary" size="lg" onClick={handleSave} disabled={saving} loading={saving} loadingText="Saving…">
        {"Save Changes"}
      </Button>
    </div>
  );

  return (
    <AppModal
      open={open}
      title={"Edit External Participant Registration"}
      onClose={() => !saving && onClose()}
      size="xl"
      layer="top"
      icon={<FileEdit size={16} />}
      footer={footer}
    >
      <div ref={bodyRef} style={{ overflowY: "auto", maxHeight: "65vh" }}>
        {saveError && (
          <div className="sr-submit-error" role="alert" style={{ margin: "0 0 12px" }}>
            <span>{saveError}</span>
          </div>
        )}
        <SpecialRegistrationForm
          form={form}
          errors={errors}
          onChange={handleFieldChange}
          onFilesChange={(_field, files) => handleFieldChange("idFiles", files)}
          onDeclarationChange={val => handleFieldChange("declaration", val)}
          onCountryChange={handleCountryChange}
          isAdminMode
          resetKey={resetKey}
          language="en"
        />
      </div>
    </AppModal>
  );
}
