import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { UserProfile } from './auth.types';

for (const desktop of [false, true]) {
  describe(desktop ? 'Desktop user profile' : 'Web user profile', () => {
    const original = window.almakDesktop;
    let auth: AuthService;
    let http: HttpTestingController;
    const manager: UserProfile = {
      id: 2,
      login: 'manager1',
      name: '',
      role: 'manager',
      permissions: ['orders.read', 'orders.write', 'orders.delete', 'payments.write'],
    };
    beforeEach(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_refresh_token');
      if (desktop)
        window.almakDesktop = {
          platform: 'win32',
          version: 'test',
          installUpdate: jasmine.createSpy('installUpdate'),
          getUpdateState: async () => ({ status: 'unsupported', revision: 0 }),
          checkForUpdates: async () => ({ status: 'unsupported', revision: 0 }),
          onUpdateState: () => jasmine.createSpy('unsubscribe'),
        };
      else delete window.almakDesktop;
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
      auth = TestBed.inject(AuthService);
      http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => {
      http.verify();
      window.almakDesktop = original;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_refresh_token');
    });
    function login() {
      auth.login({ login: 'manager1', password: 'test-placeholder' }).subscribe();
      const request = http.expectOne((r) => r.url.endsWith(desktop ? '/desktop/login' : '/login'));
      expect(request.request.withCredentials).toBe(!desktop);
      request.flush({ token: 'test-access', refreshToken: desktop ? 'test-refresh' : undefined, user: manager });
    }
    it('loads the profile in login and refresh without restricting manager capabilities', () => {
      login();
      expect(auth.profile()?.role).toBe('manager');
      expect(auth.can('orders.delete')).toBeTrue();
      expect(auth.can('payments.write')).toBeTrue();
      auth.refreshToken().subscribe();
      const request = http.expectOne((r) => r.url.endsWith(desktop ? '/desktop/refresh' : '/refresh'));
      request.flush({
        token: 'test-new-access',
        refreshToken: desktop ? 'test-new-refresh' : undefined,
        user: { ...manager, role: 'admin' },
      });
      expect(auth.profile()?.role).toBe('admin');
    });
    it('updates /me and ignores a response from the previous session after logout', () => {
      login();
      auth.loadProfile().subscribe();
      http.expectOne((r) => r.url.endsWith('/me')).flush({ ...manager, name: 'Менеджер' });
      expect(auth.profile()?.name).toBe('Менеджер');
      auth.loadProfile().subscribe();
      const late = http.expectOne((r) => r.url.endsWith('/me'));
      auth.clearSession();
      late.flush(manager);
      expect(auth.profile()).toBeNull();
      expect(auth.can('orders.read')).toBeFalse();
      expect(auth.authenticated()).toBeFalse();
    });
  });
}
