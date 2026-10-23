import { ALL_PERM_IDS } from "./permissions";

// ─────────────────────────────────────────────────────────────
// NOTIFICATION TYPES (duplicated to avoid circular dependency)
// ─────────────────────────────────────────────────────────────
export type NotificationType =
  | "approval" | "status" | "assignment" | "correction"
  | "payment" | "user-role" | "security" | "system";

export type NotificationPriority = "high" | "medium" | "low";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  module: string;
  time: string;
  isRead: boolean;
  destination: {
    main: string;
    sub?: string;
    third?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// USER & ROLE TYPES
// ─────────────────────────────────────────────────────────────
export type UserStatus = "Active" | "Inactive" | "Pending";

export interface SystemUser {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  designation: string;
  circle: string;
  zone: string;
  level: string;
  role: string;
  status: UserStatus;
  lastActive: string;
  sendInvite: boolean;
  twoFA: boolean;
  accountActive: boolean;
}

export interface SystemRole {
  id: string;
  name: string;
  description: string;
  level: string;
  status: "Active" | "Inactive";
  usersCount: number;
  permissions: string[];
}

import type { TableRow } from "../pages/modulePageUtils";
export const MOCK_DATA: Record<string, TableRow[]> = {
  "offline-return-report": [
    { id: 1, committee: "Board of Directors", t_82bb: 5, t_82c2: 3, t_212: 2, t_normal: 8, t_total: 18, t_tds: "24,50,000", t_total_tax: "32,00,000", u_82bb: 412, u_82c2: 238, u_212: 156, u_normal: 1840, u_total: 2646, u_tds: "18,40,00,000", u_total_tax: "24,10,00,000" },
    { id: 2, committee: "Executive Committee", t_82bb: 7, t_82c2: 4, t_212: 3, t_normal: 12, t_total: 26, t_tds: "31,20,000", t_total_tax: "41,50,000", u_82bb: 521, u_82c2: 312, u_212: 198, u_normal: 2140, u_total: 3171, u_tds: "21,30,00,000", u_total_tax: "28,60,00,000" },
    { id: 3, committee: "Audit Committee", t_82bb: 2, t_82c2: 1, t_212: 0, t_normal: 5, t_total: 8, t_tds: "9,80,000", t_total_tax: "13,40,000", u_82bb: 289, u_82c2: 178, u_212: 94, u_normal: 1320, u_total: 1881, u_tds: "12,60,00,000", u_total_tax: "16,90,00,000" },
    { id: 4, committee: "Risk Management Committee", t_82bb: 9, t_82c2: 6, t_212: 4, t_normal: 15, t_total: 34, t_tds: "48,70,000", t_total_tax: "62,30,000", u_82bb: 634, u_82c2: 401, u_212: 267, u_normal: 2890, u_total: 4192, u_tds: "31,20,00,000", u_total_tax: "40,80,00,000" },
    { id: 5, committee: "Shariah Supervisory Committee", t_82bb: 3, t_82c2: 2, t_212: 1, t_normal: 6, t_total: 12, t_tds: "14,20,000", t_total_tax: "19,50,000", u_82bb: 347, u_82c2: 214, u_212: 131, u_normal: 1560, u_total: 2252, u_tds: "15,80,00,000", u_total_tax: "20,30,00,000" },
    { id: 6, committee: "Nomination & Remuneration Committee", t_82bb: 6, t_82c2: 4, t_212: 2, t_normal: 11, t_total: 23, t_tds: "27,60,000", t_total_tax: "36,10,000", u_82bb: 478, u_82c2: 295, u_212: 182, u_normal: 2100, u_total: 3055, u_tds: "20,40,00,000", u_total_tax: "26,70,00,000" },
    { id: 7, committee: "HR Committee", t_82bb: 4, t_82c2: 2, t_212: 1, t_normal: 9, t_total: 16, t_tds: "19,30,000", t_total_tax: "25,80,000", u_82bb: 391, u_82c2: 241, u_212: 148, u_normal: 1760, u_total: 2540, u_tds: "17,20,00,000", u_total_tax: "22,40,00,000" },
    { id: 8, committee: "IT Steering Committee", t_82bb: 8, t_82c2: 5, t_212: 3, t_normal: 14, t_total: 30, t_tds: "38,90,000", t_total_tax: "51,20,000", u_82bb: 568, u_82c2: 356, u_212: 224, u_normal: 2460, u_total: 3608, u_tds: "26,80,00,000", u_total_tax: "35,10,00,000" },
  ],
  "tax-category-report": [
    { id: 1, category: "Board of Directors", online: 12, offline: 10, total: 22 },
    { id: 2, category: "Executive Committee", online: 24, offline: 22, total: 46 },
    { id: 3, category: "Audit Committee", online: 8, offline: 7, total: 15 },
    { id: 4, category: "Risk Management Committee", online: 6, offline: 5, total: 11 },
    { id: 5, category: "Shariah Supervisory Committee", online: 4, offline: 4, total: 8 },
    { id: 6, category: "Nomination & Remuneration Committee", online: 4, offline: 3, total: 7 },
    { id: 7, category: "HR Committee", online: 6, offline: 6, total: 12 },
    { id: 8, category: "IT Steering Committee", online: 4, offline: 3, total: 7 },
  ],
  "express-cert-disposal": [
    { id: 1, committee: "Board of Directors", t_pending: 3, t_approved: 12, t_rejected: 1, t_total_req: 16, t_disposed: 13, u_pending: 28, u_approved: 312, u_rejected: 14, u_total_req: 354, u_disposed: 326 },
    { id: 2, committee: "Executive Committee", t_pending: 5, t_approved: 18, t_rejected: 2, t_total_req: 25, t_disposed: 20, u_pending: 41, u_approved: 428, u_rejected: 19, u_total_req: 488, u_disposed: 447 },
    { id: 3, committee: "Audit Committee", t_pending: 1, t_approved: 7, t_rejected: 0, t_total_req: 8, t_disposed: 7, u_pending: 15, u_approved: 198, u_rejected: 8, u_total_req: 221, u_disposed: 206 },
    { id: 4, committee: "Risk Management Committee", t_pending: 6, t_approved: 22, t_rejected: 3, t_total_req: 31, t_disposed: 25, u_pending: 52, u_approved: 541, u_rejected: 23, u_total_req: 616, u_disposed: 564 },
    { id: 5, committee: "Shariah Supervisory Committee", t_pending: 2, t_approved: 9, t_rejected: 1, t_total_req: 12, t_disposed: 10, u_pending: 19, u_approved: 234, u_rejected: 11, u_total_req: 264, u_disposed: 245 },
    { id: 6, committee: "Nomination & Remuneration Committee", t_pending: 4, t_approved: 15, t_rejected: 1, t_total_req: 20, t_disposed: 16, u_pending: 33, u_approved: 381, u_rejected: 16, u_total_req: 430, u_disposed: 397 },
    { id: 7, committee: "HR Committee", t_pending: 2, t_approved: 11, t_rejected: 0, t_total_req: 13, t_disposed: 11, u_pending: 22, u_approved: 271, u_rejected: 10, u_total_req: 303, u_disposed: 281 },
    { id: 8, committee: "IT Steering Committee", t_pending: 7, t_approved: 25, t_rejected: 2, t_total_req: 34, t_disposed: 27, u_pending: 61, u_approved: 612, u_rejected: 28, u_total_req: 701, u_disposed: 640 },
  ],
  "user-activity-report": [
    { id: 1, committee: "Board of Directors", user_id: "U00121", designation: "Meeting Secretary", user_name: "Md. Rafiqul Islam", email: "r.islam@nccbank.com.bd", phone: "+880-1711-234567", last_login: "2026-05-24 09:15", last_pass_change: "2026-04-01", active_status: "Active", entry_today: 45, entry_upto: 1234 },
    { id: 2, committee: "Audit Committee", user_id: "U00122", designation: "Meeting Coordinator", user_name: "Nasrin Akhter", email: "n.akhter@nccbank.com.bd", phone: "+880-1812-345678", last_login: "2026-05-24 08:42", last_pass_change: "2026-03-15", active_status: "Active", entry_today: 32, entry_upto: 987 },
    { id: 3, committee: "Risk Management Committee", user_id: "U00231", designation: "Committee Member", user_name: "A.K.M. Hossain", email: "akm.hossain@nccbank.com.bd", phone: "+880-1913-456789", last_login: "2026-05-23 17:30", last_pass_change: "2026-02-28", active_status: "Active", entry_today: 0, entry_upto: 2156 },
    { id: 4, committee: "Executive Committee", user_id: "U00232", designation: "Data Entry Operator", user_name: "Sultana Begum", email: "s.begum@nccbank.com.bd", phone: "+880-1611-567890", last_login: "2026-05-22 14:18", last_pass_change: "2026-01-10", active_status: "Inactive", entry_today: 0, entry_upto: 456 },
    { id: 5, committee: "Nomination Committee", user_id: "U00341", designation: "Meeting Coordinator", user_name: "Kamal Uddin Ahmed", email: "k.ahmed@nccbank.com.bd", phone: "+880-1712-678901", last_login: "2026-05-24 10:05", last_pass_change: "2026-04-20", active_status: "Active", entry_today: 28, entry_upto: 1102 },
    { id: 6, committee: "Executive Committee", user_id: "U00342", designation: "Committee Member", user_name: "Farzana Rahman", email: "f.rahman@nccbank.com.bd", phone: "+880-1813-789012", last_login: "2026-05-24 07:55", last_pass_change: "2026-03-30", active_status: "Active", entry_today: 61, entry_upto: 3241 },
    { id: 7, committee: "Audit Committee", user_id: "U00451", designation: "Committee Member", user_name: "Md. Shahidul Haque", email: "s.haque@nccbank.com.bd", phone: "+880-1914-890123", last_login: "2026-05-23 16:45", last_pass_change: "2026-02-14", active_status: "Active", entry_today: 12, entry_upto: 782 },
    { id: 8, committee: "Risk Management Committee", user_id: "U00452", designation: "Meeting Coordinator", user_name: "Roksana Parvin", email: "r.parvin@nccbank.com.bd", phone: "+880-1612-901234", last_login: "2026-05-20 11:22", last_pass_change: "2025-12-05", active_status: "Inactive", entry_today: 0, entry_upto: 214 },
  ],
  "litigation-arrear": [
    { id: 1, committee: "Audit Committee", t_pending: 4, t_approved: 7, t_rejected: 1, t_total: 12, t_revenue: "1,24,50,000", u_pending: 68, u_approved: 312, u_rejected: 24, u_total: 404, u_revenue: "42,80,00,000" },
    { id: 2, committee: "Risk Management Committee", t_pending: 6, t_approved: 11, t_rejected: 2, t_total: 19, t_revenue: "2,18,70,000", u_pending: 94, u_approved: 441, u_rejected: 37, u_total: 572, u_revenue: "61,40,00,000" },
    { id: 3, committee: "Shariah Supervisory Committee", t_pending: 2, t_approved: 4, t_rejected: 0, t_total: 6, t_revenue: "78,20,000", u_pending: 41, u_approved: 189, u_rejected: 15, u_total: 245, u_revenue: "28,60,00,000" },
    { id: 4, committee: "Nomination & Remuneration Committee", t_pending: 8, t_approved: 14, t_rejected: 3, t_total: 25, t_revenue: "3,41,90,000", u_pending: 127, u_approved: 578, u_rejected: 48, u_total: 753, u_revenue: "84,20,00,000" },
    { id: 5, committee: "HR Committee", t_pending: 3, t_approved: 6, t_rejected: 1, t_total: 10, t_revenue: "1,02,30,000", u_pending: 52, u_approved: 238, u_rejected: 19, u_total: 309, u_revenue: "35,10,00,000" },
    { id: 6, committee: "IT Steering Committee", t_pending: 5, t_approved: 9, t_rejected: 1, t_total: 15, t_revenue: "1,87,40,000", u_pending: 83, u_approved: 374, u_rejected: 31, u_total: 488, u_revenue: "54,70,00,000" },
    { id: 7, committee: "Board of Directors", t_pending: 3, t_approved: 5, t_rejected: 1, t_total: 9, t_revenue: "94,60,000", u_pending: 47, u_approved: 213, u_rejected: 17, u_total: 277, u_revenue: "31,90,00,000" },
    { id: 8, committee: "Executive Committee", t_pending: 9, t_approved: 16, t_rejected: 3, t_total: 28, t_revenue: "4,12,80,000", u_pending: 148, u_approved: 672, u_rejected: 54, u_total: 874, u_revenue: "98,30,00,000" },
  ],
  "litigation-writ-case": [
    { id: 1, committee: "Audit Committee", t_pending: 2, t_approved: 3, t_rejected: 0, t_total: 5, t_revenue: "56,80,000", u_pending: 34, u_approved: 148, u_rejected: 12, u_total: 194, u_revenue: "18,40,00,000" },
    { id: 2, committee: "Risk Management Committee", t_pending: 3, t_approved: 5, t_rejected: 1, t_total: 9, t_revenue: "98,20,000", u_pending: 51, u_approved: 221, u_rejected: 18, u_total: 290, u_revenue: "27,60,00,000" },
    { id: 3, committee: "Shariah Supervisory Committee", t_pending: 1, t_approved: 2, t_rejected: 0, t_total: 3, t_revenue: "31,40,000", u_pending: 18, u_approved: 84, u_rejected: 7, u_total: 109, u_revenue: "10,80,00,000" },
    { id: 4, committee: "Nomination & Remuneration Committee", t_pending: 4, t_approved: 7, t_rejected: 1, t_total: 12, t_revenue: "1,48,60,000", u_pending: 67, u_approved: 298, u_rejected: 24, u_total: 389, u_revenue: "38,50,00,000" },
    { id: 5, committee: "HR Committee", t_pending: 1, t_approved: 3, t_rejected: 0, t_total: 4, t_revenue: "42,10,000", u_pending: 24, u_approved: 108, u_rejected: 9, u_total: 141, u_revenue: "14,20,00,000" },
    { id: 6, committee: "IT Steering Committee", t_pending: 2, t_approved: 4, t_rejected: 1, t_total: 7, t_revenue: "81,30,000", u_pending: 38, u_approved: 172, u_rejected: 14, u_total: 224, u_revenue: "22,70,00,000" },
    { id: 7, committee: "Board of Directors", t_pending: 1, t_approved: 2, t_rejected: 0, t_total: 3, t_revenue: "28,90,000", u_pending: 21, u_approved: 94, u_rejected: 8, u_total: 123, u_revenue: "12,40,00,000" },
    { id: 8, committee: "Executive Committee", t_pending: 5, t_approved: 8, t_rejected: 2, t_total: 15, t_revenue: "1,89,40,000", u_pending: 78, u_approved: 348, u_rejected: 28, u_total: 454, u_revenue: "45,80,00,000" },
  ],
  "litigation-dept-case": [
    { id: 1, committee: "Audit Committee", t_pending: 3, t_approved: 6, t_rejected: 1, t_total: 10, t_revenue: "87,20,000", u_pending: 52, u_approved: 234, u_rejected: 19, u_total: 305, u_revenue: "32,40,00,000" },
    { id: 2, committee: "Risk Management Committee", t_pending: 5, t_approved: 9, t_rejected: 2, t_total: 16, t_revenue: "1,52,40,000", u_pending: 78, u_approved: 351, u_rejected: 29, u_total: 458, u_revenue: "48,60,00,000" },
    { id: 3, committee: "Shariah Supervisory Committee", t_pending: 1, t_approved: 3, t_rejected: 0, t_total: 4, t_revenue: "38,60,000", u_pending: 26, u_approved: 118, u_rejected: 10, u_total: 154, u_revenue: "16,20,00,000" },
    { id: 4, committee: "Nomination & Remuneration Committee", t_pending: 7, t_approved: 12, t_rejected: 2, t_total: 21, t_revenue: "2,34,80,000", u_pending: 104, u_approved: 468, u_rejected: 39, u_total: 611, u_revenue: "65,10,00,000" },
    { id: 5, committee: "HR Committee", t_pending: 2, t_approved: 4, t_rejected: 1, t_total: 7, t_revenue: "64,30,000", u_pending: 35, u_approved: 158, u_rejected: 13, u_total: 206, u_revenue: "21,90,00,000" },
    { id: 6, committee: "IT Steering Committee", t_pending: 4, t_approved: 7, t_rejected: 1, t_total: 12, t_revenue: "1,14,60,000", u_pending: 61, u_approved: 274, u_rejected: 23, u_total: 358, u_revenue: "38,10,00,000" },
    { id: 7, committee: "Board of Directors", t_pending: 2, t_approved: 4, t_rejected: 0, t_total: 6, t_revenue: "54,70,000", u_pending: 31, u_approved: 141, u_rejected: 12, u_total: 184, u_revenue: "19,60,00,000" },
    { id: 8, committee: "Executive Committee", t_pending: 8, t_approved: 14, t_rejected: 3, t_total: 25, t_revenue: "2,91,20,000", u_pending: 121, u_approved: 545, u_rejected: 45, u_total: 711, u_revenue: "75,80,00,000" },
  ],
  "litigation-taxpayer-case": [
    { id: 1, committee: "Audit Committee", t_pending: 2, t_approved: 5, t_rejected: 1, t_total: 8, t_revenue: "64,80,000", u_pending: 41, u_approved: 184, u_rejected: 15, u_total: 240, u_revenue: "25,60,00,000" },
    { id: 2, committee: "Risk Management Committee", t_pending: 4, t_approved: 8, t_rejected: 1, t_total: 13, t_revenue: "1,12,30,000", u_pending: 62, u_approved: 278, u_rejected: 23, u_total: 363, u_revenue: "38,50,00,000" },
    { id: 3, committee: "Shariah Supervisory Committee", t_pending: 1, t_approved: 2, t_rejected: 0, t_total: 3, t_revenue: "24,10,000", u_pending: 19, u_approved: 88, u_rejected: 7, u_total: 114, u_revenue: "12,20,00,000" },
    { id: 4, committee: "Nomination & Remuneration Committee", t_pending: 6, t_approved: 11, t_rejected: 2, t_total: 19, t_revenue: "1,84,60,000", u_pending: 84, u_approved: 378, u_rejected: 31, u_total: 493, u_revenue: "52,70,00,000" },
    { id: 5, committee: "HR Committee", t_pending: 2, t_approved: 4, t_rejected: 0, t_total: 6, t_revenue: "48,90,000", u_pending: 27, u_approved: 124, u_rejected: 10, u_total: 161, u_revenue: "17,30,00,000" },
    { id: 6, committee: "IT Steering Committee", t_pending: 3, t_approved: 6, t_rejected: 1, t_total: 10, t_revenue: "84,20,000", u_pending: 48, u_approved: 218, u_rejected: 18, u_total: 284, u_revenue: "30,40,00,000" },
    { id: 7, committee: "Board of Directors", t_pending: 1, t_approved: 3, t_rejected: 0, t_total: 4, t_revenue: "32,40,000", u_pending: 24, u_approved: 108, u_rejected: 9, u_total: 141, u_revenue: "15,10,00,000" },
    { id: 8, committee: "Executive Committee", t_pending: 7, t_approved: 13, t_rejected: 2, t_total: 22, t_revenue: "2,18,40,000", u_pending: 97, u_approved: 438, u_rejected: 36, u_total: 571, u_revenue: "61,20,00,000" },
  ],
  "appeal-report": [
    { id: 1, committee: "Audit Committee", t_pending: 3, t_approved: 8, t_rejected: 1, t_total: 12, u_pending: 48, u_approved: 312, u_rejected: 24, u_total: 384 },
    { id: 2, committee: "Risk Management Committee", t_pending: 5, t_approved: 12, t_rejected: 2, t_total: 19, u_pending: 72, u_approved: 441, u_rejected: 36, u_total: 549 },
    { id: 3, committee: "Shariah Supervisory Committee", t_pending: 1, t_approved: 4, t_rejected: 0, t_total: 5, u_pending: 21, u_approved: 178, u_rejected: 14, u_total: 213 },
    { id: 4, committee: "Nomination & Remuneration Committee", t_pending: 7, t_approved: 15, t_rejected: 3, t_total: 25, u_pending: 96, u_approved: 578, u_rejected: 46, u_total: 720 },
    { id: 5, committee: "HR Committee", t_pending: 2, t_approved: 6, t_rejected: 1, t_total: 9, u_pending: 31, u_approved: 218, u_rejected: 18, u_total: 267 },
    { id: 6, committee: "IT Steering Committee", t_pending: 4, t_approved: 9, t_rejected: 1, t_total: 14, u_pending: 58, u_approved: 374, u_rejected: 29, u_total: 461 },
    { id: 7, committee: "Board of Directors", t_pending: 2, t_approved: 5, t_rejected: 1, t_total: 8, u_pending: 34, u_approved: 241, u_rejected: 19, u_total: 294 },
    { id: 8, committee: "Executive Committee", t_pending: 8, t_approved: 18, t_rejected: 3, t_total: 29, u_pending: 112, u_approved: 672, u_rejected: 54, u_total: 838 },
  ],
  "tribunal-report": [
    { id: 1, committee: "Audit Committee", t_pending: 1, t_approved: 4, t_rejected: 0, t_total: 5, u_pending: 18, u_approved: 142, u_rejected: 11, u_total: 171 },
    { id: 2, committee: "Risk Management Committee", t_pending: 2, t_approved: 6, t_rejected: 1, t_total: 9, u_pending: 27, u_approved: 198, u_rejected: 16, u_total: 241 },
    { id: 3, committee: "Shariah Supervisory Committee", t_pending: 0, t_approved: 2, t_rejected: 0, t_total: 2, u_pending: 9, u_approved: 78, u_rejected: 6, u_total: 93 },
    { id: 4, committee: "Nomination & Remuneration Committee", t_pending: 3, t_approved: 8, t_rejected: 1, t_total: 12, u_pending: 41, u_approved: 268, u_rejected: 21, u_total: 330 },
    { id: 5, committee: "HR Committee", t_pending: 1, t_approved: 3, t_rejected: 0, t_total: 4, u_pending: 13, u_approved: 98, u_rejected: 8, u_total: 119 },
    { id: 6, committee: "IT Steering Committee", t_pending: 2, t_approved: 5, t_rejected: 1, t_total: 8, u_pending: 24, u_approved: 168, u_rejected: 13, u_total: 205 },
    { id: 7, committee: "Board of Directors", t_pending: 1, t_approved: 3, t_rejected: 0, t_total: 4, u_pending: 14, u_approved: 108, u_rejected: 9, u_total: 131 },
    { id: 8, committee: "Executive Committee", t_pending: 4, t_approved: 9, t_rejected: 2, t_total: 15, u_pending: 48, u_approved: 312, u_rejected: 24, u_total: 384 },
  ],
  "payment-demand-report": [
    { id: 1, committee: "Board of Directors", meeting_id: "MTG-2026-001", meeting_title: "344th Board Meeting", meeting_year: "2026", original_demand: "৳4,80,00,000", penalty: "৳48,00,000", total_demand: "৳5,28,00,000", payment_amount: "৳5,28,00,000", outstanding: "৳0", payment_status: "Approved" },
    { id: 2, committee: "Executive Committee", meeting_id: "MTG-2026-002", meeting_title: "128th Executive Committee Meeting", meeting_year: "2026", original_demand: "৳12,50,00,000", penalty: "৳1,25,00,000", total_demand: "৳13,75,00,000", payment_amount: "৳8,00,00,000", outstanding: "৳5,75,00,000", payment_status: "Pending" },
    { id: 3, committee: "Audit Committee", meeting_id: "MTG-2026-003", meeting_title: "56th Audit Committee Meeting", meeting_year: "2026", original_demand: "৳2,20,00,000", penalty: "৳22,00,000", total_demand: "৳2,42,00,000", payment_amount: "৳0", outstanding: "৳2,42,00,000", payment_status: "Under Review" },
    { id: 4, committee: "Risk Management Committee", meeting_id: "MTG-2026-004", meeting_title: "42nd Risk Committee Meeting", meeting_year: "2026", original_demand: "৳28,40,00,000", penalty: "৳2,84,00,000", total_demand: "৳31,24,00,000", payment_amount: "৳31,24,00,000", outstanding: "৳0", payment_status: "Approved" },
    { id: 5, committee: "Shariah Supervisory Committee", meeting_id: "MTG-2026-005", meeting_title: "38th Shariah Committee Meeting", meeting_year: "2026", original_demand: "৳1,60,00,000", penalty: "৳16,00,000", total_demand: "৳1,76,00,000", payment_amount: "৳1,76,00,000", outstanding: "৳0", payment_status: "Approved" },
    { id: 6, committee: "Nomination & Remuneration Committee", meeting_id: "MTG-2026-006", meeting_title: "29th NRC Meeting", meeting_year: "2026", original_demand: "৳68,00,000", penalty: "৳0", total_demand: "৳68,00,000", payment_amount: "৳30,00,000", outstanding: "৳38,00,000", payment_status: "Pending" },
    { id: 7, committee: "HR Committee", meeting_id: "MTG-2026-007", meeting_title: "Board Strategy Session", meeting_year: "2026", original_demand: "৳45,00,00,000", penalty: "৳4,50,00,000", total_demand: "৳49,50,00,000", payment_amount: "৳0", outstanding: "৳49,50,00,000", payment_status: "Under Review" },
    { id: 8, committee: "IT Steering Committee", meeting_id: "MTG-2026-008", meeting_title: "15th IT Steering Meeting", meeting_year: "2026", original_demand: "৳18,90,00,000", penalty: "৳1,89,00,000", total_demand: "৳20,79,00,000", payment_amount: "৳20,79,00,000", outstanding: "৳0", payment_status: "Approved" },
  ],
  "return-view-approval": [
    { id: 1, committee: "Board of Directors", meeting_id: "MTG-2026-0344", meeting_title: "344th Board Meeting", meeting_year: "2026", meeting_type: "Regular", requested_by: "Md. Rafiqul Islam", request_date: "2026-05-20", approval_status: "Pending Approval" },
    { id: 2, committee: "Executive Committee", meeting_id: "MTG-2026-0128", meeting_title: "128th Executive Committee Meeting", meeting_year: "2026", meeting_type: "Regular", requested_by: "Nasrin Akhter", request_date: "2026-05-21", approval_status: "Approved" },
    { id: 3, committee: "Audit Committee", meeting_id: "MTG-2026-0056", meeting_title: "56th Audit Committee Meeting", meeting_year: "2026", meeting_type: "Regular", requested_by: "A.K.M. Hossain", request_date: "2026-05-19", approval_status: "Approved" },
    { id: 4, committee: "Risk Management Committee", meeting_id: "MTG-2026-0042", meeting_title: "42nd Risk Committee Meeting", meeting_year: "2026", meeting_type: "Special", requested_by: "Farzana Rahman", request_date: "2026-05-22", approval_status: "Rejected" },
    { id: 5, committee: "Shariah Supervisory Committee", meeting_id: "MTG-2026-0038", meeting_title: "38th Shariah Committee Meeting", meeting_year: "2026", meeting_type: "Regular", requested_by: "Kamal Uddin Ahmed", request_date: "2026-05-23", approval_status: "Pending Approval" },
    { id: 6, committee: "Nomination & Remuneration Committee", meeting_id: "MTG-2026-0029", meeting_title: "29th NRC Meeting", meeting_year: "2026", meeting_type: "Regular", requested_by: "Md. Shahidul Haque", request_date: "2026-05-18", approval_status: "Approved" },
    { id: 7, committee: "HR Committee", meeting_id: "MTG-2026-0015", meeting_title: "Board Strategy Session", meeting_year: "2026", meeting_type: "Emergency", requested_by: "Roksana Parvin", request_date: "2026-05-21", approval_status: "Pending Approval" },
    { id: 8, committee: "IT Steering Committee", meeting_id: "MTG-2026-0010", meeting_title: "15th IT Steering Meeting", meeting_year: "2026", meeting_type: "Regular", requested_by: "Md. Rafiqul Islam", request_date: "2026-05-20", approval_status: "Approved" },
  ],
  "register-5-report": [
    { id: 1, committee: "Audit Committee", t_filed: 8, t_processed: 6, t_pending: 2, t_total: 8, t_revenue: "12,40,000", u_filed: 542, u_processed: 498, u_pending: 44, u_total: 542, u_revenue: "8,42,60,000" },
    { id: 2, committee: "Risk Management Committee", t_filed: 12, t_processed: 10, t_pending: 2, t_total: 12, t_revenue: "18,60,000", u_filed: 784, u_processed: 721, u_pending: 63, u_total: 784, u_revenue: "12,18,40,000" },
    { id: 3, committee: "Shariah Supervisory Committee", t_filed: 5, t_processed: 4, t_pending: 1, t_total: 5, t_revenue: "7,80,000", u_filed: 341, u_processed: 312, u_pending: 29, u_total: 341, u_revenue: "5,24,10,000" },
    { id: 4, committee: "Nomination & Remuneration Committee", t_filed: 15, t_processed: 13, t_pending: 2, t_total: 15, t_revenue: "24,20,000", u_filed: 1024, u_processed: 941, u_pending: 83, u_total: 1024, u_revenue: "15,81,60,000" },
    { id: 5, committee: "HR Committee", t_filed: 7, t_processed: 6, t_pending: 1, t_total: 7, t_revenue: "10,90,000", u_filed: 468, u_processed: 428, u_pending: 40, u_total: 468, u_revenue: "7,21,80,000" },
    { id: 6, committee: "IT Steering Committee", t_filed: 10, t_processed: 9, t_pending: 1, t_total: 10, t_revenue: "15,60,000", u_filed: 681, u_processed: 624, u_pending: 57, u_total: 681, u_revenue: "10,48,20,000" },
    { id: 7, committee: "Board of Directors", t_filed: 6, t_processed: 5, t_pending: 1, t_total: 6, t_revenue: "9,30,000", u_filed: 412, u_processed: 378, u_pending: 34, u_total: 412, u_revenue: "6,34,80,000" },
    { id: 8, committee: "Executive Committee", t_filed: 14, t_processed: 12, t_pending: 2, t_total: 14, t_revenue: "21,80,000", u_filed: 941, u_processed: 864, u_pending: 77, u_total: 941, u_revenue: "14,52,30,000" },
  ],
};

export const MOCK_ROLES: SystemRole[] = [
  { id: "r1",  name: "System Administrator", description: "Full system access with all permissions",           level: "Super Admin",       status: "Active",   usersCount: 2,  permissions: ALL_PERM_IDS },
  { id: "r2",  name: "Board Chairman",        description: "Board meeting oversight and governance",            level: "Admin",             status: "Active",   usersCount: 5,  permissions: ["home_dashboard","home_overview","mtg_view","mtg_approve","agd_view","agd_approve","dec_view","dec_approve","res_view","res_approve","act_view","gov_body_view","gov_group_view","gov_org_view","arc_view","rep_meeting","rep_decisions","rep_governance","rep_export","rep_print","admin_users","admin_users_add","admin_roles"] },
  { id: "r3",  name: "Board Director",        description: "Director-level board participation and governance", level: "Board Director",    status: "Active",   usersCount: 8,  permissions: ["home_dashboard","home_overview","mtg_view","mtg_approve","agd_view","agd_approve","dec_view","dec_approve","res_view","res_approve","act_view","gov_body_view","gov_group_view","gov_org_view","arc_view","rep_meeting","rep_decisions","rep_governance","rep_export","rep_print"] },
  { id: "r4",  name: "Committee Chair",       description: "Senior committee management and meeting administration", level: "Meeting Secretary", status: "Active", usersCount: 15, permissions: ["home_dashboard","home_overview","home_my_tasks","mtg_view","mtg_create","mtg_update","mtg_approve","mtg_participants","mtg_rsvp","mtg_attendance","agd_submit","agd_review","agd_approve","agd_view","doc_upload","doc_view","doc_download","doc_edit","doc_comment","doc_review","doc_approve","doc_publish","dec_record","dec_view","dec_approve","res_create","res_view","res_approve","act_create","act_view","act_update","act_close","min_create","min_approve","gov_body_view","gov_group_view","gov_org_view","arc_view","rep_meeting","rep_decisions","rep_attendance","rep_export","rep_print"] },
  { id: "r5",  name: "Meeting Secretary",     description: "Standard meeting secretariat operations",          level: "Meeting Secretary", status: "Active",   usersCount: 42, permissions: ["home_dashboard","home_overview","home_my_tasks","home_my_calendar","mtg_view","mtg_create","mtg_update","mtg_participants","mtg_rsvp","mtg_attendance","mtg_poll","agd_submit","agd_review","agd_view","doc_upload","doc_view","doc_download","doc_edit","doc_comment","dec_record","dec_view","res_create","res_view","act_create","act_view","act_update","act_close","min_create","gov_body_view","gov_group_view","arc_view","rep_meeting","rep_actions","rep_attendance"] },
  { id: "r6",  name: "Meeting Data Entry",    description: "Data entry for meeting materials and documents",   level: "Data Entry Operator", status: "Active", usersCount: 18, permissions: ["home_dashboard","mtg_view","agd_view","doc_view","doc_download","doc_upload","dec_view","act_view"] },
  { id: "r7",  name: "Governance Officer",    description: "Governance body and organisation unit management", level: "Data Entry Operator", status: "Active", usersCount: 6,  permissions: ["home_dashboard","home_overview","gov_body_view","gov_body_manage","gov_group_view","gov_group_manage","gov_org_view","gov_org_manage","mtg_view","agd_view","dec_view","res_view","act_view","arc_view","rep_governance"] },
  { id: "r8",  name: "Report Analyst",        description: "Read-only access to all reports and archive",      level: "Viewer",            status: "Active",   usersCount: 12, permissions: ["home_dashboard","home_overview","mtg_view","agd_view","dec_view","res_view","act_view","arc_view","arc_export","rep_meeting","rep_decisions","rep_actions","rep_attendance","rep_governance","rep_export","rep_print"] },
  { id: "r9",  name: "Governance Reviewer",   description: "Read-only review of governance and decisions",     level: "Meeting Secretary", status: "Active",   usersCount: 9,  permissions: ["home_dashboard","home_overview","gov_body_view","gov_group_view","gov_org_view","mtg_view","agd_view","dec_view","res_view","act_view","arc_view","rep_governance","rep_decisions"] },
  { id: "r10", name: "Read Only Viewer",      description: "Dashboard and basic view access only",             level: "Viewer",            status: "Inactive", usersCount: 3,  permissions: ["home_dashboard","home_overview","mtg_view","agd_view"] },
];
export const MOCK_USERS: SystemUser[] = [
  { id: "u1", name: "Aminul Islam", employeeId: "EMP-001", email: "aminul@nccbank.com.bd", phone: "01711-000001", designation: "Board Chairman", circle: "Board Secretariat", zone: "Convay", level: "Admin", role: "Board Chairman", status: "Active", lastActive: "2026-05-24", sendInvite: true, twoFA: true, accountActive: true },
  { id: "u2", name: "Rashida Khanam", employeeId: "EMP-002", email: "rashida@nccbank.com.bd", phone: "01711-000002", designation: "Board Director", circle: "Audit Committee", zone: "Convay", level: "Board Director", role: "Board Director", status: "Active", lastActive: "2026-05-23", sendInvite: true, twoFA: true, accountActive: true },
  { id: "u3", name: "Mizanur Rahman", employeeId: "EMP-003", email: "mizanur@nccbank.com.bd", phone: "01711-000003", designation: "Meeting Secretary", circle: "Risk Management Committee", zone: "Convay", level: "Meeting Secretary", role: "Committee Chair", status: "Active", lastActive: "2026-05-22", sendInvite: false, twoFA: false, accountActive: true },
  { id: "u4", name: "Fatema Begum", employeeId: "EMP-004", email: "fatema@nccbank.com.bd", phone: "01711-000004", designation: "Meeting Secretary", circle: "Executive Committee", zone: "Convay", level: "Meeting Secretary", role: "Meeting Secretary", status: "Active", lastActive: "2026-05-21", sendInvite: false, twoFA: false, accountActive: true },
  { id: "u5", name: "Jahangir Alam", employeeId: "EMP-005", email: "jahangir@nccbank.com.bd", phone: "01711-000005", designation: "Meeting Coordinator", circle: "Board Secretariat", zone: "Convay", level: "Data Entry Operator", role: "Meeting Data Entry", status: "Inactive", lastActive: "2026-04-15", sendInvite: false, twoFA: false, accountActive: false },
  { id: "u6", name: "Sabrina Sultana", employeeId: "EMP-006", email: "sabrina@nccbank.com.bd", phone: "01711-000006", designation: "Data Entry Operator", circle: "Board Secretariat", zone: "Convay", level: "Data Entry Operator", role: "Stock Manager", status: "Active", lastActive: "2026-05-24", sendInvite: false, twoFA: false, accountActive: true },
  { id: "u7", name: "Kamal Hossain", employeeId: "EMP-007", email: "kamal@nccbank.com.bd", phone: "01711-000007", designation: "Committee Member", circle: "Nomination Committee", zone: "Convay", level: "Meeting Secretary", role: "Case Manager", status: "Active", lastActive: "2026-05-20", sendInvite: false, twoFA: true, accountActive: true },
  { id: "u8", name: "Nilufer Yasmin", employeeId: "EMP-008", email: "nilufer@nccbank.com.bd", phone: "01711-000008", designation: "Meeting Secretary", circle: "Audit Committee", zone: "Convay", level: "Meeting Secretary", role: "Meeting Secretary", status: "Pending", lastActive: "Never", sendInvite: false, twoFA: false, accountActive: false },
  { id: "u9", name: "Rafiqul Islam", employeeId: "EMP-009", email: "rafiqul.islam@nccbank.com.bd", phone: "01711-000009", designation: "Meeting Secretary", circle: "Board Secretariat", zone: "Convay", level: "Viewer", role: "Report Analyst", status: "Active", lastActive: "2026-05-18", sendInvite: false, twoFA: false, accountActive: true },
  { id: "u10", name: "Hasina Parvin", employeeId: "EMP-010", email: "hasina@nccbank.com.bd", phone: "01711-000010", designation: "Office Assistant", circle: "Board Secretariat", zone: "Convay", level: "Data Entry Operator", role: "Meeting Data Entry", status: "Inactive", lastActive: "2026-03-10", sendInvite: false, twoFA: false, accountActive: false },
  { id: "u11", name: "Shahidul Haque", employeeId: "EMP-011", email: "shahidul@nccbank.com.bd", phone: "01711-000011", designation: "Board Director", circle: "Risk Management Committee", zone: "Convay", level: "Board Director", role: "Board Director", status: "Active", lastActive: "2026-05-23", sendInvite: true, twoFA: true, accountActive: true },
  { id: "u12", name: "Monira Akter", employeeId: "EMP-012", email: "monira@nccbank.com.bd", phone: "01711-000012", designation: "Data Entry Operator", circle: "Executive Committee", zone: "Convay", level: "Data Entry Operator", role: "Stock Manager", status: "Active", lastActive: "2026-05-22", sendInvite: false, twoFA: false, accountActive: true },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "approval",
    priority: "high",
    title: "Agenda submission pending approval",
    message: "3 agenda submissions require your approval for the 344th Board Meeting",
    module: "Agenda & Documents",
    time: "5 minutes ago",
    isRead: false,
    destination: { main: "agenda-documents", sub: "agenda-management" },
  },
  {
    id: "n2",
    type: "assignment",
    priority: "medium",
    title: "Action item assigned to you",
    message: "New action item ACT-2026-071 has been assigned to you",
    module: "Decisions & Follow-up",
    time: "2 hours ago",
    isRead: false,
    destination: { main: "decisions-followup", sub: "action-items" },
  },
  {
    id: "n3",
    type: "correction",
    priority: "medium",
    title: "Resolution revision requested",
    message: "Revision requested on RES-2026-044 before final approval",
    module: "Decisions & Follow-up",
    time: "3 hours ago",
    isRead: false,
    destination: { main: "decisions-followup", sub: "resolutions" },
  },
  {
    id: "n4",
    type: "approval",
    priority: "high",
    title: "Workflow approval required",
    message: "Approval Rules workflow step is pending your action",
    module: "Administration",
    time: "4 hours ago",
    isRead: false,
    destination: { main: "administration", sub: "workflows", third: "approval-rules" },
  },
  {
    id: "n5",
    type: "status",
    priority: "low",
    title: "Meeting published",
    message: "Meeting MTG-2026-0344 has been published and invitations sent",
    module: "Meetings",
    time: "Yesterday",
    isRead: true,
    destination: { main: "meetings", sub: "meeting-overview" },
  },
  {
    id: "n6",
    type: "status",
    priority: "medium",
    title: "Board pack ready for review",
    message: "BPK-2026-0344-V2 is ready for your review",
    module: "Agenda & Documents",
    time: "Yesterday",
    isRead: true,
    destination: { main: "agenda-documents", sub: "board-packs" },
  },
  {
    id: "n7",
    type: "security",
    priority: "high",
    title: "New login from unrecognized device",
    message: "A login was detected from a new device. Verify in Security & Retention.",
    module: "Administration",
    time: "2 days ago",
    isRead: true,
    destination: { main: "administration", sub: "security-retention", third: "security-policies" },
  },
];
