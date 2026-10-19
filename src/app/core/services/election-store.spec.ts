import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import type { ElectionSnapshot } from '../models/election.models';
import { ELECTION_DATA_SOURCE, type ElectionDataSource } from './election-data-source';
import { ElectionStore } from './election-store';

function makeSnapshot(): ElectionSnapshot {
  return {
    election: { name: 'Eleição presidencial', year: 2026, round: 2 },
    status: 'in-progress',
    officialDecision: null,
    source: { mode: 'official', label: 'TSE' },
    results: [
      { candidate: { id: 'one', name: 'Candidata 1' }, validVotePercent: 50.5, votes: 505 },
      { candidate: { id: 'two', name: 'Candidato 2' }, validVotePercent: 49.5, votes: 495 },
    ],
    totals: { validVotes: 1000, totalSections: 10, countedSections: 5, countedSectionsPercent: 50 },
    history: [],
    officialGenerationId: 'generation-1',
    lastSuccessfulQueryAt: new Date('2026-10-25T20:40:00Z'),
    officialUpdatedAt: new Date('2026-10-25T20:39:00Z'),
  };
}

describe('ElectionStore', () => {
  it('shares an in-flight refresh and avoids creating concurrent data requests', async () => {
    const response = new Subject<ElectionSnapshot>();
    let requestCount = 0;
    const source: ElectionDataSource = {
      loadSnapshot: () => {
        requestCount += 1;
        return response.asObservable();
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ELECTION_DATA_SOURCE, useValue: source }],
    });

    const store = TestBed.inject(ElectionStore);
    const concurrentRequest = store.refresh();
    expect(requestCount).toBe(1);

    response.next(makeSnapshot());
    const outcome = await concurrentRequest;

    expect(outcome.kind).toBe('success');
    expect(requestCount).toBe(1);
    expect(store.snapshot()?.results).toHaveLength(2);
  });

  it('keeps the last successful snapshot visible after a later network failure', async () => {
    const firstResponse = new Subject<ElectionSnapshot>();
    let requestCount = 0;
    const source: ElectionDataSource = {
      loadSnapshot: () => {
        requestCount += 1;
        return requestCount === 1 ? firstResponse.asObservable() : throwError(() => new Error('offline'));
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ELECTION_DATA_SOURCE, useValue: source }],
    });

    const store = TestBed.inject(ElectionStore);
    const firstRequest = store.refresh();
    const previous = makeSnapshot();
    firstResponse.next(previous);
    await firstRequest;
    const visibleBeforeFailure = store.snapshot();

    const outcome = await store.refresh();

    expect(requestCount).toBe(2);
    expect(outcome.kind).toBe('error');
    expect(store.snapshot()).toBe(visibleBeforeFailure);
    expect(store.errorMessage()).toContain('Verifique sua conexão');
  });
});
