import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { CandidateResult, ElectionSnapshot } from '../../../core/models/election.models';

const CANDIDATE_COLORS = ['#0e8077', '#c34f36', '#265b7d', '#724d91', '#84551f', '#345c46'] as const;
const PERCENT_FORMAT = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const VOTE_FORMAT = new Intl.NumberFormat('pt-BR');

@Component({
  selector: 'app-candidate-comparison',
  templateUrl: './candidate-comparison.component.html',
  styleUrl: './candidate-comparison.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateComparisonComponent {
  readonly snapshot = input.required<ElectionSnapshot>();
  protected readonly unavailablePhotos = signal<ReadonlySet<string>>(new Set());
  private readonly candidateColorMap = computed(() => {
    const candidates = this.snapshot().results
      .map((result) => result.candidate.id)
      .sort((left, right) => left.localeCompare(right, 'pt-BR'));

    return new Map(candidates.map((id, index) => [id, CANDIDATE_COLORS[index % CANDIDATE_COLORS.length]]));
  });

  protected candidateColor(id: string): string {
    return this.candidateColorMap().get(id) ?? CANDIDATE_COLORS[0];
  }

  protected percentWidth(result: CandidateResult): number {
    const percent = result.validVotePercent;
    return percent === null ? 0 : Math.max(0, Math.min(100, percent));
  }

  protected formatPercent(percent: number | null): string {
    return percent === null ? 'Aguardando votos' : `${PERCENT_FORMAT.format(percent)}%`;
  }

  protected formatVotes(votes: number | null): string {
    return votes === null ? 'Ainda sem totalização de votos' : `${VOTE_FORMAT.format(votes)} votos`;
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR'))
      .join('');
  }

  protected hasPhoto(candidateId: string): boolean {
    return !this.unavailablePhotos().has(candidateId);
  }

  protected markPhotoUnavailable(candidateId: string): void {
    this.unavailablePhotos.update((failed) => new Set(failed).add(candidateId));
  }
}
