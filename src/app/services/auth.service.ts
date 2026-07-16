import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { CoreService } from './core.service';
import { createAuthTokenStorage } from './auth-token-storage';

interface LoginRequest {
  login: string;
  password: string;
}

interface TokenPairResponse {
  token: string;
  refreshToken?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly coreService = inject(CoreService);

  private readonly isDesktop = !!window.almakDesktop;
  private readonly tokenStorage = createAuthTokenStorage(this.isDesktop);
  private sessionCheckCompleted = false;
  private sessionCheck$: Observable<boolean> | null = null;

  login(payload: LoginRequest): Observable<string> {
    const endpoint = this.isDesktop ? '/desktop/login' : '/login';
    const body = this.isDesktop ? payload : { ...payload, useCookie: true };
    return this.http
      .post<TokenPairResponse>(`${this.coreService.apiBaseUrl}${endpoint}`, body, {
        withCredentials: !this.isDesktop,
      })
      .pipe(
        tap((response) => {
          this.setTokens(response);
          this.sessionCheckCompleted = true;
        }),
        map((response) => response.token),
      );
  }

  refreshToken(): Observable<string> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (this.isDesktop && !refreshToken) {
      return throwError(() => new Error('Missing desktop refresh token'));
    }

    const endpoint = this.isDesktop ? '/desktop/refresh' : '/refresh';
    const body = this.isDesktop ? { refreshToken } : {};
    return this.http
      .post<TokenPairResponse>(`${this.coreService.apiBaseUrl}${endpoint}`, body, {
        withCredentials: !this.isDesktop,
      })
      .pipe(
        tap((response) => this.setTokens(response)),
        map((response) => response.token),
      );
  }

  ensureAuthenticated(): Observable<boolean> {
    if (this.getToken()) {
      return of(true);
    }
    if (this.sessionCheckCompleted) {
      return of(false);
    }
    if (!this.sessionCheck$) {
      this.sessionCheck$ = this.refreshToken().pipe(
        map(() => true),
        catchError(() => {
          this.tokenStorage.clear();
          return of(false);
        }),
        finalize(() => {
          this.sessionCheckCompleted = true;
          this.sessionCheck$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.sessionCheck$;
  }

  logout(): Observable<void> {
    this.clearSession();
    if (this.isDesktop) {
      return of(undefined);
    }

    return this.http
      .post<void>(`${this.coreService.apiBaseUrl}/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(undefined)));
  }

  getToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  canRefresh(): boolean {
    return !this.isDesktop || !!this.tokenStorage.getRefreshToken();
  }

  clearSession(): void {
    this.tokenStorage.clear();
    this.sessionCheckCompleted = true;
  }

  private setTokens(response: TokenPairResponse): void {
    if (this.isDesktop && !response.refreshToken) {
      throw new Error('Desktop auth response is missing refresh token');
    }
    this.tokenStorage.setTokens(response.token, response.refreshToken);
  }
}
