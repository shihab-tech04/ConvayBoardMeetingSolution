import { getAttachmentPreviewKind, formatFileSize } from "../../components/attachments/attachmentTypes";
import type { AttachmentItem } from "../../components/attachments/attachmentTypes";
import type { CountryCode } from "../../data/countryOptions";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SRStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export type SRDocCategory =
  | "ID_DOCUMENT"
  | "NID_OR_SMART_ID"
  | "PASSPORT_BIO_PAGE";

export interface SRDocument {
  id: string;
  category: SRDocCategory;
  file: File;
  uploadedAt: string;
}

export interface SRDecisionHistoryItem {
  decisionType: "SUBMITTED" | "APPROVED" | "REJECTED" | "EDITED";
  previousStatus: SRStatus | null;
  newStatus: SRStatus;
  officerId: string;
  officerName: string;
  officerDesignation: string;
  timestamp: string;
  note?: string;
}

export interface SpecialRegistrationApplication {
  id: string;
  applicationNumber: string;
  applicantName: string;
  organization: string;
  designation: string;
  countryCode: CountryCode;
  country: string;
  address: string;
  phone: string; // E.164
  email: string;
  documents: SRDocument[];
  declarationAccepted: boolean;
  declarationTimestamp: string;
  submittedAt: string;
  status: SRStatus;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedByDesignation?: string;
  reviewedAt?: string;
  approvalNote?: string;
  rejectionReason?: string;
  decisionHistory: SRDecisionHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SRListParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  country?: string;
  fromDate?: string;
  toDate?: string;
}

export interface SRKpiTotals {
  total: number;
  pendingReview: number;
  approved: number;
  rejected: number;
}

export interface SRListResult {
  items: SpecialRegistrationApplication[];
  total: number;
  page: number;
  perPage: number;
}

// ── Conflict error ─────────────────────────────────────────────────────────────

export class SRConflictError extends Error {
  constructor(public readonly applicationNumber: string) {
    super(`Application ${applicationNumber} has already been processed.`);
    this.name = "SRConflictError";
  }
}

// ── Object URL cache: prevents revoking URLs still needed by the admin view ───

const _urlCache = new Map<string, string>();

function getOrCreateObjectUrl(doc: SRDocument): string {
  if (_urlCache.has(doc.id)) return _urlCache.get(doc.id)!;
  const url = URL.createObjectURL(doc.file);
  _urlCache.set(doc.id, url);
  return url;
}

export function documentToAttachment(doc: SRDocument): AttachmentItem {
  const url = getOrCreateObjectUrl(doc);
  return {
    id: doc.id,
    name: doc.file.name,
    size: doc.file.size,
    sizeLabel: formatFileSize(doc.file.size),
    type: doc.file.type,
    extension: doc.file.name.split(".").pop()?.toLowerCase() ?? "",
    previewKind: getAttachmentPreviewKind(doc.file.name, doc.file.type),
    objectUrl: url,
    uploadedAt: doc.uploadedAt,
  };
}

// ── Seed data helpers ─────────────────────────────────────────────────────────

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function seqNum(date: Date, seq: number): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `SR-EXT-${d}-${String(1000 + seq).padStart(4, "0")}`;
}

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function fakeFile(name: string, type: string): File {
  const content = `Mock document: ${name}`;
  return new File([content], name, { type, lastModified: Date.now() });
}

function makeDoc(category: SRDocCategory, fileName: string, uploadedAt: string): SRDocument {
  const ext = fileName.split(".").pop() ?? "pdf";
  const type = ext === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  return {
    id: makeId(),
    category,
    file: fakeFile(fileName, type),
    uploadedAt,
  };
}

function seedApplication(
  overrides: Partial<SpecialRegistrationApplication> & {
    seqIndex: number;
    daysAgo: number;
    applicantName: string;
    organization: string;
    designation: string;
    countryCode: CountryCode;
    country: string;
    address: string;
    phone: string;
    email: string;
  }
): SpecialRegistrationApplication {
  const { seqIndex, daysAgo, ...rest } = overrides;
  const createdAt = isoDate(daysAgo);
  const refDate = new Date(createdAt);
  const appNum = seqNum(refDate, seqIndex);
  const id = makeId();

  const docs: SRDocument[] = [
    makeDoc("ID_DOCUMENT", "identification_document.pdf", createdAt),
  ];

  const historyItem: SRDecisionHistoryItem = {
    decisionType: "SUBMITTED",
    previousStatus: null,
    newStatus: "PENDING_REVIEW",
    officerId: "citizen",
    officerName: rest.applicantName,
    officerDesignation: "Applicant",
    timestamp: createdAt,
  };

  return {
    id,
    applicationNumber: appNum,
    status: "PENDING_REVIEW",
    documents: docs,
    declarationAccepted: true,
    declarationTimestamp: createdAt,
    submittedAt: createdAt,
    decisionHistory: [historyItem],
    createdAt,
    updatedAt: createdAt,
    ...rest,
  };
}

// ── In-memory store ───────────────────────────────────────────────────────────

let _store: SpecialRegistrationApplication[] = [
  seedApplication({
    seqIndex: 1, daysAgo: 30,
    applicantName: "Dr. Karim Abdullah Al-Rashid",
    organization: "Central Bank of UAE",
    designation: "Deputy Director",
    countryCode: "AE",
    country: "United Arab Emirates",
    address: "Flat 402, Al Nakheel Tower, Al Reem Island, Abu Dhabi",
    phone: "+971501234567",
    email: "karim.alrashid@centralbank.ae",
  }),
  seedApplication({
    seqIndex: 2, daysAgo: 25,
    applicantName: "Prof. Sarah Bennett",
    organization: "London School of Economics",
    designation: "Professor of Finance",
    countryCode: "GB",
    country: "United Kingdom",
    address: "14 Green Lane, Whitechapel, London E1 2PQ",
    phone: "+447700900123",
    email: "s.bennett@lse.ac.uk",
  }),
  seedApplication({
    seqIndex: 3, daysAgo: 20,
    applicantName: "Mohammad Rafiqul Islam",
    organization: "IMF Bangladesh Office",
    designation: "Senior Economist",
    countryCode: "CA",
    country: "Canada",
    address: "2405 Dundas Street West, Toronto, ON M6P 1X1",
    phone: "+14165550192",
    email: "rafiqul.islam@imf.org",
  }),
  {
    ...seedApplication({
      seqIndex: 4, daysAgo: 18,
      applicantName: "Ms. Nasreen Akter Sultana",
      organization: "Reserve Bank of Australia",
      designation: "Policy Advisor",
      countryCode: "AU",
      country: "Australia",
      address: "27 Collins Street, Melbourne VIC 3000",
      phone: "+61412345678",
      email: "nasreen.sultana@rba.gov.au",
    }),
    status: "APPROVED" as SRStatus,
    reviewedById: "NCC-2034",
    reviewedByName: "Md. Salahuddin Ahmed",
    reviewedByDesignation: "Senior Meeting Officer",
    reviewedAt: isoDate(15),
    approvalNote: "All documents verified. Registration approved.",
    decisionHistory: [
      {
        decisionType: "SUBMITTED",
        previousStatus: null,
        newStatus: "PENDING_REVIEW",
        officerId: "external",
        officerName: "Ms. Nasreen Akter Sultana",
        officerDesignation: "External Participant",
        timestamp: isoDate(18),
      },
      {
        decisionType: "APPROVED",
        previousStatus: "PENDING_REVIEW",
        newStatus: "APPROVED",
        officerId: "NCC-2034",
        officerName: "Md. Salahuddin Ahmed",
        officerDesignation: "Senior Meeting Officer",
        timestamp: isoDate(15),
        note: "All documents verified. Registration approved.",
      },
    ],
    updatedAt: isoDate(15),
  },
  {
    ...seedApplication({
      seqIndex: 5, daysAgo: 15,
      applicantName: "Mr. Jahangir Alam Chowdhury",
      organization: "World Bank",
      designation: "Financial Specialist",
      countryCode: "US",
      country: "United States",
      address: "88 Riverside Drive, Apt 5C, New York, NY 10024",
      phone: "+12125557890",
      email: "jahangir.alam@worldbank.org",
    }),
    status: "REJECTED" as SRStatus,
    reviewedById: "NCC-1022",
    reviewedByName: "Sharmin Akter",
    reviewedByDesignation: "Meeting Officer",
    reviewedAt: isoDate(12),
    rejectionReason: "Identification document is not clearly readable. Please resubmit with a higher-quality scan.",
    decisionHistory: [
      {
        decisionType: "SUBMITTED",
        previousStatus: null,
        newStatus: "PENDING_REVIEW",
        officerId: "external",
        officerName: "Mr. Jahangir Alam Chowdhury",
        officerDesignation: "External Participant",
        timestamp: isoDate(15),
      },
      {
        decisionType: "REJECTED",
        previousStatus: "PENDING_REVIEW",
        newStatus: "REJECTED",
        officerId: "NCC-1022",
        officerName: "Sharmin Akter",
        officerDesignation: "Meeting Officer",
        timestamp: isoDate(12),
        note: "Identification document is not clearly readable. Please resubmit with a higher-quality scan.",
      },
    ],
    updatedAt: isoDate(12),
  },
  seedApplication({
    seqIndex: 6, daysAgo: 10,
    applicantName: "Dr. Sumaiya Rahman Nisha",
    organization: "Deutsche Bundesbank",
    designation: "Research Fellow",
    countryCode: "DE",
    country: "Germany",
    address: "Friedrichstraße 100, 10117 Berlin",
    phone: "+491601234567",
    email: "s.nisha@bundesbank.de",
  }),
  seedApplication({
    seqIndex: 7, daysAgo: 5,
    applicantName: "Mr. Abdul Kadir Molla",
    organization: "Bank Negara Malaysia",
    designation: "Director",
    countryCode: "MY",
    country: "Malaysia",
    address: "Block D-12-3, Jalan Ampang, Kuala Lumpur 50450",
    phone: "+60123456789",
    email: "abdulkadir.molla@bnm.gov.my",
  }),
];

// Track IDs to prevent duplicate submissions
const _submittedIds = new Set<string>();

// ── Public API ────────────────────────────────────────────────────────────────

export function addApplication(app: SpecialRegistrationApplication): void {
  if (_submittedIds.has(app.id)) return;
  _submittedIds.add(app.id);
  _store = [app, ..._store];
}

export function getApplications(params: SRListParams = {}): SRListResult {
  const { page = 1, perPage = 15, search = "", status = "", country = "", fromDate = "", toDate = "" } = params;

  const q = search.trim().toLowerCase();

  let filtered = _store.filter(app => {
    if (q) {
      const haystack = [
        app.applicationNumber,
        app.applicantName,
        app.organization,
        app.designation,
        app.email,
        app.phone,
        app.country,
      ].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (status && status !== "ALL" && app.status !== status) return false;
    if (country && !app.country.toLowerCase().includes(country.toLowerCase())) return false;
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      if (new Date(app.submittedAt) < from) return false;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (new Date(app.submittedAt) > to) return false;
    }
    return true;
  });

  // Sort: newest first
  filtered = filtered.slice().sort((a, b) =>
    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  const total = filtered.length;
  const start = (page - 1) * perPage;
  const items = filtered.slice(start, start + perPage);

  return { items, total, page, perPage };
}

export function getApplicationById(id: string): SpecialRegistrationApplication | undefined {
  return _store.find(a => a.id === id);
}

export function approveApplication(
  id: string,
  payload: {
    officerId: string;
    officerName: string;
    officerDesignation: string;
    approvalNote?: string;
  }
): SpecialRegistrationApplication {
  const app = _store.find(a => a.id === id);
  if (!app) throw new Error(`Application ${id} not found.`);
  if (app.status !== "PENDING_REVIEW") throw new SRConflictError(app.applicationNumber);

  const now = new Date().toISOString();
  const updated: SpecialRegistrationApplication = {
    ...app,
    status: "APPROVED",
    reviewedById: payload.officerId,
    reviewedByName: payload.officerName,
    reviewedByDesignation: payload.officerDesignation,
    reviewedAt: now,
    approvalNote: payload.approvalNote,
    decisionHistory: [
      ...app.decisionHistory,
      {
        decisionType: "APPROVED",
        previousStatus: "PENDING_REVIEW",
        newStatus: "APPROVED",
        officerId: payload.officerId,
        officerName: payload.officerName,
        officerDesignation: payload.officerDesignation,
        timestamp: now,
        note: payload.approvalNote,
      },
    ],
    updatedAt: now,
  };

  _store = _store.map(a => (a.id === id ? updated : a));
  return updated;
}

export function rejectApplication(
  id: string,
  payload: {
    officerId: string;
    officerName: string;
    officerDesignation: string;
    rejectionReason: string;
  }
): SpecialRegistrationApplication {
  const app = _store.find(a => a.id === id);
  if (!app) throw new Error(`Application ${id} not found.`);
  if (app.status !== "PENDING_REVIEW") throw new SRConflictError(app.applicationNumber);

  const now = new Date().toISOString();
  const updated: SpecialRegistrationApplication = {
    ...app,
    status: "REJECTED",
    reviewedById: payload.officerId,
    reviewedByName: payload.officerName,
    reviewedByDesignation: payload.officerDesignation,
    reviewedAt: now,
    rejectionReason: payload.rejectionReason,
    decisionHistory: [
      ...app.decisionHistory,
      {
        decisionType: "REJECTED",
        previousStatus: "PENDING_REVIEW",
        newStatus: "REJECTED",
        officerId: payload.officerId,
        officerName: payload.officerName,
        officerDesignation: payload.officerDesignation,
        timestamp: now,
        note: payload.rejectionReason,
      },
    ],
    updatedAt: now,
  };

  _store = _store.map(a => (a.id === id ? updated : a));
  return updated;
}

export function getKpiTotals(): SRKpiTotals {
  return _store.reduce<SRKpiTotals>(
    (acc, app) => {
      acc.total++;
      if (app.status === "PENDING_REVIEW") acc.pendingReview++;
      else if (app.status === "APPROVED") acc.approved++;
      else if (app.status === "REJECTED") acc.rejected++;
      return acc;
    },
    { total: 0, pendingReview: 0, approved: 0, rejected: 0 }
  );
}

export function getDocumentsByCategory(
  app: SpecialRegistrationApplication,
  category: SRDocCategory
): AttachmentItem[] {
  return app.documents
    .filter(d => d.category === category)
    .map(d => documentToAttachment(d));
}

export interface SpecialRegistrationUpdatePayload {
  applicantName: string;
  organization: string;
  designation: string;
  countryCode: CountryCode;
  country: string;
  address: string;
  phone: string; // E.164
  email: string;
  idFiles: File[];
}

export function updateApplication(
  id: string,
  payload: SpecialRegistrationUpdatePayload,
  editor: { editorId: string; editorName: string; editorDesignation: string },
): SpecialRegistrationApplication {
  const app = _store.find(a => a.id === id);
  if (!app) throw new Error(`Application ${id} not found.`);
  if (app.status !== "PENDING_REVIEW") throw new SRConflictError(app.applicationNumber);

  const now = new Date().toISOString();

  const existingByFile = new Map(app.documents.map(d => [d.file, d]));

  function buildDocs(category: SRDocCategory, files: File[]): SRDocument[] {
    return files.map(file => {
      const existing = existingByFile.get(file);
      if (existing) return existing;
      return { id: makeId(), category, file, uploadedAt: now };
    });
  }

  const newDocuments: SRDocument[] = [
    ...buildDocs("ID_DOCUMENT", payload.idFiles),
  ];

  const newDocIds = new Set(newDocuments.map(d => d.id));
  for (const doc of app.documents) {
    if (!newDocIds.has(doc.id) && _urlCache.has(doc.id)) {
      URL.revokeObjectURL(_urlCache.get(doc.id)!);
      _urlCache.delete(doc.id);
    }
  }

  const updated: SpecialRegistrationApplication = {
    ...app,
    applicantName: payload.applicantName,
    organization:  payload.organization,
    designation:   payload.designation,
    countryCode:   payload.countryCode,
    country:       payload.country,
    address:       payload.address,
    phone:         payload.phone,
    email:         payload.email,
    documents:     newDocuments,
    decisionHistory: [
      ...app.decisionHistory,
      {
        decisionType:        "EDITED",
        previousStatus:      "PENDING_REVIEW",
        newStatus:           "PENDING_REVIEW",
        officerId:           editor.editorId,
        officerName:         editor.editorName,
        officerDesignation:  editor.editorDesignation,
        timestamp:           now,
      },
    ],
    updatedAt: now,
  };

  _store = _store.map(a => (a.id === id ? updated : a));
  return updated;
}

export function resetStore(): void {
  _urlCache.forEach(url => URL.revokeObjectURL(url));
  _urlCache.clear();
  _submittedIds.clear();
  _store = [];
}
