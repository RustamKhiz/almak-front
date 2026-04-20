import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  DEFAULT_PANELING_COVERING,
  PANELING_COVERING_LABELS,
  PANELING_COVERING_OPTIONS,
} from '../../constants/molding-catalog';
import { OrderItemType, PanelingItem } from '../../../types/order.types';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';

export interface PanelingDialogData {
  mode: 'create' | 'edit';
  paneling?: PanelingItem;
}

export type PanelingDialogResult = Omit<PanelingItem, 'id'>;

@Component({
  selector: 'app-paneling-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    QuantityFieldComponent,
  ],
  templateUrl: './paneling-dialog.component.html',
  styleUrl: './paneling-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelingDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<PanelingDialogComponent, PanelingDialogResult>);
  private readonly data = inject<PanelingDialogData>(MAT_DIALOG_DATA);
  private lastAutoTotalArea = 0;

  protected readonly coveringOptions = PANELING_COVERING_OPTIONS;
  protected readonly coveringLabels = PANELING_COVERING_LABELS;

  protected readonly form = this.fb.group({
    color: [this.data.paneling?.color ?? '', [Validators.required]],
    count: [this.data.paneling?.count ?? 1, [Validators.required, Validators.min(1)]],
    price: [this.data.paneling?.price ?? null, [Validators.required, Validators.min(0)]],
    covering: [this.data.paneling?.covering ?? DEFAULT_PANELING_COVERING, [Validators.required]],
    width: [this.data.paneling?.width ?? null, [Validators.required, Validators.min(1)]],
    height: [this.data.paneling?.height ?? null, [Validators.required, Validators.min(1)]],
    quantityPerSet: [this.data.paneling?.quantityPerSet ?? 0.5, [Validators.required, Validators.min(0.5)]],
    totalArea: [this.data.paneling?.totalArea ?? null, [Validators.required, Validators.min(0)]],
    comment: [this.data.paneling?.comment ?? ''],
  });

  protected readonly title = computed(() =>
    this.data.mode === 'edit' ? 'Редактировать обшивку' : 'Добавить обшивку',
  );

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
      type: OrderItemType.Paneling,
      color: value.color.trim(),
      size: `${value.width}x${value.height}`,
      count: value.count,
      price: value.price,
      covering: value.covering,
      width: value.width,
      height: value.height,
      quantityPerSet: value.quantityPerSet,
      totalArea: value.totalArea,
      comment: value.comment.trim(),
    });
  }

  private calculateArea(width: number | null, height: number | null, quantityPerSet: number | null): number {
    if (width == null || height == null || quantityPerSet == null) {
      return 0;
    }

    return Number(((width * height * quantityPerSet) / 10000).toFixed(2));
  }
}
