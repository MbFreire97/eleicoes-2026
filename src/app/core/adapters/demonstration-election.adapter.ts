import type {
  CandidateResult,
  ElectionHistoryPoint,
  ElectionRound,
  ElectionSnapshot,
  TallyStatus,
} from '../models/election.models';

export interface DemonstrationElectionSample {
  readonly electionName: string;
  readonly year: number;
  readonly round: ElectionRound;
  readonly status: TallyStatus;
  readonly results: readonly CandidateResult[];
  readonly validVotes: number;
  readonly totalSections: number;
  readonly countedSections: number;
  readonly history: readonly ElectionHistoryPoint[];
}

export function toDemonstrationElectionSnapshot(
  sample: DemonstrationElectionSample,
  createdAt: Date,
): ElectionSnapshot {
  return {
    election: {
      name: sample.electionName,
      year: sample.year,
      round: sample.round,
    },
    status: sample.status,
    statusMessage: 'Amostra sintética para demonstrar a interface; não representa votos reais.',
    officialDecision: null,
    source: {
      mode: 'demonstration',
      label: 'Dados simulados para demonstração',
    },
    results: sample.results,
    totals: {
      validVotes: sample.validVotes,
      totalSections: sample.totalSections,
      countedSections: sample.countedSections,
      countedSectionsPercent: (sample.countedSections / sample.totalSections) * 100,
    },
    history: sample.history,
    officialGenerationId: null,
    lastSuccessfulQueryAt: createdAt,
    officialUpdatedAt: null,
  };
}
