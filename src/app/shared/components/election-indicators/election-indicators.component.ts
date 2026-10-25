import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ElectionSnapshot } from '../../../core/models/election.models';

const INTEGER_FORMAT = new Intl.NumberFormat('pt-BR');
const PERCENT_FORMAT = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

@Component({
  selector: 'app-election-indicators',
  templateUrl: './election-indicators.component.html',
  styleUrl: './election-indicators.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionIndicatorsComponent {
  readonly snapshot = input.required<ElectionSnapshot>();

  protected readonly validVotesLabel = computed(() => {
    const value = this.snapshot().totals.validVotes;
    return value === null ? '—' : INTEGER_FORMAT.format(value);
  });

  protected readonly difference = computed(() => {
    const ranked = this.snapshot().results
      .filter((result) => result.validVotePercent !== null)
      .slice(0, 2);

    if (ranked.length < 2) {
      return null;
    }

    return Math.abs((ranked[0].validVotePercent ?? 0) - (ranked[1].validVotePercent ?? 0));
  });

  protected readonly differenceLabel = computed(() => {
    const value = this.difference();
    return value === null ? '—' : PERCENT_FORMAT.format(value);
  });

  protected readonly sectionsPercentLabel = computed(() => {
    const value = this.snapshot().totals.countedSectionsPercent;
    return value === null ? 'Aguardando dados' : `${PERCENT_FORMAT.format(value)}%`;
  });

  protected readonly sectionsDetail = computed(() => {
    const { countedSections, totalSections } = this.snapshot().totals;

    if (countedSections === null || totalSections === null) {
      return 'Quantidade de seções ainda não divulgada';
    }

    return `${INTEGER_FORMAT.format(countedSections)} de ${INTEGER_FORMAT.format(totalSections)} seções`;
  });

  protected readonly votesDetail = computed(() =>
    this.snapshot().totals.validVotes === null
      ? 'A totalização ainda não começou ou não há dados disponíveis.'
      : 'Votos válidos registrados na abrangência nacional.',
  );

  protected readonly differenceDetail = computed(() =>
    this.difference() === null
      ? 'A diferença será calculada quando houver votação para dois candidatos.'
      : 'Distância entre os dois maiores percentuais de votos válidos.',
  );

  protected readonly sectionsLabel = computed(() =>
    this.snapshot().totals.countedSections === 0
      ? 'Nenhuma seção totalizada até agora.'
      : 'Percentual de seções totalizadas pelo TSE.',
  );
}
