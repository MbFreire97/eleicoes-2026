import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ElectionAlertsService } from '../../core/services/election-alerts.service';
import { ElectionStore } from '../../core/services/election-store';
import type { ElectionSnapshot, TallyStatus } from '../../core/models/election.models';

interface SessionAlert {
  readonly id: string;
  readonly title: string;
  readonly details: string;
  readonly occurredAt: Date;
}

const STATUS_TITLES: Record<TallyStatus, string> = {
  waiting: 'Aguardando apuração',
  'in-progress': 'Apuração em andamento',
  unavailable: 'Dados temporariamente indisponíveis',
  'mathematically-defined': 'Eleição matematicamente definida',
  final: 'Totalização final publicada',
};

const PERCENT_FORMAT = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function getCapturedUpdates(snapshot: ElectionSnapshot | null): readonly SessionAlert[] {
  if (!snapshot) {
    return [];
  }

  return snapshot.history.map((point) => ({
    id: `capture-${point.officialGenerationId ?? 'snapshot'}-${point.capturedAt.toISOString()}`,
    title: 'Apuração atualizada',
    details:
      point.countedSectionsPercent === null
        ? 'Atualização capturada sem percentual de seções disponível.'
        : `${PERCENT_FORMAT.format(point.countedSectionsPercent)}% das seções totalizadas${snapshot.source.mode === 'demonstration' ? ' · demonstração' : ''}.`,
    occurredAt: point.capturedAt,
  }));
}

@Component({
  selector: 'app-alerts-page',
  templateUrl: './alerts.page.html',
  styleUrl: './alerts.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsPage {
  private readonly electionStore = inject(ElectionStore);
  private readonly electionAlerts = inject(ElectionAlertsService);

  protected readonly snapshot = this.electionStore.snapshot;
  protected readonly isLoading = this.electionStore.isLoading;
  protected readonly errorMessage = this.electionStore.errorMessage;
  protected readonly events = computed(() =>
    [...this.electionAlerts.events(), ...getCapturedUpdates(this.snapshot())].sort(
      (left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
    ),
  );
  protected readonly visibleEvents = computed(() => this.events().slice(0, 5));
  protected readonly statusHeadline = computed(() => {
    const snapshot = this.snapshot();

    if (!snapshot) {
      return 'Consultando a apuração';
    }

    if (snapshot.status === 'in-progress' || snapshot.status === 'waiting') {
      return 'Aguardando definição oficial';
    }

    return STATUS_TITLES[snapshot.status];
  });

  protected formatTime(value: Date): string {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(value);
  }
}
