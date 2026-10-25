import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CandidateComparisonComponent } from '../../shared/components/candidate-comparison/candidate-comparison.component';
import { ElectionIndicatorsComponent } from '../../shared/components/election-indicators/election-indicators.component';
import { ElectionStore } from '../../core/services/election-store';
import type { TallyStatus } from '../../core/models/election.models';

const STATUS_TITLES: Record<TallyStatus, string> = {
  waiting: 'Aguardando apuração',
  'in-progress': 'Apuração em andamento',
  unavailable: 'Dados temporariamente indisponíveis',
  'mathematically-defined': 'Eleição matematicamente definida',
  final: 'Totalização final publicada',
};

function formatDate(value: Date | null, emptyText: string): string {
  if (!value) {
    return emptyText;
  }

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

const PERCENT_FORMAT = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR');

@Component({
  selector: 'app-home-page',
  imports: [CandidateComparisonComponent, ElectionIndicatorsComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly electionStore = inject(ElectionStore);

  protected readonly snapshot = this.electionStore.snapshot;
  protected readonly lastSuccessfulQueryAt = this.electionStore.lastSuccessfulQueryAt;
  protected readonly isLoading = this.electionStore.isLoading;
  protected readonly errorMessage = this.electionStore.errorMessage;
  protected readonly statusTitle = computed(() => {
    const election = this.snapshot();
    return election ? STATUS_TITLES[election.status] : 'Consultando a apuração';
  });
  protected readonly statusMessage = computed(() => {
    const election = this.snapshot();

    if (!election) {
      return this.errorMessage() ?? 'Carregando a informação mais recente disponível.';
    }

    if (election.source.mode === 'demonstration') {
      return `Demonstração. ${election.statusMessage ?? 'Os dados desta tela são sintéticos.'}`;
    }

    return election.statusMessage ?? 'Consulte os detalhes da apuração diretamente no TSE.';
  });
  protected readonly sourceLabel = computed(() =>
    this.snapshot()?.source.mode === 'demonstration'
      ? 'Demonstração · dados sintéticos'
      : 'Dados oficiais do TSE',
  );
  protected readonly lastQueryLabel = computed(() =>
    formatDate(this.lastSuccessfulQueryAt(), 'Ainda não houve consulta bem-sucedida'),
  );
  protected readonly officialUpdateLabel = computed(() =>
    formatDate(this.snapshot()?.officialUpdatedAt ?? null, 'O arquivo ainda não informa horário de totalização'),
  );
  protected readonly sectionsPercentLabel = computed(() => {
    const value = this.snapshot()?.totals.countedSectionsPercent;
    return value === null || value === undefined ? '—' : `${PERCENT_FORMAT.format(value)}%`;
  });
  protected readonly officialUpdateTime = computed(() => {
    const value = this.snapshot()?.officialUpdatedAt;
    return value ? TIME_FORMAT.format(value) : '—';
  });
  protected readonly officialUpdateDate = computed(() => {
    const value = this.snapshot()?.officialUpdatedAt;
    return value ? DATE_FORMAT.format(value) : 'aguardando publicação';
  });
}
