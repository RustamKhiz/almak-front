import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NumberInputNoWheelDirective } from '../../directives/number-input-no-wheel.directive';
import { DraggableDialogTitleComponent } from '../draggable-dialog-title/draggable-dialog-title.component';

export interface OrderPaymentDialogData {
  title?: string;
  confirmText?: string;
  commentLabel?: string;
  commentPlaceholder?: string;
  initialAmount?: number | null;
  maxAmount?: number | null;
}

export interface OrderPaymentDialogResult {
  amount: number;
  comment: string;
}

@Component({
  selector: 'app-order-payment-dialog',
  imports: [
    DraggableDialogTitleComponent,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    NumberInputNoWheelDirective,
  ],
  templateUrl: './order-payment-dialog.component.html',
  styleUrl: './order-payment-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPaymentDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<OrderPaymentDialogComponent, OrderPaymentDialogResult>);

  protected readonly data = inject<OrderPaymentDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  protected readonly form = this.fb.group({
    amount: [
      this.data.initialAmount ?? (null as number | null),
      [
        Validators.required,
        Validators.min(0.01),
        ...(this.data.maxAmount != null ? [Validators.max(this.data.maxAmount)] : []),
      ],
    ],
    comment: [''],
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      amount: value.amount!,
      comment: value.comment?.trim() ?? '',
    });
  }
}
