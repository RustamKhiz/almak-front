import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshRequest$: ReturnType<AuthService['refreshToken']> | null = null;

function getErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'Нет соединения с сервером';
  if (error.status === 403) return 'Нет доступа';
  if (error.status === 404) return 'Ресурс не найден';
  if (error.status >= 500) return 'Ошибка сервера. Попробуйте позже';
  return `Ошибка запроса (${error.status})`;
}

export const appInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const snackBar = inject(MatSnackBar);
  const token = authService.getToken();
  const isAuthRequest = req.url.endsWith('/login') || req.url.endsWith('/refresh') || req.url.endsWith('/logout');
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
      if (error.status !== 401 || isAuthRequest || !authService.canRefresh()) {
        if (error.status === 401) {
          authService.clearSession();
          if (!router.url.startsWith('/auth')) {
            router.navigate(['/auth']);
          }
        } else if (!isAuthRequest) {
          snackBar.open(getErrorMessage(error), 'Закрыть', {
            duration: 5000,
            panelClass: 'snack-error',
          });
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
          authService.clearSession();
          if (!router.url.startsWith('/auth')) {
            router.navigate(['/auth']);
          }

          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
