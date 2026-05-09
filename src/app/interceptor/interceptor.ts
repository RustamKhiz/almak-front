import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshRequest$: ReturnType<AuthService['refreshToken']> | null = null;

export const appInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = authService.getToken();
  const isAuthRequest = req.url.endsWith('/login') || req.url.endsWith('/refresh');
  const request =
    token && !isAuthRequest
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthRequest || !authService.getRefreshToken()) {
        if (error.status === 401) {
          authService.logout();
          if (!router.url.startsWith('/auth')) {
            router.navigate(['/auth']);
          }
        }

        return throwError(() => error);
      }

      if (!refreshRequest$) {
        refreshRequest$ = authService.refreshToken().pipe(
          shareReplay(1),
          finalize(() => {
            refreshRequest$ = null;
          }),
        );
      }

      return refreshRequest$.pipe(
        switchMap((nextToken) =>
          next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${nextToken}`,
              },
            }),
          ),
        ),
        catchError((refreshError) => {
          authService.logout();
          if (!router.url.startsWith('/auth')) {
            router.navigate(['/auth']);
          }

          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
