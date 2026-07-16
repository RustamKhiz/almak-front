import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';
import { getOrderPaymentLabel, getOrderStatusLabel, ORDER_STATUS_OPTIONS } from '../../common/constants/order-status';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../common/confirm-dialog/confirm-dialog.component';
import { OrderItemDetailsDialogComponent } from '../../common/dialogs/order-item-details-dialog/order-item-details-dialog.component';
import { PhoneFormatPipe } from '../../common/pipes/phone-format.pipe';
import { getCustomerDebt, getOrderTotal, getPaidAmount, getTotalToPay } from '../../common/utils/order-calculations';
import {
  OrderPaymentDialogComponent,
  OrderPaymentDialogResult,
} from '../../common/dialogs/order-payment-dialog/order-payment-dialog.component';
import { OrderPaymentHistoryDialogComponent } from '../../common/dialogs/order-payment-history-dialog/order-payment-history-dialog.component';
import { PrintConstructorDialogComponent } from '../../common/dialogs/print-constructor-dialog/print-constructor-dialog.component';
import { PrintConstructorDialogResult } from '../../common/dialogs/print-constructor-dialog/print-constructor.types';
import {
  SupplierDialogComponent,
  SupplierDialogResult,
} from '../../common/dialogs/supplier-dialog/supplier-dialog.component';
import { FileDownloadService } from '../../services/file-download.service';
import { OrderDocumentService } from '../../services/order-document.service';
import { OrderPrintService } from '../../services/order-print.service';
import { OrdersService } from '../../services/orders.service';
import { OrderCreatePayload, OrderPayment, OrderStatus } from '../../types/order.types';
import {
  OrderViewProductCard,
  OrderViewProductCardsService,
  SupplierItemEntity,
} from './order-view-product-cards.service';

interface OrderViewState {
  id: number;
  data: OrderCreatePayload;
}

@Component({
  selector: 'app-order-view',
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    RouterModule,
    DecimalPipe,
    DatePipe,
    PhoneFormatPipe,
    NgClass,
  ],
  templateUrl: './order-view.component.html',
  styleUrl: './order-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderViewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly orderDocumentService = inject(OrderDocumentService);
  private readonly fileDownloadService = inject(FileDownloadService);
  private readonly orderPrintService = inject(OrderPrintService);
  private readonly ordersService = inject(OrdersService);
  private readonly productCardsService = inject(OrderViewProductCardsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly state = signal<OrderViewState | null>(null);
  protected readonly showPrivateInfo = signal(localStorage.getItem('order_view_show_private') !== 'false');
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  protected readonly productCards = computed(() => {
    const current = this.state();
    return current ? this.productCardsService.build(current.data) : [];
  });
  protected readonly paymentHistory = computed(() => {
    const current = this.state();
    return current
      ? [...current.data.payments].sort((a, b) => this.getPaymentTimestamp(b) - this.getPaymentTimestamp(a))
      : [];
  });

  constructor() {
    this.fetchOrder(Number(this.route.snapshot.paramMap.get('id') ?? 0));
  }

  protected togglePrivateInfo(): void {
    const next = !this.showPrivateInfo();
    this.showPrivateInfo.set(next);
    localStorage.setItem('order_view_show_private', String(next));
  }

  protected onDeleteClick(): void {
    const current = this.state();
    if (!current) {
      return;
    }

    const dialogData: ConfirmDialogData = {
      title: 'Удаление заказа',
      message: 'Вы уверены, что хотите удалить заказ?',
      confirmText: 'Да, удалить',
      cancelText: 'Нет',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: dialogData })
      .afterClosed()
      .pipe(
        filter((ok) => ok === true),
        switchMap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
          return this.ordersService.deleteOrder(current.id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.router.navigate(['/orders']),
        error: () => {
          this.errorMessage.set('Не удалось удалить заказ.');
          this.isLoading.set(false);
        },
      });
  }

  protected onPrintConstructorClick(): void {
    const current = this.state();
    if (!current) {
      return;
    }

    this.dialog
      .open(PrintConstructorDialogComponent, {
        width: '900px',
        maxWidth: 'calc(100vw - 24px)',
        data: {
          orderId: current.id,
          order: current.data,
        },
      })
      .afterClosed()
      .pipe(
        filter((result): result is PrintConstructorDialogResult => !!result),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.action === 'print') {
          this.orderPrintService.printHtml(
            this.orderDocumentService.buildCustomOrderHtml(current.id, current.data, result.options),
          );
          return;
        }

        this.fileDownloadService.download(
          this.orderDocumentService.createCustomDocBlob(current.id, current.data, result.options),
          `order-${current.id}-custom.doc`,
        );
      });
  }

  protected onStatusChange(status: OrderStatus): void {
    const current = this.state();
    if (!current || current.data.status === status) {
      return;
    }

    this.ordersService
      .updateOrderStatus(current.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nextStatus) => {
          const state = this.state();
          if (!state) {
            return;
          }
          this.errorMessage.set(null);
          this.state.set({ ...state, data: { ...state.data, status: nextStatus } });
        },
        error: () => {
          this.errorMessage.set('Не удалось обновить статус заказа.');
        },
      });
  }

  protected onProductDetailsClick(card: OrderViewProductCard): void {
    this.dialog.open(OrderItemDetailsDialogComponent, {
      width: '720px',
      maxWidth: 'calc(100vw - 24px)',
      data: card.details,
    });
  }

  protected onChangeSupplierClick(card: OrderViewProductCard): void {
    const current = this.state();
    if (!current) {
      return;
    }

    this.dialog
      .open(SupplierDialogComponent, {
        width: '420px',
        maxWidth: 'calc(100vw - 24px)',
        data: { supplier: card.supplier },
      })
      .afterClosed()
      .pipe(
        filter((result): result is SupplierDialogResult => !!result),
        switchMap((result) => {
          const nextData = this.updateSupplierInOrder(current.data, card.entity, card.itemId, result.supplier);
          return this.ordersService.updateOrder(current.id, nextData).pipe(map(() => nextData));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.errorMessage.set(null);
          this.state.set({ id: current.id, data });
        },
        error: () => {
          this.errorMessage.set('Не удалось изменить поставщика.');
        },
      });
  }

  protected onChangeCostPriceClick(card: OrderViewProductCard): void {
    const current = this.state();
    if (!current) {
      return;
    }

    this.dialog
      .open(OrderPaymentDialogComponent, {
        width: '460px',
        maxWidth: 'calc(100vw - 24px)',
        data: {
          title: 'Закупочная цена',
          confirmText: 'Сохранить',
          commentLabel: '',
          initialAmount: card.costPrice > 0 ? card.costPrice : null,
        },
      })
      .afterClosed()
      .pipe(
        filter((result): result is OrderPaymentDialogResult => !!result),
        switchMap((result) => {
          const nextData = this.updateCostPriceInOrder(current.data, card.entity, card.itemId, result.amount);
          return this.ordersService.updateOrder(current.id, nextData).pipe(map(() => nextData));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.errorMessage.set(null);
          this.state.set({ id: current.id, data });
        },
        error: () => {
          this.errorMessage.set('Не удалось изменить закупочную цену.');
        },
      });
  }

  protected onAddPaymentClick(): void {
    const current = this.state();
    if (!current) {
      return;
    }

    this.dialog
      .open(OrderPaymentDialogComponent, {
        width: '460px',
        maxWidth: 'calc(100vw - 24px)',
        data: {
          title: 'Внести оплату',
          confirmText: 'Добавить платеж',
          maxAmount: this.getCustomerDebt(current.data),
        },
      })
      .afterClosed()
      .pipe(
        filter((result): result is OrderPaymentDialogResult => !!result),
        switchMap((result) => this.ordersService.addOrderPayment(current.id, result.amount, result.comment)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.errorMessage.set(null);
          this.state.set({ id: current.id, data });
        },
        error: () => {
          this.errorMessage.set('Не удалось добавить оплату.');
        },
      });
  }

  protected onChangeDiscountClick(): void {
    const current = this.state();
    if (!current) {
      return;
    }

    this.dialog
      .open(OrderPaymentDialogComponent, {
        width: '460px',
        maxWidth: 'calc(100vw - 24px)',
        data: {
          title: 'Скидка',
          confirmText: 'Сохранить скидку',
          commentLabel: '',
          initialAmount: current.data.discount === 0 ? null : current.data.discount,
        },
      })
      .afterClosed()
      .pipe(
        filter((result): result is OrderPaymentDialogResult => !!result),
        switchMap((result) => this.ordersService.updateOrderDiscount(current.id, result.amount)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.errorMessage.set(null);
          this.state.set({ id: current.id, data });
        },
        error: () => {
          this.errorMessage.set('Не удалось изменить скидку.');
        },
      });
  }

  protected onReversePaymentClick(payment: OrderPayment): void {
    const current = this.state();
    if (!current || !this.canReversePayment(payment)) {
      return;
    }

    const dialogData: ConfirmDialogData = {
      title: 'Удаление оплаты',
      message: 'Подтвердите удаление этой записи об оплате.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: dialogData })
      .afterClosed()
      .pipe(
        filter((ok) => ok === true),
        switchMap(() => this.ordersService.reverseOrderPayment(current.id, payment.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.errorMessage.set(null);
          this.state.set({ id: current.id, data });
        },
        error: () => {
          this.errorMessage.set('Не удалось удалить оплату.');
        },
      });
  }

  protected onPaymentHistoryClick(): void {
    const payments = this.paymentHistory();

    this.dialog
      .open(OrderPaymentHistoryDialogComponent, {
        width: '760px',
        maxWidth: 'calc(100vw - 24px)',
        data: { payments },
      })
      .afterClosed()
      .pipe(
        filter((payment): payment is OrderPayment => !!payment),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((payment) => this.onReversePaymentClick(payment));
  }

  protected getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }

  protected getPaymentLabel(isPaid: boolean): string {
    return getOrderPaymentLabel(isPaid);
  }

  protected getOrderTotal(order: OrderCreatePayload): number {
    return getOrderTotal(order);
  }

  protected getPaidAmount(order: OrderCreatePayload): number {
    return getPaidAmount(order);
  }

  protected getTotalToPay(order: OrderCreatePayload): number {
    return getTotalToPay(order);
  }

  protected getCustomerDebt(order: OrderCreatePayload): number {
    return getCustomerDebt(order);
  }

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

  private getPaymentTimestamp(payment: OrderPayment): number {
    return payment.createdAt ? new Date(payment.createdAt).getTime() : 0;
  }

  private fetchOrder(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.ordersService
      .getOrder(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.state.set({ id, data });
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Не удалось загрузить заказ.');
          this.isLoading.set(false);
        },
      });
  }

  private updateSupplierInOrder(
    order: OrderCreatePayload,
    entity: SupplierItemEntity,
    itemId: number,
    supplier: string,
  ): OrderCreatePayload {
    return {
      ...order,
      [entity]: order[entity].map((item) => (item.id === itemId ? { ...item, supplier } : item)),
    };
  }

  private updateCostPriceInOrder(
    order: OrderCreatePayload,
    entity: SupplierItemEntity,
    itemId: number,
    costPrice: number,
  ): OrderCreatePayload {
    return {
      ...order,
      [entity]: order[entity].map((item) => (item.id === itemId ? { ...item, costPrice } : item)),
    };
  }
}
