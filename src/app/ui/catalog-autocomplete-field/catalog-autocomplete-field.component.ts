import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, forwardRef, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { map, startWith } from 'rxjs/operators';

type CatalogOption = string | number;
type ValueMode = 'text' | 'number';

@Component({
  selector: 'app-catalog-autocomplete-field',
  imports: [AsyncPipe, FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  templateUrl: './catalog-autocomplete-field.component.html',
  styleUrl: './catalog-autocomplete-field.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CatalogAutocompleteFieldComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogAutocompleteFieldComponent implements ControlValueAccessor {
  private readonly destroyRef = inject(DestroyRef);

  readonly title = input.required<string>();
  readonly options = input.required<readonly CatalogOption[]>();
  readonly mode = input<ValueMode>('text');
  readonly min = input(1);

  protected readonly control = new FormControl<string>('', { nonNullable: true });
  protected readonly filteredOptions = this.control.valueChanges.pipe(
    startWith(this.control.value),
    map((value) => this.filterOptions(value)),
  );

  protected disabled = false;

  private onChange: (value: CatalogOption) => void = () => {
    /* empty */
  };

  private onTouched: () => void = () => {
    /* empty */
  };

  constructor() {
    this.control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.emitValue(value);
    });
  }

  writeValue(value: CatalogOption | null): void {
    this.control.setValue(value == null ? '' : `${value}`, { emitEvent: false });
  }

  registerOnChange(fn: (value: CatalogOption) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;

    if (isDisabled) {
      this.control.disable({ emitEvent: false });
      return;
    }

    this.control.enable({ emitEvent: false });
  }

  protected onOptionSelected(value: CatalogOption): void {
    this.control.setValue(`${value}`, { emitEvent: false });
    this.onChange(value);
    this.onTouched();
  }

  protected markTouched(): void {
    this.onTouched();
  }

  private filterOptions(value: string): readonly CatalogOption[] {
    const query = value.trim().toLowerCase();

    if (!query) {
      return this.options();
    }

    return this.options().filter((option) => `${option}`.toLowerCase().includes(query));
  }

  private emitValue(value: string): void {
    if (this.mode() === 'number') {
      const parsed = +value;
      if (!Number.isFinite(parsed)) {
        return;
      }

      this.onChange(Math.max(this.min(), Math.floor(parsed)));
      return;
    }

    this.onChange(value);
  }
}
