import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  readonly apiBaseUrl = 'http://localhost:8081';
}
