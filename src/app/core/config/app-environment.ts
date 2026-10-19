import { InjectionToken } from '@angular/core';
import type { ElectionDataMode } from '../models/election.models';

export interface AppEnvironment {
  readonly dataMode: ElectionDataMode;
  readonly electionYear: number;
  readonly electionRound: 1 | 2;
  readonly tseBaseUrl: string;
}

export const APP_ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');

// Change dataMode to 'demonstration' to preview clearly marked synthetic charts and totals.
export const appEnvironment: AppEnvironment = Object.freeze({
  dataMode: 'official',
  electionYear: 2026,
  electionRound: 2,
  tseBaseUrl: 'https://resultados.tse.jus.br',
});
