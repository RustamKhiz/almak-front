import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  CAPITAL_COVERING_LABELS,
  CAPITAL_COVERING_OPTIONS,
  DEFAULT_CAPITAL_COVERING,
} from '../../constants/molding-catalog';
import { CapitalItem, OrderItemType } from '../../../types/order.types';
import { QuantityFieldComponent } from '../../../ui/quantity-field/quantity-field.component';

export interface CapitalDialogData {
  mode: 'create' | 'edit';
  capital?: CapitalItem;
}

export type CapitalDialogResult = Omit<CapitalItem, 'id'>;

@Component({
  selector: 'app-capital-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    QuantityFieldComponent,
  ],
  templateUrl: './capital-dialog.component.html',
  styleUrl: './capital-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CapitalDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CapitalDialogComponent, CapitalDialogResult>);
  private readonly data = inject<CapitalDialogData>(MAT_DIALOG_DATA);

  protected readonly coveringOptions = CAPITAL_COVERING_OPTIONS;
  protected readonly coveringLabels = CAPITAL_COVERING_LABELS;

  protected readonly form = this.fb.nonNullable.group({
    name: [this.data.capital?.name ?? '', [Validators.required]],
    color: [this.data.capital?.color ?? '', [Validators.required]],
    covering: [this.data.capital?.covering ?? DEFAULT_CAPITAL_COVERING, [Validators.required]],
    width: [this.data.capital?.width ?? 0, [Validators.required, Validators.min(1)]],
    height: [this.data.capital?.height ?? 0, [Validators.required, Validators.min(1)]],
    price: [this.data.capital?.price ?? 0, [Validators.required, Validators.min(0)]],
    comment: [this.data.capital?.comment ?? ''],
    count: [this.data.capital?.count ?? 1, [Validators.required, Validators.min(1)]],
  });

  protected readonly title = computed(() =>
    this.data.mode === 'edit' ? 'Редактировать капитель' : 'Добавить капитель',
  );

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
      type: OrderItemType.Capital,
      name: value.name.trim(),
      color: value.color.trim(),
      covering: value.covering,
      width: value.width,
      height: value.height,
      price: value.price,
      comment: value.comment.trim(),
      count: value.count,
    });
  }
}
