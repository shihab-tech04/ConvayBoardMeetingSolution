/**
 * Designation registry — canonical source of truth for all designations.
 *
 * Seeded from the merged union of:
 *   - DESIGNATIONS (boardMeetingData.ts — governance-level titles)
 *   - USER_DESIGNATIONS_LIST (constants.ts — operational-level titles)
 *
 * Storage key: bms.designations
 */

import { createEntityRegistry, type EntityRecord } from "../hooks/useEntityRegistry";

// ── Types ──────────────────────────────────────────────────────────────────────

export type DesignationCategory =
  | "governance"   // Board / Committee level
  | "executive"    // C-suite / VP level
  | "operational"  // Officers / Operators
  | "advisory";    // Advisors / External

export interface Designation extends EntityRecord {
  name:        string;
  code?:       string;
  category?:   DesignationCategory;
  status:      "Active" | "Inactive";
  sort_order?: number;
}

// ── Seed data ──────────────────────────────────────────────────────────────────

export const MOCK_DESIGNATIONS: Designation[] = [
  // ── Governance ───────────────────────────────────────────────────────────────
  { id: "d01", created_at: "2024-01-01T00:00:00.000Z", name: "Chairman",                      code: "CHAIR",  category: "governance",  status: "Active", sort_order: 1 },
  { id: "d02", created_at: "2024-01-01T00:00:00.000Z", name: "Managing Director",              code: "MD",     category: "governance",  status: "Active", sort_order: 2 },
  { id: "d03", created_at: "2024-01-01T00:00:00.000Z", name: "Deputy Managing Director",       code: "DMD",    category: "governance",  status: "Active", sort_order: 3 },
  { id: "d04", created_at: "2024-01-01T00:00:00.000Z", name: "Executive Director",             code: "ED",     category: "governance",  status: "Active", sort_order: 4 },
  { id: "d05", created_at: "2024-01-01T00:00:00.000Z", name: "Independent Director",           code: "ID",     category: "governance",  status: "Active", sort_order: 5 },
  { id: "d06", created_at: "2024-01-01T00:00:00.000Z", name: "Non-Executive Director",         code: "NED",    category: "governance",  status: "Active", sort_order: 6 },
  { id: "d07", created_at: "2024-01-01T00:00:00.000Z", name: "Director",                       code: "DIR",    category: "governance",  status: "Active", sort_order: 7 },

  // ── Executive ────────────────────────────────────────────────────────────────
  { id: "d08", created_at: "2024-01-01T00:00:00.000Z", name: "Company Secretary",              code: "CS",     category: "executive",   status: "Active", sort_order: 10 },
  { id: "d09", created_at: "2024-01-01T00:00:00.000Z", name: "Chief Financial Officer",        code: "CFO",    category: "executive",   status: "Active", sort_order: 11 },
  { id: "d10", created_at: "2024-01-01T00:00:00.000Z", name: "Chief Risk Officer",             code: "CRO",    category: "executive",   status: "Active", sort_order: 12 },
  { id: "d11", created_at: "2024-01-01T00:00:00.000Z", name: "Chief Technology Officer",       code: "CTO",    category: "executive",   status: "Active", sort_order: 13 },
  { id: "d12", created_at: "2024-01-01T00:00:00.000Z", name: "Head of Internal Audit",         code: "HIA",    category: "executive",   status: "Active", sort_order: 14 },
  { id: "d13", created_at: "2024-01-01T00:00:00.000Z", name: "Senior Executive Vice President",code: "SEVP",   category: "executive",   status: "Active", sort_order: 15 },
  { id: "d14", created_at: "2024-01-01T00:00:00.000Z", name: "Executive Vice President",       code: "EVP",    category: "executive",   status: "Active", sort_order: 16 },
  { id: "d15", created_at: "2024-01-01T00:00:00.000Z", name: "Senior Vice President",          code: "SVP",    category: "executive",   status: "Active", sort_order: 17 },
  { id: "d16", created_at: "2024-01-01T00:00:00.000Z", name: "Vice President",                 code: "VP",     category: "executive",   status: "Active", sort_order: 18 },
  { id: "d17", created_at: "2024-01-01T00:00:00.000Z", name: "Assistant Vice President",       code: "AVP",    category: "executive",   status: "Active", sort_order: 19 },

  // ── Operational ──────────────────────────────────────────────────────────────
  { id: "d18", created_at: "2024-01-01T00:00:00.000Z", name: "Senior Officer",                 code: "SO",     category: "operational", status: "Active", sort_order: 20 },
  { id: "d19", created_at: "2024-01-01T00:00:00.000Z", name: "Officer",                        code: "OFF",    category: "operational", status: "Active", sort_order: 21 },
  { id: "d20", created_at: "2024-01-01T00:00:00.000Z", name: "Junior Officer",                 code: "JO",     category: "operational", status: "Active", sort_order: 22 },

  // ── Advisory ─────────────────────────────────────────────────────────────────
  { id: "d21", created_at: "2024-01-01T00:00:00.000Z", name: "Advisor",                        code: "ADV",    category: "advisory",    status: "Active", sort_order: 30 },
];

// ── Designation registry ───────────────────────────────────────────────────────

export const useDesignationRegistry = createEntityRegistry<Designation>(
  "bms.designations",
  "bms:designations-updated",
  MOCK_DESIGNATIONS,
);
