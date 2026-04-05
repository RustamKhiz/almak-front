import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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
    QuantityFieldComponent,
  ],
  templateUrl: './extension-dialog.component.html',
  styleUrl: './extension-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ExtensionDialogComponent, ExtensionDialogResult>);
  private readonly data = inject<ExtensionDialogData>(MAT_DIALOG_DATA);

  protected readonly coveringOptions = EXTENSION_COVERING_OPTIONS;
  protected readonly coveringLabels = EXTENSION_COVERING_LABELS;

  protected readonly form = this.fb.nonNullable.group({
    color: [this.data.extension?.color ?? '', [Validators.required]],
    covering: [this.data.extension?.covering ?? DEFAULT_EXTENSION_COVERING, [Validators.required]],
    width: [this.data.extension?.width ?? 0, [Validators.required, Validators.min(1)]],
    height: [this.data.extension?.height ?? 0, [Validators.required, Validators.min(1)]],
    comment: [this.data.extension?.comment ?? ''],
    count: [this.data.extension?.count ?? 1, [Validators.required, Validators.min(1)]],
    price: [this.data.extension?.price ?? 0, [Validators.required, Validators.min(0)]],
  });

  protected readonly title = computed(() => (this.data.mode === 'edit' ? 'Редактировать доборы' : 'Добавить доборы'));

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
      color: value.color.trim(),
      covering: value.covering,
      width: value.width,
      height: value.height,
      comment: value.comment.trim(),
      count: value.count,
      price: value.price,
    });
  }
}
