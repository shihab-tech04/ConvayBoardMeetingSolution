# Project Audit — Board Meeting Governance System

**Date:** 2026-07-20  
**Scope:** All active routes, page components, data registries, and i18n state  
**Phase:** Audit only — no code changes

---

## 1. Page-to-Entity Map

### 1.1 Home

| Route | Component | Entity | Registry | KPI Source | i18n Remaining |
|---|---|---|---|---|---|
| `/home/overview` | DashboardPage | Meeting, Decision, ActionItem | `useMeetingRegistry`, `useDecisionRegistry`, `useActionItemRegistry` | Computed from registry | `translate("main.title")`, `translate("main.subtitle")`, `translate("actions.seeLess/seeMore")` |
| `/home/my-tasks` | PSRDashboardPage | Minutes (mock) | **None** — `gen()` + `CIRCLES_DATA` | Hardcoded strings: `"8,421"` `"312"` `"87"` `"14"` | None |
| `/home/my-calendar` | CombinedDashboardPage | Meeting, Decision, ActionItem | `useMeetingRegistry`, `useDecisionRegistry`, `useActionItemRegistry` | Computed from registry | `translate("combined.title")`, `translate("combined.subtitle", ...)` |

### 1.2 Meetings

| Route | Component | Entity | Registry | Columns | Create Persists | Edit Persists | i18n Remaining |
|---|---|---|---|---|---|---|---|
| `/meetings/meeting-overview` | ReturnViewApprovalPage | Meeting | `useMeetingRegistry` | 6 | ✓ | ✗ (no onRowUpdate) | titleKey/descKey in cfg |
| `/meetings/all-meetings` | OnlineReturnRegisterPage | Meeting + Participant (child) + AgendaItem (child) | `useMeetingRegistry`, `useParticipantRegistry`, `useAgendaRegistry` | 6 | ✓ | ✓ | titleKey/descKey |
| `/meetings/meeting-calendar` | OfflineReturnRegisterPage | Meeting | `useMeetingRegistry` | **8** ⚠️ | ✓ | ✗ | titleKey/descKey |
| `/meetings/meeting-templates` | OnlineArchivePage | Meeting Template | **None** — static `archiveRows` | 7 | ✗ | ✗ | titleKey/descKey |
| `/meetings/:meetingId/live` | LiveMeetingPage | Meeting + 9 child entities | 10 registries | N/A (live UI) | ✓ | ✓ | None visible |

### 1.3 Agenda & Documents

| Route | Component | Entity | Registry | Columns | Create Persists | Edit Persists |
|---|---|---|---|---|---|---|
| `/agenda-documents/agenda-management` | Register4ListPage | AgendaItem | `useAgendaRegistry` | **9** ⚠️ | ✓ | ✗ |
| `/agenda-documents/board-packs` | StockRegisterPage | BoardPack | `useBoardPackRegistry` | **9** ⚠️ | ✓ | ✗ |
| `/agenda-documents/document-library` | TaxRegistryPage | Document | `useDocumentRegistry` | **9** ⚠️ | ✓ | ✗ |
| `/agenda-documents/questions-clarifications` | Register5Page (isApproval=false) | BoardQuestion | `useQuestionRegistry` | 6 | ✓ | ✗ |
| `/agenda-documents/my-notes` | Register5Page (isApproval=true) | PrivateNote | `usePrivateNoteRegistry` | 6 | ✓ | ✗ |

### 1.4 Decisions & Follow-up

| Route | Component | Entity | Registry | Columns | Create Persists |
|---|---|---|---|---|---|
| `/decisions-followup/decisions` | PSRApprovalPage | Decision | `useDecisionRegistry` | ~6 | ✓ |
| `/decisions-followup/resolutions` | PSREditRequestPage | Resolution | `useResolutionRegistry` | ~6 | ✓ |
| `/decisions-followup/action-items` | DoubleEntryStatusPage | ActionItem | `useActionItemRegistry` | ~6 | ✓ |
| `/decisions-followup/matters-arising` | DoubleEntryVerificationPage | — | — | — | — |
| `/decisions-followup/follow-up-questions` | PSRDormantPage | — | — | — | — |

> DoubleEntryVerificationPage and PSRDormantPage were not read during this audit. Entity mapping is incomplete for these two.

### 1.5 Governance & Organization

| Route | Component | Entity | Registry | Columns | Notes |
|---|---|---|---|---|---|
| `/governance-org/governance-bodies` | InvalidListPage | GovernanceBody | `useGovernanceRegistry` | ~6 | Read-only |
| `/governance-org/organization-structure` | ApprovalListPage | OrgStructure | — | ~6 | KPI label mismatch (see §4.3) |
| `/governance-org/users-assignments` | UserManagementPage | SystemUser | `useUserRegistry`, `useRoleRegistry` | Custom component | i18n remaining |
| `/governance-org/designations-positions` | TransferHistoryPage | Designation/Position | — | ~6 | KPI label mismatch |
| `/governance-org/participant-groups` | ParticipantGroupsPage | ParticipantGroup | **None** — hardcoded ROWS | 5 | No persistence at all |

### 1.6 Archive & Reports

| Route | Component | Entity | Registry | Columns | Notes |
|---|---|---|---|---|---|
| `/archive-reports/meeting-archive` | MeetingArchivePage | Meeting (completed) | `useMeetingRegistry` | **8** ⚠️ | Read-only, no drawerActions |
| `/archive-reports/minutes` | MinutesManagementPage | Minutes | `useMinutesRegistry` | 7 | Has EDIT + custom drawer actions |
| `/archive-reports/registers/resolutions` | ResolutionRegisterPage | Resolution | `useResolutionRegistry` | 7 | Read-only |
| `/archive-reports/registers/decisions` | DecisionRegisterPage | Decision | `useDecisionRegistry` | ~7 | Read-only |
| `/archive-reports/registers/actions` | ActionRegisterPage | ActionItem | `useActionItemRegistry` | ~7 | Read-only |
| `/archive-reports/registers/attendance` | AttendanceRegisterPage | Attendance | `useAttendanceRegistry` | ~7 | Read-only |
| `/archive-reports/registers/conflicts` | ConflictRegisterPage | Conflict | `useConflictRegistry` | ~6 | Read-only |
| `/archive-reports/analytics/meeting-performance` | MeetingPerformanceAnalyticsPage | Meeting | `useMeetingRegistry` | **8** ⚠️ | Read-only |
| `/archive-reports/analytics/decision-tracking` | DecisionTrackingPage | Decision | `useDecisionRegistry` | ~7 | Read-only |
| `/archive-reports/analytics/action-items` | ActionItemsAnalyticsPage | ActionItem | `useActionItemRegistry` | ~7 | Read-only |
| `/archive-reports/analytics/governance-bodies` | GovernanceAnalyticsPage | GovernanceBody | `useGovernanceRegistry` | ~7 | Read-only |
| `/archive-reports/analytics/member-participation` | MemberParticipationPage | Attendance | `useAttendanceRegistry` | ~7 | Read-only |
| `/archive-reports/audit-trail` | ReportViewPage (reportId="user-activity-report") | AuditLog | MOCK_DATA["user-activity-report"] | — | Static mock |

> 5 Analytics pages (DecisionTracking, ActionItems, Governance, MemberParticipation) were not read during this audit. Column counts are estimates.

### 1.7 Administration

| Route | Component | Entity | Registry / Data | Columns | Notes |
|---|---|---|---|---|---|
| `/administration/roles` | RoleManagementPage | SystemRole | `useRoleRegistry` | Custom component | i18n remaining |
| `/administration/permissions` | PermissionListPage | Permission | `usePermissionRegistry` | Custom component | Custom + Base permissions |
| `/administration/workflows` | CertificateDataEntryPage | WorkflowDefinition | Static `certDataRows` | 7 | i18n remaining (`useTranslation("actions")`), Edit not persisted |
| `/administration/approval-rules` | CertificateApprovalRequestPage | ApprovalRule | Static `certDataRows` ⚠️ | 7 | Shares same mock data as above |
| `/administration/workflow-history` | CertificateDisposalHistoryPage | WorkflowHistory | Static `certDisposalRows` | 7 | Read-only |
| `/administration/meeting-types` | DemandRegisterPage | MeetingType | Static `demandRows` | ~7 | Semantic mismatch (demand naming) |
| `/administration/quorum-rules` | DemandApprovalPage | QuorumRule | Static `demandRows` | 7 | Edit not persisted |
| `/administration/voting-methods` | TaxpayerLedgerPage | VotingMethod | Static `ledgerRows` | 7 | Duplicate function (see §4.7), hardcoded KPIs |
| `/administration/statuses-numbering` | RefundAdjustmentPage | StatusConfig | Static `refundRows` | 6 | Edit not persisted |
| `/administration/meeting-templates` | AppealPage (isApproval=false) | MeetingTemplate | Static `appealRows` | 7 | Edit not persisted |
| `/administration/minutes-templates` | AppealPage (isApproval=true) | MinutesTemplate | Static `appealRows` | 7 | Same data as above ⚠️ |
| `/administration/doc-templates` | TribunalPage (isApproval=false) | DocumentTemplate | Static `tribunalRows` | 7 | Edit not persisted |
| `/administration/comm-templates` | TribunalPage (isApproval=true) | CommunicationTemplate | Static `tribunalRows` | 7 | Same data as above ⚠️ |
| `/administration/notifications` | LitigationCasePage (caseType="taxpayer-case") | Notification | — | ~7 | 4 routes share 1 component |
| `/administration/integrations` | LitigationCasePage (caseType="dept-case") | Integration | — | ~7 | Same component, different prop |
| `/administration/security-policies` | AuditSelectionPage | SecurityPolicy | Static `auditRows` | 7 | Audit field names (see §4.3) |
| `/administration/retention` | TimeExtensionPage | RetentionPolicy | Static `timeExtRows` | 7 | Edit not persisted |
| `/administration/special-registration` | SpecialRegistrationPage | SRApplication | `specialRegistrationRepository` | Custom component | i18n remaining |

### 1.8 Public

| Route | Component | Entity | Notes |
|---|---|---|---|
| `/special-registration` | SpecialRegistrationPublicPage | SRApplication | Public submission form |

---

## 2. Shared Data Registries

All board-meeting entity state lives in `src/app/data/boardMeetingData.ts` via the `createEntityRegistry` pattern (Redux Toolkit + custom hooks).

| Registry Hook | Entity | Used By |
|---|---|---|
| `useMeetingRegistry` | Meeting | Dashboard, Meeting Overview/All/Calendar/Archive, LiveMeeting, MeetingArchive, AnalyticsPages |
| `useDecisionRegistry` | Decision | Dashboard, CombinedDash, PSRApprovalPage, DecisionRegister, DecisionTrackingPage |
| `useActionItemRegistry` | ActionItem | Dashboard, DoubleEntryStatusPage, ActionRegister, ActionItemsAnalyticsPage |
| `useResolutionRegistry` | Resolution | PSREditRequestPage, ResolutionRegister |
| `useAgendaRegistry` | AgendaItem | Register4ListPage, OnlineReturnRegisterPage (child write) |
| `useParticipantRegistry` | Participant | OnlineReturnRegisterPage (child write), LiveMeetingPage |
| `useMinutesRegistry` | Minutes | MinutesManagementPage, LiveMeetingPage |
| `useMotionRegistry` | Motion | LiveMeetingPage |
| `useAttendanceRegistry` | Attendance | AttendanceRegister, LiveMeetingPage |
| `useQuorumEventRegistry` | QuorumEvent | LiveMeetingPage |
| `useBoardPackRegistry` | BoardPack | StockRegisterPage |
| `useDocumentRegistry` | Document | TaxRegistryPage |
| `useGovernanceRegistry` | GovernanceBody | InvalidListPage, GovernanceAnalyticsPage |
| `useQuestionRegistry` | BoardQuestion | Register5Page (isApproval=false) |
| `usePrivateNoteRegistry` | PrivateNote | Register5Page (isApproval=true) |
| `useConflictRegistry` | Conflict | ConflictRegister |
| `useUserRegistry` | SystemUser | UserManagementPage |
| `useRoleRegistry` | SystemRole | UserManagementPage, RoleManagementPage |
| `usePermissionRegistry` | Permission | PermissionListPage, UserFormModal |

**Static mock data (not registry-backed):**

| Variable | Used By | Location |
|---|---|---|
| `archiveRows` | OnlineArchivePage | modulePageUtils.ts |
| `appealRows` | AppealPage ×2 | modulePageUtils.ts |
| `tribunalRows` | TribunalPage ×2 | modulePageUtils.ts |
| `auditRows` | AuditSelectionPage | modulePageUtils.ts |
| `timeExtRows` | TimeExtensionPage | modulePageUtils.ts |
| `ledgerRows` | TaxpayerLedgerPage | modulePageUtils.ts |
| `refundRows` | RefundAdjustmentPage | modulePageUtils.ts |
| `demandRows` | DemandRegisterPage, DemandApprovalPage | modulePageUtils.ts |
| `certDataRows` | CertificateDataEntryPage, CertificateApprovalRequestPage | modulePageUtils.ts |
| `certDisposalRows` | CertificateDisposalHistoryPage | modulePageUtils.ts |
| `gen()` mock | PSRDashboardPage | modulePageUtils.ts |
| `MOCK_DATA["user-activity-report"]` | ReportViewPage | mockData.ts |

---

## 3. Form & Drawer Schema Quick Reference

| Page | Form Fields Source | Steps | Drawer Schema |
|---|---|---|---|
| Meeting Overview / All Meetings / Calendar | `MEETING_FORM_FIELDS`, `MEETING_FORM_STEPS` | Multi-step | `MEETING_FULL_ACTIONS` drawer |
| Meeting Templates | `MEETING_TEMPLATE_FORM_FIELDS` | Single | View only |
| Agenda Management | `AGENDA_SUBMISSION_FORM_FIELDS` | Single | EDIT |
| Board Packs | `BOARD_PACK_FORM_FIELDS` | Single | `DOCUMENT_ACTIONS` |
| Document Library | `DOCUMENT_FORM_FIELDS` | Single | `DOCUMENT_ACTIONS` |
| Questions | `QUESTION_FORM_FIELDS` | Single | EDIT |
| My Notes | `NOTE_FORM_FIELDS` | Single | EDIT |
| Decisions | `DECISION_FORM_FIELDS` | — | — |
| Resolutions | `RESOLUTION_FORM_FIELDS` | — | — |
| Action Items | `ACTION_ITEM_FORM_FIELDS` + `PROGRESS_UPDATE` + `EXTENSION_REQUEST` + `COMPLETION` | — | EDIT |
| Minutes | `MINUTES_FORM_FIELDS` | — | EDIT + custom |
| Retention Policies | `RETENTION_FORM_FIELDS` + `LEGAL_HOLD_FORM_FIELDS` (extra btn) | — | EDIT |
| Security Policies | `SECURITY_POLICY_FORM_FIELDS` | — | EDIT |
| Workflow Definitions | `WORKFLOW_FORM_FIELDS` | — | EDIT |
| Approval Rules | `APPROVAL_RULE_FORM_FIELDS` | — | EDIT |
| Quorum Rules | `QUORUM_RULE_FORM_FIELDS` | — | EDIT |
| Voting Methods | `VOTING_METHOD_FORM_FIELDS` | — | EDIT |
| Status Config | `STATUS_CONFIG_FORM_FIELDS` | — | EDIT |
| Templates (Appeal/Tribunal) | `TEMPLATE_FORM_FIELDS` | — | EDIT |
| Participant Groups | Inline fields | — | Custom |
| Users | Custom UserFormModal | — | Custom UserDetailDrawer |
| Roles | Custom modal | — | Custom drawer |
| Permissions | Custom modal | — | DynamicDetailsDrawer |

---

## 4. Findings

### 4.1 Pages Using Local State Instead of Registries

These pages render static arrays from `modulePageUtils.ts`. Edits in the drawer are shown in the UI temporarily but are discarded on page reload. No `onRowCreate` / `onRowUpdate` is wired.

1. **PSRDashboardPage** — entirely local mock data via `gen()` and hardcoded strings
2. **ParticipantGroupsPage** — inline `const ROWS = [...]` hardcoded in component
3. **OnlineArchivePage** — `archiveRows` (static, modulePageUtils)
4. **AppealPage** ×2 — `appealRows` (static)
5. **TribunalPage** ×2 — `tribunalRows` (static)
6. **AuditSelectionPage** — `auditRows` (static)
7. **TimeExtensionPage** — `timeExtRows` (static)
8. **TaxpayerLedgerPage** — `ledgerRows` (static)
9. **RefundAdjustmentPage** — `refundRows` (static)
10. **DemandRegisterPage** — `demandRows` (static)
11. **DemandApprovalPage** — `demandRows` (static)
12. **CertificateDataEntryPage** — `certDataRows` (static)
13. **CertificateApprovalRequestPage** — `certDataRows` (static, same array as above)
14. **ReportViewPage** (audit trail) — `MOCK_DATA["user-activity-report"]` (static)

### 4.2 Pages Where Edit Does Not Persist

Pages that render `drawerActions: EDIT` but have no `onRowUpdate` callback AND use static row data. The edit form opens, saves locally in `GeneratedTablePage`'s state, but the data source is not updated.

1. OnlineArchivePage (meeting templates)
2. AppealPage ×2 (meeting/minutes templates)
3. TribunalPage ×2 (doc/comm templates)
4. AuditSelectionPage (security policies)
5. TimeExtensionPage (retention policies)
6. TaxpayerLedgerPage (voting methods)
7. RefundAdjustmentPage (statuses/numbering)
8. DemandRegisterPage (meeting types)
9. DemandApprovalPage (quorum rules)
10. CertificateDataEntryPage (workflow definitions)
11. CertificateApprovalRequestPage (approval rules)
12. Register4ListPage (agenda) — has `onRowCreate` but no `onRowUpdate`
13. StockRegisterPage (board packs) — has `onRowCreate` but no `onRowUpdate`
14. TaxRegistryPage (documents) — has `onRowCreate` but no `onRowUpdate`
15. ReturnViewApprovalPage (meeting overview) — has `onRowCreate` but no `onRowUpdate`
16. OfflineReturnRegisterPage (meeting calendar) — has `onRowCreate` but no `onRowUpdate`

### 4.3 Pages Where Drawers Fall Back to Table Columns

When `drawerActions` is absent and `GeneratedTablePage`'s detail view is triggered, it renders all table columns as the drawer body. Confirmed for:

1. **MeetingArchivePage** — no `drawerActions` key; `actions: ROW_VIEW` only
2. **ResolutionRegisterPage** — `actions: ROW_VIEW`, no `drawerActions`
3. **DecisionRegisterPage** — `actions: ROW_VIEW`, no `drawerActions`
4. **ActionRegisterPage** — `actions: ROW_VIEW`, no `drawerActions`
5. **AttendanceRegisterPage** — `actions: ROW_VIEW`, no `drawerActions`
6. **ConflictRegisterPage** — `actions: ROW_VIEW`, no `drawerActions`
7. **All 5 AnalyticsPages** — `actions: ROW_VIEW`, no `drawerActions` (read-only intent, but drawer falls back)

### 4.4 Tables With More Than 7 Columns

| Page | Column Count | Extra Columns |
|---|---|---|
| Register4ListPage (Agenda Mgmt) | 9 | agenda_id, title, submitted_by, committee, meeting, purpose, priority, date, status |
| StockRegisterPage (Board Packs) | 9 | pack_id, title, committee, meeting, version, documents, published, created_by, status |
| TaxRegistryPage (Document Library) | 9 | doc_id, name, type, meeting, owner, version, confidentiality, date, status |
| OfflineReturnRegisterPage (Meeting Calendar) | 8 | title, committee, date, start_time, duration, mode, venue, status |
| MeetingArchivePage | 8 | meeting_id, title, committee, type, date, chairperson, participants, status |
| MeetingPerformanceAnalyticsPage | 8 | meeting_id, title, committee, date, agenda_count, participants, quorum, status |

### 4.5 Duplicate Components / Shared Mock Data

1. **CertificateDataEntryPage + CertificateApprovalRequestPage** — both consume the same `certDataRows` array. The two pages show different columns mapped to the same underlying data, meaning they display identical records with different labels.

2. **AppealPage ×2** — `/administration/meeting-templates` and `/administration/minutes-templates` both render `AppealPage` with different `isApproval` props but share `appealRows`. Any template created on one page appears on the other with the same data.

3. **TribunalPage ×2** — same pattern: `/administration/doc-templates` and `/administration/comm-templates` share `tribunalRows`.

4. **DemandRegisterPage + DemandApprovalPage** — both use `demandRows` from modulePageUtils. Meeting types and quorum rules appear to show the same records.

5. **Register5Page** — two routes (`questions-clarifications` and `my-notes`) share a single component file. These are separate registries and the component correctly branches on `isApproval`, so this is intentional but may cause confusion.

### 4.6 Hardcoded KPIs (Not Computed From Live Data)

1. **PSRDashboardPage** — all four KPI values are static strings: `"8,421"`, `"312"`, `"87"`, `"14"`. These never change.

2. **TaxpayerLedgerPage** — KPI "Default Method" is hardcoded `"Show of Hands"`; "Recently Updated" is hardcoded `"2"`.

3. **RefundAdjustmentPage** — KPI "Numbering Formats" uses `|| 4` fallback: `String(refundRows.filter(r => r.adjustment_type === "Numbering").length || 4)`. If the filter returns 0, it silently shows `"4"`.

### 4.7 Hardcoded Action Arrays (Inline, Not from modulePageConfigs)

Most pages correctly reference `MEETING_ACTIONS`, `MEETING_FULL_ACTIONS`, `ROW_VIEW`, `EDIT`, `DOCUMENT_ACTIONS` from `src/app/data/modulePageConfigs.ts`. Exceptions:

1. **MinutesManagementPage** — inline actions array:
   ```ts
   actions: [{ id: "view", label: "View Details", labelKey: "actions.viewDetails", icon: Eye }]
   ```
   And inline drawerActions with `request_revision`, `publish`, `archive`.

2. **LitigationCasePage** — actions vary dynamically per `caseType` prop. These are defined inline inside the component rather than extracted to modulePageConfigs.

### 4.8 Unreachable / Unrouted Features

Files exist in `src/app/pages/` but have no route defined in `routes.tsx`:

1. **`meetings/AvailabilityPollPage.tsx`** — file found by Explore agent, not in route map
2. **`meetings/ConflictDeclarationPage.tsx`** — file found by Explore agent, not in route map
3. **`return-register/RSVPManagementPage.tsx`** — file found by Explore agent, not in route map
4. **`administration-requests/certificate-requests/CertificateEditRequestPage.tsx`** — mentioned in session summary but not confirmed in route map; route `/administration/cert-edit-request` may exist in routes.tsx but was not visible in the earlier read

### 4.9 Remaining i18n / Translation Dependencies

**These files still contain `useTranslation`, `translate()`, or translation key strings:**

| File | Type | Remaining calls |
|---|---|---|
| `DashboardPage.tsx` | Page | `translate("main.title")`, `translate("main.subtitle")`, `translate("actions.seeLess")`, `translate("actions.seeMore")` |
| `CombinedDashboardPage.tsx` | Page | `translate("combined.title")`, `translate("combined.subtitle", { assessmentYear })` |
| `UserFormModal.tsx` | Component | All form labels still use `translate("form.*")` — full translate() coverage, not yet inlined |
| `RoleManagementPage.tsx` | Page | `translate()`, `translateActions()`, `translateCommon()` remaining after partial edit |
| `CertificateDataEntryPage.tsx` | Page | `useTranslation("actions")` import + `translateActions` hook still present |
| `SpecialRegistrationPage.tsx` | Page | `useTranslation` import present (not started) |
| `UserManagementPage.tsx` | Page | Not started |
| `PermissionListPage.tsx` | Page | Not started |
| `SpecialRegistrationPublicPage.tsx` | Page | Not started |

**Infrastructure files not yet removed:**

| File | Status |
|---|---|
| `src/app/i18n/config.ts` | Not deleted |
| `src/app/i18n/stub.ts` | Not deleted (still aliased in vite.config.ts) |
| `src/app/i18n/validateLocales.ts` | Not deleted |
| `src/app/locales/` (48 JSON files) | Not deleted |
| `src/app/data/languages.ts` | Not deleted |
| `src/app/components/appearance/LanguageOptionCard.tsx` | Not deleted |
| `src/test/mocks/i18n.ts` | Not deleted |
| `src/test/setup.ts` | i18n mock setup not removed |
| `vite.config.ts` | `react-i18next` alias still present |
| `package.json` | i18next packages not yet removed |

**Residual translation key references in PageCfg objects (non-blocking but cluttered):**

Every `GenPage`-based page still passes `titleKey`, `descKey`, `headerKey`, `labelKey`, and `optionKeys` fields in its `PageCfg`. These keys are string metadata that the stub resolved; once i18n is fully removed, these fields become dead data. They do not break anything currently but should be removed in the i18n cleanup phase.

**Previously described edits that did NOT apply (files on disk still show old content):**

The session summary described edits to `fileValidation.ts` and `specialRegistrationSamples.ts`, but the Read tool confirms the files on disk have NOT been changed:

- `src/app/utils/fileValidation.ts` — still has `tf` parameter on line 52
- `src/app/data/specialRegistrationSamples.ts` — still uses `titleKey`/`descriptionKey` fields
- `src/app/components/users/UserFormModal.tsx` — still uses `useTranslation("user")` on line 2 and `translate()` everywhere

### 4.10 Semantic Field/Label Mismatches from Domain Rename

Pages were renamed from a tax/NBR domain to a board-meeting governance domain. The column `headerKey` values still reference tax-domain keys (non-blocking while stub resolves them, but wrong semantics):

| headerKey in use | Intended meaning in current domain |
|---|---|
| `headers.psrNo` | Resolution/minutes/agenda reference number |
| `headers.bankName` | Venue name |
| `headers.totalRelatedRevenue` | Document count / version count |
| `headers.meetingYear` | Financial year / effective year |
| `headers.amount` | Version number |
| `headers.appealGround` | Governance body |
| `headers.methodName/Type` | Voting method fields |
| `headers.ruleName/Type` | Rule/config fields |

Additionally:

- **AuditSelectionPage**: Page title is "Security Policies" but all internal fields are `audit_status`, `audit_type`, `auditor`. These field names are exposed in drawer details.
- **DemandRegisterPage**: Page title is "Meeting Types" but uses `demandRows` variable and demand-related field names.
- **AppealPage KPI**: Uses `amountField: "amount"` but the column for that field is labelled "Version" — the KPI would show a version string as a monetary total.
- **TribunalPage KPI**: Same pattern — `amountField: "amount"` with "Version" column label.
- **TransferHistoryPage KPI**: Status value `"Transferred"` is mapped to KPI label `"Active"`.
- **ApprovalListPage KPI**: Status labels (`"Active"`, `"Departments"`, `"Inactive"`) do not match the actual field values in the data.

### 4.11 Duplicate Function Definition

`TaxpayerLedgerPage.tsx` defines `parseAmt` twice (lines ~15 and ~19). This is a syntax-level duplicate that TypeScript should flag but may not cause a runtime error in current build.

---

## 5. Confirmed Clean Patterns

- `GeneratedTablePage` / `GenPage` is the authoritative shared page wrapper — consistent across ~35 pages
- `buildPageKpis` utility correctly replaces manual KPI arrays on most registry-backed pages
- `modulePageConfigs.ts` centralises action arrays (`MEETING_ACTIONS`, `ROW_VIEW`, `EDIT`, `DOCUMENT_ACTIONS`, etc.) — only two pages bypass this (see §4.7)
- `boardMeetingFormFields.ts` centralises all form field definitions — no page duplicates its own field arrays
- Live meeting page (`LiveMeetingPage`) is fully registry-backed across all 10 entity types
- `OnlineReturnRegisterPage` correctly writes child participant and agenda records on meeting creation
- `mobileCardMapping` is present on all GenPage pages

---

## 6. Priority Order for Next Phase (i18n Removal Completion)

1. `fileValidation.ts` — remove `tf` param (affects SRDocumentRow)
2. `specialRegistrationSamples.ts` — change `titleKey`/`descriptionKey` to `title`/`description`
3. `UserFormModal.tsx` — inline all `translate("form.*")` calls
4. `DashboardPage.tsx` — 4 remaining translate calls
5. `CombinedDashboardPage.tsx` — 2 remaining translate calls
6. `RoleManagementPage.tsx` — finish partial edit (remaining translate/translateActions/translateCommon)
7. `CertificateDataEntryPage.tsx` — remove translateActions hook
8. `SpecialRegistrationPage.tsx` — full pass
9. `UserManagementPage.tsx` — full pass
10. `PermissionListPage.tsx` — full pass
11. `SpecialRegistrationPublicPage.tsx` — full pass
12. Infrastructure deletion (i18n files, stub, locales, vite alias, package.json)
13. Strip vestigial `titleKey`, `descKey`, `headerKey`, `labelKey`, `optionKeys` from all PageCfg objects
