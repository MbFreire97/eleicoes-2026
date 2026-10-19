import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import type { ElectionSnapshot, OfficialElectionDecision, TallyStatus } from '../models/election.models';
import { AccessibilityPreferences } from './accessibility-preferences';
import { AlertAnnouncer } from './alert-announcer';

const STORAGE_KEY = 'brasil-decide-2026.official-alerts.v1';
const MAX_ALERTS = 50;

export interface ElectionAlertEvent {
  readonly id: string;
  readonly eventKey: string;
  readonly title: string;
  readonly details: string;
  readonly status: 'mathematically-defined' | 'final';
  readonly occurredAt: Date;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readAlert(value: unknown): ElectionAlertEvent | null {
  if (
    !isRecord(value) ||
    typeof value['id'] !== 'string' ||
    typeof value['eventKey'] !== 'string' ||
    typeof value['title'] !== 'string' ||
    typeof value['details'] !== 'string' ||
    (value['status'] !== 'mathematically-defined' && value['status'] !== 'final') ||
    typeof value['occurredAt'] !== 'string'
  ) {
    return null;
  }

  const occurredAt = new Date(value['occurredAt']);

  return Number.isNaN(occurredAt.getTime())
    ? null
    : {
        id: value['id'],
        eventKey: value['eventKey'],
        title: value['title'],
        details: value['details'],
        status: value['status'],
        occurredAt,
      };
}

function alertCopy(status: TallyStatus, decision: OfficialElectionDecision): { title: string; details: string } {
  if (status === 'final') {
    return {
      title: 'Totalização final publicada pelo TSE',
      details: 'O TSE publicou a totalização final. Consulte a fonte oficial para os detalhes do resultado.',
    };
  }

  if (decision === 'second-round') {
    return {
      title: 'Segundo turno indicado pelo TSE',
      details: 'O TSE indica oficialmente a realização de segundo turno. Este painel não infere esse estado pelos percentuais.',
    };
  }

  return {
    title: 'Eleição matematicamente definida pelo TSE',
    details: 'O arquivo oficial do TSE indica que a eleição está matematicamente definida. Consulte a fonte oficial para os detalhes.',
  };
}

@Injectable({ providedIn: 'root' })
export class ElectionAlertsService {
  private readonly document = inject(DOCUMENT);
  private readonly preferences = inject(AccessibilityPreferences);
  private readonly announcer = inject(AlertAnnouncer);

  readonly events = signal<readonly ElectionAlertEvent[]>(this.readStoredEvents());
  readonly latestNotification = signal<ElectionAlertEvent | null>(null);

  observe(snapshot: ElectionSnapshot): void {
    if (
      snapshot.source.mode !== 'official' ||
      (snapshot.status !== 'mathematically-defined' && snapshot.status !== 'final')
    ) {
      return;
    }

    const eventKey = [
      snapshot.election.year,
      snapshot.election.round,
      snapshot.status,
      snapshot.officialDecision ?? 'none',
    ].join(':');
    const storedEvents = this.events();

    if (storedEvents.some((event) => event.eventKey === eventKey)) {
      return;
    }

    const copy = alertCopy(snapshot.status, snapshot.officialDecision);
    const event: ElectionAlertEvent = {
      id: `official-${eventKey}`,
      eventKey,
      title: copy.title,
      details: copy.details,
      status: snapshot.status,
      occurredAt: snapshot.officialUpdatedAt ?? snapshot.lastSuccessfulQueryAt ?? new Date(),
    };
    const nextEvents = [...storedEvents, event].slice(-MAX_ALERTS);
    this.events.set(nextEvents);
    this.latestNotification.set(event);
    this.writeStoredEvents(nextEvents);

    if (this.preferences.soundAlerts()) {
      this.announcer.repeat(`${event.title}. ${event.details}`);
    }
  }

  dismissNotification(eventId: string): void {
    if (this.latestNotification()?.id === eventId) {
      this.latestNotification.set(null);
    }
  }

  private readStoredEvents(): readonly ElectionAlertEvent[] {
    try {
      const raw = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed)
        ? parsed.map(readAlert).filter((event): event is ElectionAlertEvent => event !== null).slice(-MAX_ALERTS)
        : [];
    } catch {
      return [];
    }
  }

  private writeStoredEvents(events: readonly ElectionAlertEvent[]): void {
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // The event remains available for this session when storage is unavailable.
    }
  }
}
