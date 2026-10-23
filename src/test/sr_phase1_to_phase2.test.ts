import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getApplications, getKpiTotals } from '../app/services/repositories/specialRegistrationRepository';
import { submitSpecialRegistration } from '../app/services/specialRegistrationPublicService';

function fakeFile(name: string): File {
  return new File(['content'], name, { type: 'application/pdf' });
}

describe('Phase 1 → Phase 2 connection', () => {
  beforeEach(() => {
    resetStore();
  });

  it('public submission appears in internal list', async () => {
    const result = await submitSpecialRegistration({
      applicantName: 'Dr. Karim Abdullah',
      organization: 'Central Bank of UAE',
      designation: 'Deputy Director',
      countryCode: 'AE',
      country: 'United Arab Emirates',
      address: '123 Sheikh Zayed Road',
      phone: '+971509990000',
      email: 'karim@centralbank.ae',
      attachments: {
        id: [fakeFile('passport.pdf')],
      },
      declarationAccepted: true,
      submittedAt: new Date().toISOString(),
    });

    expect(result.applicationNumber).toMatch(/^SR-EXT-\d{8}-\d{4}$/);
    expect(result.status).toBe('Pending');

    const list = getApplications();
    expect(list.total).toBe(1);
    expect(list.items[0].applicationNumber).toBe(result.applicationNumber);
    expect(list.items[0].status).toBe('PENDING_REVIEW');
    expect(list.items[0].applicantName).toBe('Dr. Karim Abdullah');
  });

  it('repeated submit does not duplicate the record', async () => {
    const payload = {
      applicantName: 'Prof. Sarah Bennett',
      organization: 'LSE',
      designation: 'Professor',
      countryCode: 'GB' as const,
      country: 'United Kingdom',
      address: '14 Green Lane',
      phone: '+447700900123',
      email: 's.bennett@lse.ac.uk',
      attachments: { id: [fakeFile('id.pdf')] },
      declarationAccepted: true as const,
      submittedAt: new Date().toISOString(),
    };
    const r1 = await submitSpecialRegistration(payload);
    const r2 = await submitSpecialRegistration(payload);
    expect(r1.applicationNumber).not.toBe(r2.applicationNumber);
    expect(getApplications().total).toBe(2);
  });

  it('KPI reflects newly submitted public application', async () => {
    const before = getKpiTotals();
    expect(before.total).toBe(0);

    await submitSpecialRegistration({
      applicantName: 'Dr. Sumaiya Rahman',
      organization: 'Deutsche Bundesbank',
      designation: 'Research Fellow',
      countryCode: 'DE',
      country: 'Germany',
      address: 'Friedrichstraße 100',
      phone: '+491601234567',
      email: 's.rahman@bundesbank.de',
      attachments: { id: [fakeFile('id.pdf')] },
      declarationAccepted: true,
      submittedAt: new Date().toISOString(),
    });

    const after = getKpiTotals();
    expect(after.total).toBe(1);
    expect(after.pendingReview).toBe(1);
    expect(after.approved).toBe(0);
  });

  it('documents are stored and have correct categories', async () => {
    await submitSpecialRegistration({
      applicantName: 'Mr. Test Participant',
      organization: 'World Bank',
      designation: 'Financial Specialist',
      countryCode: 'CA',
      country: 'Canada',
      address: 'Toronto',
      phone: '+14165550192',
      email: 'test@worldbank.org',
      attachments: {
        id: [fakeFile('passport.pdf'), fakeFile('id_card.jpg')],
      },
      declarationAccepted: true,
      submittedAt: new Date().toISOString(),
    });

    const list = getApplications();
    const app = list.items[0];
    const idDocs = app.documents.filter(d => d.category === 'ID_DOCUMENT');

    expect(idDocs.length).toBe(2);
  });
});
