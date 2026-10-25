import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ElectionAlertsService } from './core/services/election-alerts.service';
import { ElectionPollingService } from './core/services/election-polling.service';

const NAVIGATION_ITEMS = [
  { label: 'Início', path: '/inicio', icon: 'home' },
  { label: 'Gráficos', path: '/graficos', icon: 'chart' },
  { label: 'Alertas', path: '/alertas', icon: 'bell' },
  { label: 'Ajuda', path: '/ajuda', icon: 'help' },
] as const;

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly polling = inject(ElectionPollingService);
  private readonly alerts = inject(ElectionAlertsService);

  protected readonly navigationItems = NAVIGATION_ITEMS;
  protected readonly latestNotification = this.alerts.latestNotification;

  constructor() {
    this.polling.start();
  }

  protected dismissAlert(id: string): void {
    this.alerts.dismissNotification(id);
  }
}
