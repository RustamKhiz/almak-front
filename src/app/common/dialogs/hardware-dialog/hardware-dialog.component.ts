import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HardwareItem, OrderItemType } from '../../../types/order.types';
import { bindLeadingCapitalization } from '../../utils/form-text';

export interface HardwareDialogData {
  mode: 'create' | 'edit';
  hardware?: HardwareItem;
}

export type HardwareDialogResult = Omit<HardwareItem, 'id'>;

@Component({
  selector: 'app-hardware-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './hardware-dialog.component.html',
  styleUrl: './hardware-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HardwareDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<HardwareDialogComponent, HardwareDialogResult>);
  private readonly data = inject<HardwareDialogData>(MAT_DIALOG_DATA);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = this.fb.nonNullable.group(
    {
      handleModel: this.data.hardware?.handleModel ?? '',
      handleColor: this.data.hardware?.handleColor ?? '',
      handleCount: [this.data.hardware?.handleCount ?? null, [optionalIntegerValidator(), Validators.min(0)]],
      handlePrice: this.data.hardware?.handlePrice ?? null,
      lockCount: [this.data.hardware?.lockCount ?? null, [optionalIntegerValidator(), Validators.min(0)]],
      lockPrice: this.data.hardware?.lockPrice ?? null,
      fixatorCount: [this.data.hardware?.fixatorCount ?? null, [optionalIntegerValidator(), Validators.min(0)]],
      fixatorPrice: this.data.hardware?.fixatorPrice ?? null,
      clickCount: [this.data.hardware?.clickCount ?? null, [optionalIntegerValidator(), Validators.min(0)]],
      clickPrice: this.data.hardware?.clickPrice ?? null,
      thumbturnCount: [this.data.hardware?.thumbturnCount ?? null, [optionalIntegerValidator(), Validators.min(0)]],
      thumbturnPrice: this.data.hardware?.thumbturnPrice ?? null,
      escutcheonCount: [this.data.hardware?.escutcheonCount ?? null, [optionalIntegerValidator(), Validators.min(0)]],
      escutcheonPrice: this.data.hardware?.escutcheonPrice ?? null,
      cylinderCount: [this.data.hardware?.cylinderCount ?? null, [optionalIntegerValidator(), Validators.min(0)]],
      cylinderPrice: this.data.hardware?.cylinderPrice ?? null,
      boltCount: [this.data.hardware?.boltCount ?? null, [optionalIntegerValidator(), Validators.min(0)]],
      boltPrice: this.data.hardware?.boltPrice ?? null,
      hingeCount: [this.data.hardware?.hingeCount ?? null, [optionalIntegerValidator(), Validators.min(0)]],
      hingePrice: this.data.hardware?.hingePrice ?? null,
      doorStopCount: [this.data.hardware?.doorStopCount ?? null, [optionalIntegerValidator(), Validators.min(0)]],
      doorStopPrice: this.data.hardware?.doorStopPrice ?? null,
      comment: this.data.hardware?.comment ?? '',
    },
    { validators: [hardwareNotEmptyValidator()] },
  );

  protected readonly title = computed(() =>
    this.data.mode === 'edit' ? 'Редактировать фурнитуру' : 'Добавить фурнитуру',
  );

  constructor() {
    bindLeadingCapitalization(this.form.controls.handleModel, this.destroyRef);
    bindLeadingCapitalization(this.form.controls.handleColor, this.destroyRef);

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
      handleModel: value.handleModel.trim(),
      handleColor: value.handleColor.trim(),
      handleCount: normalizeOptionalInteger(value.handleCount),
      handlePrice: value.handlePrice,
      lockCount: normalizeOptionalInteger(value.lockCount),
      lockPrice: value.lockPrice,
      fixatorCount: normalizeOptionalInteger(value.fixatorCount),
      fixatorPrice: value.fixatorPrice,
      clickCount: normalizeOptionalInteger(value.clickCount),
      clickPrice: value.clickPrice,
      thumbturnCount: normalizeOptionalInteger(value.thumbturnCount),
      thumbturnPrice: value.thumbturnPrice,
      escutcheonCount: normalizeOptionalInteger(value.escutcheonCount),
      escutcheonPrice: value.escutcheonPrice,
      cylinderCount: normalizeOptionalInteger(value.cylinderCount),
      cylinderPrice: value.cylinderPrice,
      boltCount: normalizeOptionalInteger(value.boltCount),
      boltPrice: value.boltPrice,
      hingeCount: normalizeOptionalInteger(value.hingeCount),
      hingePrice: value.hingePrice,
      doorStopCount: normalizeOptionalInteger(value.doorStopCount),
      doorStopPrice: value.doorStopPrice,
      comment: value.comment.trim(),
    });
  }
}

function optionalIntegerValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === '') {
      return null;
    }

    return Number.isInteger(Number(value)) ? null : { integer: true };
  };
}

function normalizeOptionalInteger(value: number | null): number | null {
  if (value === null || value <= 0) {
    return null;
  }

  return Math.round(value);
}

function hardwareNotEmptyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as Record<string, unknown> | null;
    if (!value) {
      return { emptyHardware: true };
    }

    const hasValue = Object.values(value).some((fieldValue) => {
      if (typeof fieldValue === 'string') {
        return fieldValue.trim() !== '';
      }
      return fieldValue != null;
    });

    return hasValue ? null : { emptyHardware: true };
  };
}
