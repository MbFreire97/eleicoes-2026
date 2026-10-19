import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { CandidateResult, ElectionHistoryPoint } from '../models/election.models';
import { toDemonstrationElectionSnapshot } from '../adapters/demonstration-election.adapter';
import type { ElectionSnapshot } from '../models/election.models';
import type { ElectionDataSource } from './election-data-source';

const DEMONSTRATION_SAMPLE = {
  electionName: 'Eleição presidencial',
  year: 2026,
  round: 2,
  status: 'in-progress',
  results: [
    {
      candidate: { id: 'demo-candidate-01', name: 'Candidato de exemplo 1' },
      validVotePercent: 52.3,
      votes: 523_000,
    },
    {
      candidate: { id: 'demo-candidate-02', name: 'Candidata de exemplo 2' },
      validVotePercent: 47.7,
      votes: 477_000,
    },
  ] satisfies readonly CandidateResult[],
  validVotes: 1_000_000,
  totalSections: 10_000,
  countedSections: 7_640,
} as const;

@Injectable({ providedIn: 'root' })
export class DemonstrationElectionDataSource implements ElectionDataSource {
  loadSnapshot(): Observable<ElectionSnapshot> {
    const now = new Date();
    const history = [
      [46.8, 53.2],
      [48.5, 51.5],
      [50.1, 49.9],
      [52.3, 47.7],
    ].map(([first, second], index): ElectionHistoryPoint => ({
      capturedAt: new Date(now.getTime() - (3 - index) * 15 * 60_000),
      candidatePercentages: {
        'demo-candidate-01': first,
        'demo-candidate-02': second,
      },
      countedSectionsPercent: 22.4 + index * 18,
    }));

    return of(toDemonstrationElectionSnapshot({ ...DEMONSTRATION_SAMPLE, history }, now));
  }
}
