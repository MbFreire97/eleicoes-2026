import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ENVIRONMENT } from '../../core/config/app-environment';
import { AccessibilityPreferences, type FontScale } from '../../core/services/accessibility-preferences';
import { ElectionPollingService } from '../../core/services/election-polling.service';
import { ElectionStore } from '../../core/services/election-store';

@Component({
  selector: 'app-help-page',
  imports: [RouterLink],
  templateUrl: './help.page.html',
  styleUrl: './help.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpPage {
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly polling = inject(ElectionPollingService);
  protected readonly electionStore = inject(ElectionStore);
  protected readonly preferences = inject(AccessibilityPreferences);
  protected readonly updateMessage = signal('');
  protected readonly modeLabel = computed(() =>
    this.environment.dataMode === 'official'
      ? 'Dados oficiais selecionados. A aplicação consulta os arquivos publicados pelo TSE.'
      : 'Modo demonstração selecionado. Os valores exibidos são sintéticos e identificados.',
  );

  protected setFontScale(value: FontScale): void {
    this.preferences.setFontScale(value);
  }

  protected setHighContrast(event: Event): void {
    const input = event.currentTarget;

    if (input instanceof HTMLInputElement) {
      this.preferences.setHighContrast(input.checked);
    }
  }

  protected setSoundAlerts(event: Event): void {
    const input = event.currentTarget;

    if (input instanceof HTMLInputElement) {
      this.preferences.setSoundAlerts(input.checked);
    }
  }

  protected async refreshData(): Promise<void> {
    this.updateMessage.set('Consultando novamente a configuração e o arquivo da eleição.');
    const outcome = await this.polling.refreshNow();
    this.updateMessage.set(
      outcome.kind === 'success'
        ? 'Consulta concluída. Os dados e o horário oficial são apresentados separadamente.'
        : 'Não foi possível consultar os dados. A próxima tentativa automática seguirá o intervalo de espera.',
    );
  }
}
