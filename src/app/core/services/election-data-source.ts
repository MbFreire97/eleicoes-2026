import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type { ElectionSnapshot } from '../models/election.models';

export interface ElectionDataSource {
  loadSnapshot(): Observable<ElectionSnapshot>;
}

export const ELECTION_DATA_SOURCE = new InjectionToken<ElectionDataSource>('ELECTION_DATA_SOURCE');
