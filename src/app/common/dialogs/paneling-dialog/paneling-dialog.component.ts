import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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
  private readonly dialogRef = inject(MatDialogRef<PanelingDialogComponent, PanelingDialogResult>);
  private readonly data = inject<PanelingDialogData>(MAT_DIALOG_DATA);

  protected readonly coveringOptions = PANELING_COVERING_OPTIONS;
  protected readonly coveringLabels = PANELING_COVERING_LABELS;

  protected readonly form = this.fb.group({
    color: [this.data.paneling?.color ?? '', [Validators.required]],
    size: [this.data.paneling?.size ?? '', [Validators.required]],
    covering: [this.data.paneling?.covering ?? DEFAULT_PANELING_COVERING, [Validators.required]],
    count: [this.data.paneling?.count ?? 1, [Validators.required, Validators.min(1)]],
    price: [this.data.paneling?.price ?? 0, [Validators.required, Validators.min(0)]],
    comment: [this.data.paneling?.comment ?? ''],
  });

  protected readonly title = computed(() => (this.data.mode === 'edit' ? 'Редактировать обшивку' : 'Добавить обшивку'));

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
      color: value.color?.trim() ?? '',
      size: value.size?.trim() ?? '',
      covering: value.covering ?? DEFAULT_PANELING_COVERING,
      count: Math.max(1, Number(value.count ?? 1)),
      price: Number(value.price ?? 0),
      comment: value.comment?.trim() ?? '',
    });
  }
}
