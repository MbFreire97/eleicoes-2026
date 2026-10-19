import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { provideElectionCharts } from '../../charts/chart-runtime';
import type { EChartsCoreOption } from 'echarts/core';
import type { CandidateResult, ElectionHistoryPoint, ElectionSnapshot } from '../../../core/models/election.models';

const CHART_COLORS = ['#0e7069', '#a6412c', '#205e83', '#684288', '#774912', '#31573f'] as const;
const PERCENT_FORMAT = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const INTEGER_FORMAT = new Intl.NumberFormat('pt-BR');
const TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

@Component({
  selector: 'app-election-charts',
  imports: [NgxEchartsDirective],
  providers: [provideElectionCharts()],
  templateUrl: './election-charts.component.html',
  styleUrl: './election-charts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionChartsComponent {
  readonly snapshot = input.required<ElectionSnapshot>();
  readonly detailed = input(false);

  protected readonly rankedCandidates = computed(() =>
    this.snapshot().results.filter((result) => result.validVotePercent !== null),
  );
  protected readonly hasVotePercentages = computed(() => this.rankedCandidates().length > 0);
  protected readonly hasHistory = computed(() => this.snapshot().history.length > 0);
  protected readonly hasSectionProgress = computed(
    () => this.snapshot().totals.countedSectionsPercent !== null,
  );

  private readonly candidateColorMap = computed(() => {
    const ids = this.snapshot().results
      .map((result) => result.candidate.id)
      .sort((left, right) => left.localeCompare(right, 'pt-BR'));

    return new Map(ids.map((id, index) => [id, CHART_COLORS[index % CHART_COLORS.length]] as const));
  });

  protected readonly voteBarHeight = computed(() =>
    `${Math.max(220, this.rankedCandidates().length * 48)}px`,
  );

  protected readonly voteBarOptions = computed<EChartsCoreOption>(() => {
    const results = this.rankedCandidates();

    return {
      animation: false,
      aria: { show: true, description: 'Comparação de percentuais de votos válidos por candidatura.' },
      grid: { left: 12, right: 48, top: 14, bottom: 28, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#344f60', fontSize: 16 },
        splitLine: { lineStyle: { color: '#dbe2e5' } },
      },
      yAxis: {
        type: 'category',
        data: results.map((result) => result.candidate.name),
        axisLabel: { color: '#142334', fontSize: 16, width: 130, overflow: 'truncate' },
        axisLine: { show: false },
      },
      series: [
        {
          name: 'Votos válidos',
          type: 'bar',
          barMaxWidth: 34,
          data: results.map((result) => ({
            value: result.validVotePercent,
            itemStyle: { color: this.candidateColor(result) },
          })),
          label: {
            show: true,
            position: 'right',
            color: '#142334',
            fontSize: 16,
            fontWeight: 700,
            formatter: (parameters: { value: number }) => `${PERCENT_FORMAT.format(parameters.value)}%`,
          },
        },
      ],
    };
  });

  protected readonly timelineOptions = computed<EChartsCoreOption>(() => {
    const history = this.sortedHistory();
    const candidates = this.snapshot().results;

    return {
      animation: false,
      aria: { show: true, description: 'Evolução dos percentuais registrada a cada atualização disponível.' },
      color: candidates.map((candidate) => this.candidateColor(candidate)),
      grid: { left: 48, right: 18, top: 24, bottom: 48 },
      tooltip: { trigger: 'axis' },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { color: '#142334', fontSize: 16 },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: history.map((point) => this.formatTime(point.capturedAt)),
        axisLabel: { color: '#344f60', fontSize: 16 },
        axisLine: { lineStyle: { color: '#9aaab1' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#344f60', fontSize: 16 },
        splitLine: { lineStyle: { color: '#dbe2e5' } },
      },
      series: candidates.map((candidate) => ({
        name: candidate.candidate.name,
        type: 'line',
        smooth: false,
        showSymbol: true,
        symbolSize: 8,
        lineStyle: { width: 3 },
        data: history.map((point) => point.candidatePercentages[candidate.candidate.id] ?? null),
      })),
    };
  });

  protected readonly sectionOptions = computed<EChartsCoreOption>(() => {
    const percent = Math.max(0, Math.min(100, this.snapshot().totals.countedSectionsPercent ?? 0));

    return {
      animation: false,
      aria: {
        show: true,
        description: `Seções totalizadas: ${PERCENT_FORMAT.format(percent)} por cento.`,
      },
      color: ['#0e7069', '#e2e7e9'],
      tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
      series: [
        {
          name: 'Seções',
          type: 'pie',
          radius: ['62%', '82%'],
          center: ['50%', '46%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#fff', borderWidth: 3 },
          label: { show: false },
          data: [
            { name: 'Totalizadas', value: percent },
            { name: 'Aguardando totalização', value: 100 - percent },
          ],
        },
      ],
    };
  });

  protected candidateColor(result: CandidateResult): string {
    return this.candidateColorMap().get(result.candidate.id) ?? CHART_COLORS[0];
  }

  protected formatPercent(value: number | null): string {
    return value === null ? '—' : `${PERCENT_FORMAT.format(value)}%`;
  }

  protected formatNumber(value: number | null): string {
    return value === null ? '—' : INTEGER_FORMAT.format(value);
  }

  protected formatTime(value: Date): string {
    return TIME_FORMAT.format(value);
  }

  protected sortedHistory(): readonly ElectionHistoryPoint[] {
    return [...this.snapshot().history].sort(
      (left, right) => left.capturedAt.getTime() - right.capturedAt.getTime(),
    );
  }

  protected latestHistoryValue(candidateId: string): string {
    const point = this.sortedHistory().at(-1);
    return this.formatPercent(point?.candidatePercentages[candidateId] ?? null);
  }

  protected sectionSummary(): string {
    const { countedSections, totalSections, countedSectionsPercent } = this.snapshot().totals;

    if (countedSections === null || totalSections === null || countedSectionsPercent === null) {
      return 'Dados de totalização ainda não disponíveis.';
    }

    return `${INTEGER_FORMAT.format(countedSections)} de ${INTEGER_FORMAT.format(totalSections)} seções (${this.formatPercent(countedSectionsPercent)}).`;
  }
}
