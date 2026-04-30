import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CoreService } from './core.service';

interface LoginRequest {
  login: string;
  password: string;
}

interface TokenPairResponse {
  token: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly coreService = inject(CoreService);

  private readonly tokenKey = 'auth_token';
  private readonly refreshTokenKey = 'auth_refresh_token';

  login(payload: LoginRequest): Observable<string> {
    return this.http.post<TokenPairResponse>(`${this.coreService.apiBaseUrl}/login`, payload).pipe(
      tap((response) => this.setTokens(response.token, response.refreshToken)),
      map((response) => response.token),
    );
  }

  refreshToken(): Observable<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    return this.http.post<TokenPairResponse>(`${this.coreService.apiBaseUrl}/refresh`, { refreshToken }).pipe(
      tap((response) => this.setTokens(response.token, response.refreshToken)),
      map((response) => response.token),
    );
  }

  logout(): void {
    this.clearTokens();
  }

  hasToken(): boolean {
    return !!this.getToken() || !!this.getRefreshToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  clearToken(): void {
    this.clearTokens();
  }

  private setTokens(token: string, refreshToken: string): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }
}
