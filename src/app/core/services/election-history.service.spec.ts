import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ElectionSnapshot } from '../models/election.models';
import { ElectionHistoryService } from './election-history.service';

const STORAGE_KEY = 'brasil-decide-2026.history.v1.2026.2';

function makeSnapshot(overrides: Partial<ElectionSnapshot> = {}): ElectionSnapshot {
  return {
    election: { name: 'Eleição presidencial', year: 2026, round: 2 },
    status: 'in-progress',
    officialDecision: null,
    source: { mode: 'official', label: 'TSE' },
    results: [
      {
        candidate: { id: 'candidate-1', name: 'Candidato 1' },
        validVotePercent: 51.5,
        votes: 515,
      },
      {
        candidate: { id: 'candidate-2', name: 'Candidata 2' },
        validVotePercent: 48.5,
        votes: 485,
      },
    ],
    totals: {
      validVotes: 1000,
      totalSections: 100,
      countedSections: 50,
      countedSectionsPercent: 50,
    },
    history: [],
    officialGenerationId: 'generation-1',
    lastSuccessfulQueryAt: new Date('2026-10-25T20:40:00-03:00'),
    officialUpdatedAt: new Date('2026-10-25T20:39:00-03:00'),
    ...overrides,
  };
}

describe('ElectionHistoryService', () => {
  let service: ElectionHistoryService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ElectionHistoryService);
  });

  it('captures candidate votes and national section progress, then persists the point', () => {
    const capturedAt = new Date('2026-10-25T23:40:00.000Z');
    const history = service.restoreAndCapture(makeSnapshot(), capturedAt);

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      capturedAt,
      candidateNames: { 'candidate-1': 'Candidato 1' },
      candidateVotes: { 'candidate-1': 515 },
      validVotes: 1000,
      countedSections: 50,
      totalSections: 100,
      countedSectionsPercent: 50,
      officialGenerationId: 'generation-1',
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(1);
  });

  it('does not add duplicate content even if the file has a new generation identifier', () => {
    service.restoreAndCapture(makeSnapshot(), new Date('2026-10-25T20:40:00Z'));
    const history = service.restoreAndCapture(
      makeSnapshot({ officialGenerationId: 'generation-2' }),
      new Date('2026-10-25T20:40:30Z'),
    );

    expect(history).toHaveLength(1);
    expect(history[0].officialGenerationId).toBe('generation-1');
  });

  it('restores the saved timeline in chronological order and ignores waiting zero data', () => {
    service.restoreAndCapture(makeSnapshot(), new Date('2026-10-25T20:40:30Z'));
    service.restoreAndCapture(
      makeSnapshot({
        officialGenerationId: 'generation-2',
        totals: { validVotes: 1010, totalSections: 100, countedSections: 51, countedSectionsPercent: 51 },
      }),
      new Date('2026-10-25T20:40:00Z'),
    );
    const waiting = makeSnapshot({
      status: 'waiting',
      results: [],
      totals: { validVotes: null, totalSections: 100, countedSections: 0, countedSectionsPercent: 0 },
      officialGenerationId: null,
      lastSuccessfulQueryAt: null,
      officialUpdatedAt: null,
    });

    const restored = service.restoreAndCapture(waiting, new Date('2026-10-25T20:41:00Z'));

    expect(restored).toHaveLength(2);
    expect(restored[0].capturedAt.getTime()).toBeLessThan(restored[1].capturedAt.getTime());
    expect(restored[0].countedSections).toBe(51);
  });

  it('does not persist demonstration samples as official history', () => {
    const demo = makeSnapshot({
      source: { mode: 'demonstration', label: 'Demonstração' },
      history: [
        {
          capturedAt: new Date(),
          candidatePercentages: { 'candidate-1': 51.5 },
          countedSectionsPercent: 50,
        },
      ],
    });

    expect(service.restoreAndCapture(demo, new Date())).toEqual(demo.history);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps only the most recent 400 captured snapshots', () => {
    let history = service.restoreAndCapture(makeSnapshot(), new Date('2026-10-25T20:00:00Z'));

    for (let index = 1; index <= 405; index += 1) {
      history = service.restoreAndCapture(
        makeSnapshot({
          officialGenerationId: `generation-${index}`,
          results: [
            { candidate: { id: 'candidate-1', name: 'Candidato 1' }, validVotePercent: 51.5, votes: 515 + index },
            { candidate: { id: 'candidate-2', name: 'Candidata 2' }, validVotePercent: 48.5, votes: 485 },
          ],
          totals: {
            validVotes: 1000 + index,
            totalSections: 100,
            countedSections: Math.min(index, 100),
            countedSectionsPercent: Math.min(index, 100),
          },
        }),
        new Date(Date.UTC(2026, 9, 25, 20, 0, index)),
      );
    }

    expect(history).toHaveLength(400);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(400);
  });
});
