import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertAnnouncer } from '../../core/services/alert-announcer';
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

function getSessionAlerts(snapshot: ElectionSnapshot | null): readonly SessionAlert[] {
  if (!snapshot || snapshot.source.mode !== 'demonstration' || !snapshot.lastSuccessfulQueryAt) {
    return [];
  }

  return [
    {
      id: 'demonstration-loaded',
      title: 'Amostra demonstrativa carregada',
      details:
        'Este registro confirma apenas que uma amostra sintética foi carregada nesta sessão. Não representa evento ou resultado eleitoral real.',
      occurredAt: snapshot.lastSuccessfulQueryAt,
    },
  ];
}

@Component({
  selector: 'app-alerts-page',
  imports: [RouterLink],
  templateUrl: './alerts.page.html',
  styleUrl: './alerts.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsPage {
  private readonly electionStore = inject(ElectionStore);
  private readonly alertAnnouncer = inject(AlertAnnouncer);
  private readonly electionAlerts = inject(ElectionAlertsService);

  protected readonly snapshot = this.electionStore.snapshot;
  protected readonly isLoading = this.electionStore.isLoading;
  protected readonly errorMessage = this.electionStore.errorMessage;
  protected readonly events = computed(() =>
    [...this.electionAlerts.events(), ...getSessionAlerts(this.snapshot())].sort(
      (left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
    ),
  );
  protected readonly announcement = signal('');
  protected readonly statusTitle = computed(() => {
    const snapshot = this.snapshot();
    return snapshot ? STATUS_TITLES[snapshot.status] : 'Consultando a apuração';
  });

  protected formatDate(value: Date): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(value);
  }

  protected repeatAlert(message: string): void {
    this.announcement.set(this.alertAnnouncer.repeat(message));
  }
}
