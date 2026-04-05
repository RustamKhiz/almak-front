import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HardwareItem, HardwareMechanismType, OrderItemType } from '../../../types/order.types';

export interface HardwareDialogData {
  mode: 'create' | 'edit';
  hardware?: HardwareItem;
}

export type HardwareDialogResult = Omit<HardwareItem, 'id'>;

const HARDWARE_MECHANISM_OPTIONS: readonly HardwareMechanismType[] = [
  HardwareMechanismType.Lock,
  HardwareMechanismType.Fixator,
] as const;

const HARDWARE_MECHANISM_LABELS: Readonly<Record<HardwareMechanismType, string>> = {
  [HardwareMechanismType.Lock]: 'Замок',
  [HardwareMechanismType.Fixator]: 'Фиксатор',
};

@Component({
  selector: 'app-hardware-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './hardware-dialog.component.html',
  styleUrl: './hardware-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HardwareDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<HardwareDialogComponent, HardwareDialogResult>);
  private readonly data = inject<HardwareDialogData>(MAT_DIALOG_DATA);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly mechanismOptions = HARDWARE_MECHANISM_OPTIONS;
  protected readonly mechanismLabels = HARDWARE_MECHANISM_LABELS;

  protected readonly form = this.fb.group(
    {
      handleModel: [this.data.hardware?.handleModel ?? ''],
      handleColor: [this.data.hardware?.handleColor ?? ''],
      handleCount: [this.data.hardware?.handleCount ?? (null as number | null)],
      handlePrice: [this.data.hardware?.handlePrice ?? (null as number | null)],
      mechanismType: [this.data.hardware?.mechanismType ?? (null as HardwareMechanismType | null)],
      mechanismCount: [this.data.hardware?.mechanismCount ?? (null as number | null)],
      mechanismPrice: [this.data.hardware?.mechanismPrice ?? (null as number | null)],
      thumbturnCount: [this.data.hardware?.thumbturnCount ?? (null as number | null)],
      thumbturnPrice: [this.data.hardware?.thumbturnPrice ?? (null as number | null)],
      escutcheonCount: [this.data.hardware?.escutcheonCount ?? (null as number | null)],
      escutcheonPrice: [this.data.hardware?.escutcheonPrice ?? (null as number | null)],
      cylinderCount: [this.data.hardware?.cylinderCount ?? (null as number | null)],
      cylinderPrice: [this.data.hardware?.cylinderPrice ?? (null as number | null)],
      boltCount: [this.data.hardware?.boltCount ?? (null as number | null)],
      boltPrice: [this.data.hardware?.boltPrice ?? (null as number | null)],
      hingeCount: [this.data.hardware?.hingeCount ?? (null as number | null)],
      hingePrice: [this.data.hardware?.hingePrice ?? (null as number | null)],
      doorStopCount: [this.data.hardware?.doorStopCount ?? (null as number | null)],
      doorStopPrice: [this.data.hardware?.doorStopPrice ?? (null as number | null)],
      comment: [this.data.hardware?.comment ?? ''],
    },
    { validators: [hardwareNotEmptyValidator()] },
  );

  protected readonly title = computed(() =>
    this.data.mode === 'edit' ? 'Редактировать фурнитуру' : 'Добавить фурнитуру',
  );

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.form.hasError('emptyHardware')) {
        this.form.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  protected onCancelClick(): void {
    this.dialogRef.close();
  }

  protected onSaveClick(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      type: OrderItemType.Hardware,
      handleModel: value.handleModel?.trim() || '',
      handleColor: value.handleColor?.trim() || '',
      handleCount: normalizeOptionalNumber(value.handleCount),
      handlePrice: normalizeOptionalNumber(value.handlePrice),
      mechanismType: value.mechanismType ?? null,
      mechanismCount: normalizeOptionalNumber(value.mechanismCount),
      mechanismPrice: normalizeOptionalNumber(value.mechanismPrice),
      thumbturnCount: normalizeOptionalNumber(value.thumbturnCount),
      thumbturnPrice: normalizeOptionalNumber(value.thumbturnPrice),
      escutcheonCount: normalizeOptionalNumber(value.escutcheonCount),
      escutcheonPrice: normalizeOptionalNumber(value.escutcheonPrice),
      cylinderCount: normalizeOptionalNumber(value.cylinderCount),
      cylinderPrice: normalizeOptionalNumber(value.cylinderPrice),
      boltCount: normalizeOptionalNumber(value.boltCount),
      boltPrice: normalizeOptionalNumber(value.boltPrice),
      hingeCount: normalizeOptionalNumber(value.hingeCount),
      hingePrice: normalizeOptionalNumber(value.hingePrice),
      doorStopCount: normalizeOptionalNumber(value.doorStopCount),
      doorStopPrice: normalizeOptionalNumber(value.doorStopPrice),
      comment: value.comment?.trim() || '',
    });
  }
}

function hardwareNotEmptyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as Record<string, unknown> | null;
    if (!value) {
      return { emptyHardware: true };
    }

    const hasValue = Object.entries(value).some(([key, fieldValue]) => {
      if (key === 'mechanismType') {
        return typeof fieldValue === 'string' && fieldValue.trim() !== '';
      }
      if (typeof fieldValue === 'string') {
        return fieldValue.trim() !== '';
      }
      if (typeof fieldValue === 'number') {
        return !Number.isNaN(fieldValue);
      }
      return fieldValue !== null && fieldValue !== undefined;
    });

    return hasValue ? null : { emptyHardware: true };
  };
}

function normalizeOptionalNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return value;
}
