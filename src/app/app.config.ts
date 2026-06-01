import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';

import { routes } from './app.routes';
import { appInterceptor } from './interceptor/interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, ...(environment.useHashRouting ? [withHashLocation()] : [])),
    provideHttpClient(withInterceptors([appInterceptor])),
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { disableClose: true } },
  ],
};
