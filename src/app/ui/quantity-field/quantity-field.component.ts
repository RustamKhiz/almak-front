import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-quantity-field',
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './quantity-field.component.html',
  styleUrl: './quantity-field.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuantityFieldComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuantityFieldComponent implements ControlValueAccessor {
  readonly label = input('Количество');
  readonly min = input(1);

  protected value = 1;
  protected disabled = false;

  private onChange: (value: number) => void = () => {
    /* empty */
  };

  private onTouched: () => void = () => {
    /* empty */
  };

  writeValue(value: number | null): void {
    this.value = this.normalizeValue(value);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected decrease(): void {
    if (this.disabled) {
      return;
    }

    this.updateValue(this.value - 1);
  }

  protected increase(): void {
    if (this.disabled) {
      return;
    }

    this.updateValue(this.value + 1);
  }

  protected onInput(value: string | number): void {
    this.updateValue(Number(value));
  }

  protected markTouched(): void {
    this.onTouched();
  }

  private updateValue(value: number): void {
    this.value = this.normalizeValue(value);
    this.onChange(this.value);
    this.onTouched();
  }

  private normalizeValue(value: number | null | undefined): number {
    const fallback = this.min();
    const normalized = Number.isFinite(value) ? Number(value) : fallback;
    return Math.max(this.min(), Math.floor(normalized || fallback));
  }
}
