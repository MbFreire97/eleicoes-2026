import { describe, expect, it } from 'vitest';
import {
  findPresidentialElection,
  toOfficialElectionSnapshot,
  type TseElectionSelection,
} from './tse-result.adapter';

const TSE_BASE = 'https://resultados.tse.jus.br';

const configFixture = {
  f: 'o',
  arq: [
    { tp: 'u', dir: '<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>' },
    { tp: 'ft', dir: '<base>/<ambiente>/<ciclo>/<cd_eleicao>/fotos/<uf>' },
  ],
  pl: [
    {
      c: 'ele2026',
      e: [
        {
          cd: '6257',
          cdt2: '6258',
          nm: 'Eleição Ordinária Federal - 2026 1º Turno',
          t: '1',
          abr: [{ cd: 'br', cp: [{ cd: '1', ds: 'Presidente' }] }],
        },
        {
          cd: '6258',
          cdt2: '',
          nm: 'Eleição Ordinária Federal - 2026 2º Turno',
          t: '2',
          abr: [{ cd: 'br', cp: [{ cd: '1', ds: 'Presidente' }] }],
        },
      ],
    },
  ],
};

const selection: TseElectionSelection = {
  electionId: '6258',
  cycle: 'ele2026',
  round: 2,
  name: 'Eleição Ordinária Federal - 2026 2º Turno',
  photoDirectory: `${TSE_BASE}/oficial/ele2026/6258/fotos/br`,
};

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ele: '6258',
    t: '2',
    f: 'o',
    tpabr: 'br',
    cdabr: 'br',
    dg: '25/10/2026',
    hg: '20:42:00',
    dt: '25/10/2026',
    ht: '20:40:00',
    dv: 's',
    tf: 'n',
    and: 'p',
    md: 'n',
    carg: [
      {
        cd: '1',
        agr: [
          {
            par: [
              {
                n: '22',
                sg: 'EXM',
                cand: [
                  {
                    n: '22',
                    sqcand: '280002551544',
                    nm: 'CANDIDATO EXEMPLO UM',
                    nmu: 'Exemplo Um',
                    seq: '2',
                    vap: '523000',
                    pvap: '52,3',
                    pvapn: '52,3000000',
                  },
                ],
              },
              {
                n: '13',
                sg: 'DUM',
                cand: [
                  {
                    n: '13',
                    sqcand: '280002542548',
                    nm: 'CANDIDATA EXEMPLO DOIS',
                    nmu: 'Exemplo Dois',
                    seq: '1',
                    vap: '477000',
                    pvap: '47,7',
                    pvapn: '47,7000000',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    s: { ts: '10000', st: '7640', pst: '76,40', pstn: '76,4' },
    v: { vv: '1.000.000', vvc: '1.000.000' },
    ...overrides,
  };
}

describe('TSE result adapter', () => {
  it('discovers the requested presidential turn and photo directory from EA11', () => {
    const resolved = findPresidentialElection(configFixture, 2, 2026, TSE_BASE);

    expect(resolved).toEqual(selection);
  });

  it('uses the first-turn counterpart code when the second-turn entry is not listed yet', () => {
    const configWithoutSecondTurn = {
      ...configFixture,
      pl: [
        {
          ...configFixture.pl[0],
          e: configFixture.pl[0].e.slice(0, 1),
        },
      ],
    };

    expect(findPresidentialElection(configWithoutSecondTurn, 2, 2026, TSE_BASE)?.electionId).toBe('6258');
  });

  it('maps official candidates, localized totals, section progress and generation time', () => {
    const snapshot = toOfficialElectionSnapshot(payload(), selection, new Date('2026-10-25T23:00:00Z'));

    expect(snapshot.source.mode).toBe('official');
    expect(snapshot.status).toBe('in-progress');
    expect(snapshot.results.map((result) => result.candidate.name)).toEqual(['Exemplo Um', 'Exemplo Dois']);
    expect(snapshot.results[0].validVotePercent).toBe(52.3);
    expect(snapshot.results[0].candidate.photoUrl).toBe(
      `${TSE_BASE}/oficial/ele2026/6258/fotos/br/280002551544.jpeg`,
    );
    expect(snapshot.totals.validVotes).toBe(1_000_000);
    expect(snapshot.totals.countedSectionsPercent).toBe(76.4);
    expect(snapshot.officialUpdatedAt?.getHours()).toBe(20);
  });

  it('does not present zero votes as candidate results before totalization starts', () => {
    const snapshot = toOfficialElectionSnapshot(
      payload({
        and: 'n',
        v: { vv: '0', vvc: '0' },
        s: { ts: '499248', st: '0', pst: '0,00' },
      }),
      selection,
      new Date('2026-10-19T12:00:00Z'),
    );

    expect(snapshot.status).toBe('waiting');
    expect(snapshot.results[0].votes).toBeNull();
    expect(snapshot.results[0].validVotePercent).toBeNull();
    expect(snapshot.totals.validVotes).toBeNull();
    expect(snapshot.totals.countedSections).toBe(0);
  });

  it('returns an unavailable state instead of trusting an unknown tally status', () => {
    const snapshot = toOfficialElectionSnapshot(payload({ and: 'unexpected' }), selection, new Date());

    expect(snapshot.status).toBe('unavailable');
    expect(snapshot.results[0].votes).toBeNull();
    expect(snapshot.statusMessage).toContain('incompleto');
  });

  it('uses only the official EA20 decision field for mathematical results', () => {
    const snapshot = toOfficialElectionSnapshot(
      payload({ and: 'p', md: 's' }),
      selection,
      new Date(),
    );

    expect(snapshot.status).toBe('mathematically-defined');
    expect(snapshot.officialDecision).toBe('second-round');
  });
});
