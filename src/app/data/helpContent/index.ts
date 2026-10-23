export interface FAQ {
  q: string;
  a: string;
}

export interface StatusDef {
  label: string;
  meaning: string;
}

export interface PageGuide {
  title: string;
  overview: string;
  workflow: string[];
  actions: string[];
  statuses?: StatusDef[];
  commonErrors?: string[];
  bestPractices?: string[];
  faqs: FAQ[];
  relatedPages?: string[];
}

export interface RoleGuide {
  role: string;
  icon: string;
  responsibilities: string[];
  actions: string[];
  modules: string[];
  approvalFlow: string;
  escalationFlow: string;
}

export interface ModuleDoc {
  module: string;
  purpose: string;
  workflow: string[];
  dataSources: string[];
  approvalLogic: string;
  statusMeanings: StatusDef[];
  actions: string[];
  commonErrors: string[];
  bestPractices: string[];
  relatedModules: string[];
}

export interface WhatsNewEntry {
  version: string;
  releaseDate: string;
  features: string[];
  fixes: string[];
  uiChanges: string[];
  systemUpdates: string[];
}

// ─────────────────────────────────────────────────────────────────
// PAGE GUIDES
// ─────────────────────────────────────────────────────────────────

export const PAGE_GUIDES: Record<string, PageGuide> = {
  "dashboard-main": {
    title: "Dashboard",
    overview:
      "The main Dashboard provides a real-time overview of committee operations. It summarizes meeting submissions, pending approvals, minutes status, and key performance metrics for the current meeting year.",
    workflow: [
      "Log in — the Dashboard loads automatically with current meeting year data.",
      "Review summary cards to identify pending items requiring your attention.",
      "Click any card or chart element to drill down into the related module.",
      "Use the Meeting Year selector in the topbar to switch reporting periods.",
      "Monitor notifications bell for system alerts and approval requests.",
    ],
    actions: ["View summary statistics", "Navigate to modules via cards", "Switch meeting year", "Export dashboard data"],
    statuses: [
      { label: "Pending", meaning: "Records awaiting action or approval." },
      { label: "Approved", meaning: "Records that have been reviewed and approved." },
      { label: "Rejected", meaning: "Records declined at the approval stage." },
      { label: "Active", meaning: "Members or records currently in the system." },
    ],
    faqs: [
      { q: "Why do my numbers differ from the report?", a: "The dashboard reflects live data for the selected meeting year. Reports may use cached or filtered data. Ensure the same meeting year is selected in both views." },
      { q: "How do I change the meeting year?", a: "Use the Meeting Year dropdown in the topbar (top left). This setting applies globally to all modules." },
      { q: "Can I export dashboard data?", a: "Individual module pages have export functionality. The dashboard itself displays summary KPIs only." },
      { q: "Why is my dashboard showing no data?", a: "Confirm the correct meeting year is selected and that your account has been assigned to the correct committee." },
      { q: "How often does the dashboard refresh?", a: "Dashboard data refreshes when the page is loaded or when you navigate back to it." },
    ],
    relatedPages: ["psr-dashboard", "combined-dashboard"],
  },

  "psr-dashboard": {
    title: "Minutes Dashboard",
    overview:
      "The Minutes Dashboard focuses specifically on minutes records. It provides a breakdown of minutes status across all members in the committee — pending, approved, dormant, and invalid entries.",
    workflow: [
      "Review the minutes status summary at the top of the page.",
      "Use status filters to isolate specific categories (Pending, Dormant, Invalid).",
      "Click any record to view details in the side drawer.",
      "Navigate directly to Minutes Approval or Edit Request from the action buttons.",
    ],
    actions: ["View minutes statistics", "Filter by status", "Navigate to Minutes Approval", "View individual minutes entry records"],
    statuses: [
      { label: "Pending", meaning: "minutes submitted but not yet approved." },
      { label: "Approved", meaning: "minutes reviewed and approved by authorized officer." },
      { label: "Dormant", meaning: "Member has not submitted meeting records for the defined period." },
      { label: "Invalid", meaning: "minutes entry contains data errors or fails validation rules." },
    ],
    faqs: [
      { q: "What is a minutes entry?", a: "Min. Ref. is the minutes record. It tracks whether each member in the committee has submitted their meeting record for the meeting year." },
      { q: "What is a dormant member?", a: "A dormant member is one who has not submitted a return for two or more consecutive meeting years." },
      { q: "How do I approve a minutes entry?", a: "Go to Minutes & Resolutions > Minutes Approval. Select the record and use the Approve action button." },
      { q: "Why is a record showing as Invalid?", a: "Invalid records have data inconsistencies — e.g., Meeting ID mismatch, missing data, or duplicate entries. Review the Common Errors listed in the Invalid List page." },
      { q: "Can I see minutes entry data for a different committee?", a: "No. Each user can only view data for committees they are assigned to by the administrator." },
    ],
    relatedPages: ["psr-approval", "psr-dormant", "invalid-list"],
  },

  "combined-dashboard": {
    title: "Voting Record Dashboard",
    overview:
      "The Voting Record Dashboard monitors the dual-entry verification system that ensures every meeting submission is entered and verified by two separate operators, reducing data entry errors.",
    workflow: [
      "Review the verification status summary — how many records are awaiting second entry.",
      "Use the status breakdown to identify bottlenecks in the double-entry pipeline.",
      "Navigate to Voting Record Verification to process pending items.",
    ],
    actions: ["View double-entry statistics", "Monitor verification backlog", "Navigate to verification page"],
    statuses: [
      { label: "Pending First Entry", meaning: "Record received but not yet entered by first operator." },
      { label: "Pending Second Entry", meaning: "First entry complete, awaiting second operator verification." },
      { label: "Verified", meaning: "Both entries match and record is confirmed." },
      { label: "Discrepancy", meaning: "Two entries do not match; requires supervisor review." },
    ],
    faqs: [
      { q: "What is double-entry verification?", a: "Two separate operators enter the same data independently. The system compares both entries to ensure accuracy before approving the record." },
      { q: "What happens when entries don't match?", a: "A discrepancy alert is created. A supervisor or senior officer must review and determine the correct value." },
      { q: "Can the same person do both entries?", a: "No. The system enforces that the second entry must be made by a different user account." },
    ],
    relatedPages: ["double-entry-status", "double-entry-verification"],
  },

  // ─── REPORTS ────────────────────────────────────────────────────────────────

  "offline-return-report": {
    title: "Offline Meeting Report",
    overview:
      "Displays a consolidated report of all offline (paper-based) meeting records received by the committee for the selected meeting year.",
    workflow: [
      "Select the meeting year from the topbar.",
      "Apply filters (Meeting Type, Committee, Date Range) to narrow results.",
      "Review the data table — each row represents a member's offline meeting record.",
      "Use the Export button to download the report as an Excel file.",
    ],
    actions: ["Filter by department, committee, date", "View return details", "Export to Excel"],
    statuses: [
      { label: "Submitted", meaning: "Physical return received and recorded in system." },
      { label: "Pending", meaning: "Received but not yet fully processed." },
      { label: "Verified", meaning: "Return details confirmed and validated." },
    ],
    faqs: [
      { q: "What is an offline meeting?", a: "An offline meeting is a paper meeting record submitted physically at the board secretariat, as opposed to online submissions through the e-filing portal." },
      { q: "How do I export this report?", a: "Click the Download/Export button in the top right of the table. The file will be saved as an Excel (.xlsx) file." },
      { q: "Why are some entries missing?", a: "Ensure the correct meeting year is selected. Also confirm that returns have been entered into the system by data entry operators." },
      { q: "Can I filter by a specific member's Meeting ID?", a: "Use the search functionality in the table to find a specific Meeting ID or member name." },
      { q: "How do I view the full details of a return?", a: "Click the View/Details icon on the row to open the record details drawer." },
    ],
    relatedPages: ["online-return-register", "return-view-approval"],
  },

  "tax-category-report": {
    title: "Meeting Category Report",
    overview:
      "Provides a breakdown of meeting records and resolutions categorized by meeting type (governance compliance, wealth statement, etc.) for the selected meeting year and committee.",
    workflow: [
      "Select filters for meeting year, department, and committee.",
      "The table shows submission counts and amounts by category.",
      "Export to Excel for further analysis.",
    ],
    actions: ["Filter by category, department, committee", "View category breakdown", "Export to Excel"],
    faqs: [
      { q: "What categories are included?", a: "Categories include individual governance compliance, company meeting records, wealth statement, and other applicable meeting categories defined by Convay." },
      { q: "Why does my total not match the dashboard?", a: "Confirm the same meeting year and committee filters are applied." },
      { q: "Can I see historical data?", a: "Yes — select a previous meeting year from the topbar dropdown." },
      { q: "How is each category calculated?", a: "Figures come from meeting submissions recorded in the Return Register system." },
      { q: "Who can access this report?", a: "Meeting Secretarys, Board Chairmans, and Auditors assigned to the committee." },
    ],
    relatedPages: ["offline-return-report", "dashboard-main"],
  },

  "express-cert-disposal": {
    title: "Express Certificate Disposal Report",
    overview:
      "Tracks the lifecycle of governance clearance certificates from issuance to disposal, providing an audit trail for the certificate management process.",
    workflow: [
      "Apply date range and status filters.",
      "Review the disposal timeline for each certificate batch.",
      "Export records as needed for audit purposes.",
    ],
    actions: ["Filter by date, status", "View certificate details", "Export to Excel"],
    faqs: [
      { q: "What is a certificate disposal?", a: "Disposal refers to the formal recording that blank or used certificate books have been accounted for, preventing unauthorized use." },
      { q: "How do I track a specific certificate number?", a: "Use the search bar to search by certificate number or batch reference." },
      { q: "Who authorizes disposals?", a: "Certificate disposals must be approved by the Board Chairman or designated officer." },
      { q: "What if a certificate is reported missing?", a: "This should be escalated immediately to the Board Chairman. Document the incident in the Administration module." },
      { q: "Can I re-print a disposal record?", a: "Yes — use the Print/Download action on the record row." },
    ],
    relatedPages: ["data-entry-request", "disposal-history"],
  },

  "user-activity-report": {
    title: "User Activity Report",
    overview:
      "Provides a complete audit log of all user actions within the system — logins, record modifications, approvals, exports, and data entry operations.",
    workflow: [
      "Select a user, date range, or action type to filter the activity log.",
      "Review the activity table — each row shows user, action, module, timestamp.",
      "Export the log for compliance or audit purposes.",
    ],
    actions: ["Filter by user, date, action", "View activity details", "Export log to Excel"],
    faqs: [
      { q: "Who can view the User Activity Report?", a: "Only Board Chairmans and Admin Users have access to this report." },
      { q: "How long is activity data retained?", a: "Activity data is retained for the current and previous two meeting years by default." },
      { q: "Can I track who exported data?", a: "Yes — all export actions are logged with user, timestamp, and file details." },
      { q: "What does 'Failed Login' mean in the log?", a: "It records unsuccessful login attempts, which is important for security monitoring." },
      { q: "Can activity data be deleted?", a: "No — activity logs are immutable for audit and compliance purposes." },
    ],
    relatedPages: ["dashboard-main"],
  },

  // ─── RETURN REGISTER ────────────────────────────────────────────────────────

  "return-view-approval": {
    title: "Return View & Approval",
    overview:
      "This page allows authorized officers to review submitted meeting records and either approve or return them for correction. It is the primary workflow for return authorization.",
    workflow: [
      "Review the list of returns awaiting approval.",
      "Click a record to open the details drawer and review all submitted information.",
      "Verify member details, return amount, and supporting documents.",
      "Click Approve to authorize the return, or Return to Member with a reason note.",
    ],
    actions: ["View return details", "Approve return", "Return for correction", "Filter by status/date", "Export list"],
    statuses: [
      { label: "Pending Approval", meaning: "Return submitted by member, awaiting officer review." },
      { label: "Approved", meaning: "Return reviewed and authorized by officer." },
      { label: "Returned", meaning: "Return sent back to member for correction." },
      { label: "Rejected", meaning: "Return formally rejected; member must re-submit." },
    ],
    commonErrors: [
      "Approving without reviewing attached documents.",
      "Not providing a reason when returning a submission.",
      "Approving records outside your assigned committee.",
    ],
    bestPractices: [
      "Always open the full details drawer before approving.",
      "Record clear, actionable notes when returning a submission.",
      "Process approvals in chronological order to avoid backlog.",
    ],
    faqs: [
      { q: "What is the difference between Returned and Rejected?", a: "'Returned' means the member can correct and re-submit. 'Rejected' is a final decision — the member must formally appeal to re-submit." },
      { q: "Can I undo an approval?", a: "No. Once approved, a return cannot be reversed by the approving officer. Contact the Board Chairman if an error was made." },
      { q: "How long do I have to process a pending return?", a: "Per Convay guidelines, pending returns should be processed within 30 working days of receipt." },
      { q: "Can I approve returns in bulk?", a: "No. Each return must be reviewed individually to ensure compliance." },
      { q: "What if I notice a discrepancy in the return data?", a: "Use the 'Return for Correction' action with a detailed note explaining the discrepancy." },
    ],
    relatedPages: ["online-return-register", "offline-return-register"],
  },

  "online-return-register": {
    title: "Online Meeting Register",
    overview:
      "The Online Meeting Register displays all meeting records submitted through the Convay e-filing portal for the selected meeting year, grouped by the current committee.",
    workflow: [
      "Filter by meeting year, status, or date range.",
      "Browse the table of submitted online meetings.",
      "Click a row to view full return details in the side drawer.",
      "Returns requiring approval appear in Return View & Approval.",
    ],
    actions: ["Filter returns", "View return details", "Export register", "Navigate to approval"],
    statuses: [
      { label: "Submitted", meaning: "Return submitted by member via e-filing portal." },
      { label: "Under Review", meaning: "Officer has opened the return for review." },
      { label: "Approved", meaning: "Return formally approved." },
      { label: "Returned", meaning: "Sent back for correction." },
    ],
    faqs: [
      { q: "What is the difference between Online and Offline Meeting Register?", a: "Online returns are submitted digitally through the e-filing portal. Offline returns are paper forms submitted physically at the board secretariat." },
      { q: "Can I see returns from other committees?", a: "No. The register only shows returns for your assigned committee(s)." },
      { q: "How do I find a specific Meeting ID?", a: "Use the search field in the table to search by Meeting ID or member name." },
      { q: "Why is a return missing from the register?", a: "Confirm the member submitted through the official e-filing portal. Submissions from unauthorized channels will not appear." },
      { q: "How do I export the full register?", a: "Click the Download button in the top right. The full filtered list will be exported as Excel." },
    ],
    relatedPages: ["return-view-approval", "offline-return-register"],
  },

  "offline-return-register": {
    title: "Offline Meeting Register",
    overview:
      "Records all paper-based meeting records physically received at the committee office. Data entry operators enter these returns into the system after physical receipt.",
    workflow: [
      "Data entry operators scan and enter paper return details.",
      "Submitted entries appear in this register for officer review.",
      "Filter by date, status, or member to find specific records.",
      "Export as needed for reporting purposes.",
    ],
    actions: ["View return details", "Filter records", "Export register"],
    statuses: [
      { label: "Entered", meaning: "Data entered by operator, not yet verified." },
      { label: "Verified", meaning: "Data entry verified and confirmed." },
      { label: "Approved", meaning: "Return approved by reviewing officer." },
    ],
    faqs: [
      { q: "Who enters offline meetings into the system?", a: "Data Entry Operators are responsible for entering paper return data." },
      { q: "What if data was entered incorrectly?", a: "The data entry operator can edit the record until it is approved. After approval, contact the Board Chairman for corrections." },
      { q: "How is the offline meeting verified?", a: "The supervisor or committee officer compares the entered data against the physical form." },
      { q: "Can offline meetings be approved from this page?", a: "Approval is done in the Return View & Approval page, not in this register." },
      { q: "How long should physical returns be retained?", a: "Per Convay guidelines, physical meeting records must be retained for a minimum of six meeting years." },
    ],
    relatedPages: ["return-view-approval", "online-return-register"],
  },

  "online-archive": {
    title: "Online Archive",
    overview:
      "The Online Archive stores completed, closed, or archived online meeting record records from previous meeting years. It provides read-only access to historical submission data.",
    workflow: [
      "Select the historical meeting year from the topbar.",
      "Browse or search the archive using Meeting ID or member name.",
      "Click a record to view archived details.",
      "Export archived records as needed.",
    ],
    actions: ["Search archive", "View historical records", "Export archive data"],
    faqs: [
      { q: "Can I modify archived records?", a: "No. Archived records are read-only. They cannot be edited or deleted." },
      { q: "How far back does the archive go?", a: "The archive contains records from all previous meeting years loaded into the system." },
      { q: "Why is a recent return showing in the archive?", a: "Completed and closed returns from the current year may be moved to archive after final processing." },
      { q: "Can I restore an archived record to active status?", a: "Contact the Board Chairman or Admin User to restore records." },
      { q: "Who can access the archive?", a: "All authorized users can view the archive. Only Admin Users can manage archival settings." },
    ],
    relatedPages: ["online-return-register"],
  },

  // ─── REGISTER & STOCK ────────────────────────────────────────────────────────

  "register-4": {
    title: "Agenda Register List",
    overview:
      "Agenda Register is the official Convay register that lists all members within a committee, their Meeting IDs, and their meeting submission status for the meeting year.",
    workflow: [
      "Filter by meeting year and committee to load the register.",
      "Review the member list — green/active rows indicate submitted meeting records.",
      "Use the search function to find a specific Meeting ID or member name.",
      "Export the register for submission to the Board Secretariat.",
    ],
    actions: ["Filter by year/committee", "Search members", "View member details", "Export Agenda Register"],
    statuses: [
      { label: "Active", meaning: "Member is active and expected to schedule a meeting." },
      { label: "Submitted", meaning: "Member has submitted a return for this year." },
      { label: "Dormant", meaning: "Member has not submitted meeting records for multiple years." },
      { label: "Inactive", meaning: "Member has been formally deactivated." },
    ],
    faqs: [
      { q: "What is Agenda Register?", a: "Agenda Register is an official Convay record listing all registered members within a committee and their meeting scheduling status." },
      { q: "Why is a member missing from Agenda Register?", a: "The member may not be assigned to your committee, or their Meeting ID may be inactive. Check with the Board Member Registry module." },
      { q: "Can I add new members to Agenda Register?", a: "New member registrations are managed through the Board Member Registry module." },
      { q: "How do I generate the official Agenda Register for the Board Chairman?", a: "Click Export to download the official Excel format. Verify data before submission." },
      { q: "What is the difference between Dormant and Inactive?", a: "Dormant means the member exists but has not filed recently. Inactive means the member has been formally deregistered." },
    ],
    relatedPages: ["stock-register", "tax-registry"],
  },

  "stock-register": {
    title: "Agenda Item Tracker",
    overview:
      "The Agenda Item Tracker tracks the inventory of official board papers, forms, and documents issued to and used by the committee office.",
    workflow: [
      "Review current stock levels for each document type.",
      "Record issued quantities when distributing forms to officers.",
      "Record returned items when collecting unused forms.",
      "Export the register for auditing purposes.",
    ],
    actions: ["View stock levels", "Record issuance", "Record returns", "Export stock register"],
    statuses: [
      { label: "In Stock", meaning: "Available quantity above minimum threshold." },
      { label: "Low Stock", meaning: "Available quantity below the defined minimum." },
      { label: "Out of Stock", meaning: "No items remaining in stock." },
      { label: "Issued", meaning: "Items distributed to an officer or unit." },
    ],
    faqs: [
      { q: "What items are tracked in the Agenda Item Tracker?", a: "Board papers, official forms, blank meeting record books, and other official documents issued by Convay." },
      { q: "Who can issue items from stock?", a: "Only the Stock Manager and authorized Admin Users can record issuances." },
      { q: "What happens when stock runs out?", a: "The system alerts the Stock Manager. A requisition must be raised to the Board Secretariat for replenishment." },
      { q: "How do I correct a wrong entry?", a: "Contact the Admin User — stock entries cannot be self-corrected to maintain audit integrity." },
      { q: "Is stock tracked per officer or per unit?", a: "Stock is tracked per officer for accountability of issued materials." },
    ],
    relatedPages: ["register-4", "data-entry-request"],
  },

  "tax-registry": {
    title: "Board Member Registry",
    overview:
      "The Board Member Registry is the master database of all registered members within the committee, containing Meeting ID, name, address, category, and registration status.",
    workflow: [
      "Search for a member by Meeting ID, name, or address.",
      "Review member profile including registration date and category.",
      "Update address or category information as authorized.",
      "Add new member registrations through the Add form.",
    ],
    actions: ["Search member", "View member profile", "Add new registration", "Update member data", "Export registry"],
    statuses: [
      { label: "Active", meaning: "Member in good standing, expected to file." },
      { label: "Dormant", meaning: "Inactive for multiple meeting years." },
      { label: "Deregistered", meaning: "Formally removed from the registry." },
      { label: "Special", meaning: "Registered under special category rules." },
    ],
    faqs: [
      { q: "Who can add new members?", a: "Meeting Secretarys and Data Entry Operators can register new members. Approval may be required depending on settings." },
      { q: "Can I delete a member record?", a: "No — deactivation is used instead of deletion to maintain historical records." },
      { q: "How do I transfer a member to another committee?", a: "Use the Transfer History page under Minutes & Resolutions." },
      { q: "What is a Special Registration?", a: "Special registrations cover entities with non-standard filing requirements, such as non-resident members or special economic zone entities." },
      { q: "Why can't I find a Meeting ID in the registry?", a: "The Meeting ID may belong to a different committee, or may have been deregistered. Check with the Board Secretariat." },
    ],
    relatedPages: ["register-4", "special-registration"],
  },

  "register-5": {
    title: "Resolution Register",
    overview:
      "Resolution Register is the official demand register that records all financial agenda items issued to members within the committee for the meeting year.",
    workflow: [
      "Review pending demand entries requiring officer sign-off.",
      "Verify demand amounts against resolution records.",
      "Approve or flag entries for correction.",
      "Export the finalized register for Board Chairman submission.",
    ],
    actions: ["Review demand entries", "Approve entries", "Flag for correction", "Export Resolution Register"],
    statuses: [
      { label: "Draft", meaning: "Entry created but not yet submitted for approval." },
      { label: "Pending Approval", meaning: "Entry submitted, awaiting officer authorization." },
      { label: "Approved", meaning: "Demand entry authorized and locked." },
      { label: "Rejected", meaning: "Entry declined; requires correction and resubmission." },
    ],
    faqs: [
      { q: "What is Resolution Register?", a: "Resolution Register is the official Convay register of financial agenda items, tracking amounts resolved and outstanding for each member." },
      { q: "Who approves Resolution Register entries?", a: "Entries are approved by the Meeting Secretary or Board Chairman, depending on demand amount thresholds." },
      { q: "Can I edit an approved entry?", a: "No. Approved entries are locked. Contact the Board Chairman for corrections." },
      { q: "What is the difference between Resolution Register and the Demand Register?", a: "Resolution Register is the official physical/digital ledger. The Demand Register (in Case & Financial Management) handles the full lifecycle of demand issuance, collection, and disputes." },
      { q: "How often should Resolution Register be updated?", a: "Resolution Register entries should be updated within 30 days of a resolution decision." },
    ],
    relatedPages: ["demand-entry", "register-4"],
  },

  // ─── minutes entry & VERIFICATION ──────────────────────────────────────────────────────

  "psr-approval": {
    title: "Minutes Approval",
    overview:
      "The Minutes Approval page is the central workflow for reviewing and approving minutes records. Officers review each minutes for completeness and accuracy before granting approval.",
    workflow: [
      "Review the list of minutes entries pending your approval.",
      "Click a record to open the full details in the side drawer.",
      "Verify member details, submission date, and supporting information.",
      "Click Approve to confirm, or Reject with a documented reason.",
      "Approved minutes entries are locked and counted in the meeting year totals.",
    ],
    actions: ["View minutes entry details", "Approve Minutes", "Reject Minutes", "Request edit", "Filter by status/date"],
    statuses: [
      { label: "Pending", meaning: "minutes submitted, awaiting approval." },
      { label: "Approved", meaning: "minutes reviewed and approved by officer." },
      { label: "Rejected", meaning: "minutes entry declined — member must resubmit." },
      { label: "Edit Requested", meaning: "Officer has requested a correction to the minutes entry." },
    ],
    commonErrors: [
      "Approving a minutes entry without verifying the Meeting ID against Agenda Register.",
      "Rejecting without providing a clear documented reason.",
      "Approving records outside the current meeting year scope.",
    ],
    bestPractices: [
      "Always cross-reference the Meeting ID with the Board Member Registry before approving.",
      "Batch approvals of similar records to improve processing efficiency.",
      "Document all rejections thoroughly for audit trail purposes.",
    ],
    faqs: [
      { q: "What does Min. Ref. stand for?", a: "Min. Ref. is the minutes record — the record confirming a member has submitted their return." },
      { q: "What if I accidentally approve the wrong record?", a: "Contact the Board Chairman immediately. Approved minutes entries cannot be reversed without Board Chairman authorization." },
      { q: "How many minutes entries can I approve per day?", a: "There is no system limit. Process based on workload and accuracy, not speed." },
      { q: "What happens after minutes approval?", a: "The record is locked and counted in the meeting year totals. It also triggers downstream processes in reporting." },
      { q: "Who can approve minutes entries?", a: "Meeting Secretarys and Board Chairmans. Board Directors may also have approval rights depending on configuration." },
    ],
    relatedPages: ["psr-edit-request", "psr-dashboard", "approval-list"],
  },

  "psr-edit-request": {
    title: "minutes entry Edit Request",
    overview:
      "When an officer identifies an error in an approved or submitted minutes entry, an Edit Request must be formally raised. This page manages the lifecycle of such requests.",
    workflow: [
      "Identify the minutes entry requiring correction.",
      "Click 'Request Edit' on the minutes entry detail view.",
      "Provide a clear description of the required change and supporting justification.",
      "Submit for supervisor review and approval.",
      "Once approved, the minutes entry is unlocked for editing.",
    ],
    actions: ["View edit requests", "Submit new edit request", "Approve/reject edit request", "Track request status"],
    statuses: [
      { label: "Pending", meaning: "Edit request submitted, awaiting supervisor decision." },
      { label: "Approved", meaning: "Edit request approved; minutes entry unlocked for correction." },
      { label: "Rejected", meaning: "Edit request denied; original minutes entry remains unchanged." },
      { label: "Completed", meaning: "Edit was made and minutes entry re-approved." },
    ],
    faqs: [
      { q: "Who can approve minutes entry edit requests?", a: "Only the Board Chairman or designated supervisor can approve edit requests." },
      { q: "How long does an edit request take?", a: "Standard SLA is 5 working days. Urgent requests should be escalated directly to the Board Chairman." },
      { q: "Can I withdraw an edit request?", a: "Yes — you can cancel a pending edit request before it is reviewed." },
      { q: "What information must be included in an edit request?", a: "The specific field(s) to be changed, the current incorrect value, the correct value, and supporting justification." },
      { q: "What if my edit request is rejected?", a: "Contact your supervisor. If you believe the rejection is incorrect, escalate to the Board Chairman with documentation." },
    ],
    relatedPages: ["psr-approval", "psr-dashboard"],
  },

  "double-entry-status": {
    title: "Voting Record Status",
    overview:
      "Shows the current verification status of all records in the double-entry system. Supervisors use this page to monitor the pipeline and identify discrepancies.",
    workflow: [
      "Review the status table — each row shows a record and its dual-entry state.",
      "Filter by status to find discrepancies or pending second entries.",
      "Click a discrepancy record to view both entries side by side.",
      "Assign resolution tasks to operators if needed.",
    ],
    actions: ["View entry status", "Filter by discrepancy", "View comparison view", "Export status report"],
    statuses: [
      { label: "Awaiting Entry", meaning: "Record received; no entries made yet." },
      { label: "First Entry Done", meaning: "One operator has entered data; awaiting second entry." },
      { label: "Verified", meaning: "Both entries match — record confirmed." },
      { label: "Discrepancy", meaning: "Entries don't match — supervisor review needed." },
    ],
    faqs: [
      { q: "What is a discrepancy?", a: "A discrepancy means the two independent entries for the same record have different values in one or more fields." },
      { q: "How do I resolve a discrepancy?", a: "Go to the Voting Record Verification page to view both entries side by side and determine the correct value." },
      { q: "How long can a record stay in 'First Entry Done' status?", a: "Per process guidelines, the second entry should be completed within 2 working days." },
      { q: "Who can perform the second entry?", a: "Any operator except the one who performed the first entry." },
      { q: "Can I view which operator made each entry?", a: "Yes — the details drawer shows the operator name and timestamp for each entry." },
    ],
    relatedPages: ["double-entry-verification", "combined-dashboard"],
  },

  "double-entry-verification": {
    title: "Voting Record Verification",
    overview:
      "The verification workspace where operators complete the second data entry for records and supervisors resolve discrepancies between entries.",
    workflow: [
      "Select a record awaiting second entry from the queue.",
      "Enter the data from the source document independently.",
      "Submit your entry — the system automatically compares it with the first entry.",
      "If entries match, the record is marked Verified.",
      "If they don't match, a supervisor is notified to resolve the discrepancy.",
    ],
    actions: ["Complete second entry", "Resolve discrepancy", "View entry comparison", "Export verified records"],
    faqs: [
      { q: "Can I see the first entry while doing the second entry?", a: "No — the second entry is hidden from the first entry to ensure independence. You only see both after submitting." },
      { q: "What happens after I resolve a discrepancy?", a: "The correct value is locked in and the record is marked Verified. The resolution is logged in the audit trail." },
      { q: "Do I need to enter all fields again?", a: "Yes — the second entry is completely independent to ensure accuracy." },
      { q: "What if I make a mistake in my entry?", a: "Contact your supervisor before submitting. After submission, corrections require supervisor intervention." },
      { q: "Can I see statistics on my entry accuracy?", a: "Supervisors can view per-operator accuracy stats in the User Activity Report." },
    ],
    relatedPages: ["double-entry-status", "combined-dashboard"],
  },

  "psr-dormant": {
    title: "minutes entry Dormant List",
    overview:
      "Lists all members in the committee who have been flagged as dormant — meaning they have not filed a return for the defined number of consecutive meeting years.",
    workflow: [
      "Review the list of dormant members.",
      "Investigate each case to determine if dormancy is legitimate or an oversight.",
      "Issue formal dormancy notices as required by Convay guidelines.",
      "Update status when a dormant member resumes filing.",
    ],
    actions: ["View dormant members", "Filter by duration", "Issue dormancy notice", "Update status", "Export list"],
    statuses: [
      { label: "Dormant", meaning: "Member has not filed for 2+ consecutive years." },
      { label: "Notice Issued", meaning: "Formal dormancy notice sent to member." },
      { label: "Reactivated", meaning: "Member has resumed filing and been reactivated." },
    ],
    faqs: [
      { q: "How many years of non-filing makes a member dormant?", a: "Per Convay policy, non-filing for 2 or more consecutive meeting years triggers dormant status." },
      { q: "What action must I take on dormant members?", a: "A formal notice must be issued, and the case may be referred to the legal unit if the member does not respond." },
      { q: "Can a dormant member re-file?", a: "Yes — dormant members can be reactivated by submitting returns for missed years. Contact the Board Chairman for guidance." },
      { q: "How do I remove a member from the dormant list?", a: "Once a valid return is submitted and approved, the system updates the status automatically." },
      { q: "Are there penalties for dormant members?", a: "Yes — penalties per Convay rules apply. The Demand Register should be updated accordingly." },
    ],
    relatedPages: ["psr-dashboard", "psr-approval", "invalid-list"],
  },

  // ─── MISFILED RETURNS ────────────────────────────────────────────────────────

  "invalid-list": {
    title: "Invalid List",
    overview:
      "Lists all minutes entries or meeting submissions that have failed system validation rules — e.g., Meeting ID mismatches, duplicate entries, or missing required data.",
    workflow: [
      "Review invalid entries and understand the flagged error.",
      "Investigate the source document or original submission.",
      "Correct the underlying data if within your authority.",
      "Escalate to Board Chairman for entries requiring formal correction.",
    ],
    actions: ["View invalid entries", "View error details", "Correct data entry", "Escalate to Board Chairman", "Export invalid list"],
    statuses: [
      { label: "Invalid", meaning: "Entry flagged by system validation rules." },
      { label: "Under Review", meaning: "Being investigated by an officer." },
      { label: "Corrected", meaning: "Error resolved and entry updated." },
      { label: "Escalated", meaning: "Referred to Board Chairman or legal for resolution." },
    ],
    faqs: [
      { q: "What causes a record to be flagged as Invalid?", a: "Common causes: duplicate Meeting ID, Meeting ID not found in Registry, missing mandatory fields, date outside meeting year range, or submission from an unregistered source." },
      { q: "Can I delete an invalid entry?", a: "No — entries cannot be deleted. They must be corrected or escalated." },
      { q: "What if the error is in the source document?", a: "The error must be escalated to the Board Chairman. The member may need to be contacted to provide a corrected submission." },
      { q: "Who is responsible for resolving invalid entries?", a: "The supervising Meeting Secretary is responsible for resolution within 15 working days." },
      { q: "How do I prevent invalid entries?", a: "Ensure Data Entry Operators validate Meeting IDs against the Board Member Registry before submitting. Use the validation step in the entry form." },
    ],
    relatedPages: ["approval-list", "psr-dormant"],
  },

  "approval-list": {
    title: "Approval List (Misfiled)",
    overview:
      "Manages returns that have been identified as misfiled — submitted to the wrong committee or under an incorrect Meeting ID. This page handles the formal approval workflow for corrections.",
    workflow: [
      "Review misfiled returns requiring formal action.",
      "Verify the correct committee or Meeting ID for each record.",
      "Approve the transfer to the correct committee, or reject with reason.",
      "Track the correction through to completion.",
    ],
    actions: ["View misfiled records", "Approve correction", "Reject correction", "Track transfer status"],
    statuses: [
      { label: "Pending", meaning: "Misfiled return identified, awaiting approval for correction." },
      { label: "Approved", meaning: "Correction approved — record being transferred." },
      { label: "Rejected", meaning: "Correction request denied." },
      { label: "Transferred", meaning: "Record successfully moved to correct committee." },
    ],
    faqs: [
      { q: "What is a misfiled return?", a: "A return submitted under the wrong Meeting ID or routed to the wrong committee." },
      { q: "Who can approve misfiled corrections?", a: "Meeting Secretarys and Board Chairmans with jurisdiction over both the source and destination committees." },
      { q: "What happens to the original record after transfer?", a: "The original record is marked as transferred and an audit log entry is created. The receiving committee takes ownership." },
      { q: "Can I transfer returns to a committee I don't manage?", a: "You can initiate the transfer. The receiving committee's Board Chairman must also approve it." },
      { q: "How long does a misfiled correction take?", a: "Standard processing is 10 working days from identification to completion." },
    ],
    relatedPages: ["invalid-list", "transfer-history"],
  },

  "transfer-history": {
    title: "Transfer History",
    overview:
      "A complete audit log of all member and return transfers that have occurred between committees, including misfiled return corrections and member committee reassignments.",
    workflow: [
      "Search for a specific Meeting ID or transfer date.",
      "Review the transfer log — source committee, destination committee, approving officer, date.",
      "Export transfer records for reporting or audit purposes.",
    ],
    actions: ["Search transfers", "View transfer details", "Export history"],
    faqs: [
      { q: "How far back does transfer history go?", a: "All transfers since the system went live are recorded. No data is purged." },
      { q: "Can I reverse a transfer?", a: "A reverse transfer must be approved by both committees' Board Chairmans. Use the Approval List to initiate." },
      { q: "Why is a transfer not appearing in history?", a: "Transfers appear only after final approval. Pending transfers are in the Approval List." },
      { q: "Can I export transfer history for a specific period?", a: "Yes — use the date range filter before exporting." },
      { q: "Who can view transfer history?", a: "All authorized users can view history. Only Board Chairmans can initiate transfers." },
    ],
    relatedPages: ["approval-list", "tax-registry"],
  },

  // ─── CASE & FINANCIAL ────────────────────────────────────────────────────────

  "arrear-case": {
    title: "Case Management Overdue Action Case",
    overview:
      "Manages overdue action cases where outstanding financial agendas have not been paid and have been escalated to the case management unit for formal collection proceedings.",
    workflow: [
      "Review the list of open overdue action cases for your committee.",
      "Open a case to view member details, demand amount, and case history.",
      "Update case status as proceedings advance.",
      "Record hearings, outcomes, and next steps.",
    ],
    actions: ["View case list", "Open case details", "Update case status", "Record hearing outcome", "Export case list"],
    statuses: [
      { label: "Open", meaning: "Case is active and proceedings are ongoing." },
      { label: "Hearing Scheduled", meaning: "A court or administrative hearing has been set." },
      { label: "Judgment Pending", meaning: "Hearing concluded; awaiting formal judgment." },
      { label: "Resolved", meaning: "Case concluded — payment received or written off." },
      { label: "Appealed", meaning: "Member has filed an appeal against the decision." },
    ],
    faqs: [
      { q: "What triggers an overdue action case?", a: "When a financial agenda item is not paid within the statutory period, the case is escalated to the case management unit." },
      { q: "Who handles overdue action cases?", a: "The Board Chairman and legal unit officers manage action items." },
      { q: "Can I add notes to a case?", a: "Yes — use the Notes/Comments section in the case detail drawer." },
      { q: "What happens when a case is resolved?", a: "The case is closed, payment is recorded in the Demand Register, and the member's liability is updated." },
      { q: "How do I find a specific case?", a: "Search by Meeting ID, case number, or member name in the search bar." },
    ],
    relatedPages: ["demand-entry", "appeal-reg-view"],
  },

  "writ-case": {
    title: "Escalated Case Resolution Matter",
    overview:
      "Manages escalated case petitions filed by members challenging resolutions or financial agendas.",
    workflow: [
      "Review active resolution matters and their current status.",
      "Record hearing dates, proceedings, and interim orders.",
      "Update case status based on proceedings.",
      "Coordinate with legal counsel and the Board Secretariat.",
    ],
    actions: ["View resolution matters", "Record hearing details", "Update status", "Export case list"],
    statuses: [
      { label: "Active", meaning: "Case filed and pending decision." },
      { label: "Stay Order", meaning: "A temporary stay has been issued on the financial agenda." },
      { label: "Judgment", meaning: "A final judgment has been issued." },
      { label: "Dismissed", meaning: "Escalated case petition dismissed." },
      { label: "Settled", meaning: "Case resolved through settlement." },
    ],
    faqs: [
      { q: "What is a resolution matter?", a: "An escalated case petition is filed by a member challenging a resolution or demanding review of an administrative decision." },
      { q: "What is a stay order?", a: "A stay order is a directive that temporarily suspends a financial agenda until the case is decided." },
      { q: "Should I continue collection actions during a stay?", a: "No. Collection activities must stop immediately upon receiving a stay order. Contact the Board Chairman." },
      { q: "Who updates resolution matter records?", a: "The legal unit officer assigned to the case, under the Board Chairman's supervision." },
      { q: "How do I know a new resolution matter has been filed?", a: "The system generates an alert when a new resolution matter is entered for your committee." },
    ],
    relatedPages: ["arrear-case", "dept-case"],
  },

  "dept-case": {
    title: "Case Management Department Case",
    overview: "Tracks cases where Convay or the board department is the appellant — i.e., the department is challenging a lower-level or administrative decision.",
    workflow: [
      "Review active departmental cases.",
      "Record appeal proceedings and court dates.",
      "Track case progress through the escalation hierarchy.",
    ],
    actions: ["View departmental cases", "Record proceedings", "Update status", "Export list"],
    faqs: [
      { q: "What is a departmental action item?", a: "These are cases where the board department has filed a minutes revision against a decision favorable to the member — typically an escalation or lower-level order." },
      { q: "Who authorizes filing a departmental minutes revision?", a: "Only the Board Chairman can authorize filing departmental minutes revisions." },
      { q: "What is the minutes revision timeline?", a: "Departmental minutes revisions must be filed within 60 days of the order being challenged." },
      { q: "How do I track a case through multiple courts?", a: "Each court stage is recorded as a separate hearing entry with outcome notes." },
      { q: "Can I view related member cases alongside this?", a: "Yes — the related Meeting ID's member case is linked in the case details." },
    ],
    relatedPages: ["member-case", "writ-case"],
  },

  "member-case": {
    title: "Case Management Member Case",
    overview: "Tracks all action items initiated by members — minutes revisions, objections, and formal disputes against resolutions.",
    workflow: [
      "Review member-initiated cases for your committee.",
      "Track case progress and required response deadlines.",
      "Coordinate departmental responses with legal unit.",
      "Update case status and outcomes.",
    ],
    actions: ["View member cases", "Record responses", "Update status", "Set hearing reminders"],
    faqs: [
      { q: "What types of cases appear here?", a: "Objections to resolutions, minutes revisions to the Board Chairman, minutes revisions to the Escalation Panel, and escalated cases filed by members." },
      { q: "What is the response deadline for an objection?", a: "The department must respond to formal objections within 30 days per Convay regulations." },
      { q: "How do I handle multiple cases for the same member?", a: "Each case is tracked separately. The member's Meeting ID links all cases in the details view." },
      { q: "What happens if we miss a response deadline?", a: "Missing a deadline can result in an ex-parte order against the department. Always set hearing reminders." },
      { q: "Can I attach documents to a case?", a: "Document management for case attachments is planned for a future release." },
    ],
    relatedPages: ["dept-case", "demand-entry"],
  },

  "appeal-reg-view": {
    title: "Appeal Register",
    overview: "The Appeal Register records all formal minutes revisions filed with the Board Chairman, tracking the minutes revision from filing to final decision.",
    workflow: [
      "Review the list of active appeals.",
      "Open an appeal to view member details, grounds for appeal, and hearing schedule.",
      "Record hearing dates, officer notes, and interim decisions.",
      "Update the final outcome when the appeal is decided.",
    ],
    actions: ["View appeal list", "Open appeal details", "Record hearing", "Update decision", "Export register"],
    statuses: [
      { label: "Filed", meaning: "Appeal received and registered." },
      { label: "Under Hearing", meaning: "Appeal hearing is in progress." },
      { label: "Decision Pending", meaning: "Hearing concluded; decision being formulated." },
      { label: "Decided", meaning: "Final decision issued." },
      { label: "Withdrawn", meaning: "Member has withdrawn the appeal." },
    ],
    faqs: [
      { q: "Who can hear a minutes revision?", a: "The Board Chairman or a designated Board Director authorized to hear minutes revisions." },
      { q: "What is the time limit for filing a minutes revision?", a: "Minutes revisions must be filed within 45 days of the resolution order, unless an extension is granted." },
      { q: "Can a decision be further escalated?", a: "Yes — minutes revision decisions can be taken to the Escalation Panel. Use the Escalation Register for further proceedings." },
      { q: "How do I view the original resolution that was revised?", a: "The minutes revision details drawer links to the original resolution records." },
      { q: "What if an appeal involves multiple meeting years?", a: "Each year's appeal is registered separately but linked by Meeting ID." },
    ],
    relatedPages: ["appeal-approval", "tribunal-reg-view"],
  },

  "appeal-approval": {
    title: "Appeal Approval",
    overview: "Workflow for reviewing and formally approving the drafted decisions for minutes revisions before they are communicated to members.",
    workflow: [
      "Review drafted appeal decisions awaiting approval.",
      "Open the decision draft to verify reasoning and legal basis.",
      "Approve the decision to authorize formal communication.",
      "Rejected drafts are returned to the drafting officer for revision.",
    ],
    actions: ["Review decision drafts", "Approve decision", "Return for revision", "Export approved decisions"],
    faqs: [
      { q: "Who approves appeal decisions?", a: "Only the Board Chairman or designated authority can approve and sign off appeal decisions." },
      { q: "What checks should be done before approving?", a: "Verify: legal basis cited, meeting year, Meeting ID accuracy, demand amount, and that the decision follows precedent." },
      { q: "Can I approve a decision with reservations?", a: "No — you should return it for revision with your comments rather than approving with reservations." },
      { q: "How is the member notified?", a: "The system generates a formal order document upon approval. Physical delivery is handled by the office." },
      { q: "What is the timeline for issuing an appeal decision?", a: "Decisions should be issued within 60 days of the final hearing." },
    ],
    relatedPages: ["appeal-reg-view", "tribunal-reg-view"],
  },

  "tribunal-reg-view": {
    title: "Escalation Register",
    overview: "Records cases referred to the Escalation Panel — the second level of minutes revision above the Board Chairman.",
    workflow: [
      "Review cases referred to the Escalation Panel.",
      "Record Escalation Panel hearing dates and proceedings.",
      "Update case status based on Escalation Panel orders.",
      "Coordinate with the legal unit on escalation submissions.",
    ],
    actions: ["View escalated matters", "Record proceedings", "Update status", "Export register"],
    statuses: [
      { label: "Referred", meaning: "Case submitted to Escalation Panel registry." },
      { label: "Hearing Set", meaning: "Escalation Panel hearing date confirmed." },
      { label: "Under Hearing", meaning: "Proceedings ongoing." },
      { label: "Order Issued", meaning: "Escalation Panel has issued an order." },
      { label: "Further Escalated", meaning: "Case escalated to a higher authority." },
    ],
    faqs: [
      { q: "What is the Escalation Panel?", a: "It is an independent panel that hears minutes revisions from decisions made by Board Chairmans." },
      { q: "What is the time limit for filing with the Escalation Panel?", a: "Minutes revisions must be filed within 60 days of the Board Chairman's decision." },
      { q: "Can Escalation Panel orders be further escalated?", a: "Yes — Escalation Panel orders can be escalated to a higher authority." },
      { q: "Who represents the department at the Escalation Panel?", a: "Departmental representatives, supported by the Board Chairman and legal unit officers." },
      { q: "What documents are needed for an escalation filing?", a: "Original resolution order, Board Chairman's minutes revision decision, grounds of revision, and relevant meeting records." },
    ],
    relatedPages: ["tribunal-approval", "appeal-reg-view"],
  },

  "demand-entry": {
    title: "Demand Register (Entry)",
    overview: "Used to record and manage financial agenda items issued to members for outstanding liabilities.",
    workflow: [
      "Create a new demand entry for a member with outstanding liability.",
      "Enter demand amount, meeting year, and demand type.",
      "Submit for supervisor approval.",
      "Track payment status against each demand.",
    ],
    actions: ["Create demand entry", "Edit pending entry", "Submit for approval", "View demand history", "Export register"],
    statuses: [
      { label: "Draft", meaning: "Entry being prepared, not yet submitted." },
      { label: "Pending Approval", meaning: "Submitted, awaiting authorization." },
      { label: "Active", meaning: "Approved financial agenda item outstanding." },
      { label: "Partially Paid", meaning: "Some payment received but balance remains." },
      { label: "Settled", meaning: "Full payment received or formally written off." },
    ],
    faqs: [
      { q: "What is a financial agenda item?", a: "A formal notice issued by the board authority requiring a member to pay an assessed but unpaid liability." },
      { q: "Who can create demand entries?", a: "Meeting Secretarys and Data Entry Operators, with final approval by the Board Chairman." },
      { q: "Can I record a partial payment?", a: "Yes — use the payment recording feature in the Member Ledger module." },
      { q: "What happens if a demand is disputed?", a: "The member must file an appeal. The demand is not suspended unless a court orders a stay." },
      { q: "How do I link a demand to a action item?", a: "In the demand details, use the 'Link to Case' option to associate with an existing action item." },
    ],
    relatedPages: ["demand-approval", "member-ledger", "register-5"],
  },

  "member-ledger": {
    title: "Member Ledger",
    overview: "The Member Ledger provides a complete financial record for each member — all resolutions, financial agenda items, payments, and refunds in one place.",
    workflow: [
      "Search for a member by Meeting ID or name.",
      "Review the ledger entries — resolutions, demands, and payments in chronological order.",
      "Verify outstanding balance.",
      "Export the ledger for audit or member communication.",
    ],
    actions: ["Search member", "View ledger entries", "Record payment", "Export ledger"],
    faqs: [
      { q: "What does the ledger show?", a: "All financial transactions related to the member: resolutions raised, financial agenda items issued, payments received, refunds granted, and adjustments made." },
      { q: "Can I add manual entries to the ledger?", a: "Manual entries require Board Chairman authorization. Contact Admin to enable manual adjustments." },
      { q: "Why is the balance different from what the member claims?", a: "Compare each line item with the member's records. Common discrepancies include unprocessed payments or misapplied receipts." },
      { q: "Can members see their ledger?", a: "Members can view their own ledger through the Convay e-service portal." },
      { q: "How far back does the ledger go?", a: "The ledger contains all entries from the time the member was registered in the system." },
    ],
    relatedPages: ["demand-entry", "refund-adjustment"],
  },

  "demand-approval": {
    title: "Demand Approval",
    overview: "The approval workflow for reviewing and authorizing financial agenda items before they are formally issued to members.",
    workflow: [
      "Review pending demand entries requiring your approval.",
      "Open each entry to verify accuracy of amount, member details, and resolution basis.",
      "Approve to authorize issuance, or return for correction.",
    ],
    actions: ["Review pending demands", "Approve demand", "Return for correction", "Export approved demands"],
    faqs: [
      { q: "Who can approve financial agenda items?", a: "Board Chairmans and designated Board Directors." },
      { q: "What checks must be done before approving?", a: "Verify Meeting ID, meeting year, demand amount calculation, and that the correct member category is applied." },
      { q: "Can I approve demands in bulk?", a: "Bulk approval is not supported — each demand requires individual review." },
      { q: "What happens after I approve a demand?", a: "The financial agenda item is formally generated and the member's ledger is updated." },
      { q: "Can I reject a demand I previously approved?", a: "No. Contact the Board Chairman to initiate a formal correction or adjustment." },
    ],
    relatedPages: ["demand-entry", "member-ledger"],
  },

  "refund-adjustment": {
    title: "Refund & Adjustment",
    overview: "Manages adjustment requests and adjustment entries for cases where members have overpaid or are due a credit.",
    workflow: [
      "Review adjustment requests or adjustment applications.",
      "Verify the overpayment amount against the member ledger.",
      "Approve the refund or adjustment with required documentation.",
      "Update the member ledger upon completion.",
    ],
    actions: ["View adjustment requests", "Approve refund", "Reject request", "Record adjustment", "Export records"],
    statuses: [
      { label: "Requested", meaning: "Member has applied for a refund or adjustment." },
      { label: "Under Review", meaning: "Being verified by an officer." },
      { label: "Approved", meaning: "Refund or adjustment authorized." },
      { label: "Processed", meaning: "Refund issued or adjustment applied to ledger." },
      { label: "Rejected", meaning: "Request denied with documented reasons." },
    ],
    faqs: [
      { q: "What qualifies for a financial adjustment?", a: "Overpayment of amounts approved, advance amounts approved in excess of liability, or correction of erroneous resolutions." },
      { q: "How long does a refund take?", a: "Processing time is 30–90 days depending on the amount and complexity." },
      { q: "Can I approve my own refund application?", a: "No — refund approvals require review by a different officer than the one who raised the adjustment." },
      { q: "What documentation is required for a refund?", a: "Original payment receipts, resolution records showing overpayment, and a formal refund application." },
      { q: "What is an adjustment vs a refund?", a: "A refund returns money to the member. An adjustment credits the overpayment against future liabilities." },
    ],
    relatedPages: ["member-ledger", "demand-entry"],
  },

  // ─── ADMINISTRATION ──────────────────────────────────────────────────────────

  "user-management": {
    title: "User Management",
    overview: "Manages all system user accounts — creating new users, assigning roles and committees, updating profiles, and deactivating accounts.",
    workflow: [
      "View the list of all system users.",
      "Create a new user account with name, designation, email, and committee assignment.",
      "Assign roles to control module access.",
      "Deactivate users who leave or change roles.",
    ],
    actions: ["Create user", "Edit user profile", "Assign role", "Activate/deactivate user", "Export user list"],
    statuses: [
      { label: "Active", meaning: "User account is enabled and can log in." },
      { label: "Inactive", meaning: "Account disabled — user cannot log in." },
      { label: "Pending", meaning: "Account created but awaiting activation." },
    ],
    faqs: [
      { q: "Who can create new user accounts?", a: "Only Admin Users and Board Chairmans can create and manage user accounts." },
      { q: "How do I reset a user's password?", a: "Use the 'Reset Password' action in the user details. The user will receive a reset link." },
      { q: "Can a user be in multiple committees?", a: "Yes — a user can be assigned to multiple committees if their role requires it." },
      { q: "What happens to a user's data when they are deactivated?", a: "Their records and actions are preserved. Only their login access is disabled." },
      { q: "How do I give a user access to a new module?", a: "Update the user's role assignment in Role Management to include the required module." },
    ],
    relatedPages: ["role-management", "user-activity-report"],
  },

  "role-management": {
    title: "Role Management",
    overview: "Defines access control roles that determine which modules and actions each category of user can perform.",
    workflow: [
      "Review existing roles and their permissions.",
      "Create a new role with specific module access.",
      "Assign roles to user accounts.",
      "Update role permissions as operational requirements change.",
    ],
    actions: ["View roles", "Create role", "Edit role permissions", "Assign role to user", "Export role list"],
    faqs: [
      { q: "What is role-based access control (RBAC)?", a: "RBAC means access to modules and actions is determined by the user's assigned role, not individual permissions. This simplifies management and ensures consistency." },
      { q: "Can a user have multiple roles?", a: "Yes — a user can have multiple roles, combining permissions from each." },
      { q: "What is the difference between a role and a designation?", a: "Designation is the user's job title. Role controls their system access. A Board Director (designation) may have an Approver role (system access)." },
      { q: "How do I prevent a role from accessing a module?", a: "Edit the role and uncheck the relevant module permission." },
      { q: "Can roles be deleted?", a: "Only if no users are currently assigned to that role." },
    ],
    relatedPages: ["user-management"],
  },

  "special-registration": {
    title: "Special Registration",
    overview: "Handles the registration process for members requiring special category treatment — non-residents, SEZ entities, diplomatic missions, and other exceptions.",
    workflow: [
      "Receive and review the special registration application.",
      "Verify the member's eligibility for special category status.",
      "Submit for Board Chairman approval.",
      "Assign the special Meeting ID and update the Board Member Registry.",
    ],
    actions: ["View applications", "Process registration", "Approve/reject", "Export registrations"],
    faqs: [
      { q: "Who qualifies for special registration?", a: "Non-resident individuals, foreign companies, SEZ entities, diplomatic missions, and others defined by Convay guidelines." },
      { q: "What is different about special registration?", a: "Special registrations have different meeting treatment rules, filing requirements, and applicable rates." },
      { q: "Who approves special registrations?", a: "All special registrations require Board Chairman approval." },
      { q: "Can a special registration be converted to regular?", a: "Yes, if the entity's circumstances change. This requires a formal application and Board Chairman approval." },
      { q: "Is there a Meeting ID format difference for special registrations?", a: "Meeting ID format follows Convay standard. Special category is recorded as a classification field, not in the Meeting ID format." },
    ],
    relatedPages: ["tax-registry", "user-management"],
  },

  "time-extension": {
    title: "Rescheduling Request Requests",
    overview: "Manages formal applications from members requesting an extension to the standard filing deadline.",
    workflow: [
      "Review incoming rescheduling request applications.",
      "Verify the member's circumstances and reason for extension.",
      "Approve or reject the application with justification.",
      "Communicate the decision to the member.",
    ],
    actions: ["View applications", "Review details", "Approve extension", "Reject with reason", "Export list"],
    statuses: [
      { label: "Submitted", meaning: "Application received by the system." },
      { label: "Under Review", meaning: "Being evaluated by an officer." },
      { label: "Approved", meaning: "Extension granted to the member." },
      { label: "Rejected", meaning: "Application denied." },
    ],
    faqs: [
      { q: "What is the maximum extension that can be granted?", a: "Per Convay guidelines, extensions of up to 60 days may be granted by the Meeting Secretary. Longer extensions require Board Chairman authorization." },
      { q: "What are valid reasons for an extension?", a: "Medical emergencies, natural disasters, technical issues with e-filing, or documented business disruptions." },
      { q: "Can an extension be granted multiple times?", a: "No — only one extension per meeting year per member is permitted under standard rules." },
      { q: "Does an extension waive late filing penalties?", a: "Yes — if approved before the original deadline, penalties do not apply during the extension period." },
      { q: "How is the member notified of the decision?", a: "The decision is communicated through the e-service portal and a formal letter is generated." },
    ],
    relatedPages: ["user-management", "return-view-approval"],
  },

  "audit-selection": {
    title: "Governance Audit",
    overview: "The process of selecting members for formal governance audit based on risk criteria, random selection, or Board Chairman directives.",
    workflow: [
      "Review the governance audit criteria and pool of eligible members.",
      "Apply selection criteria (risk score, random, specific Meeting ID).",
      "Confirm the selected members for the audit batch.",
      "Submit for Board Chairman approval.",
      "Notify selected members and initiate the audit process.",
    ],
    actions: ["Review selection pool", "Apply criteria", "Confirm selection", "Submit for approval", "Export audit list"],
    statuses: [
      { label: "Draft", meaning: "Selection in progress, not finalized." },
      { label: "Pending Approval", meaning: "Submitted for Board Chairman review." },
      { label: "Approved", meaning: "Audit selection finalized and authorized." },
      { label: "Notified", meaning: "Selected members formally notified." },
      { label: "Audit In Progress", meaning: "Audit process has begun for these members." },
    ],
    faqs: [
      { q: "Who can select members for audit?", a: "Meeting Secretarys can propose governance audits; final approval requires the Board Chairman." },
      { q: "What are the risk criteria for governance audit?", a: "High declared losses, large fluctuations in income, mismatch between lifestyle and declared income, and statistical outliers." },
      { q: "Can a member refuse an audit?", a: "No — members selected for audit are legally required to cooperate per the Governance Compliance Act." },
      { q: "How many members are typically selected per year?", a: "This varies by committee size. The Board Chairman sets annual audit targets based on Convay directives." },
      { q: "What happens after governance audit is approved?", a: "Audit notices are generated and issued to selected members, and audit teams are assigned." },
    ],
    relatedPages: ["user-management"],
  },

  "data-entry-request": {
    title: "Certificate Data Entry",
    overview: "Used by authorized operators to enter details of board papers received from the Board Secretariat into the system.",
    workflow: [
      "Receive certificate batch with official reference.",
      "Enter certificate numbers, type, and received quantity.",
      "Submit the entry for supervisor verification.",
      "Certificates become available in the Agenda Item Tracker after approval.",
    ],
    actions: ["Create entry", "Edit pending entry", "Submit for verification", "Export entries"],
    faqs: [
      { q: "What types of board papers are entered here?", a: "Governance Clearance Board Papers, Governance Compliance Board Papers, and other official Convay board papers issued by the Board Secretariat." },
      { q: "What is the board paper batch reference?", a: "An official number assigned by the issuing Board Secretariat to each batch of board papers." },
      { q: "Can I edit an entry after submission?", a: "No — submitted entries must be verified by a supervisor before changes can be made." },
      { q: "What if a certificate number is wrong?", a: "Notify your supervisor immediately. Do not proceed with issuing certificates until the error is corrected." },
      { q: "How are certificates tracked after entry?", a: "They move to the Agenda Item Tracker and are tracked by serial number through issuance, usage, and disposal." },
    ],
    relatedPages: ["approval-request", "stock-register", "disposal-history"],
  },

  "approval-request": {
    title: "Certificate Approval Request",
    overview: "The approval workflow for certificate data entries — supervisors verify entered certificate details before making them available for use.",
    workflow: [
      "Review certificate data entries awaiting approval.",
      "Verify quantity and serial numbers against official documentation.",
      "Approve to add certificates to the Agenda Item Tracker.",
      "Return entries with errors for correction.",
    ],
    actions: ["Review entries", "Approve entry", "Return for correction", "Export approved entries"],
    faqs: [
      { q: "What documentation should I check against?", a: "The official dispatch letter from the Board Secretariat that accompanies each board paper batch." },
      { q: "Can I partially approve an entry?", a: "No — entries are approved in full. If some certificates have errors, return the whole entry for correction." },
      { q: "What is the timeline for approving certificate entries?", a: "Entries should be approved within 2 working days of submission." },
      { q: "Who has final approval authority?", a: "The supervising Meeting Secretary or Stock Manager." },
      { q: "What if the quantities don't match the dispatch letter?", a: "Do not approve. Escalate immediately to the Board Chairman and document the discrepancy." },
    ],
    relatedPages: ["data-entry-request", "stock-register"],
  },

  "edit-request": {
    title: "Certificate Edit Request",
    overview: "Manages formal requests to correct errors in approved certificate entries.",
    workflow: [
      "Identify the certificate entry requiring correction.",
      "Submit an edit request with detailed justification.",
      "Supervisor reviews and approves or rejects the request.",
      "If approved, the entry is unlocked for correction.",
    ],
    actions: ["View edit requests", "Submit edit request", "Approve/reject request"],
    faqs: [
      { q: "When should an edit request be raised?", a: "Only when data was entered incorrectly and has been formally approved. Minor corrections before approval use the standard edit function." },
      { q: "Who approves certificate edit requests?", a: "Board Chairman or designated senior officer." },
      { q: "Can I cancel an edit request?", a: "Yes — pending requests can be cancelled before they are reviewed." },
      { q: "What information must be included in the edit request?", a: "Certificate batch number, specific error, correct value, and supporting documentation." },
      { q: "How long does an edit request take?", a: "Standard processing is 5 working days." },
    ],
    relatedPages: ["data-entry-request", "disposal-history"],
  },

  "disposal-history": {
    title: "Certificate Disposal History",
    overview: "A complete audit trail of all certificate disposals — accounting for every certificate issued, used, and disposed of.",
    workflow: [
      "Review the disposal log for a specific batch or date range.",
      "Track certificates from receipt through to final disposal.",
      "Export the disposal record for Board Secretariat submission.",
    ],
    actions: ["View disposal history", "Search by batch/date", "Export disposal record"],
    faqs: [
      { q: "What is a certificate disposal?", a: "The formal recording that certificates have been accounted for — either used, returned, or cancelled. This prevents unauthorized certificates from being issued." },
      { q: "Can disposal records be edited?", a: "No — disposal records are permanent audit entries." },
      { q: "How often should disposal records be reconciled?", a: "Monthly reconciliation is required. Quarterly submission to the Board Secretariat." },
      { q: "What if my disposal numbers don't balance?", a: "Stop all board paper activities and report to the Board Chairman immediately. This is a serious compliance issue." },
      { q: "Who submits the disposal report to the Board Secretariat?", a: "The Stock Manager or designated officer, authorized by the Board Chairman." },
    ],
    relatedPages: ["data-entry-request", "stock-register"],
  },
};

// ─────────────────────────────────────────────────────────────────
// ROLE GUIDES
// ─────────────────────────────────────────────────────────────────

export const ROLE_GUIDES: RoleGuide[] = [
  {
    role: "Board Chairman",
    icon: "Crown",
    responsibilities: [
      "Overall supervision of the committee or range",
      "Final authority on approvals, disputes, and escalations",
      "Authorizing appeals, action items, and governance audits",
      "Managing user access and system administration",
    ],
    actions: [
      "Approve all types of records (minutes entry, demand, certificate, audit)",
      "Override or reverse decisions with documented justification",
      "Authorize special registrations and rescheduling requests",
      "Access all reports and export any data",
      "Manage user accounts and role assignments",
    ],
    modules: [
      "All modules with full access",
      "User Activity Report (exclusive)",
      "Governance Audit",
      "Role Management",
    ],
    approvalFlow: "Final approver for all workflows. No further approval required for any action.",
    escalationFlow: "Escalates to the Convay Board at the Divisional or National level for issues beyond committee authority.",
  },
  {
    role: "Board Director",
    icon: "ShieldCheck",
    responsibilities: [
      "Assisting the Board Chairman in day-to-day operations",
      "Reviewing and approving operational records within delegated authority",
      "Managing committee workflows and supervising officers",
    ],
    actions: [
      "Approve Minutes, demand entries, and return records within delegated authority",
      "Review and forward action items",
      "Access all operational reports",
      "Supervise Meeting Secretarys and operators",
    ],
    modules: [
      "Dashboard", "Reports", "Return Register", "Minutes & Resolutions",
      "Case & Financial Management", "Register & Stock",
    ],
    approvalFlow: "Approves within delegated authority. Items exceeding delegated amount or complexity are forwarded to the Board Chairman.",
    escalationFlow: "Escalates to Board Chairman for items above authority threshold.",
  },
  {
    role: "Meeting Secretary",
    icon: "UserCheck",
    responsibilities: [
      "Day-to-day management of member records in assigned committee",
      "Reviewing and approving returns, minutes entries, and demands",
      "Maintaining registers (Agenda Register, Resolution Register)",
      "Monitoring dormant and invalid records",
    ],
    actions: [
      "Approve returns and minutes entries",
      "Create and approve demand entries",
      "Process transfer requests",
      "Export registers",
      "Manage certificate data entry approvals",
    ],
    modules: [
      "Dashboard", "Return Register", "Minutes & Resolutions",
      "Register & Stock", "Misfiled Returns", "Case & Financial",
      "Administration (limited)",
    ],
    approvalFlow: "Approves routine operational records. Complex items escalated to Board Director or Board Chairman.",
    escalationFlow: "Escalates to Board Director or Board Chairman for disputed records, case management, and high-value demands.",
  },
  {
    role: "Auditor",
    icon: "Search",
    responsibilities: [
      "Reviewing meeting records for compliance and accuracy",
      "Verifying governance audits",
      "Reporting discrepancies and anomalies",
    ],
    actions: [
      "Read-only access to all records",
      "View audit trails and user activity",
      "Export data for audit review",
      "Flag records for supervisor attention",
    ],
    modules: [
      "Dashboard (view only)", "Reports (all)", "Return Register (view only)",
      "Minutes & Resolutions (view only)", "Case & Financial (view only)",
      "Governance Audit",
    ],
    approvalFlow: "Auditors do not approve records. They flag issues for the relevant officer.",
    escalationFlow: "Reports audit findings to the Board Chairman or external audit authority.",
  },
  {
    role: "Data Entry Operator",
    icon: "Keyboard",
    responsibilities: [
      "Entering offline meeting data into the system",
      "Entering certificate batch details",
      "Data entry for Agenda Register and other registers",
    ],
    actions: [
      "Create and edit data entries (before approval)",
      "Submit entries for supervisor approval",
      "View assigned records",
    ],
    modules: [
      "Offline Meeting Register (entry only)",
      "Register & Stock (entry only)",
      "Certificate Data Entry",
    ],
    approvalFlow: "Submits entries for Meeting Secretary or supervisor approval.",
    escalationFlow: "Reports data discrepancies to the supervising Meeting Secretary.",
  },
  {
    role: "Stock Manager",
    icon: "Package",
    responsibilities: [
      "Managing inventory of official forms and certificates",
      "Recording issuances and returns",
      "Monthly stock reconciliation",
      "Submitting disposal reports",
    ],
    actions: [
      "Manage Agenda Item Tracker",
      "Approve certificate data entries",
      "Record issuance and returns",
      "Export and submit disposal records",
    ],
    modules: [
      "Agenda Item Tracker (full access)",
      "Certificate Management (full access)",
    ],
    approvalFlow: "Approves certificate data entries. Reports to Meeting Secretary and Board Chairman.",
    escalationFlow: "Escalates stock discrepancies immediately to the Board Chairman.",
  },
  {
    role: "Admin User",
    icon: "Settings",
    responsibilities: [
      "System configuration and user management",
      "Managing roles and permissions",
      "System-level troubleshooting",
    ],
    actions: [
      "Create, edit, and deactivate user accounts",
      "Assign and modify roles",
      "Manage system settings",
      "Access all administrative reports",
    ],
    modules: [
      "Administration (full access)",
      "User Management",
      "Role Management",
      "User Activity Report",
    ],
    approvalFlow: "Does not participate in operational approvals. Manages the system infrastructure.",
    escalationFlow: "Escalates system issues to the IT support team or Convay central administration.",
  },
];

// ─────────────────────────────────────────────────────────────────
// MODULE DOCUMENTATION
// ─────────────────────────────────────────────────────────────────

export const MODULE_DOCS: ModuleDoc[] = [
  {
    module: "Dashboard",
    purpose: "Provides a real-time overview of the committee's operations — meeting submissions, minutes status, pending approvals, and key performance metrics.",
    workflow: [
      "Load dashboard on login",
      "Review summary cards for pending items",
      "Navigate to modules by clicking action cards",
      "Use meeting year selector for period-specific data",
    ],
    dataSources: ["Return Register", "minutes entry database", "Demand Register", "User activity logs"],
    approvalLogic: "Dashboard is view-only. Actions are performed in their respective modules.",
    statusMeanings: [
      { label: "Pending", meaning: "Records awaiting action" },
      { label: "Approved", meaning: "Records processed and authorized" },
    ],
    actions: ["View metrics", "Navigate modules", "Switch meeting year"],
    commonErrors: ["Forgetting to change meeting year before reviewing data", "Navigating to wrong module from a card"],
    bestPractices: [
      "Start each session by reviewing the dashboard for pending items",
      "Use the Minutes Dashboard daily to track minutes entry completion rates",
    ],
    relatedModules: ["Report", "Minutes & Resolutions"],
  },
  {
    module: "Report",
    purpose: "Generates official Convay reports covering returns, meeting categories, board papers, user activity, case management, minutes revisions, escalations, payment, and demand data.",
    workflow: [
      "Select report type from sidebar",
      "Apply meeting year, department, committee, and date filters",
      "Review the generated data table",
      "Export to Excel as needed",
    ],
    dataSources: ["Return Register", "Case & Financial Management", "minutes entry system", "User activity logs"],
    approvalLogic: "Reports are read-only generated views. No approval workflow applies.",
    statusMeanings: [],
    actions: ["Filter data", "View report", "Export to Excel"],
    commonErrors: ["Not applying the correct meeting year filter", "Exporting unfiltered data when a specific subset is needed"],
    bestPractices: [
      "Always confirm filters before exporting",
      "Use date range filters for period-specific compliance reports",
    ],
    relatedModules: ["Dashboard", "Return Register", "Case & Financial Management"],
  },
  {
    module: "Return Register",
    purpose: "Manages the complete lifecycle of meeting submissions — online (e-filed) and offline (paper) — from receipt through approval.",
    workflow: [
      "Receive return (online via e-filing portal, or offline via physical submission)",
      "Data entry operator enters offline meetings",
      "Officer reviews in Return View & Approval",
      "Approve or return for correction",
      "Approved returns are archived at year-end",
    ],
    dataSources: ["Convay e-filing portal", "Physical submissions entered by operators"],
    approvalLogic: "Returns require Meeting Secretary or Board Director approval. High-value returns may require Board Chairman sign-off.",
    statusMeanings: [
      { label: "Submitted", meaning: "Return received by system" },
      { label: "Under Review", meaning: "Officer reviewing" },
      { label: "Approved", meaning: "Authorized and locked" },
      { label: "Returned", meaning: "Sent back for correction" },
    ],
    actions: ["View register", "Approve returns", "Return for correction", "Export register", "Archive"],
    commonErrors: [
      "Approving without verifying Meeting ID in Board Member Registry",
      "Not documenting reasons when returning submissions",
    ],
    bestPractices: [
      "Process returns within 30 working days",
      "Cross-check online and offline registers monthly",
    ],
    relatedModules: ["Minutes & Resolutions", "Register & Stock"],
  },
  {
    module: "Register & Stock",
    purpose: "Maintains the official member registry (Agenda Register, Board Member Registry) and tracks physical stock of official forms and certificates (Agenda Item Tracker).",
    workflow: [
      "Register new members in Board Member Registry",
      "Maintain annual Agenda Register with submission status",
      "Receive certificate batches → enter in data entry → approve → add to stock",
      "Issue from stock to officers → record in Agenda Item Tracker",
      "Monthly reconciliation and disposal reporting",
    ],
    dataSources: ["Board Member Registry (master)", "Board paper batch dispatches from Board Secretariat"],
    approvalLogic: "Board paper entries require Stock Manager or Meeting Secretary approval. Registry changes require Board Chairman authorization.",
    statusMeanings: [
      { label: "Active", meaning: "Member in registry, expected to file" },
      { label: "In Stock", meaning: "Certificates/forms available for issuance" },
    ],
    actions: ["Manage registry", "Track stock", "Issue certificates", "Export registers"],
    commonErrors: [
      "Issuing certificates without stock register entry",
      "Not recording returns of unused certificates",
    ],
    bestPractices: [
      "Reconcile stock monthly",
      "Never issue certificates without a signed receipt from the receiving officer",
    ],
    relatedModules: ["Return Register", "Administration"],
  },
  {
    module: "Minutes & Resolutions",
    purpose: "Manages minutes records and the double-entry verification system to ensure accuracy and integrity of meeting submission data.",
    workflow: [
      "Member submits return → minutes entry created",
      "Meeting Secretary reviews minutes entry in Minutes Approval",
      "Double-entry verification: two operators enter data independently",
      "Discrepancies resolved by supervisor",
      "Approved minutes entries contribute to meeting year totals",
    ],
    dataSources: ["Return Register", "e-filing portal submissions"],
    approvalLogic: "Minutes entries approved by Meeting Secretarys. Edit requests require Board Chairman approval.",
    statusMeanings: [
      { label: "Pending", meaning: "Awaiting approval" },
      { label: "Approved", meaning: "Authorized and counted" },
      { label: "Dormant", meaning: "No submission for 2+ years" },
      { label: "Invalid", meaning: "Failed validation" },
    ],
    actions: ["Approve Minutess", "Handle dormant/invalid records", "Double-entry verification", "Transfer records"],
    commonErrors: [
      "Not checking Meeting ID against Registry before minutes approval",
      "The same operator performing both double entries",
    ],
    bestPractices: [
      "Review dormant list monthly and issue notices on schedule",
      "Resolve discrepancies within 2 working days",
    ],
    relatedModules: ["Return Register", "Register & Stock"],
  },
  {
    module: "Misfiled Returns",
    purpose: "Handles returns that have been submitted to the wrong committee or under an incorrect Meeting ID — facilitating investigation and formal transfer.",
    workflow: [
      "Identify misfiled return (Meeting ID mismatch or wrong committee)",
      "Review in Invalid List or Approval List",
      "Submit correction/transfer request",
      "Board Chairman of both committees approves",
      "Record appears in Transfer History after completion",
    ],
    dataSources: ["Return Register", "minutes entry system", "Board Member Registry"],
    approvalLogic: "Misfiled corrections require approval from Meeting Secretarys and Board Chairmans of both source and destination committees.",
    statusMeanings: [
      { label: "Invalid", meaning: "Flagged for data error" },
      { label: "Transferred", meaning: "Moved to correct committee" },
    ],
    actions: ["Identify misfiled records", "Approve corrections", "Track transfers"],
    commonErrors: ["Approving a transfer without confirming the destination committee Meeting ID"],
    bestPractices: [
      "Review Invalid List weekly to catch errors early",
      "Document all transfers with official correspondence references",
    ],
    relatedModules: ["Return Register", "Minutes & Resolutions"],
  },
  {
    module: "Case & Financial Management",
    purpose: "Manages the full lifecycle of board disputes, case management proceedings, demand issuance, member ledgers, and refund/adjustment processing.",
    workflow: [
      "Financial agenda item issued and recorded in Demand Register",
      "Non-payment triggers escalation to Case Management",
      "Member may request minutes revision to Board Chairman → Escalation Panel → Higher Authority",
      "Payments recorded in Member Ledger",
      "Refunds processed for overpayments",
    ],
    dataSources: ["Demand Register", "Return Register", "Court records"],
    approvalLogic: "Demands approved by Meeting Secretary/Board Chairman. Case management managed by Board Chairman. Refunds require Board Chairman approval.",
    statusMeanings: [
      { label: "Active", meaning: "Case or demand currently open" },
      { label: "Resolved", meaning: "Concluded through payment or decision" },
      { label: "Appealed", meaning: "Under formal minutes revision process" },
    ],
    actions: ["Manage demands", "Track case management", "Process minutes revisions", "Manage refunds"],
    commonErrors: [
      "Not updating case status promptly after hearings",
      "Missing response deadlines in minutes revisions",
    ],
    bestPractices: [
      "Set calendar reminders for all court hearing dates",
      "Reconcile Member Ledger monthly with Demand Register",
    ],
    relatedModules: ["Minutes & Resolutions", "Register & Stock"],
  },
  {
    module: "Administration & Requests",
    purpose: "System administration including user management, role assignment, special registrations, governance audit, rescheduling requests, and certificate management.",
    workflow: [
      "Create user accounts and assign roles",
      "Process special registration applications",
      "Review rescheduling request requests",
      "Manage governance audit",
      "Oversee certificate lifecycle (entry → approval → stock → disposal)",
    ],
    dataSources: ["System user database", "Convay registration database", "Board paper dispatch records"],
    approvalLogic: "User management approved by Admin/Board Chairman. Board papers approved by Stock Manager. All major changes require Board Chairman sign-off.",
    statusMeanings: [
      { label: "Active", meaning: "User or registration in good standing" },
      { label: "Pending", meaning: "Awaiting review or activation" },
    ],
    actions: ["Manage users", "Manage roles", "Process registrations", "Audit selection", "Certificate management"],
    commonErrors: [
      "Assigning overly broad roles to users",
      "Not deactivating user accounts promptly after staff changes",
    ],
    bestPractices: [
      "Review user access quarterly",
      "Apply principle of least privilege when assigning roles",
    ],
    relatedModules: ["Dashboard", "Register & Stock"],
  },
];

// ─────────────────────────────────────────────────────────────────
// WHAT'S NEW
// ─────────────────────────────────────────────────────────────────

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    version: "2.4.0",
    releaseDate: "June 2026",
    features: [
      "Help & User Guide system — contextual documentation available from every page",
      "Excel export for all table reports (.xlsx format)",
      "Crossfade transition animation for login slideshow",
    ],
    fixes: [
      "Filter label translation keys now display correctly in all languages",
      "Login page slider image transitions improved",
    ],
    uiChanges: [
      "Unified Material Design 3 button and form component system",
      "Improved modal system with consistent bottom-sheet behavior on mobile",
      "New search field component across all topbar and filter areas",
    ],
    systemUpdates: [
      "Meeting year selector now applies globally to all modules",
      "Improved keyboard navigation and ARIA accessibility across all dialogs",
    ],
  },
  {
    version: "2.3.0",
    releaseDate: "May 2026",
    features: [
      "Voting Record Verification dashboard",
      "Transfer History module for misfiled returns",
      "Certificate Disposal History tracking",
    ],
    fixes: [
      "minutes approval status sync issue resolved",
      "Mobile navigation drawer animation stabilized",
    ],
    uiChanges: [
      "Breadcrumb navigation added to all pages",
      "Mobile bottom-sheet modal pattern applied consistently",
    ],
    systemUpdates: [
      "Notification system enhanced with unread count badge",
      "Performance improvements for large data tables",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// QUICK ACTIONS (Getting Started)
// ─────────────────────────────────────────────────────────────────

export const QUICK_ACTIONS = [
  {
    title: "Getting Started",
    description: "First login, navigation overview, and initial setup steps for new users.",
    icon: "PlayCommittee",
    content: [
      "Log in with your credentials provided by your Admin User.",
      "On first login, change your password via the profile menu (top right).",
      "Select the correct Meeting Year from the topbar dropdown.",
      "Use the sidebar to navigate to your primary module.",
      "Check the Dashboard for any pending items requiring your action.",
    ],
  },
  {
    title: "System Navigation",
    description: "How to move between modules, use search, and access key features.",
    icon: "Map",
    content: [
      "The left sidebar contains all main modules — click to expand sub-navigation.",
      "The topbar search (desktop) searches across reports, cases, and members.",
      "Breadcrumbs at the top of each page show your current location.",
      "The Bell icon shows system notifications and pending approval alerts.",
      "The Profile menu (top right) provides access to account settings and sign-out.",
    ],
  },
  {
    title: "Meeting Year Selection",
    description: "How the Meeting Year selector works and affects all modules.",
    icon: "Calendar",
    content: [
      "The Meeting Year dropdown is in the topbar, visible on all pages.",
      "Changing the year updates all module data globally.",
      "The default is the current active meeting year.",
      "Historical data from previous years can be accessed by selecting a past year.",
      "Reports and exports always reflect the currently selected meeting year.",
    ],
  },
  {
    title: "Downloading & Exporting",
    description: "How to export data from any page as Excel files.",
    icon: "Download",
    content: [
      "Look for the Download or Export button in the top-right of any table page.",
      "Exports include all currently filtered data in Excel (.xlsx) format.",
      "Apply your filters before exporting to download only the relevant subset.",
      "The filename includes the module name and date for easy identification.",
      "For print-quality reports, use the Print button where available.",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// SEARCH INDEX
// ─────────────────────────────────────────────────────────────────

export interface SearchResult {
  type: "page" | "role" | "module" | "faq" | "action";
  title: string;
  excerpt: string;
  pageKey?: string;
  sectionIndex?: number;
}

export function searchHelpContent(query: string): SearchResult[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search page guides
  for (const [key, guide] of Object.entries(PAGE_GUIDES)) {
    const haystack = [
      guide.title, guide.overview,
      ...guide.workflow, ...guide.actions,
      ...(guide.statuses?.map(s => s.label + " " + s.meaning) ?? []),
      ...(guide.commonErrors ?? []),
      ...(guide.bestPractices ?? []),
      ...guide.faqs.flatMap(f => [f.q, f.a]),
    ].join(" ").toLowerCase();

    if (haystack.includes(q)) {
      // Prioritize FAQ matches
      const faqMatch = guide.faqs.find(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
      if (faqMatch) {
        results.push({ type: "faq", title: faqMatch.q, excerpt: faqMatch.a, pageKey: key });
      } else {
        results.push({ type: "page", title: guide.title, excerpt: guide.overview.slice(0, 120) + "…", pageKey: key });
      }
    }
  }

  // Search role guides
  for (const role of ROLE_GUIDES) {
    const haystack = [
      role.role, ...role.responsibilities, ...role.actions, ...role.modules,
      role.approvalFlow, role.escalationFlow,
    ].join(" ").toLowerCase();
    if (haystack.includes(q)) {
      results.push({ type: "role", title: role.role, excerpt: role.responsibilities[0] });
    }
  }

  // Search module docs
  for (const mod of MODULE_DOCS) {
    const haystack = [
      mod.module, mod.purpose, ...mod.workflow, ...mod.actions,
      ...mod.commonErrors, ...mod.bestPractices,
    ].join(" ").toLowerCase();
    if (haystack.includes(q)) {
      results.push({ type: "module", title: mod.module, excerpt: mod.purpose.slice(0, 120) + "…" });
    }
  }

  return results.slice(0, 12);
}
