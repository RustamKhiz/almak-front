import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  readonly apiBaseUrl = environment.apiBaseUrl;
}
