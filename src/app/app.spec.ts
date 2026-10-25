import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { DemonstrationElectionDataSource } from './core/services/demonstration-election-data-source';
import { ELECTION_DATA_SOURCE } from './core/services/election-data-source';
import { APP_ENVIRONMENT } from './core/config/app-environment';
import { ElectionChartsComponent } from './shared/components/election-charts/election-charts.component';

describe('App', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: APP_ENVIRONMENT,
          useValue: { dataMode: 'demonstration', electionYear: 2026, electionRound: 2, tseBaseUrl: 'https://resultados.tse.jus.br' },
        },
        { provide: ELECTION_DATA_SOURCE, useClass: DemonstrationElectionDataSource },
      ],
    });
    TestBed.overrideComponent(ElectionChartsComponent, {
      set: { imports: [], template: '<p class="charts-test-placeholder">Gráficos</p>' },
    });
    await TestBed.compileComponents();
  });

  it('renders the project brand and four primary navigation links', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-title')?.textContent).toContain('Brasil Decide');
    expect(compiled.querySelectorAll('.bottom-nav-link')).toHaveLength(4);
  });

  it('shows the home status as demonstration data', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/inicio');
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.overview-card')?.textContent).toContain('Demonstração');
    expect(compiled.querySelector('.candidate-list')?.textContent).toContain('Candidato de exemplo 1');
    expect(compiled.querySelector('.indicators-grid')?.textContent).toContain('4,6');
    expect(compiled.textContent).toContain('Demonstração: nomes e valores sintéticos');
  });

  it('navigates across the four planned sections while keeping the app shell', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const sections = [
      ['/inicio', '2º turno – Presidente'],
      ['/graficos', 'Gráficos da apuração'],
      ['/alertas', 'Alertas da apuração'],
      ['/ajuda', 'Ajuda e acessibilidade'],
    ] as const;

    for (const [path, expectedHeading] of sections) {
      await router.navigateByUrl(path);
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.brand-title')?.textContent).toContain('Brasil Decide');
      expect(compiled.querySelector('main h1')?.textContent?.trim()).toBe(expectedHeading);
    }
  });

  it('exposes named navigation controls, a skip link, and labelled accessibility settings', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/ajuda');
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const skipLink = compiled.querySelector<HTMLAnchorElement>('.skip-link');
    const bottomNavigation = compiled.querySelector<HTMLElement>('.bottom-nav');
    const fontOptions = compiled.querySelectorAll<HTMLInputElement>('input[name="font-scale"]');
    const accessibilityToggles = compiled.querySelectorAll<HTMLInputElement>(
      '.preference-toggle input[type="checkbox"]',
    );

    expect(skipLink?.getAttribute('href')).toBe('#conteudo');
    expect(compiled.querySelector('#conteudo')).not.toBeNull();
    expect(bottomNavigation?.getAttribute('aria-label')).toBe('Navegação principal');
    expect(fontOptions).toHaveLength(3);
    expect([...fontOptions].every((input) => input.closest('label')?.textContent?.trim())).toBe(true);
    expect(accessibilityToggles).toHaveLength(2);
    expect([...accessibilityToggles].every((input) => input.closest('label')?.textContent?.trim())).toBe(true);
  });
});
