import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import type { ElectionRefreshOutcome } from './election-store';
import { ElectionStore } from './election-store';

const BASE_INTERVAL_MS = 30_000;
const MAX_BACKOFF_MS = 5 * 60_000;

@Injectable({ providedIn: 'root' })
export class ElectionPollingService {
  private readonly document = inject(DOCUMENT);
  private readonly store = inject(ElectionStore);
  private readonly destroyRef = inject(DestroyRef);

  private started = false;
  private pausedForHiddenTab = false;
  private refreshInProgress = false;
  private refreshRequestedWhileBusy = false;
  private consecutiveFailures = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private readonly onVisibilityChange = (): void => {
    if (!this.isDocumentVisible()) {
      this.pausedForHiddenTab = true;
      this.clearTimer();
      return;
    }

    if (this.started && this.pausedForHiddenTab) {
      this.pausedForHiddenTab = false;
      void this.refreshAndSchedule();
    }
  };

  constructor() {
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.clearTimer();
    });
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.pausedForHiddenTab = !this.isDocumentVisible();

    if (!this.pausedForHiddenTab) {
      void this.refreshAndSchedule();
    }
  }

  refreshNow(): Promise<ElectionRefreshOutcome> {
    this.clearTimer();
    const request = this.store.refresh();

    return request.then((outcome) => {
      if (outcome.kind === 'success') {
        this.consecutiveFailures = 0;
      }
      this.scheduleNext(outcome);
      return outcome;
    });
  }

  private async refreshAndSchedule(): Promise<void> {
    if (!this.started || !this.isDocumentVisible()) {
      return;
    }

    if (this.refreshInProgress) {
      this.refreshRequestedWhileBusy = true;
      return;
    }

    this.refreshInProgress = true;

    try {
      let outcome: ElectionRefreshOutcome;

      try {
        outcome = await this.store.refresh();
      } catch {
        outcome = { kind: 'error' };
      }

      this.scheduleNext(outcome);
    } finally {
      this.refreshInProgress = false;

      if (this.refreshRequestedWhileBusy && this.isDocumentVisible()) {
        this.refreshRequestedWhileBusy = false;
        void this.refreshAndSchedule();
      }
    }
  }

  private scheduleNext(outcome: ElectionRefreshOutcome): void {
    if (!this.started || !this.isDocumentVisible()) {
      return;
    }

    if (outcome.kind === 'success' && outcome.snapshot.source.mode === 'demonstration') {
      this.clearTimer();
      return;
    }

    if (outcome.kind === 'error') {
      this.consecutiveFailures += 1;
    } else {
      this.consecutiveFailures = 0;
    }

    const delay =
      outcome.kind === 'error'
        ? Math.min(BASE_INTERVAL_MS * 2 ** (this.consecutiveFailures - 1), MAX_BACKOFF_MS)
        : outcome.snapshot.automaticRefreshAfterMs ?? BASE_INTERVAL_MS;

    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.refreshAndSchedule();
    }, delay);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private isDocumentVisible(): boolean {
    return this.document.visibilityState !== 'hidden';
  }
}
