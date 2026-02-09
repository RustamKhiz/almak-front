import { CanActivateFn } from '@angular/router';

const AUTH_GUARD_ENABLED = false;

export const authGuard: CanActivateFn = () => {
  if (!AUTH_GUARD_ENABLED) {
    return true;
  }

  return false;
};