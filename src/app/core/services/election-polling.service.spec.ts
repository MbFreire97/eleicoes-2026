import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { ElectionSnapshot } from '../models/election.models';
import { ELECTION_DATA_SOURCE, type ElectionDataSource } from './election-data-source';
import { ElectionPollingService } from './election-polling.service';
import { ElectionStore } from './election-store';

function makeSnapshot(queryAt: Date): ElectionSnapshot {
  return {
    election: { name: 'Eleição presidencial', year: 2026, round: 2 },
    status: 'in-progress',
    officialDecision: null,
    source: { mode: 'official', label: 'TSE' },
    results: [
      { candidate: { id: 'candidate-1', name: 'Candidato 1' }, validVotePercent: 51, votes: 510 },
      { candidate: { id: 'candidate-2', name: 'Candidata 2' }, validVotePercent: 49, votes: 490 },
    ],
    totals: { validVotes: 1000, totalSections: 100, countedSections: 50, countedSectionsPercent: 50 },
    history: [],
    officialGenerationId: 'generation-stable',
    lastSuccessfulQueryAt: queryAt,
    officialUpdatedAt: new Date('2026-10-25T20:39:00-03:00'),
  };
}

function configure(source: ElectionDataSource): void {
  TestBed.configureTestingModule({
    providers: [{ provide: ELECTION_DATA_SOURCE, useValue: source }],
  });
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('ElectionPollingService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('polls every 5 seconds and keeps the same visible snapshot when values did not change', async () => {
    vi.useFakeTimers();
    let requests = 0;
    configure({
      loadSnapshot: () => {
        requests += 1;
        return of(makeSnapshot(new Date(Date.UTC(2026, 9, 25, 20, 0, requests))));
      },
    });

    const store = TestBed.inject(ElectionStore);
    const polling = TestBed.inject(ElectionPollingService);
    polling.start();
    await flushMicrotasks();
    const originalSnapshot = store.snapshot();

    await vi.advanceTimersByTimeAsync(4_999);
    expect(requests).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toBe(2);
    expect(store.snapshot()).toBe(originalSnapshot);
    expect(store.lastSuccessfulQueryAt()?.getTime()).toBeGreaterThan(
      originalSnapshot?.lastSuccessfulQueryAt?.getTime() ?? 0,
    );
  });

  it('uses exponential backoff after failures', async () => {
    vi.useFakeTimers();
    let requests = 0;
    configure({
      loadSnapshot: () => {
        requests += 1;
        return requests <= 2
          ? throwError(() => new Error('offline'))
          : of(makeSnapshot(new Date('2026-10-25T20:00:00Z')));
      },
    });

    TestBed.inject(ElectionStore);
    TestBed.inject(ElectionPollingService).start();
    await flushMicrotasks();
    expect(requests).toBe(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(requests).toBe(2);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(requests).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toBe(3);
  });

  it('pauses timer queries while hidden and refreshes immediately when the tab returns', async () => {
    vi.useFakeTimers();
    const originalDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    let visibility: DocumentVisibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
    let requests = 0;
    configure({
      loadSnapshot: () => {
        requests += 1;
        return of(makeSnapshot(new Date(Date.UTC(2026, 9, 25, 20, 0, requests))));
      },
    });

    try {
      TestBed.inject(ElectionStore);
      TestBed.inject(ElectionPollingService).start();
      await flushMicrotasks();
      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(60_000);
      expect(requests).toBe(1);

      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      await flushMicrotasks();
      expect(requests).toBe(2);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(document, 'visibilityState', originalDescriptor);
      } else {
        Reflect.deleteProperty(document, 'visibilityState');
      }
    }
  });
});
