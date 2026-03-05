import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[appPhoneMask]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneMaskDirective),
      multi: true,
    },
  ],
})
export class PhoneMaskDirective implements ControlValueAccessor {
  private readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);

  private onChange: (value: string) => void = () => {
    // no-op
  };
  private onTouched: () => void = () => {
    // no-op
  };

  writeValue(value: string | null): void {
    const digits = this.normalize(value ?? '');
    this.elementRef.nativeElement.value = this.format(digits);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.elementRef.nativeElement.disabled = isDisabled;
  }

  @HostListener('input', ['$event'])
  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const digits = this.normalize(input?.value ?? '');
    this.elementRef.nativeElement.value = this.format(digits);
    this.onChange(digits);
  }

  @HostListener('blur')
  protected onBlur(): void {
    this.onTouched();
  }

  private normalize(raw: string): string {
    let digits = raw.replace(/\D/g, '');
    if (!digits) {
      return '';
    }

    if (digits.startsWith('8')) {
      digits = `7${digits.slice(1)}`;
    } else if (digits.startsWith('9')) {
      digits = `7${digits}`;
    } else if (!digits.startsWith('7')) {
      digits = `7${digits}`;
    }

    return digits.slice(0, 11);
  }

  private format(digits: string): string {
    if (!digits) {
      return '';
    }

    const local = digits.startsWith('7') ? digits.slice(1) : digits;
    let result = '+7';

    if (local.length > 0) {
      result += ` (${local.slice(0, 3)}`;
    }
    if (local.length >= 3) {
      result += ')';
    }
    if (local.length > 3) {
      result += ` ${local.slice(3, 6)}`;
    }
    if (local.length > 6) {
      result += `-${local.slice(6, 8)}`;
    }
    if (local.length > 8) {
      result += `-${local.slice(8, 10)}`;
    }

    return result;
  }
}
