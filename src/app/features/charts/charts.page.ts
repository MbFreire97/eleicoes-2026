import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ElectionStore } from '../../core/services/election-store';
import { ElectionChartsComponent } from '../../shared/components/election-charts/election-charts.component';

@Component({
  selector: 'app-charts-page',
  imports: [ElectionChartsComponent],
  templateUrl: './charts.page.html',
  styleUrl: './charts.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsPage {
  private readonly electionStore = inject(ElectionStore);

  protected readonly snapshot = this.electionStore.snapshot;
  protected readonly isLoading = this.electionStore.isLoading;
  protected readonly errorMessage = this.electionStore.errorMessage;
  protected readonly sourceNote = computed(() => {
    const election = this.snapshot();

    if (!election) {
      return '';
    }

    const updated = election.officialUpdatedAt
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
          election.officialUpdatedAt,
        )
      : 'sem horário oficial de totalização no arquivo';

    return `${election.source.label} · ${election.election.round}º turno · ${updated}`;
  });
}
