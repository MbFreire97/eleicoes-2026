export type ElectionRound = 1 | 2;

export type TallyStatus =
  | 'waiting'
  | 'in-progress'
  | 'unavailable'
  | 'mathematically-defined'
  | 'final';

export type ElectionDataMode = 'demonstration' | 'official';

export type OfficialElectionDecision = 'elected' | 'second-round' | null;

export interface ElectionHistoryPoint {
  readonly capturedAt: Date;
  readonly candidatePercentages: Readonly<Record<string, number | null>>;
  readonly candidateNames?: Readonly<Record<string, string>>;
  readonly candidateVotes?: Readonly<Record<string, number | null>>;
  readonly validVotes?: number | null;
  readonly countedSections?: number | null;
  readonly totalSections?: number | null;
  readonly countedSectionsPercent: number | null;
  readonly officialGenerationId?: string | null;
  readonly status?: TallyStatus;
  readonly officialDecision?: OfficialElectionDecision;
}

export interface ElectionCandidate {
  readonly id: string;
  readonly name: string;
  readonly party?: string;
  readonly photoUrl?: string;
}

export interface CandidateResult {
  readonly candidate: ElectionCandidate;
  readonly validVotePercent: number | null;
  readonly votes: number | null;
}

export interface ElectionTotals {
  readonly validVotes: number | null;
  readonly totalSections: number | null;
  readonly countedSections: number | null;
  readonly countedSectionsPercent: number | null;
}

export interface ElectionSnapshot {
  readonly election: {
    readonly name: string;
    readonly year: number;
    readonly round: ElectionRound;
  };
  readonly status: TallyStatus;
  readonly statusMessage?: string;
  readonly officialDecision: OfficialElectionDecision;
  readonly source: {
    readonly mode: ElectionDataMode;
    readonly label: string;
  };
  readonly results: readonly CandidateResult[];
  readonly totals: ElectionTotals;
  readonly history: readonly ElectionHistoryPoint[];
  readonly officialGenerationId: string | null;
  readonly automaticRefreshAfterMs?: number | null;
  readonly lastSuccessfulQueryAt: Date | null;
  readonly officialUpdatedAt: Date | null;
}
