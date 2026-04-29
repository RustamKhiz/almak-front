import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  DEFAULT_EXTENSION_COVERING,
  EXTENSION_COVERING_LABELS,
  EXTENSION_COVERING_OPTIONS,
} from '../../constants/molding-catalog';
import { ExtensionItem, OrderItemType } from '../../../types/order.types';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';

export interface ExtensionDialogData {
  mode: 'create' | 'edit';
  extension?: ExtensionItem;
}

export type ExtensionDialogResult = Omit<ExtensionItem, 'id'>;

@Component({
  selector: 'app-extension-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DecimalPipe,
    QuantityFieldComponent,
  ],
  templateUrl: './extension-dialog.component.html',
  styleUrl: './extension-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<ExtensionDialogComponent, ExtensionDialogResult>);
  private readonly data = inject<ExtensionDialogData>(MAT_DIALOG_DATA);
  private lastAutoTotalArea = 0;

  protected readonly coveringOptions = EXTENSION_COVERING_OPTIONS;
  protected readonly coveringLabels = EXTENSION_COVERING_LABELS;

  protected readonly form = this.fb.group({
    color: [this.data.extension?.color ?? '', [Validators.required]],
    covering: [this.data.extension?.covering ?? DEFAULT_EXTENSION_COVERING, [Validators.required]],
    width: [this.data.extension?.width ?? null, [Validators.required, Validators.min(1)]],
    height: [this.data.extension?.height ?? null, [Validators.required, Validators.min(1)]],
    quantityPerSet: [this.data.extension?.quantityPerSet ?? 0.5, [Validators.required, Validators.min(0.5)]],
    totalArea: [this.data.extension?.totalArea ?? null, [Validators.required, Validators.min(0)]],
    price: [this.data.extension?.price ?? null, [Validators.required, Validators.min(0)]],
    comment: [this.data.extension?.comment ?? ''],
  });

  protected readonly title = computed(() => (this.data.mode === 'edit' ? 'Редактировать доборы' : 'Добавить доборы'));

  constructor() {
    this.lastAutoTotalArea = this.calculateArea(
      this.form.controls.width.value,
      this.form.controls.height.value,
      this.form.controls.quantityPerSet.value,
    );

    if (this.form.controls.totalArea.value == null) {
      this.form.controls.totalArea.setValue(this.lastAutoTotalArea, { emitEvent: false });
    }

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ width, height, quantityPerSet }) => {
      const nextAutoTotalArea = this.calculateArea(width ?? null, height ?? null, quantityPerSet ?? null);
      const currentTotalArea = this.form.controls.totalArea.value;

      if (currentTotalArea == null || currentTotalArea === this.lastAutoTotalArea) {
        this.form.controls.totalArea.setValue(nextAutoTotalArea, { emitEvent: false });
      }

      this.lastAutoTotalArea = nextAutoTotalArea;
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
      type: OrderItemType.Extension,
      color: value.color?.trim(),
      covering: value.covering,
      width: value.width,
      height: value.height,
      quantityPerSet: value.quantityPerSet,
      totalArea: value.totalArea,
      comment: value.comment?.trim(),
      count: 1,
      price: value.price,
    });
  }

  protected getDraftTotal(): number {
    const value = this.form.getRawValue();

    return Number(value.totalArea ?? 0) * Number(value.price ?? 0);
  }

  private calculateArea(width: number | null, height: number | null, quantityPerSet: number | null): number {
    if (width == null || height == null || quantityPerSet == null) {
      return 0;
    }

    return Number(((width * height * quantityPerSet) / 10000).toFixed(2));
  }
}
