import { useState, useEffect, useRef, useMemo } from "react";
import {
  UserPlus, Building2, Shield, Landmark, CheckCircle,
  AlertCircle, Users, Info,
} from "lucide-react";
import type { BmsUser, UserType, AccountStatus } from "../../data/bmsUsers";
import type { SystemRole } from "../../data/mockData";
import type { GovernanceBody } from "../../data/boardMeetingData";
import { useDesignationRegistry } from "../../data/designations";
import { useOrgUnitRegistry } from "../../data/boardMeetingData";
import { useGovernanceRegistry } from "../../data/boardMeetingData";
import { SafeText, ExpandableText } from "../shared/SafeText";
import { usePermissionRegistry } from "../../hooks/usePermissionRegistry";
import { SToggle } from "../forms/SToggle";
import { AppTextField } from "../forms/AppTextField";
import { AppSelectField } from "../forms/AppSelectField";
import { AppPhoneField } from "../forms/AppPhoneField";
import { AppDateField } from "../forms/AppDateField";
import { AppModal } from "../modals/AppModal";
import { Button } from "../buttons/Button";
import { StatusBadge } from "../badges/StatusBadge";
import { isValidEmail, isValidPhone, isEmailUnique, isEmployeeIdUnique } from "../../utils/bmsValidation";

interface UserFormModalProps {
  open: boolean;
  userId: string | null;
  bmsUsers: BmsUser[];
  roles: SystemRole[];
  onClose: () => void;
  onSave: (u: BmsUser) => void;
  onNavigateToRoleManagement: () => void;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-1 text-red-500 text-[0.72rem] mt-1">
      <AlertCircle size={11} aria-hidden="true" /> {msg}
    </div>
  );
}

const USER_TYPES: UserType[] = ["Internal Employee", "Governance Member", "External Participant"];

const STEP_LABELS = [
  "Identity & Contact",
  "Organisation",
  "Roles & Access",
  "Governance",
  "Review",
];
const STEP_SHORT = ["Identity", "Organisation", "Roles", "Governance", "Review"];
const STEP_ICONS = [Users, Building2, Shield, Landmark, CheckCircle];

const LANGUAGES = ["English", "Bengali (Bangla)"];
const TIMEZONES = ["Asia/Dhaka (UTC+6)", "UTC", "Asia/Kolkata (UTC+5:30)"];
const EMP_TYPES = ["full_time", "part_time", "contract", "board_appointed", "honorary"] as const;
const EMP_TYPE_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  board_appointed: "Board Appointed",
  honorary: "Honorary",
};

function SectionHead({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="modal-fieldset__head">
      <div className="modal-fieldset__head-icon"><Icon size={11} strokeWidth={2} /></div>
      <h3 className="modal-fieldset__head-label">{title}</h3>
    </div>
  );
}

export function UserFormModal({
  open, userId, bmsUsers, roles, onClose, onSave, onNavigateToRoleManagement,
}: UserFormModalProps) {
  const { permissionGroups } = usePermissionRegistry();
  const orgReg = useOrgUnitRegistry();
  const desigReg = useDesignationRegistry();
  const govReg = useGovernanceRegistry();

  const existing = userId ? (bmsUsers.find((u) => u.id === userId) ?? null) : null;
  const isEdit = !!existing;

  // ── Step state ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<boolean[]>([false, false, false, false, false]);

  // ── Step 1: Identity ──────────────────────────────────────────────────────────
  const [userType, setUserType] = useState<UserType>("Internal Employee");
  const [name, setName]             = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [extRefId, setExtRefId]     = useState("");
  const [prefLang, setPrefLang]     = useState("English");
  const [timezone, setTimezone]     = useState("Asia/Dhaka (UTC+6)");

  // ── Step 2: Organisation ──────────────────────────────────────────────────────
  const [designationId, setDesignationId] = useState("");
  const [position, setPosition]           = useState("");
  const [branchId, setBranchId]           = useState("");
  const [divisionId, setDivisionId]       = useState("");
  const [departmentId, setDepartmentId]   = useState("");
  const [primaryOrgUnitId, setPrimaryOrgUnitId] = useState("");
  const [managerId, setManagerId]         = useState("");
  const [empType, setEmpType]             = useState("full_time");
  const [empStart, setEmpStart]           = useState("");
  const [empEnd, setEmpEnd]               = useState("");
  // External participant fields
  const [extOrgName, setExtOrgName]       = useState("");
  const [extDesignation, setExtDesignation] = useState("");
  const [extSponsorId, setExtSponsorId]   = useState("");

  // ── Step 3: Roles ─────────────────────────────────────────────────────────────
  const [primaryRoleId, setPrimaryRoleId] = useState("");
  const [additionalRoleIds, setAdditionalRoleIds] = useState<string[]>([]);
  const [accessStart, setAccessStart]     = useState("");
  const [accessExpiry, setAccessExpiry]   = useState("");
  const [require2FA, setRequire2FA]       = useState(false);

  // ── Step 4: Governance ────────────────────────────────────────────────────────
  const [govMembershipIds, setGovMembershipIds] = useState<string[]>([]);
  const [skipGovernance, setSkipGovernance]     = useState(false);

  // ── Step 5: Invitation ────────────────────────────────────────────────────────
  const [inviteAction, setInviteAction] = useState<"draft" | "send_invite" | "activate">("send_invite");

  // ── Field errors ───────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  const firstFieldRef = useRef<HTMLInputElement>(null);

  // ── Init on open ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setStepErrors([false, false, false, false, false]);
    setErrors({});

    if (existing) {
      setUserType(existing.user_type ?? "Internal Employee");
      setName(existing.name ?? "");
      setDisplayName(existing.display_name ?? "");
      setEmail(existing.email ?? "");
      setPhone(existing.phone ?? "");
      setEmployeeId(existing.employee_id ?? "");
      setExtRefId(existing.external_reference_id ?? "");
      setPrefLang(existing.preferred_language ?? "English");
      setTimezone(existing.timezone ?? "Asia/Dhaka (UTC+6)");

      setDesignationId(existing.designation_id ?? "");
      setPosition(existing.position ?? "");
      setBranchId(existing.branch_id ?? "");
      setDivisionId(existing.division_id ?? "");
      setDepartmentId(existing.department_id ?? "");
      setPrimaryOrgUnitId(existing.primary_org_unit_id ?? "");
      setManagerId(existing.manager_user_id ?? "");
      setEmpType(existing.employment_type ?? "full_time");
      setEmpStart(existing.employment_start_at ?? "");
      setEmpEnd(existing.employment_end_at ?? "");
      setExtOrgName(existing.circle ?? "");
      setExtDesignation(existing.designation ?? "");
      setExtSponsorId("");

      setPrimaryRoleId(existing.primary_role_id ?? existing.role_id ?? "");
      setAdditionalRoleIds(
        (existing.role_ids ?? []).filter(id => id !== (existing.primary_role_id ?? existing.role_id))
      );
      setAccessStart(existing.access_start_at ?? "");
      setAccessExpiry(existing.access_expires_at ?? "");
      setRequire2FA(existing.two_factor_required ?? false);

      setGovMembershipIds(existing.governance_membership_ids ?? []);
      setSkipGovernance((existing.governance_membership_ids ?? []).length === 0);
      setInviteAction("draft");
    } else {
      setUserType("Internal Employee");
      setName(""); setDisplayName(""); setEmail(""); setPhone("");
      setEmployeeId(""); setExtRefId("");
      setPrefLang("English"); setTimezone("Asia/Dhaka (UTC+6)");
      setDesignationId(""); setPosition(""); setBranchId(""); setDivisionId("");
      setDepartmentId(""); setPrimaryOrgUnitId(""); setManagerId("");
      setEmpType("full_time"); setEmpStart(""); setEmpEnd("");
      setExtOrgName(""); setExtDesignation(""); setExtSponsorId("");
      setPrimaryRoleId(""); setAdditionalRoleIds([]);
      setAccessStart(""); setAccessExpiry(""); setRequire2FA(false);
      setGovMembershipIds([]); setSkipGovernance(true);
      setInviteAction("send_invite");
    }

    requestAnimationFrame(() => firstFieldRef.current?.focus());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const activeDesignations = desigReg.items.filter(d => d.status === "Active");
  const activeOrgUnits     = orgReg.items.filter(u => u.status === "Active");
  const activeRoles        = roles.filter(r => r.status === "Active");
  const govBodies          = govReg.items;
  const activeManagers     = bmsUsers.filter(u => u.account_status === "active" && u.id !== (existing?.id ?? ""));

  const branches    = activeOrgUnits.filter(u => u.unit_type === "Branch");
  const allDivisions = activeOrgUnits.filter(u => u.unit_type === "Division");
  const allDepts    = activeOrgUnits.filter(u => u.unit_type === "Department");

  const filteredDivisions = branchId
    ? allDivisions.filter(d => d.parent_unit_id === branchId || d.parent_unit === activeOrgUnits.find(u=>u.id===branchId)?.unit_name)
    : allDivisions;
  const filteredDepts = divisionId
    ? allDepts.filter(d => d.parent_unit_id === divisionId || d.parent_unit === activeOrgUnits.find(u=>u.id===divisionId)?.unit_name)
    : allDepts;

  const selectedRole = activeRoles.find(r => r.id === primaryRoleId);
  const modulesWithAccess = selectedRole
    ? permissionGroups.filter(g => g.permissions.some(p => selectedRole.permissions.includes(p.id)))
    : [];

  const selectedDesig = activeDesignations.find(d => d.id === designationId);
  const selectedBranch = activeOrgUnits.find(u => u.id === branchId);
  const selectedDiv = activeOrgUnits.find(u => u.id === divisionId);
  const selectedDept = activeOrgUnits.find(u => u.id === departmentId);
  const selectedPrimaryUnit = activeOrgUnits.find(u => u.id === primaryOrgUnitId);
  const selectedManager = bmsUsers.find(u => u.id === managerId);

  // Build summary path string
  const orgPath = [selectedBranch?.unit_name, selectedDiv?.unit_name, selectedDept?.unit_name, selectedPrimaryUnit?.unit_name]
    .filter(Boolean).join(" › ");

  const isInternal    = userType === "Internal Employee";
  const isGovernance  = userType === "Governance Member";
  const isExternal    = userType === "External Participant";

  // ── Validation ────────────────────────────────────────────────────────────────

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!name.trim()) errs.name = "Full name is required.";
      if (!email.trim()) {
        errs.email = "Email is required.";
      } else if (!isValidEmail(email.trim())) {
        errs.email = "Enter a valid email address.";
      } else if (!isEmailUnique(email.trim(), bmsUsers, existing?.id)) {
        errs.email = "This email is already in use.";
      }
      if (isInternal || isGovernance) {
        if (!employeeId.trim()) {
          errs.employeeId = "Employee ID is required.";
        } else if (!isEmployeeIdUnique(employeeId.trim(), bmsUsers, existing?.id)) {
          errs.employeeId = "This Employee ID is already assigned.";
        }
      }
      if (phone && !isValidPhone(phone)) errs.phone = "Enter a valid phone number.";
    }
    if (s === 1) {
      if (isInternal && !designationId) errs.designationId = "Designation is required.";
      if (isInternal && !primaryOrgUnitId) errs.primaryOrgUnitId = "Primary organisation unit is required.";
    }
    if (s === 2) {
      if (!primaryRoleId) errs.primaryRoleId = "A primary role is required.";
      if (accessStart && accessExpiry && new Date(accessStart) >= new Date(accessExpiry)) {
        errs.accessDates = "Access start must be before expiry date.";
      }
    }
    setErrors(prev => ({ ...prev, ...errs }));
    const hasErrors = Object.keys(errs).length > 0;
    setStepErrors(prev => {
      const next = [...prev];
      next[s] = hasErrors;
      return next;
    });
    return !hasErrors;
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep(s => Math.min(s + 1, 4));
  };
  const goPrev = () => setStep(s => Math.max(s - 1, 0));

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!validateStep(step)) return;
    const now = new Date().toISOString();
    const savedId = existing?.id ?? `u-${Date.now()}`;

    const primaryRole = activeRoles.find(r => r.id === primaryRoleId);

    let accountStatus: AccountStatus = "draft";
    if (inviteAction === "send_invite") accountStatus = "invited";
    else if (inviteAction === "activate") accountStatus = "active";

    const user: BmsUser = {
      ...existing,
      id: savedId,
      created_at: existing?.created_at ?? now,
      updated_at: now,

      // Identity
      user_type:              userType,
      name:                   name.trim(),
      display_name:           displayName.trim() || undefined,
      email:                  email.trim(),
      phone:                  phone || undefined,
      employee_id:            isInternal || isGovernance ? employeeId.trim() : extRefId.trim() || savedId,
      external_reference_id:  isExternal ? extRefId.trim() || undefined : undefined,
      preferred_language:     prefLang,
      timezone:               timezone,

      // Organisation
      designation_id:        isInternal || isGovernance ? (designationId || undefined) : undefined,
      designation:           selectedDesig?.name ?? (isExternal ? extDesignation : undefined),
      position:              position.trim() || undefined,
      branch_id:             isInternal ? (branchId || undefined) : undefined,
      division_id:           isInternal ? (divisionId || undefined) : undefined,
      department_id:         isInternal ? (departmentId || undefined) : undefined,
      primary_org_unit_id:   isInternal || isGovernance ? (primaryOrgUnitId || undefined) : undefined,
      manager_user_id:       isInternal ? (managerId || undefined) : undefined,
      employment_type:       isInternal ? (empType as BmsUser["employment_type"]) : undefined,
      employment_start_at:   isInternal ? (empStart || undefined) : undefined,
      employment_end_at:     isInternal ? (empEnd || undefined) : undefined,
      circle:                isExternal ? extOrgName.trim() : (selectedPrimaryUnit?.unit_name ?? selectedDiv?.unit_name ?? ""),

      // Roles
      primary_role_id:       primaryRoleId || undefined,
      role_ids:              [primaryRoleId, ...additionalRoleIds].filter(Boolean),
      role:                  primaryRole?.name ?? "",
      role_id:               primaryRoleId || undefined,
      level:                 primaryRole?.level ?? "",

      // Access
      access_start_at:       accessStart || undefined,
      access_expires_at:     accessExpiry || undefined,
      two_factor_required:   require2FA,

      // Governance
      governance_membership_ids: skipGovernance ? [] : govMembershipIds,

      // Status
      account_status:        existing?.account_status ?? accountStatus,
      invitation_status:     inviteAction === "send_invite" ? "sent" : "not_sent",
      sendInvite:            inviteAction === "send_invite",

      // Legacy compat
      twoFA:                 require2FA,
      accountActive:         accountStatus === "active",
      status:                accountStatus === "active" ? "Active" : accountStatus === "invited" ? "Pending" : "Inactive",
      lastActive:            existing?.lastActive ?? "Never",
    };

    onSave(user);
    onClose();
  };

  // ── Footer ────────────────────────────────────────────────────────────────────

  const isLastStep = step === 4;
  const isFirstStep = step === 0;

  const footer = (
    <div className="flex items-center gap-3 w-full">
      <Button variant="ghost" size="lg" onClick={onClose} className="mr-auto">
        Cancel
      </Button>
      {!isFirstStep && (
        <Button variant="secondary" size="lg" onClick={goPrev}>
          Back
        </Button>
      )}
      {!isLastStep && (
        <Button variant="primary" size="lg" onClick={goNext}>
          Next
        </Button>
      )}
      {isLastStep && (
        <Button variant="primary" size="lg" onClick={handleSave}>
          {inviteAction === "send_invite" ? "Save & Send Invitation"
            : inviteAction === "activate" ? "Create Active User"
            : "Save as Draft"}
        </Button>
      )}
    </div>
  );

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  const step1 = (
    <fieldset className="modal-fieldset">
      <SectionHead icon={Users} title="Identity & Contact" />
      <div className="modal-fieldset__body">
        <div className="modal-fieldset__grid">
          <div className="modal-fieldset__full">
            <AppSelectField
              id="ufm-usertype"
              label="User Type"
              value={userType}
              onChange={v => setUserType(v as UserType)}
              options={USER_TYPES}
              required
            />
          </div>
          <div>
            <AppTextField
              id="ufm-name"
              label="Full Name"
              value={name}
              onChange={v => { setName(v); setErrors(e => ({ ...e, name: "" })); }}
              required
              inputRef={firstFieldRef}
              autoComplete="off"
            />
            <FieldError msg={errors.name} />
          </div>
          <AppTextField
            id="ufm-displayname"
            label="Display Name"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Optional preferred name"
            autoComplete="off"
          />
          <div>
            <AppTextField
              id="ufm-email"
              label="Official Email"
              value={email}
              onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: "" })); }}
              required
              autoComplete="off"
            />
            <FieldError msg={errors.email} />
          </div>
          <div>
            <AppPhoneField
              id="ufm-phone"
              label="Phone"
              value={phone}
              onChange={v => { setPhone(v); setErrors(e => ({ ...e, phone: "" })); }}
              placeholder="+880-XXXX-XXXXXX"
            />
            <FieldError msg={errors.phone} />
          </div>
          {(isInternal || isGovernance) && (
            <div>
              <AppTextField
                id="ufm-empid"
                label="Employee ID"
                value={employeeId}
                onChange={v => { setEmployeeId(v); setErrors(e => ({ ...e, employeeId: "" })); }}
                helper="Must be unique across all users"
                required
                autoComplete="off"
              />
              <FieldError msg={errors.employeeId} />
            </div>
          )}
          {isExternal && (
            <AppTextField
              id="ufm-extrefid"
              label="External Reference ID"
              value={extRefId}
              onChange={setExtRefId}
              helper="Identifier from the external organisation"
              autoComplete="off"
            />
          )}
          <AppSelectField
            id="ufm-lang"
            label="Preferred Language"
            value={prefLang}
            onChange={setPrefLang}
            options={LANGUAGES}
          />
          <AppSelectField
            id="ufm-tz"
            label="Time Zone"
            value={timezone}
            onChange={setTimezone}
            options={TIMEZONES}
          />
        </div>
      </div>
    </fieldset>
  );

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  const step2Internal = (
    <>
      <fieldset className="modal-fieldset">
        <SectionHead icon={Building2} title="Organisation Assignment" />
        <div className="modal-fieldset__body">
          <div className="modal-fieldset__grid">
            <AppSelectField
              id="ufm-branch"
              label="Branch"
              value={branches.find(u => u.id === branchId)?.unit_name ?? ""}
              onChange={v => {
                const u = branches.find(u => u.unit_name === v);
                setBranchId(u?.id ?? "");
                setDivisionId(""); setDepartmentId("");
              }}
              options={["", ...branches.map(u => u.unit_name)]}
              helper="Optional — filter by branch"
            />
            <AppSelectField
              id="ufm-division"
              label="Division"
              value={filteredDivisions.find(u => u.id === divisionId)?.unit_name ?? ""}
              onChange={v => {
                const u = filteredDivisions.find(u => u.unit_name === v);
                setDivisionId(u?.id ?? "");
                setDepartmentId("");
              }}
              options={["", ...filteredDivisions.map(u => u.unit_name)]}
              helper="Optional — filter by division"
            />
            <AppSelectField
              id="ufm-dept"
              label="Department"
              value={filteredDepts.find(u => u.id === departmentId)?.unit_name ?? ""}
              onChange={v => {
                const u = filteredDepts.find(u => u.unit_name === v);
                setDepartmentId(u?.id ?? "");
              }}
              options={["", ...filteredDepts.map(u => u.unit_name)]}
              helper="Optional — filter by department"
            />
            <div>
              <AppSelectField
                id="ufm-primaryunit"
                label="Primary Organisation Unit"
                value={selectedPrimaryUnit?.unit_name ?? ""}
                onChange={v => {
                  const u = activeOrgUnits.find(u => u.unit_name === v);
                  setPrimaryOrgUnitId(u?.id ?? "");
                  setErrors(e => ({ ...e, primaryOrgUnitId: "" }));
                }}
                options={activeOrgUnits.map(u => u.unit_name)}
                required
                helper={selectedPrimaryUnit ? `${selectedPrimaryUnit.unit_type} · ${selectedPrimaryUnit.parent_unit}` : "Main unit assignment"}
              />
              <FieldError msg={errors.primaryOrgUnitId} />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="modal-fieldset">
        <SectionHead icon={Users} title="Designation & Reporting" />
        <div className="modal-fieldset__body">
          <div className="modal-fieldset__grid">
            <div>
              <AppSelectField
                id="ufm-desig"
                label="Designation"
                value={selectedDesig?.name ?? ""}
                onChange={v => {
                  const d = activeDesignations.find(d => d.name === v);
                  setDesignationId(d?.id ?? "");
                  setErrors(e => ({ ...e, designationId: "" }));
                }}
                options={activeDesignations.map(d => d.name)}
                required
                helper={selectedDesig?.category ? `${selectedDesig.category} · ${selectedDesig.code ?? ""}` : ""}
              />
              <FieldError msg={errors.designationId} />
            </div>
            <AppTextField
              id="ufm-position"
              label="Position / Title"
              value={position}
              onChange={setPosition}
              placeholder="e.g. Head of Finance"
            />
            <AppSelectField
              id="ufm-manager"
              label="Reporting Manager"
              value={activeManagers.find(u => u.id === managerId)?.name ?? ""}
              onChange={v => {
                const u = activeManagers.find(u => u.name === v);
                setManagerId(u?.id ?? "");
              }}
              options={["", ...activeManagers.map(u => u.name)]}
              helper="Optional"
            />
            <AppSelectField
              id="ufm-emptype"
              label="Employment Type"
              value={EMP_TYPE_LABELS[empType] ?? empType}
              onChange={v => {
                const entry = Object.entries(EMP_TYPE_LABELS).find(([, label]) => label === v);
                setEmpType(entry ? entry[0] : v);
              }}
              options={EMP_TYPES.map(t => EMP_TYPE_LABELS[t])}
            />
            <AppDateField
              id="ufm-empstart"
              label="Employment Start Date"
              value={empStart}
              onChange={setEmpStart}
            />
            <AppDateField
              id="ufm-empend"
              label="Employment End Date (Optional)"
              value={empEnd}
              onChange={setEmpEnd}
            />
          </div>
        </div>
      </fieldset>
    </>
  );

  const step2External = (
    <fieldset className="modal-fieldset">
      <SectionHead icon={Building2} title="External Organisation" />
      <div className="modal-fieldset__body">
        <div className="modal-fieldset__grid">
          <AppTextField
            id="ufm-extorg"
            label="Organisation Name"
            value={extOrgName}
            onChange={setExtOrgName}
            placeholder="External organisation name"
          />
          <AppTextField
            id="ufm-extdesig"
            label="Designation / Title"
            value={extDesignation}
            onChange={setExtDesignation}
            placeholder="e.g. Senior Consultant"
          />
          <AppSelectField
            id="ufm-extsponsor"
            label="Internal Sponsor"
            value={activeManagers.find(u => u.id === extSponsorId)?.name ?? ""}
            onChange={v => {
              const u = activeManagers.find(u => u.name === v);
              setExtSponsorId(u?.id ?? "");
            }}
            options={["", ...activeManagers.map(u => u.name)]}
            helper="Internal user responsible for this participant"
          />
          <AppDateField
            id="ufm-extexpiry"
            label="Access Expiry Date"
            value={accessExpiry}
            onChange={setAccessExpiry}
          />
        </div>
      </div>
    </fieldset>
  );

  const step2Governance = (
    <>
      {step2Internal}
      <p className="text-[0.75rem] text-[var(--color-text-secondary)] mt-1 mb-3 px-1">
        Governance membership is managed separately in Step 4.
      </p>
    </>
  );

  const step2 = isExternal ? step2External : isGovernance ? step2Governance : step2Internal;

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  const step3 = (
    <>
      <fieldset className="modal-fieldset">
        <SectionHead icon={Shield} title="Role Assignment" />
        <div className="modal-fieldset__body">
          <div className="modal-fieldset__grid">
            <div>
              <AppSelectField
                id="ufm-primaryrole"
                label="Primary Role"
                value={activeRoles.find(r => r.id === primaryRoleId)?.name ?? ""}
                onChange={v => {
                  const r = activeRoles.find(r => r.name === v);
                  setPrimaryRoleId(r?.id ?? "");
                  setErrors(e => ({ ...e, primaryRoleId: "" }));
                }}
                options={activeRoles.map(r => r.name)}
                required
                helper="Determines system access permissions"
              />
              <FieldError msg={errors.primaryRoleId} />
            </div>
            {selectedRole && (
              <div className="modal-fieldset__full">
                <div className="role-summary">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <SafeText value={selectedRole.name} mode="truncate" as="span" className="text-[13px] font-semibold text-[var(--color-primary)]" />
                      <span className="modal-form-header__subtitle">{selectedRole.level}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="modal-form-header__subtitle">{selectedRole.permissions.length} permissions</span>
                      <button
                        type="button"
                        onClick={() => { onClose(); onNavigateToRoleManagement(); }}
                        className="text-[12px] font-semibold outline-none rounded focus-visible:outline-2 focus-visible:outline-offset-2 text-[var(--color-primary)]"
                      >
                        View
                      </button>
                    </div>
                  </div>
                  {selectedRole.description && (
                    <div className="text-[12px] mb-2 leading-snug text-[var(--color-text-secondary)]">
                      <ExpandableText value={selectedRole.description} maxChars={100} collapsedLines={2} mode="block" />
                    </div>
                  )}
                  <div className="role-summary__tags">
                    {modulesWithAccess.length > 0
                      ? modulesWithAccess.map(g => <span key={g.id} className="role-tag">{g.label}</span>)
                      : <span className="modal-form-header__subtitle">No modules assigned</span>
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="modal-fieldset">
        <SectionHead icon={Users} title="Access Period & Security" />
        <div className="modal-fieldset__body">
          <div className="modal-fieldset__grid">
            <AppDateField id="ufm-accstart" label="Access Start Date" value={accessStart} onChange={setAccessStart} />
            <div>
              <AppDateField id="ufm-accexpiry" label="Access Expiry Date" value={accessExpiry} onChange={setAccessExpiry} />
              <FieldError msg={errors.accessDates} />
            </div>
            <div className="modal-fieldset__full">
              <SToggle id="ufm-2fa" checked={require2FA} onChange={setRequire2FA} label="Require two-factor authentication (2FA)" />
            </div>
          </div>
        </div>
      </fieldset>
    </>
  );

  // ── Step 4 ─────────────────────────────────────────────────────────────────

  const step4 = (
    <fieldset className="modal-fieldset">
      <SectionHead icon={Landmark} title="Governance Memberships" />
      <div className="modal-fieldset__body">
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-[var(--color-surface)] text-[0.78rem] text-[var(--color-text-secondary)]">
          <Info size={13} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
          <span>Assign this user to governance bodies. This step is optional — skip if no membership is needed at this time.</span>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {govBodies.filter(g => g.status === "Active").map(body => {
            const checked = govMembershipIds.includes(body.id);
            return (
              <label key={body.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => {
                    setGovMembershipIds(prev =>
                      e.target.checked ? [...prev, body.id] : prev.filter(id => id !== body.id)
                    );
                    if (e.target.checked) setSkipGovernance(false);
                  }}
                  className="accent-[var(--color-primary)] w-4 h-4"
                />
                <div className="min-w-0">
                  <p className="text-[0.8rem] font-medium text-[var(--color-text-primary)] truncate">{body.body_name}</p>
                  <p className="text-[0.72rem] text-[var(--color-text-secondary)]">{body.body_type}</p>
                </div>
              </label>
            );
          })}
          {govBodies.filter(g => g.status === "Active").length === 0 && (
            <p className="text-[0.78rem] text-[var(--color-text-secondary)] text-center py-4">No active governance bodies found.</p>
          )}
        </div>

        <div className="modal-fieldset__full">
          <SToggle
            id="ufm-skipgov"
            checked={skipGovernance}
            onChange={v => {
              setSkipGovernance(v);
              if (v) setGovMembershipIds([]);
            }}
            label="Skip — no governance membership needed right now"
          />
        </div>
      </div>
    </fieldset>
  );

  // ── Step 5: Review ─────────────────────────────────────────────────────────

  const primaryRole = activeRoles.find(r => r.id === primaryRoleId);
  const additionalRoleNames = additionalRoleIds
    .map(id => activeRoles.find(r => r.id === id)?.name)
    .filter(Boolean);
  const selectedGovBodies = govBodies.filter(g => govMembershipIds.includes(g.id));

  function SummaryRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <div className="detail-row">
        <span className="detail-row__key">{label}</span>
        <span className="detail-row__val">
          <SafeText value={value} mode="break" as="span" />
        </span>
      </div>
    );
  }

  const step5 = (
    <>
      <div className="detail-section mb-4">
        <p className="filter-label mb-2">Identity</p>
        <SummaryRow label="User Type" value={userType} />
        <SummaryRow label="Full Name" value={name} />
        <SummaryRow label="Display Name" value={displayName} />
        <SummaryRow label="Email" value={email} />
        <SummaryRow label="Phone" value={phone} />
        <SummaryRow label="Employee ID" value={isInternal || isGovernance ? employeeId : undefined} />
        <SummaryRow label="External Ref" value={isExternal ? extRefId : undefined} />
      </div>

      <div className="detail-section mb-4">
        <p className="filter-label mb-2">Organisation</p>
        {isInternal || isGovernance ? (
          <>
            <SummaryRow label="Designation" value={selectedDesig?.name} />
            <SummaryRow label="Position" value={position} />
            <SummaryRow label="Org Path" value={orgPath || undefined} />
            <SummaryRow label="Manager" value={selectedManager?.name} />
            <SummaryRow label="Employment" value={EMP_TYPE_LABELS[empType]} />
          </>
        ) : (
          <>
            <SummaryRow label="Organisation" value={extOrgName} />
            <SummaryRow label="Designation" value={extDesignation} />
          </>
        )}
      </div>

      <div className="detail-section mb-4">
        <p className="filter-label mb-2">Roles & Access</p>
        <SummaryRow label="Primary Role" value={primaryRole?.name} />
        {additionalRoleNames.length > 0 && (
          <SummaryRow label="Additional Roles" value={additionalRoleNames.join(", ")} />
        )}
        <SummaryRow label="Access Start" value={accessStart || undefined} />
        <SummaryRow label="Access Expiry" value={accessExpiry || undefined} />
        <SummaryRow label="2FA Required" value={require2FA ? "Yes" : "No"} />
        {primaryRole && (
          <div className="flex flex-wrap gap-1 mt-2">
            {permissionGroups
              .filter(g => g.permissions.some(p => primaryRole.permissions.includes(p.id)))
              .map(g => <span key={g.id} className="role-tag">{g.label}</span>)}
          </div>
        )}
      </div>

      {selectedGovBodies.length > 0 && (
        <div className="detail-section mb-4">
          <p className="filter-label mb-2">Governance Memberships</p>
          {selectedGovBodies.map(g => (
            <div key={g.id} className="detail-row">
              <span className="detail-row__key">{g.body_name}</span>
              <span className="detail-row__val text-[0.75rem]">{g.body_type}</span>
            </div>
          ))}
        </div>
      )}

      {!isEdit && (
        <fieldset className="modal-fieldset">
          <SectionHead icon={Users} title="Create Action" />
          <div className="modal-fieldset__body">
            <div className="flex flex-col gap-2">
              {[
                { value: "draft", label: "Save as Draft", desc: "User is created but not yet active. No invitation sent." },
                { value: "send_invite", label: "Save & Send Invitation", desc: "User record saved and an invitation email will be sent." },
                { value: "activate", label: "Create Active User", desc: "User is immediately activated. For use by authorised administrators only." },
              ].map(opt => (
                <label key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    inviteAction === opt.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="inviteAction"
                    value={opt.value}
                    checked={inviteAction === opt.value}
                    onChange={() => setInviteAction(opt.value as typeof inviteAction)}
                    className="accent-[var(--color-primary)] mt-1"
                  />
                  <div>
                    <p className="text-[0.8rem] font-semibold text-[var(--color-text-primary)]">{opt.label}</p>
                    <p className="text-[0.72rem] text-[var(--color-text-secondary)]">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </fieldset>
      )}
    </>
  );

  const stepContent = [step1, step2, step3, step4, step5];

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit User — ${existing?.name ?? ""}` : "Add New User"}
      icon={<UserPlus size={15} strokeWidth={2} />}
      subtitle={isEdit ? "Update user information and access" : "Create a new user account"}
      fullPage
      hasUnsavedChanges={name.length > 0}
      steps={STEP_LABELS}
      stepShortLabels={STEP_SHORT}
      currentStep={step}
      stepIcons={STEP_ICONS}
      stepErrors={stepErrors}
      onStepClick={s => { if (s < step) setStep(s); }}
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        {stepContent[step]}
      </div>
    </AppModal>
  );
}
