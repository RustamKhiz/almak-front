const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export interface AuthTokenStorage {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(accessToken: string, refreshToken?: string): void;
  clear(): void;
}

class WebAuthTokenStorage implements AuthTokenStorage {
  private accessToken: string | null = null;

  constructor() {
    // Remove credentials left by versions that stored web tokens in localStorage.
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): null {
    return null;
  }

  setTokens(accessToken: string): void {
    this.accessToken = accessToken;
  }

  clear(): void {
    this.accessToken = null;
  }
}

class DesktopAuthTokenStorage implements AuthTokenStorage {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function createAuthTokenStorage(isDesktop: boolean): AuthTokenStorage {
  return isDesktop ? new DesktopAuthTokenStorage() : new WebAuthTokenStorage();
}
