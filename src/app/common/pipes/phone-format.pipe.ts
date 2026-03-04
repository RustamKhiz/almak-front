import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneFormat',
  standalone: true,
})
export class PhoneFormatPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    const digits = this.normalize(value ?? '');
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
}
