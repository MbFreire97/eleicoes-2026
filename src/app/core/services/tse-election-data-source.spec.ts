import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { APP_ENVIRONMENT } from '../config/app-environment';
import { TseElectionDataSource } from './tse-election-data-source';

const baseUrl = 'https://resultados.tse.jus.br';
const environment = {
  dataMode: 'official' as const,
  electionYear: 2026,
  electionRound: 2 as const,
  tseBaseUrl: baseUrl,
};

const electionConfig = {
  f: 'o',
  arq: [{ tp: 'ft', dir: '<base>/<ambiente>/<ciclo>/<cd_eleicao>/fotos/<uf>' }],
  pl: [
    {
      c: 'ele2026',
      e: [
        {
          cd: '6258',
          nm: 'Eleição Ordinária Federal - 2026 2º Turno',
          t: '2',
          abr: [{ cd: 'br', cp: [{ cd: '1', ds: 'Presidente' }] }],
        },
      ],
    },
  ],
};

const waitingResult = {
  ele: '6258',
  t: '2',
  f: 'o',
  tpabr: 'br',
  dv: 's',
  tf: 'n',
  and: 'n',
  carg: [],
  s: { ts: '499248', st: '0', pst: '0,00' },
  v: { vv: '0' },
};

describe('TseElectionDataSource', () => {
  let source: TseElectionDataSource;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: environment },
      ],
    });
    source = TestBed.inject(TseElectionDataSource);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads EA11 before building the validated second-turn presidential EA20 path', () => {
    let receivedStatus = '';
    source.loadSnapshot().subscribe((snapshot) => (receivedStatus = snapshot.status));

    http.expectOne(`${baseUrl}/oficial/comum/config/ele-c.json`).flush(electionConfig);
    const resultRequest = http.expectOne(
      `${baseUrl}/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json`,
    );
    resultRequest.flush(waitingResult);

    expect(receivedStatus).toBe('waiting');
  });

  it('treats a not-yet-published second-turn EA20 file as a waiting state', () => {
    let receivedMessage = '';
    source.loadSnapshot().subscribe((snapshot) => (receivedMessage = snapshot.statusMessage ?? ''));

    http.expectOne(`${baseUrl}/oficial/comum/config/ele-c.json`).flush(electionConfig);
    http
      .expectOne(`${baseUrl}/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json`)
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(receivedMessage).toContain('ainda não está disponível');
  });

  it('waits five minutes before retrying a 404 instead of treating it as a connection error', () => {
    let retryDelay: number | null | undefined;
    source.loadSnapshot().subscribe((snapshot) => (retryDelay = snapshot.automaticRefreshAfterMs));

    http
      .expectOne(`${baseUrl}/oficial/comum/config/ele-c.json`)
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(retryDelay).toBe(5 * 60_000);
    http.expectNone(`${baseUrl}/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json`);
  });
});
