import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CoreService } from './core.service';

interface LoginRequest {
  login: string;
  password: string;
}

interface LoginResponse {
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly coreService = inject(CoreService);

  private readonly tokenKey = 'auth_token';

  login(payload: LoginRequest): Observable<string> {
    return this.http.post<LoginResponse>(`${this.coreService.apiBaseUrl}/login`, payload).pipe(
      map((response) => response.token),
      tap((token) => this.setToken(token)),
    );
  }

  logout(): void {
    this.clearToken();
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }
}
