import { inject, Injectable, signal } from '@angular/core';
import { catchError, defer, finalize, firstValueFrom, map, of, take } from 'rxjs';
import type { ElectionSnapshot } from '../models/election.models';
import { ElectionAlertsService } from './election-alerts.service';
import { ELECTION_DATA_SOURCE } from './election-data-source';
import { ElectionHistoryService } from './election-history.service';

export type ElectionRefreshOutcome =
  | { readonly kind: 'success'; readonly snapshot: ElectionSnapshot; readonly contentChanged: boolean }
  | { readonly kind: 'error' };

function sameVisibleContent(left: ElectionSnapshot, right: ElectionSnapshot): boolean {
  const content = (snapshot: ElectionSnapshot) => ({
    election: snapshot.election,
    status: snapshot.status,
    statusMessage: snapshot.statusMessage,
    officialDecision: snapshot.officialDecision,
    source: snapshot.source,
    results: snapshot.results,
    totals: snapshot.totals,
    history: snapshot.history,
    officialGenerationId: snapshot.officialGenerationId,
    automaticRefreshAfterMs: snapshot.automaticRefreshAfterMs,
    officialUpdatedAt: snapshot.officialUpdatedAt,
  });

  return JSON.stringify(content(left)) === JSON.stringify(content(right));
}

@Injectable({ providedIn: 'root' })
export class ElectionStore {
  private readonly dataSource = inject(ELECTION_DATA_SOURCE);
  private readonly historyService = inject(ElectionHistoryService);
  private readonly alertsService = inject(ElectionAlertsService);
  private activeRequest: Promise<ElectionRefreshOutcome> | null = null;

  readonly snapshot = signal<ElectionSnapshot | null>(null);
  readonly lastSuccessfulQueryAt = signal<Date | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    void this.refresh();
  }

  refresh(): Promise<ElectionRefreshOutcome> {
    if (this.activeRequest) {
      return this.activeRequest;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const request = firstValueFrom(
      defer(() => this.dataSource.loadSnapshot()).pipe(
        take(1),
        map((loadedSnapshot): ElectionRefreshOutcome => {
          const queryAt = loadedSnapshot.lastSuccessfulQueryAt;
          const history = this.historyService.restoreAndCapture(
            loadedSnapshot,
            queryAt ?? new Date(),
          );
          const nextSnapshot =
            loadedSnapshot.source.mode === 'official'
              ? { ...loadedSnapshot, history }
              : loadedSnapshot;
          const currentSnapshot = this.snapshot();
          const contentChanged = !currentSnapshot || !sameVisibleContent(currentSnapshot, nextSnapshot);

          if (queryAt) {
            this.lastSuccessfulQueryAt.set(queryAt);
          }

          if (contentChanged) {
            this.snapshot.set(nextSnapshot);
          }

          this.alertsService.observe(nextSnapshot);

          return { kind: 'success', snapshot: nextSnapshot, contentChanged };
        }),
        catchError(() => {
          this.errorMessage.set(
            'Não foi possível consultar os dados agora. Verifique sua conexão e tente atualizar novamente.',
          );
          return of<ElectionRefreshOutcome>({ kind: 'error' });
        }),
        finalize(() => {
          this.isLoading.set(false);
        }),
      ),
    );

    this.activeRequest = request;
    void request.then(() => {
      if (this.activeRequest === request) {
        this.activeRequest = null;
      }
    });

    return request;
  }
}
