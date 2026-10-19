import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, of, switchMap, throwError, type Observable } from 'rxjs';
import { APP_ENVIRONMENT } from '../config/app-environment';
import {
  findPresidentialElection,
  toOfficialElectionSnapshot,
  waitingForTseSnapshot,
  type TseElectionSelection,
} from '../adapters/tse-result.adapter';
import type { ElectionSnapshot } from '../models/election.models';
import type { ElectionDataSource } from './election-data-source';

@Injectable({ providedIn: 'root' })
export class TseElectionDataSource implements ElectionDataSource {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly baseUrl = this.environment.tseBaseUrl.replace(/\/$/, '');
  private readonly configurationUrl = `${this.baseUrl}/oficial/comum/config/ele-c.json`;

  loadSnapshot(): Observable<ElectionSnapshot> {
    return this.http.get<unknown>(this.configurationUrl).pipe(
      map((configuration) =>
        findPresidentialElection(
          configuration,
          this.environment.electionRound,
          this.environment.electionYear,
          this.baseUrl,
        ),
      ),
      switchMap((selection) => {
        if (!selection) {
          return of(
            waitingForTseSnapshot(
              {
                electionId: '',
                cycle: `ele${this.environment.electionYear}`,
                round: this.environment.electionRound,
                name: 'Eleição presidencial',
                photoDirectory: null,
              },
              new Date(),
              'O TSE ainda não publicou a configuração deste turno presidencial.',
              5 * 60_000,
            ),
          );
        }

        return this.loadResult(selection);
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(
            waitingForTseSnapshot(
              {
                electionId: '',
                cycle: `ele${this.environment.electionYear}`,
                round: this.environment.electionRound,
                name: 'Eleição presidencial',
                photoDirectory: null,
              },
              new Date(),
              'A configuração oficial do turno ainda não está disponível no TSE.',
              5 * 60_000,
            ),
          );
        }

        return throwError(() => error);
      }),
    );
  }

  private loadResult(selection: TseElectionSelection): Observable<ElectionSnapshot> {
    const electionCode = selection.electionId.padStart(6, '0');
    const url = `${this.baseUrl}/oficial/${selection.cycle}/${selection.electionId}/dados/br/br-c0001-e${electionCode}-u.json`;

    return this.http.get<unknown>(url).pipe(
      map((payload) => toOfficialElectionSnapshot(payload, selection, new Date())),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(
            waitingForTseSnapshot(
              selection,
              new Date(),
              `O arquivo oficial do ${selection.round}º turno ainda não está disponível no TSE.`,
              5 * 60_000,
            ),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
