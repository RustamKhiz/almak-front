import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { OrderPayment } from '../../../types/order.types';
import { DraggableDialogTitleComponent } from '../draggable-dialog-title/draggable-dialog-title.component';

export interface OrderPaymentHistoryDialogData {
  payments: readonly OrderPayment[];
}

@Component({
  selector: 'app-order-payment-history-dialog',
  imports: [DraggableDialogTitleComponent, MatDialogModule, MatButtonModule, DatePipe],
  templateUrl: './order-payment-history-dialog.component.html',
  styleUrl: './order-payment-history-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPaymentHistoryDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<OrderPaymentHistoryDialogComponent, OrderPayment | null>);

  protected readonly data = inject<OrderPaymentHistoryDialogData>(MAT_DIALOG_DATA);

  protected canReversePayment(payment: OrderPayment): boolean {
    return payment.reversalOfPaymentId === null && payment.reversedByPaymentId === null;
  }

  protected isReversalPayment(payment: OrderPayment): boolean {
    return payment.reversalOfPaymentId !== null;
  }

  protected getPaymentAmountLabel(payment: OrderPayment): string {
    const sign = payment.amount < 0 ? '-' : '+';
    return `${sign}${Math.abs(payment.amount).toLocaleString('ru-RU')} ₽`;
  }

  protected getPaymentComment(payment: OrderPayment): string {
    if (payment.comment) {
      return payment.comment;
    }

    return 'Без комментария';
  }

  protected getPaymentDirectionLabel(payment: OrderPayment): string {
    return this.isReversalPayment(payment) ? 'Корректировка' : 'Оплата';
  }

  protected onReverseClick(payment: OrderPayment): void {
    this.dialogRef.close(payment);
  }
}
