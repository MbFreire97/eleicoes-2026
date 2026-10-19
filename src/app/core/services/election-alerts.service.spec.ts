import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ElectionSnapshot } from '../models/election.models';
import { AccessibilityPreferences } from './accessibility-preferences';
import { AlertAnnouncer } from './alert-announcer';
import { ElectionAlertsService } from './election-alerts.service';

function makeSnapshot(overrides: Partial<ElectionSnapshot> = {}): ElectionSnapshot {
  return {
    election: { name: 'Eleição presidencial', year: 2026, round: 2 },
    status: 'mathematically-defined',
    officialDecision: 'elected',
    source: { mode: 'official', label: 'TSE' },
    results: [
      { candidate: { id: 'candidate-1', name: 'Nome que não deve ser inferido' }, validVotePercent: 52, votes: 520 },
    ],
    totals: { validVotes: 1000, totalSections: 100, countedSections: 90, countedSectionsPercent: 90 },
    history: [],
    officialGenerationId: 'generation-1',
    lastSuccessfulQueryAt: new Date('2026-10-25T20:40:00-03:00'),
    officialUpdatedAt: new Date('2026-10-25T20:39:00-03:00'),
    ...overrides,
  };
}

describe('ElectionAlertsService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('ignores partial leads and all demonstration decisions', () => {
    const service = TestBed.inject(ElectionAlertsService);
    service.observe(makeSnapshot({ status: 'in-progress', officialDecision: null }));
    service.observe(
      makeSnapshot({
        source: { mode: 'demonstration', label: 'Demonstração' },
      }),
    );

    expect(service.events()).toEqual([]);
    expect(service.latestNotification()).toBeNull();
  });

  it('creates one persistent official alert per defined-result event without inferring a candidate', () => {
    const service = TestBed.inject(ElectionAlertsService);
    const snapshot = makeSnapshot();
    service.observe(snapshot);
    service.observe({ ...snapshot, officialGenerationId: 'generation-2' });

    expect(service.events()).toHaveLength(1);
    expect(service.events()[0].title).toContain('TSE');
    expect(service.events()[0].details).not.toContain('Nome que não deve ser inferido');
    expect(service.latestNotification()?.id).toBe(service.events()[0].id);
    expect(JSON.parse(localStorage.getItem('brasil-decide-2026.official-alerts.v1') ?? '[]')).toHaveLength(1);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(ElectionAlertsService);
    restored.observe(snapshot);

    expect(restored.events()).toHaveLength(1);
    expect(restored.latestNotification()).toBeNull();
  });

  it('speaks only after the sound preference is enabled and never repeats a duplicate event', () => {
    const preferences = TestBed.inject(AccessibilityPreferences);
    const announcer = TestBed.inject(AlertAnnouncer);
    const repeat = vi.spyOn(announcer, 'repeat').mockReturnValue('Reproduzindo.');
    const service = TestBed.inject(ElectionAlertsService);
    const snapshot = makeSnapshot();

    service.observe(snapshot);
    expect(repeat).not.toHaveBeenCalled();

    preferences.setSoundAlerts(true);
    service.observe(makeSnapshot({ election: { name: 'Eleição presidencial', year: 2026, round: 1 } }));
    service.observe(makeSnapshot({ election: { name: 'Eleição presidencial', year: 2026, round: 1 } }));

    expect(repeat).toHaveBeenCalledTimes(1);
  });

  it('records a distinct final-totalization event after a mathematical definition', () => {
    const service = TestBed.inject(ElectionAlertsService);
    service.observe(makeSnapshot());
    service.observe(makeSnapshot({ status: 'final', officialDecision: null }));

    expect(service.events()).toHaveLength(2);
    expect(service.events()[1].status).toBe('final');
  });
});
