import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HardwareItem, OrderItemType } from '../../../types/order.types';
import { bindLeadingCapitalization } from '../../utils/form-text';

export interface HardwareDialogData {
  mode: 'create' | 'edit';
  hardware?: HardwareItem;
  defaultColor?: string;
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
      handleColor: this.data.hardware?.handleColor ?? this.data.defaultColor ?? '',
      handleCount: this.data.hardware?.handleCount ?? null,
      handlePrice: this.data.hardware?.handlePrice ?? null,
      lockCount: this.data.hardware?.lockCount ?? null,
      lockPrice: this.data.hardware?.lockPrice ?? null,
      fixatorCount: this.data.hardware?.fixatorCount ?? null,
      fixatorPrice: this.data.hardware?.fixatorPrice ?? null,
      clickCount: this.data.hardware?.clickCount ?? null,
      clickPrice: this.data.hardware?.clickPrice ?? null,
      thumbturnCount: this.data.hardware?.thumbturnCount ?? null,
      thumbturnPrice: this.data.hardware?.thumbturnPrice ?? null,
      escutcheonCount: this.data.hardware?.escutcheonCount ?? null,
      escutcheonPrice: this.data.hardware?.escutcheonPrice ?? null,
      cylinderCount: this.data.hardware?.cylinderCount ?? null,
      cylinderPrice: this.data.hardware?.cylinderPrice ?? null,
      boltCount: this.data.hardware?.boltCount ?? null,
      boltPrice: this.data.hardware?.boltPrice ?? null,
      hingeCount: this.data.hardware?.hingeCount ?? null,
      hingePrice: this.data.hardware?.hingePrice ?? null,
      doorStopCount: this.data.hardware?.doorStopCount ?? null,
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
      handleCount: value.handleCount,
      handlePrice: value.handlePrice,
      lockCount: value.lockCount,
      lockPrice: value.lockPrice,
      fixatorCount: value.fixatorCount,
      fixatorPrice: value.fixatorPrice,
      clickCount: value.clickCount,
      clickPrice: value.clickPrice,
      thumbturnCount: value.thumbturnCount,
      thumbturnPrice: value.thumbturnPrice,
      escutcheonCount: value.escutcheonCount,
      escutcheonPrice: value.escutcheonPrice,
      cylinderCount: value.cylinderCount,
      cylinderPrice: value.cylinderPrice,
      boltCount: value.boltCount,
      boltPrice: value.boltPrice,
      hingeCount: value.hingeCount,
      hingePrice: value.hingePrice,
      doorStopCount: value.doorStopCount,
      doorStopPrice: value.doorStopPrice,
      comment: value.comment.trim(),
    });
  }
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
