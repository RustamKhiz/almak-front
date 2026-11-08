import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';

export function bindLockAccessories(
  controls: Record<string, AbstractControl>,
  destroyRef: DestroyRef,
  editing = false,
): void {
  const overridden = new Set<string>();
  for (const key of ['cylinderCount', 'escutcheonCount']) {
    if (editing && controls[key].value !== controls['lockCount'].value) overridden.add(key);
    controls[key].valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => overridden.add(key));
  }
  controls['lockCount'].valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe((count) => {
    for (const key of ['cylinderCount', 'escutcheonCount']) {
      if (!overridden.has(key)) controls[key].setValue(count, { emitEvent: false });
    }
  });
}
