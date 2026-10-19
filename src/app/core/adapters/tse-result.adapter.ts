import type {
  CandidateResult,
  ElectionHistoryPoint,
  ElectionRound,
  ElectionSnapshot,
  OfficialElectionDecision,
  TallyStatus,
} from '../models/election.models';

type JsonRecord = Record<string, unknown>;

export interface TseElectionSelection {
  readonly electionId: string;
  readonly cycle: string;
  readonly round: ElectionRound;
  readonly name: string;
  readonly photoDirectory: string | null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function records(value: unknown): readonly JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function localizedNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const raw = text(value);

  if (!raw) {
    return null;
  }

  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/\./g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function hasPresidentInBrazil(election: JsonRecord): boolean {
  return records(election['abr']).some(
    (scope) =>
      text(scope['cd']) === 'br' &&
      records(scope['cp']).some((office) => text(office['cd']) === '1'),
  );
}

function findCandidateElection(
  config: JsonRecord,
  round: ElectionRound,
  cycle: string,
): JsonRecord | null {
  for (const group of records(config['pl'])) {
    if (text(group['c']) !== cycle) {
      continue;
    }

    const found = records(group['e']).find(
      (election) => text(election['t']) === String(round) && hasPresidentInBrazil(election),
    );

    if (found) {
      return found;
    }
  }

  return null;
}

export function findPresidentialElection(
  rawConfig: unknown,
  round: ElectionRound,
  year: number,
  baseUrl: string,
): TseElectionSelection | null {
  if (!isRecord(rawConfig) || text(rawConfig['f']) !== 'o') {
    return null;
  }

  const cycle = `ele${year}`;
  let election = findCandidateElection(rawConfig, round, cycle);

  if (!election && round === 2) {
    const firstRoundElection = findCandidateElection(rawConfig, 1, cycle);
    const secondRoundId = text(firstRoundElection?.['cdt2']);

    if (firstRoundElection && secondRoundId && /^\d{1,6}$/.test(secondRoundId)) {
      election = { ...firstRoundElection, cd: secondRoundId, t: '2' };
    }
  }

  const electionId = text(election?.['cd']);

  if (!electionId || !/^\d{1,6}$/.test(electionId)) {
    return null;
  }

  const photoTemplate = records(rawConfig['arq']).find((entry) => text(entry['tp']) === 'ft');
  const photoDirectoryTemplate = text(photoTemplate?.['dir']);
  const photoDirectory = photoDirectoryTemplate
    ? photoDirectoryTemplate
        .replaceAll('<base>', baseUrl.replace(/\/$/, ''))
        .replaceAll('<ambiente>', 'oficial')
        .replaceAll('<ciclo>', cycle)
        .replaceAll('<cd_eleicao>', electionId)
        .replaceAll('<uf>', 'br')
    : null;

  return {
    electionId,
    cycle,
    round,
    name: text(election?.['nm']) ?? `Eleição presidencial ${year}`,
    photoDirectory,
  };
}

function electionDate(date: unknown, time: unknown): Date | null {
  const dateText = text(date);
  const timeText = text(time);

  if (!dateText) {
    return null;
  }

  const dateParts = dateText.split('/').map(Number);
  const timeParts = timeText?.split(':').map(Number) ?? [0, 0, 0];

  if (dateParts.length !== 3 || [...dateParts, ...timeParts].some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [day, month, year] = dateParts;
  const [hours = 0, minutes = 0, seconds = 0] = timeParts;
  const parsed = new Date(year, month - 1, day, hours, minutes, seconds);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readResults(
  rawCargo: unknown,
  selection: TseElectionSelection,
  canDiscloseVotes: boolean,
): readonly CandidateResult[] {
  const results: Array<{ result: CandidateResult; sequence: number }> = [];

  for (const office of records(rawCargo)) {
    if (text(office['cd']) !== '1') {
      continue;
    }

    for (const aggregation of records(office['agr'])) {
      for (const party of records(aggregation['par'])) {
        for (const rawCandidate of records(party['cand'])) {
          const name = text(rawCandidate['nmu']) ?? text(rawCandidate['nm']);
          const id = text(rawCandidate['sqcand']) ?? text(rawCandidate['n']);

          if (!name || !id) {
            continue;
          }

          const photoId = text(rawCandidate['sqcand']);
          const sequence = localizedNumber(rawCandidate['seq']) ?? Number.MAX_SAFE_INTEGER;
          const result: CandidateResult = {
            candidate: {
              id,
              name,
              party: text(party['sg']) ?? undefined,
              photoUrl:
                photoId && selection.photoDirectory
                  ? `${selection.photoDirectory.replace(/\/$/, '')}/${encodeURIComponent(photoId)}.jpeg`
                  : undefined,
            },
            validVotePercent: canDiscloseVotes
              ? localizedNumber(rawCandidate['pvapn']) ?? localizedNumber(rawCandidate['pvap'])
              : null,
            votes: canDiscloseVotes ? localizedNumber(rawCandidate['vap']) : null,
          };

          results.push({ result, sequence });
        }
      }
    }
  }

  return results
    .sort((left, right) => {
      const leftPercent = left.result.validVotePercent;
      const rightPercent = right.result.validVotePercent;

      if (leftPercent !== null && rightPercent !== null && leftPercent !== rightPercent) {
        return rightPercent - leftPercent;
      }

      return left.sequence - right.sequence;
    })
    .map(({ result }) => result);
}

function determineStatus(
  tallyProgress: string | null,
  finalization: string | null,
  decision: string | null,
): { status: TallyStatus; officialDecision: OfficialElectionDecision } {
  if (finalization === 's') {
    return { status: 'final', officialDecision: decision === 'e' ? 'elected' : null };
  }

  if (decision === 'e' || decision === 's') {
    return {
      status: 'mathematically-defined',
      officialDecision: decision === 'e' ? 'elected' : 'second-round',
    };
  }

  if (tallyProgress === 'p' || tallyProgress === 'f') {
    return { status: 'in-progress', officialDecision: null };
  }

  if (tallyProgress === 'n') {
    return { status: 'waiting', officialDecision: null };
  }

  return { status: 'unavailable', officialDecision: null };
}

export function waitingForTseSnapshot(
  selection: TseElectionSelection,
  createdAt: Date,
  statusMessage: string,
  automaticRefreshAfterMs = 5 * 60_000,
): ElectionSnapshot {
  return {
    election: { name: selection.name, year: Number(selection.cycle.slice(3)), round: selection.round },
    status: 'waiting',
    statusMessage,
    officialDecision: null,
    source: { mode: 'official', label: 'Dados oficiais do Tribunal Superior Eleitoral (TSE)' },
    results: [],
    totals: {
      validVotes: null,
      totalSections: null,
      countedSections: null,
      countedSectionsPercent: null,
    },
    history: [],
    officialGenerationId: null,
    automaticRefreshAfterMs,
    lastSuccessfulQueryAt: null,
    officialUpdatedAt: null,
  };
}

export function toOfficialElectionSnapshot(
  rawPayload: unknown,
  selection: TseElectionSelection,
  createdAt: Date,
): ElectionSnapshot {
  if (!isRecord(rawPayload)) {
    throw new Error('O TSE retornou um arquivo sem objeto JSON válido.');
  }

  const electionId = text(rawPayload['ele']);

  if (electionId !== selection.electionId || text(rawPayload['f']) !== 'o') {
    throw new Error('O arquivo recebido não corresponde à eleição oficial selecionada.');
  }

  const rawSections = isRecord(rawPayload['s']) ? rawPayload['s'] : {};
  const rawVotes = isRecord(rawPayload['v']) ? rawPayload['v'] : {};
  const tallyProgress = text(rawPayload['and']);
  const finalization = text(rawPayload['tf']);
  const decision = text(rawPayload['md']);
  const canDiscloseVotes = text(rawPayload['dv']) === 's';
  const computedStatus = determineStatus(tallyProgress, finalization, decision);
  const canDisplayVotes = canDiscloseVotes && computedStatus.status !== 'waiting' && computedStatus.status !== 'unavailable';
  const totalSections = localizedNumber(rawSections['ts']);
  const countedSections = localizedNumber(rawSections['st']);
  const directSectionPercent = localizedNumber(rawSections['pstn']) ?? localizedNumber(rawSections['pst']);
  const calculatedSectionPercent =
    totalSections !== null && totalSections > 0 && countedSections !== null
      ? (countedSections / totalSections) * 100
      : null;
  const results = readResults(rawPayload['carg'], selection, canDisplayVotes);

  const history: readonly ElectionHistoryPoint[] = [];
  const statusMessage = computedStatus.status === 'waiting'
    ? 'O TSE ainda não iniciou a totalização deste turno.'
    : text(rawPayload['dv']) === 'n'
      ? 'O TSE ainda não liberou a divulgação dos votos deste turno.'
      : computedStatus.status === 'unavailable'
        ? 'O arquivo oficial está incompleto ou usa um estado de totalização não reconhecido.'
        : computedStatus.status === 'mathematically-defined'
      ? 'O TSE indica que a eleição está matematicamente definida.'
      : computedStatus.status === 'final'
        ? 'O TSE publicou a totalização final da eleição.'
        : computedStatus.status === 'in-progress'
          ? 'Os dados oficiais do TSE estão em totalização.'
          : 'O andamento oficial não está disponível neste arquivo.';

  return {
    election: {
      name: text(rawPayload['nmn']) ?? selection.name,
      year: Number(selection.cycle.slice(3)),
      round: selection.round,
    },
    status: computedStatus.status,
    statusMessage,
    officialDecision: computedStatus.officialDecision,
    source: { mode: 'official', label: 'Dados oficiais do Tribunal Superior Eleitoral (TSE)' },
    results,
    totals: {
      validVotes: canDisplayVotes ? localizedNumber(rawVotes['vv']) : null,
      totalSections,
      countedSections,
      countedSectionsPercent: directSectionPercent ?? calculatedSectionPercent,
    },
    history,
    officialGenerationId: text(rawPayload['idg']),
    lastSuccessfulQueryAt: createdAt,
    officialUpdatedAt: electionDate(rawPayload['dt'], rawPayload['ht']),
  };
}
