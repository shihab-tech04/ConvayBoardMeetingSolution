import { describe, it, expect, beforeEach } from 'vitest';
import {
  addApplication,
  getApplications,
  getKpiTotals,
  approveApplication,
  rejectApplication,
  SRConflictError,
  resetStore,
  type SpecialRegistrationApplication,
} from '../app/services/repositories/specialRegistrationRepository';

function makeApp(overrides: Partial<SpecialRegistrationApplication> = {}): SpecialRegistrationApplication {
  const now = new Date().toISOString();
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    applicationNumber: 'SR-EXT-20260714-0001',
    applicantName: 'Test Participant',
    organization: 'Test Organisation',
    designation: 'Analyst',
    countryCode: 'GB',
    country: 'United Kingdom',
    address: '10 Downing Street',
    phone: '+447700900000',
    email: 'test@example.com',
    documents: [],
    declarationAccepted: true,
    declarationTimestamp: now,
    submittedAt: now,
    status: 'PENDING_REVIEW',
    decisionHistory: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('SpecialRegistrationRepository — Phase 2 data layer', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts empty after reset', () => {
    const result = getApplications();
    expect(result.total).toBe(0);
  });

  it('addApplication adds and is visible via getApplications', () => {
    const app = makeApp();
    addApplication(app);
    const result = getApplications();
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(app.id);
  });

  it('getKpiTotals counts correctly', () => {
    addApplication(makeApp({ status: 'PENDING_REVIEW' }));
    addApplication(makeApp({ status: 'APPROVED' }));
    addApplication(makeApp({ status: 'REJECTED' }));
    const kpis = getKpiTotals();
    expect(kpis.total).toBe(3);
    expect(kpis.pendingReview).toBe(1);
    expect(kpis.approved).toBe(1);
    expect(kpis.rejected).toBe(1);
  });

  it('approveApplication transitions status to APPROVED', async () => {
    const app = makeApp({ id: 'app-approve-test' });
    addApplication(app);
    await approveApplication('app-approve-test', {
      officerId: 'NCC-001',
      officerName: 'Test Officer',
      officerDesignation: 'Meeting Officer',
      approvalNote: 'Looks good',
    });
    const result = getApplications();
    expect(result.items[0].status).toBe('APPROVED');
  });

  it('rejectApplication transitions status to REJECTED', async () => {
    const app = makeApp({ id: 'app-reject-test' });
    addApplication(app);
    await rejectApplication('app-reject-test', {
      officerId: 'NCC-001',
      officerName: 'Test Officer',
      officerDesignation: 'Meeting Officer',
      rejectionReason: 'Document unclear',
    });
    const result = getApplications();
    expect(result.items[0].status).toBe('REJECTED');
  });

  it('throws SRConflictError when approving already-approved application', () => {
    const app = makeApp({ id: 'app-conflict-test', status: 'APPROVED' });
    addApplication(app);
    expect(() =>
      approveApplication('app-conflict-test', {
        officerId: 'NCC-001',
        officerName: 'Test Officer',
        officerDesignation: 'Meeting Officer',
      }),
    ).toThrow(SRConflictError);
  });

  it('filters by search query', () => {
    addApplication(makeApp({ applicantName: 'John Smith', organization: 'Acme Corp' }));
    addApplication(makeApp({ applicantName: 'Jane Doe', organization: 'Globex' }));
    const result = getApplications({ search: 'Acme' });
    expect(result.total).toBe(1);
    expect(result.items[0].applicantName).toBe('John Smith');
  });

  it('filters by status', () => {
    addApplication(makeApp({ status: 'PENDING_REVIEW' }));
    addApplication(makeApp({ status: 'APPROVED' }));
    const result = getApplications({ status: 'APPROVED' });
    expect(result.total).toBe(1);
    expect(result.items[0].status).toBe('APPROVED');
  });
});
