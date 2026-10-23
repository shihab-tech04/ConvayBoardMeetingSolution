import {
  addApplication,
  type SpecialRegistrationApplication,
  type SRDocument,
  type SRDocCategory,
} from "./repositories/specialRegistrationRepository";
import type { CountryCode } from "../data/countryOptions";

export interface SpecialRegAttachments {
  id: File[];
}

export interface SpecialRegPayload {
  applicantName: string;
  organization: string;
  designation: string;
  countryCode: CountryCode;
  country: string;
  address: string;
  phone: string; // E.164
  email: string;
  attachments: SpecialRegAttachments;
  declarationAccepted: true;
  submittedAt: string;
}

export interface SpecialRegResult {
  applicationNumber: string;
  submittedAt: string;
  status: "Pending";
  email: string;
}

function generateApplicationNumber(): string {
  const today = new Date();
  const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return `SR-EXT-${yyyymmdd}-${seq}`;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function filesToDocs(files: File[], category: SRDocCategory, submittedAt: string): SRDocument[] {
  return files.map(file => ({
    id: makeId(),
    category,
    file,
    uploadedAt: submittedAt,
  }));
}

// Build FormData so real files can be sent when a backend is available.
function buildFormData(payload: SpecialRegPayload): FormData {
  const fd = new FormData();
  fd.append("applicantName", payload.applicantName);
  fd.append("organization", payload.organization);
  fd.append("designation", payload.designation);
  fd.append("countryCode", payload.countryCode);
  fd.append("country", payload.country);
  fd.append("address", payload.address);
  fd.append("phone", payload.phone);
  fd.append("email", payload.email);
  fd.append("declarationAccepted", String(payload.declarationAccepted));
  fd.append("submittedAt", payload.submittedAt);
  payload.attachments.id.forEach(f => fd.append("id_document", f));
  return fd;
}

export async function submitSpecialRegistration(
  payload: SpecialRegPayload,
): Promise<SpecialRegResult> {
  // Build FormData (ready for real API — not sent in this mock)
  buildFormData(payload);

  // Mock network delay
  await new Promise<void>(resolve => setTimeout(resolve, 1500));

  const applicationNumber = generateApplicationNumber();
  const id = makeId();
  const now = payload.submittedAt;

  const documents: SRDocument[] = [
    ...filesToDocs(payload.attachments.id, "ID_DOCUMENT", now),
  ];

  const app: SpecialRegistrationApplication = {
    id,
    applicationNumber,
    applicantName: payload.applicantName,
    organization: payload.organization,
    designation: payload.designation,
    countryCode: payload.countryCode,
    country: payload.country,
    address: payload.address,
    phone: payload.phone,
    email: payload.email,
    documents,
    declarationAccepted: true,
    declarationTimestamp: now,
    submittedAt: now,
    status: "PENDING_REVIEW",
    decisionHistory: [
      {
        decisionType: "SUBMITTED",
        previousStatus: null,
        newStatus: "PENDING_REVIEW",
        officerId: "external",
        officerName: payload.applicantName,
        officerDesignation: payload.designation || "External Participant",
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  addApplication(app);

  return {
    applicationNumber,
    submittedAt: now,
    status: "Pending",
    email: payload.email,
  };
}
