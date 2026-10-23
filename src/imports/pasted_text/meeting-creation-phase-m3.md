# Board Meeting Creation — Phase M3: Approved Agendas, Documents, Meeting Mode, and Quorum

Work only on Steps 3 and 4 of the existing Meeting Creation wizard.

Do not create agendas or document metadata directly inside Meeting Creation.

## Step 3 — Agendas and Documents

### Agenda source

Use the canonical Agenda registry and `MeetingAgendaLink` registry.

Remove from Meeting Creation:

* Manual Agenda Item repeatable form
* Automatic creation of new Approved agendas
* Agenda Template selector
* Free-text agenda owner
* Meeting-specific duplicate agenda records

Meeting Creation must select existing agendas from Agenda Management.

## Agenda eligibility

Show only Level 1 parent agendas that are:

* Approved
* Meeting Ready
* Active
* Not archived
* Not already linked to the meeting

Do not show a parent merely because its own status says Approved when an active child still blocks meeting readiness.

Use the Agenda Management readiness logic or extract a shared helper from the existing logic.

Do not create another readiness engine.

## Agenda selector

Each eligible parent must show:

* Agenda title
* Child count
* Total duration
* Owner
* Confidentiality
* Approval status
* Meeting readiness
* Unique document count

Allow:

* Search
* Purpose filter
* Owner filter
* Multi-selection
* Preview hierarchy
* Preview documents

Do not allow editing agenda content from Meeting Creation.

## Selected agenda list

Show selected parent agendas in meeting order.

Users may:

* Move Up
* Move Down
* Preview
* Remove from Meeting

Rules:

* Preserve child hierarchy.
* Store order in `MeetingAgendaLink.display_order`.
* Do not create duplicate meeting-agenda links.
* Removing the relationship must not delete or change the agenda.
* Historical meetings must retain their linked agenda IDs and order.

## Agenda duration

Calculate total duration using selected parent agendas and their active children.

Compare it with scheduled meeting duration.

Show:

* Scheduled duration
* Agenda duration
* Remaining time or overrun

Do not block Save Draft.

Show a scheduling blocker only when the agenda duration exceeds meeting time and the issue has not been acknowledged according to existing policy.

## Agenda documents

Automatically display documents linked to:

* Selected parent agendas
* Their direct child agendas

Use the canonical agenda-document link registry.

Show:

* Document name
* Version
* Status
* Confidentiality
* Source agenda
* Preview

Do not copy documents.

Do not silently change the selected version later.

## Additional meeting documents

Use the existing Document Library picker.

Allow:

* Search
* Filters
* Multi-selection
* Preview
* Version selection when supported

Do not show a manual document metadata form.

Do not create a Draft document record from Meeting Creation.

When users choose Upload New Document:

* Open the existing `DocumentComposerModal`.
* Pass the meeting context.
* Create a normal Document Library record.
* Return to the same meeting Draft.
* Link the stored document after successful creation.

Remove or replace the basic `AddDocumentModal` in `MeetingContextualModals.tsx` because it bypasses real file storage, validation, and version creation.

Reuse the real Document Composer.

## Meeting-document relationship

First inspect whether a reusable meeting-document relationship already exists.

If one exists, use it.

If none exists, add one minimal canonical relationship beside `MeetingAgendaLink` containing only:

* ID
* Meeting ID
* Document ID
* Version ID
* Source: Agenda or Additional
* Source Agenda ID when applicable
* Display order
* Added by
* Added date

Do not create another document registry or copy file content.

Prevent duplicate links for the same meeting, document, and version.

## Step 4 — Meeting Mode

Support:

* Physical
* Virtual
* Hybrid

### Physical

Require:

* Venue
* Room or location
* Access instructions only when needed

### Virtual

Require:

* Virtual platform
* Meeting link or existing session reference

Optional:

* Dial-in information

### Hybrid

Require both physical and virtual details.

Do not build another video-conference system.

Use the existing Live Meeting and virtual-session foundation.

## Quorum configuration

Use:

* Canonical governance membership
* Selected participant links
* Existing `QuorumRule` registry
* One shared quorum calculation helper

Do not create a second quorum engine.

Projected quorum must use:

* Active quorum-eligible selected participants
* Governance-body rule
* Required roles
* Whether virtual participation counts
* Whether alternates count
* Whether recused members are excluded

Do not use RSVP responses to calculate projected quorum during initial creation.

RSVP will affect later pre-meeting readiness, not the initial selection forecast.

Show:

* Eligible participants
* Required number or percentage
* Projected count
* Required roles
* Expected to Meet
* At Risk
* Not Expected to Meet
* Not Configured

Show which missing roles or members cause a risk.

## Document-access checks

Before leaving Step 4, check selected participants against restricted and confidential documents.

Show warnings for users who do not have access.

Do not silently grant access.

Allow authorized users to:

* Review access
* Remove the participant
* Remove the document
* Resolve access through the existing document-access journey

## Completion criteria

* Meeting Creation selects only approved Meeting Ready parent agendas.
* No new agenda records are created.
* Agenda order persists.
* Child hierarchy remains intact.
* Agenda documents appear automatically.
* Additional documents use the real Document Library.
* Upload uses the real Document Composer.
* Document versions remain identifiable.
* Physical, Virtual, and Hybrid validation works.
* One quorum engine calculates projected quorum.
* RSVP is not required for initial scheduling forecast.
* Document access risks are visible.

# Golden Rules

* Do not break Agenda Builder or Document Management.
* Do not create agenda or document records directly in Meeting Creation.
* Do not copy document files.
* Do not create duplicate relationship records.
* Do not create another quorum engine, uploader, picker, viewer, or document store.
* Reuse existing Agenda readiness, Document Composer, Document Library, viewer, registries, and design-system components.
* Preserve IDs, versions, hierarchy, permissions, audit history, desktop, mobile, accessibility, EN/BN, and themes.
