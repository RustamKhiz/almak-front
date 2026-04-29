import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { DOOR_LEAF_TYPE_LABELS } from '../../common/constants/door-catalog';
import { INTERIOR_DOOR_COVERING_LABELS } from '../../common/constants/interior-door-covering';
import {
  CAPITAL_COVERING_LABELS,
  EXTENSION_COVERING_LABELS,
  MOLDING_COVERING_LABELS,
  MOLDING_PLATBAND_TYPE_LABELS,
  PANELING_COVERING_LABELS,
} from '../../common/constants/molding-catalog';
import { getOrderPaymentLabel, getOrderStatusLabel, ORDER_STATUS_OPTIONS } from '../../common/constants/order-status';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../common/confirm-dialog/confirm-dialog.component';
import {
  OrderItemDetailsDialogComponent,
  OrderItemDetailsDialogData,
  OrderItemDetailsSection,
} from '../../common/dialogs/order-item-details-dialog/order-item-details-dialog.component';
import { PhoneFormatPipe } from '../../common/pipes/phone-format.pipe';
import {
  getCapitalTotal,
  getCustomerDebt,
  getExtensionTotal,
  getHardwareTotal,
  getInteriorDoorTotal,
  getMoldingTotal,
  getOrderTotal,
  getPaidAmount,
  getPanelingTotal,
  getTotalToPay,
} from '../../common/utils/order-calculations';
import {
  OrderPaymentDialogComponent,
  OrderPaymentDialogResult,
} from '../../common/dialogs/order-payment-dialog/order-payment-dialog.component';
import { OrderPaymentHistoryDialogComponent } from '../../common/dialogs/order-payment-history-dialog/order-payment-history-dialog.component';
import { FileDownloadService } from '../../services/file-download.service';
import { OrderDocumentService } from '../../services/order-document.service';
import { OrderPrintService } from '../../services/order-print.service';
import { OrdersService } from '../../services/orders.service';
import {
  CapitalItem,
  EntranceDoorItem,
  EntranceDoorKind,
  ExtensionItem,
  HardwareItem,
  InteriorDoorItem,
  MoldingItem,
  OrderCreatePayload,
  OrderPayment,
  OrderStatus,
  PanelingItem,
} from '../../types/order.types';

interface OrderViewState {
  id: number;
  data: OrderCreatePayload;
}

interface OrderViewProductCard {
  key: string;
  typeLabel: string;
  title: string;
  summary: string;
  countLabel: string;
  total: number;
  details: OrderItemDetailsDialogData;
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly state = signal<OrderViewState | null>(null);
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  protected readonly leafTypesLabels = DOOR_LEAF_TYPE_LABELS;
  protected readonly doorCoveringLabels = INTERIOR_DOOR_COVERING_LABELS;
  protected readonly moldingPlatbandTypeLabels = MOLDING_PLATBAND_TYPE_LABELS;
  protected readonly moldingCoveringLabels = MOLDING_COVERING_LABELS;
  protected readonly extensionCoveringLabels = EXTENSION_COVERING_LABELS;
  protected readonly capitalCoveringLabels = CAPITAL_COVERING_LABELS;
  protected readonly panelingCoveringLabels = PANELING_COVERING_LABELS;
  protected readonly productCards = computed(() => {
    const current = this.state();
    return current ? this.buildProductCards(current.data) : [];
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

  protected onPaymentStatusChange(isPaid: boolean): void {
    const current = this.state();
    if (!current || current.data.isPaid === isPaid) {
      return;
    }

    this.ordersService
      .updateOrderPaymentStatus(current.id, isPaid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nextPaymentStatus) => {
          const state = this.state();
          if (!state) {
            return;
          }
          this.errorMessage.set(null);
          this.state.set({ ...state, data: { ...state.data, isPaid: nextPaymentStatus } });
        },
        error: () => {
          this.errorMessage.set('Не удалось обновить статус оплаты.');
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

  protected onReversePaymentClick(payment: OrderPayment): void {
    const current = this.state();
    if (!current || !this.canReversePayment(payment)) {
      return;
    }

    const dialogData: ConfirmDialogData = {
      title: 'Сторно платежа',
      message: 'Подтвердите сторно этой оплаты. Операция будет добавлена в историю отдельной записью.',
      confirmText: 'Сделать сторно',
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
          this.errorMessage.set('Не удалось выполнить сторно платежа.');
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

    return this.isReversalPayment(payment) ? 'Сторно без комментария' : 'Без комментария';
  }

  protected getPaymentDirectionLabel(payment: OrderPayment): string {
    return this.isReversalPayment(payment) ? 'Сторно' : 'Оплата';
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

  private buildProductCards(order: OrderCreatePayload): OrderViewProductCard[] {
    return [
      ...order.interiorDoors.map((item) => this.buildInteriorDoorCard(item)),
      ...order.entranceDoors.map((item) => this.buildEntranceDoorCard(item)),
      ...order.moldings.map((item) => this.buildMoldingCard(item)),
      ...order.extensions.map((item) => this.buildExtensionCard(item)),
      ...order.capitals.map((item) => this.buildCapitalCard(item)),
      ...order.hardwares.map((item) => this.buildHardwareCard(item)),
      ...order.panelings.map((item) => this.buildPanelingCard(item)),
    ];
  }

  private buildInteriorDoorCard(item: InteriorDoorItem): OrderViewProductCard {
    return {
      key: `interior-${item.id}`,
      typeLabel: 'Межкомнатная дверь',
      title: item.model,
      summary: `${this.formatInteriorDoorSize(item)} · ${this.leafTypesLabels[item.leafType]} · цвет ${item.color} · ${this.getInteriorDoorGlassLabel(item)}`,
      countLabel: `${item.count + (item.leafType === 'Double' ? Number(item.count2 ?? 0) : 0)} шт.`,
      total: getInteriorDoorTotal(item),
      details: {
        title: `Межкомнатная дверь · ${item.model}`,
        subtitle: 'Полная информация по позиции заказа.',
        badges: [this.leafTypesLabels[item.leafType], this.doorCoveringLabels[item.covering]],
        total: getInteriorDoorTotal(item),
        sections: [
          this.section('Основное', [
            ['Модель', item.model],
            ['Цвет', item.color],
            ['Тип створки', this.leafTypesLabels[item.leafType]],
          ]),
          this.section('Створка 1', [
            ['Ширина', `${item.width} см`],
            ['Высота', `${item.height} см`],
            ['Цена', this.formatMoney(item.price)],
            ['Количество', `${item.count} шт.`],
          ]),
          ...(item.leafType === 'Double'
            ? [
                this.section('Створка 2', [
                  ['Ширина', `${item.width2 ?? 0} см`],
                  ['Высота', `${item.height2 ?? item.height} см`],
                  ['Цена', this.formatMoney(item.price2 ?? 0)],
                  ['Количество', `${item.count2 ?? 0} шт.`],
                ]),
              ]
            : []),
          this.section('Дополнительно', [
            ['Покрытие', this.doorCoveringLabels[item.covering]],
            ['Тип полотна', this.getInteriorDoorGlassLabel(item)],
            ['Стекло', item.hasGlass ? item.glassComment || 'Без уточнения' : 'Не используется'],
            ['Стоимость', this.formatMoney(getInteriorDoorTotal(item))],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildEntranceDoorCard(item: EntranceDoorItem): OrderViewProductCard {
    const kindLabel = item.kind === EntranceDoorKind.Welded ? 'Сварочная' : 'Фабричная';
    return {
      key: `entrance-${item.id}`,
      typeLabel: 'Входная дверь',
      title: item.model,
      summary: `${kindLabel} · ${this.leafTypesLabels[item.leafType]} · ${item.width} × ${item.height} см`,
      countLabel: `${item.count} шт.`,
      total: item.price * item.count,
      details: {
        title: `Входная дверь · ${item.model}`,
        subtitle: 'Полная информация по позиции заказа.',
        badges: [kindLabel, this.leafTypesLabels[item.leafType]],
        total: item.price * item.count,
        sections: [
          this.section('Основное', [
            ['Исполнение', kindLabel],
            ['Тип створки', this.leafTypesLabels[item.leafType]],
            ['Модель', item.model],
            ['Размер', `${item.width} × ${item.height} см`],
            ['Цвет двери', item.color],
            ['Цвет обшивки', item.panelColor || 'Не указан'],
            ['Покрытие', item.painting || 'Не указано'],
            ['Глазок', item.hasPeephole === null ? 'Не указан' : item.hasPeephole ? 'Есть' : 'Нет'],
            ['Количество', `${item.count} шт.`],
            ['Цена за штуку', this.formatMoney(item.price)],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildMoldingCard(item: MoldingItem): OrderViewProductCard {
    return {
      key: `molding-${item.id}`,
      typeLabel: 'Погонаж',
      title: `${item.color} · ${this.moldingCoveringLabels[item.covering]}`,
      summary: `Коробка ${item.frameCount} шт. · Наличник ${item.platbandCount} шт. · Притворная планка ${item.rebateBarCount} шт.`,
      countLabel: `${item.frameCount + item.platbandCount + item.rebateBarCount} шт.`,
      total: getMoldingTotal(item),
      details: {
        title: 'Погонаж',
        subtitle: 'Полная информация по позиции заказа.',
        badges: [item.color, this.moldingCoveringLabels[item.covering]],
        total: getMoldingTotal(item),
        sections: [
          this.section('Коробка', [
            ['Длина', item.frameLength !== null ? `${item.frameLength} см` : 'Не указана'],
            ['Количество', `${item.frameCount} шт.`],
            ['Цена за штуку', this.formatMoney(item.framePrice)],
          ]),
          this.section('Наличник', [
            ['Тип', this.moldingPlatbandTypeLabels[item.platbandType]],
            ['Модель', item.platbandFigure || 'Не указана'],
            ['Длина', item.platbandLength !== null ? `${item.platbandLength} см` : 'Не указана'],
            ['Количество', `${item.platbandCount} шт.`],
            ['Цена за штуку', this.formatMoney(item.platbandPrice)],
          ]),
          this.section('Дополнительно', [
            ['Цвет', item.color],
            ['Покрытие', this.moldingCoveringLabels[item.covering]],
            ['Притворная планка', `${item.rebateBarCount} шт.`],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildExtensionCard(item: ExtensionItem): OrderViewProductCard {
    return {
      key: `extension-${item.id}`,
      typeLabel: 'Доборы',
      title: `${item.color} · ${this.extensionCoveringLabels[item.covering]}`,
      summary: `${item.width} × ${item.height} см · ${item.quantityPerSet} в комплекте · ${item.count} комплектов`,
      countLabel: `${item.count} компл.`,
      total: getExtensionTotal(item),
      details: {
        title: 'Доборы',
        subtitle: 'Расчет общей стоимости учитывает квадратуру, цену за м² и количество комплектов.',
        badges: [item.color, this.extensionCoveringLabels[item.covering]],
        total: getExtensionTotal(item),
        sections: [
          this.section('Размеры и комплектация', [
            ['Ширина', `${item.width} см`],
            ['Высота', `${item.height} см`],
            ['Доборов в комплекте', `${item.quantityPerSet}`],
            ['Количество комплектов', `${item.count}`],
            ['Общая квадратура', `${item.totalArea} м²`],
          ]),
          this.section('Стоимость', [
            ['Цена за квадратный метр', this.formatMoney(item.price)],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildCapitalCard(item: CapitalItem): OrderViewProductCard {
    return {
      key: `capital-${item.id}`,
      typeLabel: 'Капитель',
      title: item.name,
      summary: `${item.width} × ${item.height} см · цвет ${item.color} · ${this.capitalCoveringLabels[item.covering]}`,
      countLabel: `${item.count} шт.`,
      total: getCapitalTotal(item),
      details: {
        title: `Капитель · ${item.name}`,
        subtitle: 'Полная информация по позиции заказа.',
        badges: [item.color, this.capitalCoveringLabels[item.covering]],
        total: getCapitalTotal(item),
        sections: [
          this.section('Основное', [
            ['Название', item.name],
            ['Цвет', item.color],
            ['Покрытие', this.capitalCoveringLabels[item.covering]],
            ['Ширина', `${item.width} см`],
            ['Высота', `${item.height} см`],
            ['Количество', `${item.count} шт.`],
            ['Цена за штуку', this.formatMoney(item.price)],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildHardwareCard(item: HardwareItem): OrderViewProductCard {
    return {
      key: `hardware-${item.id}`,
      typeLabel: 'Фурнитура',
      title: item.handleModel ? `Ручка ${item.handleModel}` : 'Комплект фурнитуры',
      summary: this.getHardwareSummary(item),
      countLabel: `${this.getHardwarePositionsCount(item)} поз.`,
      total: getHardwareTotal(item),
      details: {
        title: 'Фурнитура',
        subtitle: 'Полная раскладка по механизмам и комплектующим.',
        badges: item.handleColor ? [item.handleColor] : [],
        total: getHardwareTotal(item),
        sections: [
          this.section('Ручка', [
            ['Модель', item.handleModel || 'Не указана'],
            ['Цвет', item.handleColor || 'Не указан'],
            ['Количество', item.handleCount !== null ? `${item.handleCount}` : 'Не указано'],
            ['Цена', item.handlePrice !== null ? this.formatMoney(item.handlePrice) : 'Не указана'],
          ]),
          this.section('Механизмы', [
            ['Замок', this.formatCountPrice(item.lockCount, item.lockPrice)],
            ['Фиксатор', this.formatCountPrice(item.fixatorCount, item.fixatorPrice)],
            ['Крутилка', this.formatCountPrice(item.thumbturnCount, item.thumbturnPrice)],
            ['Накладка', this.formatCountPrice(item.escutcheonCount, item.escutcheonPrice)],
            ['Цилиндр', this.formatCountPrice(item.cylinderCount, item.cylinderPrice)],
            ['Шпингалет', this.formatCountPrice(item.boltCount, item.boltPrice)],
            ['Петли', this.formatCountPrice(item.hingeCount, item.hingePrice)],
            ['Ограничитель', this.formatCountPrice(item.doorStopCount, item.doorStopPrice)],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildPanelingCard(item: PanelingItem): OrderViewProductCard {
    return {
      key: `paneling-${item.id}`,
      typeLabel: 'Обшивка',
      title: `${item.color} · ${this.panelingCoveringLabels[item.covering]}`,
      summary: `${item.width} × ${item.height} см · ${item.quantityPerSet} в комплекте · ${item.count} комплектов`,
      countLabel: `${item.count} компл.`,
      total: getPanelingTotal(item),
      details: {
        title: 'Обшивка',
        subtitle: 'Расчет общей стоимости учитывает квадратуру, цену за м² и количество комплектов.',
        badges: [item.color, this.panelingCoveringLabels[item.covering]],
        total: getPanelingTotal(item),
        sections: [
          this.section('Размеры и комплектация', [
            ['Ширина', `${item.width} см`],
            ['Высота', `${item.height} см`],
            ['Количество обшивки в комплекте', `${item.quantityPerSet}`],
            ['Количество комплектов', `${item.count}`],
            ['Общая квадратура', `${item.totalArea} м²`],
          ]),
          this.section('Стоимость', [
            ['Цена за квадратный метр', this.formatMoney(item.price)],
            ['Покрытие', this.panelingCoveringLabels[item.covering]],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private section(title: string, rows: [string, string][]): OrderItemDetailsSection {
    return {
      title,
      rows: rows.map(([label, value]) => ({ label, value })),
    };
  }

  private formatDoorSize(width: number, height: number, width2: number | null): string {
    return `${width2 === null ? `${width}` : `${width} + ${width2}`} × ${height} см`;
  }

  private formatInteriorDoorSize(item: InteriorDoorItem): string {
    if (item.leafType !== 'Double') {
      return `${item.width} × ${item.height} см`;
    }

    return `${item.width} × ${item.height} см + ${item.width2 ?? 0} × ${item.height2 ?? item.height} см`;
  }

  private getInteriorDoorGlassLabel(item: InteriorDoorItem): string {
    return item.hasGlass ? 'со стеклом' : 'глухая';
  }

  private formatMoney(value: number): string {
    return `${value.toLocaleString('ru-RU')} ₽`;
  }

  private formatCountPrice(count: number | null, price: number | null): string {
    if (count === null && price === null) {
      return 'Не указано';
    }

    const countLabel = count !== null ? `${count} шт.` : 'кол-во не указано';
    const priceLabel = price !== null ? this.formatMoney(price) : 'цена не указана';
    return `${countLabel} · ${priceLabel}`;
  }

  private getHardwareSummary(item: HardwareItem): string {
    const parts: string[] = [];

    if (item.handleColor) {
      parts.push(`цвет ручки ${item.handleColor}`);
    }
    if (item.lockCount !== null) {
      parts.push(`замков ${item.lockCount}`);
    }
    if (item.fixatorCount !== null) {
      parts.push(`фиксаторов ${item.fixatorCount}`);
    }
    if (item.hingeCount !== null) {
      parts.push(`петель ${item.hingeCount}`);
    }

    return parts.join(' · ') || 'Набор комплектующих без дополнительных уточнений';
  }

  private getHardwarePositionsCount(item: HardwareItem): number {
    return [
      item.handleCount,
      item.lockCount,
      item.fixatorCount,
      item.thumbturnCount,
      item.escutcheonCount,
      item.cylinderCount,
      item.boltCount,
      item.hingeCount,
      item.doorStopCount,
    ].filter((value) => value !== null && value > 0).length;
  }
}
