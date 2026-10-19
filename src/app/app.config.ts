import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { APP_ENVIRONMENT, appEnvironment } from './core/config/app-environment';
import { DemonstrationElectionDataSource } from './core/services/demonstration-election-data-source';
import { TseElectionDataSource } from './core/services/tse-election-data-source';
import { ELECTION_DATA_SOURCE } from './core/services/election-data-source';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    { provide: APP_ENVIRONMENT, useValue: appEnvironment },
    {
      provide: ELECTION_DATA_SOURCE,
      useFactory: () =>
        inject(APP_ENVIRONMENT).dataMode === 'official'
          ? inject(TseElectionDataSource)
          : inject(DemonstrationElectionDataSource),
    },
  ],
};
