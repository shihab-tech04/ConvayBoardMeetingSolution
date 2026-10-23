Complete the advanced Document Library by adding the production editor adapter, final security rules, responsive behavior, error handling, cleanup, and tests.

Do not remove the working local editor.

## ONLYOFFICE provider

Complete:

`OnlyOfficeEditorProvider`

Use backend-generated editor configuration.

Configuration should support:

- Document URL
- Document key
- File type
- Document title
- Logged-in user ID
- Logged-in user name
- Permissions
- Editor mode
- Language
- Callback URL
- JWT
- Customization
- Editor events

Do not expose server secrets in frontend code.

Environment values may contain only public configuration such as the document-server URL.

Use backend contracts for:

- Editor configuration
- Save callback
- Version creation
- Historical files
- Restore
- Access
- Review
- Approval

## Capability behavior

When ONLYOFFICE is available, support its real features:

- Office document editing
- Real-time co-editing
- Comments
- Tracked changes
- Review mode
- Presence
- Version saving
- Office export

When unavailable:

- Keep the local editor working
- Show a clear provider status
- Do not display real-time collaboration as active
- Do not display tracked changes as active

## Security

Document access must combine:

- System permissions
- Document ownership
- Explicit access grants
- Workflow assignment
- Confidentiality
- Related-record access where appropriate

Do not grant editing only because the user can view the related meeting.

Support:

- Restrict download
- Restrict print
- Restrict copy
- Restrict resharing
- Access expiry
- External-user blocking
- Read-only mode
- Locked approval mode

Apply restrictions through actual action and provider configuration, not only hidden buttons.

## Responsive behavior

### Desktop

- Collapsible left editor panel
- Centered document canvas
- Collapsible right collaboration panel

### Tablet

- Side panels open as overlays
- Toolbar scrolls horizontally
- No page-level horizontal overflow

### Mobile

Support at minimum:

- View document
- Basic editing where supported
- Add and reply to comments
- Resolve comments
- View versions
- Request review
- Approve or reject
- Download where permitted

Do not squeeze the desktop editor into mobile width.

## Error and loading states

Implement:

- Loading library
- Empty library
- No search results
- Loading document
- Missing source file
- Unsupported format
- Converting
- Conversion failed
- Editor unavailable
- Autosave failed
- Offline
- Reconnecting
- Permission denied
- Locked
- Version conflict
- Archived
- Deleted
- Session expired

Every error must include a useful recovery action.

Do not show a blank editor canvas.

## Accessibility

Ensure:

- Accessible editor toolbar labels
- Accessible panel tabs
- Keyboard-accessible comments
- Correct focus movement
- Correct focus restoration
- Visible focus states
- Status not communicated only by color
- Autosave live announcements
- Accessible drawer and modal titles
- Minimum 44px mobile tap targets
- Reduced-motion support

## CSS cleanup

Create or complete:

- `src/styles/documents.css`
- `src/styles/document-editor.css`

Reuse:

- Existing theme tokens
- Existing typography
- Existing buttons
- Existing cards
- Existing tabs
- Existing status badges
- Existing drawer and overlay styles

Remove only obsolete document-specific styles after confirming they are unused.

Do not create a new visual brand.

## Tests

Add tests for:

### Library

- Tabs
- Search
- Filters
- Counts
- URL state
- Drawer deep link
- Permission-based actions

### Upload

- Valid DOCX
- Disguised executable
- MIME mismatch
- Invalid Office container
- Original-file preservation
- Unsupported format

### Local editor

- Create
- Edit
- Autosave
- Reload
- Comments
- Version creation
- Version comparison
- Restore
- Offline persistence

### Workflow

- Review
- Revision
- Approval
- Rejection
- Lock
- Approval reset
- Audit events

### Board Pack

- Add selected version
- Preserve pinned version
- Detect newer version
- Update linked version

### Providers

- Local capability flags
- ONLYOFFICE unavailable state
- Unsupported tracked changes hidden
- Read-only enforcement

Run:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`

Fix all failures.

## Final validation

Confirm:

- Existing document records remain intact.
- The Document Library uses `UnifiedDataTable`.
- Table rows still contain only View.
- Document actions remain in the drawer or editor.
- The local editor works without a backend.
- Original uploaded files are preserved.
- Versions and audit history are preserved.
- Comments are shared between drawer and editor.
- Workflow and permissions work.
- Board Packs pin exact versions.
- My Tasks and My Notes integrations work.
- ONLYOFFICE capabilities appear only when configured.
- Desktop, tablet, mobile, light theme, dark theme, and font scaling work.
- The Help icon remains hidden.
- No User Guide content exists.

## Golden Rules

- Do not break solved issues.
- Do not remove the local editor.
- Do not expose backend secrets.
- Do not fake collaboration capabilities.
- Do not remove document records or versions.
- Do not change unrelated modules.
- Reuse the current design system.
- Keep EN/BN behavior unchanged.
- Keep the Help icon hidden.
- Do not create User Guide content.