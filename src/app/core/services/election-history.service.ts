import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import type { ElectionHistoryPoint, ElectionSnapshot } from '../models/election.models';

const STORAGE_PREFIX = 'brasil-decide-2026.history.v1';
const MAX_HISTORY_POINTS = 400;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readNumberRecord(value: unknown): Readonly<Record<string, number | null>> | null {
  if (!isRecord(value)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number | null] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1]) || entry[1] === null,
    ),
  );
}

function readStringRecord(value: unknown): Readonly<Record<string, string>> | null {
  if (!isRecord(value)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function fromStoredPoint(value: unknown): ElectionHistoryPoint | null {
  if (!isRecord(value) || typeof value['capturedAt'] !== 'string') {
    return null;
  }

  const capturedAt = new Date(value['capturedAt']);
  const candidatePercentages = readNumberRecord(value['candidatePercentages']);

  if (Number.isNaN(capturedAt.getTime()) || !candidatePercentages) {
    return null;
  }

  const candidateNames = readStringRecord(value['candidateNames']);
  const candidateVotes = readNumberRecord(value['candidateVotes']);
  const status = value['status'];
  const officialDecision = value['officialDecision'];

  return {
    capturedAt,
    candidatePercentages,
    ...(candidateNames ? { candidateNames } : {}),
    ...(candidateVotes ? { candidateVotes } : {}),
    validVotes: finiteNumberOrNull(value['validVotes']),
    countedSections: finiteNumberOrNull(value['countedSections']),
    totalSections: finiteNumberOrNull(value['totalSections']),
    countedSectionsPercent: finiteNumberOrNull(value['countedSectionsPercent']),
    officialGenerationId:
      typeof value['officialGenerationId'] === 'string' ? value['officialGenerationId'] : null,
    ...(status === 'waiting' || status === 'in-progress' || status === 'unavailable' ||
    status === 'mathematically-defined' || status === 'final'
      ? { status }
      : {}),
    ...(officialDecision === 'elected' || officialDecision === 'second-round' || officialDecision === null
      ? { officialDecision }
      : {}),
  };
}

function fingerprint(point: ElectionHistoryPoint): string {
  const sortedRecord = (record: Readonly<Record<string, unknown>> | undefined) =>
    Object.entries(record ?? {}).sort(([left], [right]) => left.localeCompare(right));

  return JSON.stringify({
    candidatePercentages: sortedRecord(point.candidatePercentages),
    candidateNames: sortedRecord(point.candidateNames),
    candidateVotes: sortedRecord(point.candidateVotes),
    validVotes: point.validVotes ?? null,
    countedSections: point.countedSections ?? null,
    totalSections: point.totalSections ?? null,
    countedSectionsPercent: point.countedSectionsPercent,
    status: point.status ?? null,
    officialDecision: point.officialDecision ?? null,
  });
}

@Injectable({ providedIn: 'root' })
export class ElectionHistoryService {
  private readonly document = inject(DOCUMENT);
  private readonly cache = new Map<string, readonly ElectionHistoryPoint[]>();

  restoreAndCapture(snapshot: ElectionSnapshot, capturedAt: Date): readonly ElectionHistoryPoint[] {
    if (snapshot.source.mode !== 'official') {
      return snapshot.history;
    }

    const key = this.storageKey(snapshot);
    const history = [...(this.cache.get(key) ?? this.read(key))];
    const point = this.toPoint(snapshot, capturedAt);

    if (point) {
      const latest = history.at(-1);

      if (!latest || fingerprint(latest) !== fingerprint(point)) {
        history.push(point);
        history.sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime());
        history.splice(0, Math.max(0, history.length - MAX_HISTORY_POINTS));
        this.write(key, history);
      }
    }

    this.cache.set(key, history);
    return history;
  }

  private toPoint(snapshot: ElectionSnapshot, capturedAt: Date): ElectionHistoryPoint | null {
    const hasReportedData =
      snapshot.totals.countedSections !== null && snapshot.totals.countedSections > 0 ||
      snapshot.results.some((result) => result.votes !== null || result.validVotePercent !== null) ||
      snapshot.officialDecision !== null || snapshot.status === 'final';

    if (!hasReportedData) {
      return null;
    }

    return {
      capturedAt: new Date(capturedAt),
      candidatePercentages: Object.fromEntries(
        snapshot.results.map(({ candidate, validVotePercent }) => [candidate.id, validVotePercent]),
      ),
      candidateNames: Object.fromEntries(
        snapshot.results.map(({ candidate }) => [candidate.id, candidate.name]),
      ),
      candidateVotes: Object.fromEntries(
        snapshot.results.map(({ candidate, votes }) => [candidate.id, votes]),
      ),
      validVotes: snapshot.totals.validVotes,
      countedSections: snapshot.totals.countedSections,
      totalSections: snapshot.totals.totalSections,
      countedSectionsPercent: snapshot.totals.countedSectionsPercent,
      officialGenerationId: snapshot.officialGenerationId,
      status: snapshot.status,
      officialDecision: snapshot.officialDecision,
    };
  }

  private storageKey(snapshot: ElectionSnapshot): string {
    return `${STORAGE_PREFIX}.${snapshot.election.year}.${snapshot.election.round}`;
  }

  private read(key: string): readonly ElectionHistoryPoint[] {
    try {
      const raw = this.document.defaultView?.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.map(fromStoredPoint).filter((point): point is ElectionHistoryPoint => point !== null)
        : [];
    } catch {
      return [];
    }
  }

  private write(key: string, history: readonly ElectionHistoryPoint[]): void {
    try {
      this.document.defaultView?.localStorage.setItem(key, JSON.stringify(history));
    } catch {
      // Keep the captured history available for the current session if storage is unavailable.
    }
  }
}
