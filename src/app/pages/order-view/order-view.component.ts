import { DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { ORDER_STATUS_OPTIONS, getOrderStatusLabel } from '../../common/constants/order-status';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../common/confirm-dialog/confirm-dialog.component';
import { PhoneFormatPipe } from '../../common/pipes/phone-format.pipe';
import { FileDownloadService } from '../../services/file-download.service';
import { OrderDocumentService } from '../../services/order-document.service';
import { OrderPrintService } from '../../services/order-print.service';
import { OrdersService } from '../../services/orders.service';
import {
  getCapitalTotal,
  getCustomerDebt,
  getExtensionTotal,
  getHardwareTotal,
  getMoldingTotal,
  getOrderTotal,
  getPanelingTotal,
  getTotalToPay,
} from '../../common/utils/order-calculations';
import {
  CapitalCovering,
  CapitalItem,
  DoorLeafType,
  ExtensionCovering,
  ExtensionItem,
  HardwareItem,
  MoldingCovering,
  MoldingItem,
  MoldingPlatbandType,
  OrderCreatePayload,
  OrderStatus,
  PanelingCovering,
  PanelingItem,
} from '../../types/order.types';

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
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly state = signal<OrderViewState | null>(null);
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  protected readonly leafTypesLabels: Record<DoorLeafType, string> = {
    Single: 'одностворчатая',
    Double: 'двустворчатая',
  };
  protected readonly moldingPlatbandTypeLabels: Record<MoldingPlatbandType, string> = {
    [MoldingPlatbandType.Oval]: 'овальный',
    [MoldingPlatbandType.Smooth]: 'гладкий',
    [MoldingPlatbandType.Figure]: 'фигурный',
  };
  protected readonly moldingCoveringLabels: Record<MoldingCovering, string> = {
    [MoldingCovering.Enamel]: 'эмаль',
    [MoldingCovering.Veneer]: 'шпон',
    [MoldingCovering.Embossing]: 'тиснение',
    [MoldingCovering.PVC]: 'пвх',
  };
  protected readonly extensionCoveringLabels: Record<ExtensionCovering, string> = {
    [ExtensionCovering.Enamel]: 'эмаль',
    [ExtensionCovering.Veneer]: 'шпон',
    [ExtensionCovering.Embossing]: 'тиснение',
  };
  protected readonly capitalCoveringLabels: Record<CapitalCovering, string> = {
    [CapitalCovering.Enamel]: 'эмаль',
    [CapitalCovering.Veneer]: 'шпон',
    [CapitalCovering.Embossing]: 'тиснение',
  };
  protected readonly panelingCoveringLabels: Record<PanelingCovering, string> = {
    [PanelingCovering.Enamel]: 'эмаль',
    [PanelingCovering.Veneer]: 'шпон',
    [PanelingCovering.Embossing]: 'тиснение',
    [PanelingCovering.PVC]: 'пвх',
  };

  constructor() {
    this.fetchOrder(Number(this.route.snapshot.paramMap.get('id') ?? 0));
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

  protected onDownloadClick(): void {
    const current = this.state();
    if (current) {
      this.fileDownloadService.download(
        this.orderDocumentService.createDocBlob(current.id, current.data),
        `order-${current.id}.doc`,
      );
    }
  }
  protected onPrintClick(): void {
    const current = this.state();
    if (current) {
      this.orderPrintService.printHtml(this.orderDocumentService.buildOrderHtml(current.id, current.data));
    }
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

  protected getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }
  protected getOrderTotal(order: OrderCreatePayload): number {
    return getOrderTotal(order);
  }
  protected getTotalToPay(order: OrderCreatePayload): number {
    return getTotalToPay(order);
  }
  protected getCustomerDebt(order: OrderCreatePayload): number {
    return getCustomerDebt(order);
  }
  protected getMoldingTotal(item: MoldingItem): number {
    return getMoldingTotal(item);
  }
  protected getExtensionTotal(item: ExtensionItem): number {
    return getExtensionTotal(item);
  }
  protected getPanelingTotal(item: PanelingItem): number {
    return getPanelingTotal(item);
  }
  protected getHardwareTotal(item: HardwareItem): number {
    return getHardwareTotal(item);
  }
  protected getCapitalTotal(item: CapitalItem): number {
    return getCapitalTotal(item);
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
}
