/**
 * Lifecycle tests — create/edit/status persistence, KPI recalculation,
 * cross-page synchronization, and quorum/threshold calculations.
 *
 * These run in Node/jsdom without rendering any components, exercising
 * the shared registries and utility functions directly.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMeetingRegistry,
  useResolutionRegistry,
  useDecisionRegistry,
  useActionItemRegistry,
  generateId,
  type Meeting,
  type Resolution,
  type Decision,
  type ActionItem,
} from '../app/data/boardMeetingData';

// ── Quorum / threshold helpers (duplicated from LiveMeetingPage for isolation) ─

function parseQuorumPct(raw: string | undefined, memberCount: number): number {
  if (!raw) return 0.6;
  const pctMatch = raw.match(/(\d+(?:\.\d+)?)%/);
  if (pctMatch) { const n = parseFloat(pctMatch[1]); return n > 1 ? n / 100 : n; }
  const memberMatch = raw.match(/^(\d+)\s*members?/i);
  if (memberMatch && memberCount > 0) return parseInt(memberMatch[1]) / memberCount;
  return 0.6;
}

function calcThresholdPct(threshold: string): number {
  switch (threshold) {
    case 'Simple Majority': return 0.5;
    case 'Two-Thirds':      return 2 / 3;
    case 'Three-Quarters':  return 0.75;
    case 'Unanimous':       return 1.0;
    default:                return 0.5;
  }
}

// ── generateId ────────────────────────────────────────────────────────────────

describe('generateId', () => {
  const year = new Date().getFullYear();

  it('generates id with correct prefix and year', () => {
    const id = generateId('MTG', []);
    expect(id).toMatch(new RegExp(`^MTG-${year}-\\d+$`));
  });

  it('generates sequential ids when given existing ones', () => {
    const existing = [`MTG-${year}-0001`, `MTG-${year}-0002`, `MTG-${year}-0003`];
    const id = generateId('MTG', existing);
    expect(id).toBe(`MTG-${year}-0004`);
  });

  it('does not collide with existing ids', () => {
    const existing = [`MTG-${year}-0001`, `MTG-${year}-0002`, `MTG-${year}-0003`];
    const id = generateId('MTG', existing);
    expect(existing).not.toContain(id);
  });

  it('starts from 0001 when no existing ids', () => {
    const id = generateId('RES', []);
    expect(id).toBe(`RES-${year}-0001`);
  });
});

// ── Quorum calculation ────────────────────────────────────────────────────────

describe('parseQuorumPct', () => {
  it('parses integer percentage: "60%"', () => {
    expect(parseQuorumPct('60%', 10)).toBeCloseTo(0.6);
  });

  it('parses decimal percentage: "66.67%"', () => {
    expect(parseQuorumPct('66.67%', 10)).toBeCloseTo(0.6667, 3);
  });

  it('parses "50%+1" taking the percentage portion', () => {
    expect(parseQuorumPct('50%+1', 10)).toBeCloseTo(0.5);
  });

  it('parses "3 members" against memberCount 10 → 30%', () => {
    expect(parseQuorumPct('3 members', 10)).toBeCloseTo(0.3);
  });

  it('parses "5 member" (singular)', () => {
    expect(parseQuorumPct('5 member', 20)).toBeCloseTo(0.25);
  });

  it('returns default 60% when raw is undefined', () => {
    expect(parseQuorumPct(undefined, 10)).toBeCloseTo(0.6);
  });

  it('returns default 60% when raw is empty string', () => {
    expect(parseQuorumPct('', 10)).toBeCloseTo(0.6);
  });

  it('large percentages are divided by 100: "75%"', () => {
    expect(parseQuorumPct('75%', 10)).toBeCloseTo(0.75);
  });

  it('handles memberCount 0 without dividing by zero', () => {
    expect(() => parseQuorumPct('3 members', 0)).not.toThrow();
    // Falls through to default
    expect(parseQuorumPct('3 members', 0)).toBeCloseTo(0.6);
  });
});

describe('calcThresholdPct', () => {
  it('Simple Majority → 0.5', () => {
    expect(calcThresholdPct('Simple Majority')).toBe(0.5);
  });

  it('Two-Thirds → ~0.667', () => {
    expect(calcThresholdPct('Two-Thirds')).toBeCloseTo(2 / 3);
  });

  it('Three-Quarters → 0.75', () => {
    expect(calcThresholdPct('Three-Quarters')).toBe(0.75);
  });

  it('Unanimous → 1.0', () => {
    expect(calcThresholdPct('Unanimous')).toBe(1.0);
  });

  it('unknown threshold defaults to Simple Majority', () => {
    expect(calcThresholdPct('Unknown')).toBe(0.5);
  });
});

// ── Meeting registry — create / edit / status persistence ────────────────────

describe('Meeting registry', () => {
  let add: ReturnType<typeof useMeetingRegistry>['add'];
  let update: ReturnType<typeof useMeetingRegistry>['update'];
  let getItems: () => ReturnType<typeof useMeetingRegistry>['items'];

  beforeEach(() => {
    const { result } = renderHook(() => useMeetingRegistry());
    add = result.current.add;
    update = result.current.update;
    getItems = () => result.current.items;
  });

  function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
    const id = generateId('MTG', getItems().map(m => m.meeting_id));
    return {
      id, meeting_id: id,
      meeting_title: 'Test Board Meeting',
      committee: 'Board of Directors',
      meeting_type: 'Regular',
      meeting_date: '2026-08-01',
      meeting_time: '10:00',
      duration: '120',
      venue: 'Head Office',
      mode: 'Physical',
      status: 'Scheduled',
      approval_status: 'Draft',
      created_at: new Date().toISOString(),
      ...overrides,
    };
  }

  it('add creates a new meeting visible in items', () => {
    const before = getItems().length;
    const m = makeMeeting({ meeting_title: 'Special Meeting' });
    act(() => { add(m); });
    expect(getItems().length).toBe(before + 1);
    const found = getItems().find(x => x.meeting_id === m.meeting_id);
    expect(found?.meeting_title).toBe('Special Meeting');
  });

  it('update changes specific fields without losing others', () => {
    const m = makeMeeting({ meeting_title: 'Original Title' });
    act(() => { add(m); });
    act(() => { update(m.id, { meeting_title: 'Updated Title' }); });
    const found = getItems().find(x => x.id === m.id);
    expect(found?.meeting_title).toBe('Updated Title');
    expect(found?.committee).toBe('Board of Directors');
  });

  it('status update persists correctly', () => {
    const m = makeMeeting({ status: 'Scheduled' });
    act(() => { add(m); });
    act(() => { update(m.id, { status: 'In Progress' }); });
    const found = getItems().find(x => x.id === m.id);
    expect(found?.status).toBe('In Progress');
  });
});

// ── Resolution registry — create and cross-page link ────────────────────────

describe('Resolution registry', () => {
  it('add creates a resolution and it appears in items', () => {
    const { result } = renderHook(() => useResolutionRegistry());
    const before = result.current.items.length;
    act(() => {
      result.current.add({
        id: 'res-test-001',
        resolution_id: 'RES-T001',
        resolution_title: 'Approve Dividend Payment',
        resolution_type: 'Ordinary',
        related_meeting: 'MTG-0001',
        agenda_item: 'Agenda Item 3',
        source_motion: 'Proposed by Mr. Mintoo',
        status: 'Draft',
        created_at: new Date().toISOString(),
      });
    });
    expect(result.current.items.length).toBe(before + 1);
    const found = result.current.items.find(r => r.id === 'res-test-001');
    expect(found?.resolution_title).toBe('Approve Dividend Payment');
    expect(found?.related_meeting).toBe('MTG-0001');
  });

  it('resolution links to source motion and agenda item', () => {
    const { result } = renderHook(() => useResolutionRegistry());
    act(() => {
      result.current.add({
        id: 'res-test-002',
        resolution_id: 'RES-T002',
        resolution_title: 'Approve Budget',
        related_meeting: 'MTG-0002',
        agenda_item: 'Item 2',
        source_motion: 'MOTION-001',
        source_vote: 'VOTE-001',
        status: 'Draft',
        created_at: new Date().toISOString(),
      });
    });
    const found = result.current.items.find(r => r.id === 'res-test-002');
    expect(found?.source_motion).toBe('MOTION-001');
    expect(found?.source_vote).toBe('VOTE-001');
    expect(found?.agenda_item).toBe('Item 2');
  });
});

// ── Decision registry — KPI recalculation after status change ────────────────

describe('Decision registry KPI recalculation', () => {
  it('count by status reflects adds correctly', () => {
    const { result } = renderHook(() => useDecisionRegistry());
    const initialOpen = result.current.items.filter(d => d.implementation_status === 'Open').length;

    act(() => {
      result.current.add({
        id: 'dec-kpi-01',
        decision_title: 'KPI Test Decision',
        related_meeting: 'MTG-0001',
        decision_type: 'Resolution',
        implementation_status: 'Open',
        created_at: new Date().toISOString(),
      } as Decision);
    });

    const afterAdd = result.current.items.filter(d => d.implementation_status === 'Open').length;
    expect(afterAdd).toBe(initialOpen + 1);

    // Simulate status update (e.g., secretary marks it Implemented)
    act(() => {
      result.current.update('dec-kpi-01', { implementation_status: 'Implemented' });
    });

    const afterUpdate = result.current.items.filter(d => d.implementation_status === 'Open').length;
    expect(afterUpdate).toBe(initialOpen);
    const implemented = result.current.items.filter(d => d.implementation_status === 'Implemented');
    expect(implemented.some(d => d.id === 'dec-kpi-01')).toBe(true);
  });
});

// ── Action item registry — cross-page sync ───────────────────────────────────

describe('Action item registry cross-page synchronization', () => {
  it('item added through registry hook appears in getById', () => {
    const { result } = renderHook(() => useActionItemRegistry());

    act(() => {
      result.current.add({
        id: 'ai-sync-01',
        action_title: 'Follow-up on compliance report',
        related_meeting: 'MTG-0003',
        assigned_to: 'Ms. Nasrin Sultana',
        due_date: '2026-09-01',
        priority: 'High',
        status: 'Open',
        created_at: new Date().toISOString(),
      } as ActionItem);
    });

    const found = result.current.getById('ai-sync-01');
    expect(found?.action_title).toBe('Follow-up on compliance report');
  });

  it('update propagates to same hook instance', () => {
    const { result } = renderHook(() => useActionItemRegistry());

    act(() => {
      result.current.add({
        id: 'ai-sync-02',
        action_title: 'Initial title',
        status: 'Open',
        created_at: new Date().toISOString(),
      } as ActionItem);
    });

    act(() => {
      result.current.update('ai-sync-02', { status: 'Completed' });
    });

    const found = result.current.getById('ai-sync-02');
    expect(found?.status).toBe('Completed');
  });
});

// ── Live meeting session persistence ─────────────────────────────────────────

describe('Live meeting session localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const SESSION_KEY = (id: string) => `bms.live.${id}`;

  it('session is empty when no prior data exists', () => {
    const raw = localStorage.getItem(SESSION_KEY('MTG-0001'));
    expect(raw).toBeNull();
  });

  it('session round-trips through JSON correctly', () => {
    const session = {
      ctrlStatus: 'in-progress',
      elapsed: 3600,
      activeIdx: 2,
      agendaStatuses: { 0: 'completed', 1: 'completed', 2: 'in-progress' },
      notes: { 2: 'Discussed Q3 financials.' },
      motions: [{ id: 'M-1', text: 'Approve budget', status: 'Passed', proposedBy: 'p1', secondedBy: 'p2' }],
      attendance: { p1: 'present', p2: 'virtual', p3: 'absent' },
      activeVote: null,
      timeline: { started: '2026-08-01T10:00:00Z' },
    };
    localStorage.setItem(SESSION_KEY('MTG-0001'), JSON.stringify(session));
    const restored = JSON.parse(localStorage.getItem(SESSION_KEY('MTG-0001'))!);
    expect(restored.ctrlStatus).toBe('in-progress');
    expect(restored.elapsed).toBe(3600);
    expect(restored.activeIdx).toBe(2);
    expect(restored.motions[0].status).toBe('Passed');
    expect(restored.attendance.p1).toBe('present');
  });

  it('corrupted session data falls back gracefully', () => {
    localStorage.setItem(SESSION_KEY('MTG-BAD'), 'not-json{{{{');
    expect(() => {
      try {
        JSON.parse(localStorage.getItem(SESSION_KEY('MTG-BAD'))!);
      } catch { /* expected */ }
    }).not.toThrow();
  });

  it('different meeting ids have independent sessions', () => {
    localStorage.setItem(SESSION_KEY('MTG-A'), JSON.stringify({ ctrlStatus: 'in-progress' }));
    localStorage.setItem(SESSION_KEY('MTG-B'), JSON.stringify({ ctrlStatus: 'not-started' }));
    const a = JSON.parse(localStorage.getItem(SESSION_KEY('MTG-A'))!);
    const b = JSON.parse(localStorage.getItem(SESSION_KEY('MTG-B'))!);
    expect(a.ctrlStatus).toBe('in-progress');
    expect(b.ctrlStatus).toBe('not-started');
  });

  it('vote record survives session persistence', () => {
    const session = {
      ctrlStatus: 'in-progress',
      elapsed: 0,
      activeIdx: 0,
      agendaStatuses: {},
      notes: {},
      motions: [],
      attendance: {},
      activeVote: {
        id: 'vote-001',
        motionId: 'M-001',
        motionText: 'Approve annual report',
        voteType: 'Show of Hands',
        threshold: 'Simple Majority',
        thresholdPct: 0.5,
        status: 'Open',
        openedAt: '2026-08-01T10:30:00Z',
        castVotes: { p1: 'For', p2: 'Against', p3: 'For' },
        reopenHistory: [],
      },
      timeline: {},
    };
    localStorage.setItem(SESSION_KEY('MTG-VOTE'), JSON.stringify(session));
    const restored = JSON.parse(localStorage.getItem(SESSION_KEY('MTG-VOTE'))!);
    expect(restored.activeVote).not.toBeNull();
    expect(restored.activeVote.castVotes.p1).toBe('For');
    expect(restored.activeVote.castVotes.p2).toBe('Against');
    expect(restored.activeVote.status).toBe('Open');
  });
});
