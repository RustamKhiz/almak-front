import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CoreService } from './core.service';

type LoginRequest = {
  login: string;
  password: string;
};

type LoginResponse = {
  token: string;
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'auth_token';

  constructor(
    private readonly http: HttpClient,
    private readonly coreService: CoreService,
  ) {}

  login(payload: LoginRequest): Observable<string> {
    return this.http
      .post<LoginResponse>(`${this.coreService.apiBaseUrl}/login`, payload)
      .pipe(
        map((response) => response.token),
        tap((token) => this.setToken(token)),
      );
  }

  logout(): void {
    localStorage.clear();
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }
}
