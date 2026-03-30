import { DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { getOrderStatusLabel, ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from '../../common/constants/order-status';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../common/confirm-dialog/confirm-dialog.component';
import { PhoneFormatPipe } from '../../common/pipes/phone-format.pipe';
import { FileDownloadService } from '../../services/file-download.service';
import { OrderDocumentService } from '../../services/order-document.service';
import { OrderPrintService } from '../../services/order-print.service';
import { OrdersService } from '../../services/orders.service';
import { DoorLeafType, OrderCreatePayload, OrderStatus } from '../../types/order.types';

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
    MatMenuModule,
    RouterModule,
    DecimalPipe,
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly state = signal<OrderViewState | null>(null);
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly leafTypesLabels: Record<DoorLeafType, string> = {
    Single: 'Одностворчатая',
    Double: 'Двустворчатая',
  };

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.fetchOrder(id);
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
        filter((isConfirmed) => isConfirmed === true),
        switchMap(() => {
          this.isLoading.set(true);
          return this.ordersService.deleteOrder(current.id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/orders']);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  protected onDownloadClick(): void {
    const current = this.state();
    if (!current) {
      return;
    }

    const blob = this.orderDocumentService.createDocBlob(current.id, current.data);
    this.fileDownloadService.download(blob, `order-${current.id}.doc`);
  }

  protected onPrintClick(): void {
    const current = this.state();
    if (!current) {
      return;
    }

    const html = this.orderDocumentService.buildOrderHtml(current.id, current.data);
    this.orderPrintService.printHtml(html);
  }

  protected onStatusChange(status: OrderStatus): void {
    const current = this.state();
    if (!current || current.data.status === status) {
      return;
    }

    this.ordersService
      .updateOrderStatus(current.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((nextStatus) => {
        const state = this.state();
        if (!state) {
          return;
        }

        this.state.set({
          ...state,
          data: {
            ...state.data,
            status: nextStatus,
          },
        });
      });
  }

  protected getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }

  protected getOrderTotal(order: OrderCreatePayload): number {
    return order.orders.reduce((sum, item) => sum + item.price * item.count, 0);
  }

  protected getTotalToPay(order: OrderCreatePayload): number {
    return Math.max(this.getOrderTotal(order) - order.discount, 0);
  }

  protected getCustomerDebt(order: OrderCreatePayload): number {
    return Math.max(this.getTotalToPay(order) - order.prepayment, 0);
  }

  private fetchOrder(id: number): void {
    this.isLoading.set(true);
    this.ordersService
      .getOrder(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.state.set({ id, data });
        this.isLoading.set(false);
      });
  }
}
