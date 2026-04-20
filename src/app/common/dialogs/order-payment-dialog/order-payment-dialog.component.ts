import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface OrderPaymentDialogData {
  title?: string;
  confirmText?: string;
}

export interface OrderPaymentDialogResult {
  amount: number;
  comment: string;
}

@Component({
  selector: 'app-order-payment-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './order-payment-dialog.component.html',
  styleUrl: './order-payment-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPaymentDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<OrderPaymentDialogComponent, OrderPaymentDialogResult>);

  protected readonly data = inject<OrderPaymentDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  protected readonly form = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    comment: [''],
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      amount: value.amount,
      comment: value.comment.trim(),
    });
  }
}
