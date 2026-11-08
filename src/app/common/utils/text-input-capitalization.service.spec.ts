import { TestBed } from '@angular/core/testing';
import { TextInputCapitalizationService } from './text-input-capitalization.service';

describe('Text field capitalization', () => {
  let container: HTMLElement;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    TestBed.inject(TextInputCapitalizationService);
    container = document.createElement('section');
    document.body.append(container);
  });
  afterEach(() => container.remove());
  it('normalizes actual input before form listeners and retains spaces and the cursor', () => {
    const field = document.createElement('input');
    container.append(field);
    field.value = 'белая ';
    field.setSelectionRange(3, 3);
    let observed = '';
    field.addEventListener('input', () => {
      observed = field.value;
    });
    field.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(observed).toBe('Белая ');
    expect(field.selectionStart).toBe(3);
  });
  it('leaves credentials and composition in progress unchanged', () => {
    const field = document.createElement('input');
    container.append(field);
    field.autocomplete = 'username';
    field.value = 'manager1';
    field.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(field.value).toBe('manager1');
    field.autocomplete = '';
    field.value = 'верона';
    field.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    expect(field.value).toBe('верона');
    field.dispatchEvent(new Event('compositionend', { bubbles: true }));
    expect(field.value).toBe('Верона');
  });
});
