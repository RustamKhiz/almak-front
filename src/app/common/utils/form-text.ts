import { AbstractControl } from '@angular/forms';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export function capitalizeFirstLetter(value: string): string {
  const trimmedStart = value.trimStart();

  if (!trimmedStart) {
    return value;
  }

  const leadingWhitespaceLength = value.length - trimmedStart.length;
  const leadingWhitespace = value.slice(0, leadingWhitespaceLength);

  return `${leadingWhitespace}${trimmedStart.charAt(0).toLocaleUpperCase()}${trimmedStart.slice(1)}`;
}

export function capitalizeEachWord(value: string): string {
  return value.replace(/(?:^|\s)\S/g, (char) => char.toLocaleUpperCase());
}

export function bindLeadingCapitalization(control: AbstractControl<string | null>, destroyRef: DestroyRef): void {
  control.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe((value) => {
    if (typeof value !== 'string') {
      return;
    }

    const normalizedValue = capitalizeFirstLetter(value);
    if (normalizedValue === value) {
      return;
    }

    control.setValue(normalizedValue, { emitEvent: false });
  });
}

export function bindEachWordCapitalization(control: AbstractControl<string | null>, destroyRef: DestroyRef): void {
  control.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe((value) => {
    if (typeof value !== 'string') {
      return;
    }

    const normalizedValue = capitalizeEachWord(value);
    if (normalizedValue === value) {
      return;
    }

    control.setValue(normalizedValue, { emitEvent: false });
  });
}
