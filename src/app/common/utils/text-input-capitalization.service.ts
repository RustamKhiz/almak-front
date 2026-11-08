import { DestroyRef, Injectable, inject } from '@angular/core';
import { capitalizeFirstLetter } from './form-text';

@Injectable({ providedIn: 'root' })
export class TextInputCapitalizationService {
  constructor() {
    const normalize = (event: Event) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
      if (event instanceof InputEvent && event.isComposing) return;
      if (field instanceof HTMLInputElement && !['text', 'search'].includes(field.type)) return;
      if (field.closest('app-auth, [data-preserve-case]') || /password|username|email/i.test(field.autocomplete))
        return;
      const value = capitalizeFirstLetter(field.value);
      if (value === field.value) return;
      const start = field.selectionStart,
        end = field.selectionEnd,
        direction = field.selectionDirection;
      const difference = value.length - field.value.length;
      field.value = value;
      if (start !== null && end !== null)
        field.setSelectionRange(start + (start ? difference : 0), end + (end ? difference : 0), direction ?? undefined);
    };
    document.addEventListener('input', normalize, true);
    document.addEventListener('compositionend', normalize, true);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('input', normalize, true);
      document.removeEventListener('compositionend', normalize, true);
    });
  }
}
