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
import { DOOR_LEAF_TYPE_LABELS } from '../../common/constants/door-catalog';
import { ENTRANCE_DOOR_OPENING_LABELS } from '../../common/constants/entrance-door-catalog';
import { INTERIOR_DOOR_COVERING_LABELS } from '../../common/constants/interior-door-covering';
import {
  CAPITAL_COVERING_LABELS,
  EXTENSION_COVERING_LABELS,
  MOLDING_COVERING_LABELS,
  MOLDING_PLATBAND_TYPE_LABELS,
  PANELING_COVERING_LABELS,
  PANELING_KIND_LABELS,
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
  getFrameTotal,
  getHardwareTotal,
  getInteriorDoorTotal,
  getOrderTotal,
  getPaidAmount,
  getPanelingTotal,
  getPlatbandTotal,
  getSkirtingTotal,
  getTotalToPay,
} from '../../common/utils/order-calculations';
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
  SkirtingItem,
} from '../../types/order.types';

type SupplierItemEntity =
  | 'interiorDoors'
  | 'entranceDoors'
  | 'moldings'
  | 'extensions'
  | 'capitals'
  | 'hardwares'
  | 'panelings'
  | 'skirtings';

interface OrderViewState {
  id: number;
  data: OrderCreatePayload;
}

interface OrderViewProductCard {
  key: string;
  typeLabel: string;
  title: string;
  summary: string;
  supplier: string;
  costPrice: number;
  entity: SupplierItemEntity;
  itemId: number;
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly state = signal<OrderViewState | null>(null);
  protected readonly showPrivateInfo = signal(localStorage.getItem('order_view_show_private') !== 'false');
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  protected readonly leafTypesLabels = DOOR_LEAF_TYPE_LABELS;
  protected readonly entranceDoorOpeningLabels = ENTRANCE_DOOR_OPENING_LABELS;
  protected readonly doorCoveringLabels = INTERIOR_DOOR_COVERING_LABELS;
  protected readonly moldingPlatbandTypeLabels = MOLDING_PLATBAND_TYPE_LABELS;
  protected readonly moldingCoveringLabels = MOLDING_COVERING_LABELS;
  protected readonly extensionCoveringLabels = EXTENSION_COVERING_LABELS;
  protected readonly capitalCoveringLabels = CAPITAL_COVERING_LABELS;
  protected readonly panelingCoveringLabels = PANELING_COVERING_LABELS;
  protected readonly panelingKindLabels = PANELING_KIND_LABELS;
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

  private buildProductCards(order: OrderCreatePayload): OrderViewProductCard[] {
    return [
      ...order.entranceDoors.map((item) => this.buildEntranceDoorCard(item)),
      ...order.interiorDoors.map((item) => this.buildInteriorDoorCard(item)),
      ...order.moldings.map((item) =>
        item.platbandCount > 0 && item.frameCount === 0 && item.frameBoxCount === 0 && item.frameSetCount === 0
          ? this.buildPlatbandCard(item)
          : this.buildFrameCard(item),
      ),
      ...order.extensions.map((item) => this.buildExtensionCard(item)),
      ...order.capitals.map((item) => this.buildCapitalCard(item)),
      ...order.hardwares.map((item) => this.buildHardwareCard(item)),
      ...order.panelings.map((item) => this.buildPanelingCard(item)),
      ...order.skirtings.map((item) => this.buildSkirtingCard(item)),
    ];
  }

  private buildInteriorDoorCard(item: InteriorDoorItem): OrderViewProductCard {
    return {
      key: `interior-${item.id}`,
      entity: 'interiorDoors',
      itemId: item.id,
      typeLabel: 'Межкомнатная дверь',
      title: item.model,
      summary: `${this.formatInteriorDoorSize(item)} · ${this.leafTypesLabels[item.leafType]} · цвет ${item.color} · ${this.getInteriorDoorGlassLabel(item)}`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.count + (item.leafType === 'Double' ? Number(item.count2 ?? 0) : 0)} шт.`,
      total: getInteriorDoorTotal(item),
      details: {
        title: `Межкомнатная дверь · ${item.model}`,
        subtitle: 'Полная информация по позиции заказа.',
        badges: [this.leafTypesLabels[item.leafType], this.doorCoveringLabels[item.covering] ?? item.covering],
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
          ...(item.leafType === 'Double' && item.rebateBarCount > 0
            ? [
                this.section('Притворная планка', [
                  ['Количество', `${item.rebateBarCount} шт.`],
                  ['Цена', item.rebateBarPrice != null ? this.formatMoney(item.rebateBarPrice) : 'Не указана'],
                ]),
              ]
            : []),
          this.section('Дополнительно', [
            ['Покрытие', this.doorCoveringLabels[item.covering] ?? item.covering],
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
      entity: 'entranceDoors',
      itemId: item.id,
      typeLabel: 'Входная дверь',
      title: item.model,
      summary: `${kindLabel} · ${this.leafTypesLabels[item.leafType]} · открывание ${this.getEntranceDoorOpeningLabel(item).toLowerCase()} · ${item.width} × ${item.height} см`,
      supplier: item.supplier,
      costPrice: item.costPrice,
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
            ['Открывание', this.getEntranceDoorOpeningLabel(item)],
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

  private buildFrameCard(item: MoldingItem): OrderViewProductCard {
    const total = getFrameTotal(item);
    return {
      key: `molding-${item.id}`,
      entity: 'moldings',
      itemId: item.id,
      typeLabel: 'Коробки',
      title: `${item.color} · ${this.moldingCoveringLabels[item.covering] ?? item.covering}`,
      summary: `Коробок в комплекте ${item.frameSetCount} · Доп. коробок ${item.frameBoxCount} шт.`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.frameCount} шт.`,
      total,
      details: {
        title: 'Коробки',
        subtitle: 'Полная информация по позиции заказа.',
        badges: [item.color, this.moldingCoveringLabels[item.covering] ?? item.covering],
        total,
        sections: [
          this.section('Коробка', [
            ['Длина', item.frameLength !== null ? `${item.frameLength} см` : 'Не указана'],
            ['В комплекте', `${item.frameSetCount} шт.`],
            ['Дополнительные', `${item.frameBoxCount} шт.`],
            ['Всего', `${item.frameCount} шт.`],
            ['Цена дополнительной коробки', this.formatMoney(item.framePrice)],
            ['Общая стоимость', this.formatMoney(total)],
          ]),
          this.section('Дополнительно', [
            ['Цвет', item.color],
            ['Покрытие', this.moldingCoveringLabels[item.covering] ?? item.covering],
            ['Поставщик', item.supplier || 'Не указан'],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildPlatbandCard(item: MoldingItem): OrderViewProductCard {
    const extraCount = Math.max(0, item.platbandCount - item.platbandSetCount);
    const total = getPlatbandTotal(item);
    return {
      key: `molding-${item.id}`,
      entity: 'moldings',
      itemId: item.id,
      typeLabel: 'Наличники',
      title: `${this.moldingPlatbandTypeLabels[item.platbandType]} · ${item.color} · ${this.moldingCoveringLabels[item.covering] ?? item.covering}`,
      summary: `В комплекте ${item.platbandSetCount} · Доп. ${extraCount} шт. · Всего ${item.platbandCount} шт.`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.platbandCount} шт.`,
      total,
      details: {
        title: 'Наличники',
        subtitle: 'Цена умножается только на дополнительные наличники.',
        badges: [
          this.moldingPlatbandTypeLabels[item.platbandType],
          item.color,
          this.moldingCoveringLabels[item.covering] ?? item.covering,
        ],
        total,
        sections: [
          this.section('Наличник', [
            ['Тип', this.moldingPlatbandTypeLabels[item.platbandType]],
            ...(item.platbandFigure ? [['Модель', item.platbandFigure] as [string, string]] : []),
            ['Длина', item.platbandLength !== null ? `${item.platbandLength} см` : 'Не указана'],
            ['В комплекте', `${item.platbandSetCount} шт.`],
            ['Дополнительные', `${extraCount} шт.`],
            ['Всего', `${item.platbandCount} шт.`],
            ['Цена за штуку', this.formatMoney(item.platbandPrice)],
            ['Стоимость (доп.)', this.formatMoney(total)],
          ]),
          this.section('Дополнительно', [
            ['Цвет', item.color],
            ['Покрытие', this.moldingCoveringLabels[item.covering] ?? item.covering],
            ['Поставщик', item.supplier || 'Не указан'],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildExtensionCard(item: ExtensionItem): OrderViewProductCard {
    return {
      key: `extension-${item.id}`,
      entity: 'extensions',
      itemId: item.id,
      typeLabel: 'Доборы',
      title: `${item.color} · ${this.extensionCoveringLabels[item.covering] ?? item.covering}`,
      summary: `${item.width} × ${item.height} см · комплектов ${item.setCount} · доборов ${item.quantityPerSet} · ${item.totalArea} м²`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.quantityPerSet} шт.`,
      total: getExtensionTotal(item),
      details: {
        title: 'Доборы',
        subtitle: 'Расчет общей стоимости учитывает общую квадратуру и цену за м².',
        badges: [item.color, this.extensionCoveringLabels[item.covering] ?? item.covering],
        total: getExtensionTotal(item),
        sections: [
          this.section('Размеры и комплектация', [
            ['Ширина', `${item.width} см`],
            ['Высота', `${item.height} см`],
            ['Количество комплектов', `${item.setCount}`],
            ['Количество доборов', `${item.quantityPerSet}`],
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
      entity: 'capitals',
      itemId: item.id,
      typeLabel: 'Капитель',
      title: item.name,
      summary: `${item.width} × ${item.height} см · цвет ${item.color} · ${this.capitalCoveringLabels[item.covering] ?? item.covering}`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.count} шт.`,
      total: getCapitalTotal(item),
      details: {
        title: `Капитель · ${item.name}`,
        subtitle: 'Полная информация по позиции заказа.',
        badges: [item.color, this.capitalCoveringLabels[item.covering] ?? item.covering],
        total: getCapitalTotal(item),
        sections: [
          this.section('Основное', [
            ['Название', item.name],
            ['Цвет', item.color],
            ['Покрытие', this.capitalCoveringLabels[item.covering] ?? item.covering],
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
      entity: 'hardwares',
      itemId: item.id,
      typeLabel: 'Фурнитура',
      title: item.handleModel ? `Ручка ${item.handleModel}` : 'Комплект фурнитуры',
      summary: this.getHardwareSummary(item),
      supplier: item.supplier,
      costPrice: item.costPrice,
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
            ['Фиксатор', this.formatCountPrice(item.fixatorCount, item.fixatorPrice)],
            ['Крутилка', this.formatCountPrice(item.thumbturnCount, item.thumbturnPrice)],
            ['Замок', this.formatCountPrice(item.lockCount, item.lockPrice)],
            ['Барабан', this.formatCountPrice(item.cylinderCount, item.cylinderPrice)],
            ['Накладка', this.formatCountPrice(item.escutcheonCount, item.escutcheonPrice)],
            ['Щелчок', this.formatCountPrice(item.clickCount, item.clickPrice)],
            ['Шпингалет', this.formatCountPrice(item.boltCount, item.boltPrice)],
            ['Петли правые', this.formatCountPrice(item.hingeRightCount, item.hingePrice)],
            ['Петли левые', this.formatCountPrice(item.hingeLeftCount, item.hingePrice)],
            ['Ограничитель', this.formatCountPrice(item.doorStopCount, item.doorStopPrice)],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildSkirtingCard(item: SkirtingItem): OrderViewProductCard {
    const totalLength = Number((item.length * item.count).toFixed(2));
    const total = getSkirtingTotal(item);
    return {
      key: `skirting-${item.id}`,
      entity: 'skirtings',
      itemId: item.id,
      typeLabel: 'Плинтус',
      title: `${item.model} · ${item.color}`,
      summary: `${item.height} мм · ${item.length} м × ${item.count} шт. = ${totalLength} м`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${totalLength} м`,
      total,
      details: {
        title: 'Плинтус',
        subtitle: 'Стоимость = цена за метр × всего метров.',
        badges: [item.model, item.color],
        total,
        sections: [
          this.section('Параметры', [
            ['Модель', item.model],
            ['Цвет', item.color],
            ['Высота', `${item.height} мм`],
            ['Длина', `${item.length} м`],
            ['Количество', `${item.count} шт.`],
            ['Всего метров', `${totalLength} м`],
          ]),
          this.section('Стоимость', [
            ['Цена за метр', this.formatMoney(item.price)],
            ['Итого', this.formatMoney(total)],
            ['Поставщик', item.supplier || 'Не указан'],
            ['Комментарий', item.comment || 'Нет'],
          ]),
        ],
      },
    };
  }

  private buildPanelingCard(item: PanelingItem): OrderViewProductCard {
    return {
      key: `paneling-${item.id}`,
      entity: 'panelings',
      itemId: item.id,
      typeLabel: 'Обшивка',
      title: `${item.color} · ${this.panelingKindLabels[item.kind]}`,
      summary: `${this.formatPanelingSizes(item)} · ${this.panelingCoveringLabels[item.covering] ?? item.covering} · ${item.totalArea} м²`,
      supplier: item.supplier,
      costPrice: item.costPrice,
      countLabel: `${item.count} шт.`,
      total: getPanelingTotal(item),
      details: {
        title: 'Обшивка',
        subtitle: 'Расчет общей стоимости учитывает общую квадратуру и цену за м².',
        badges: [
          item.color,
          this.panelingKindLabels[item.kind],
          this.panelingCoveringLabels[item.covering] ?? item.covering,
        ],
        total: getPanelingTotal(item),
        sections: [
          this.section('Размеры и квадратура', [
            ...item.sizes.map((size, index): [string, string] => [
              `Размер ${index + 1}`,
              `${size.width} × ${size.height} см · ${this.formatArea(this.getPanelingSizeArea(size.width, size.height))}`,
            ]),
            ['Общая квадратура', this.formatArea(item.totalArea)],
          ]),
          this.section('Стоимость', [
            ['Цена за квадратный метр', this.formatMoney(item.price)],
            ['Тип обшивки', this.panelingKindLabels[item.kind]],
            ['Покрытие', this.panelingCoveringLabels[item.covering] ?? item.covering],
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

  private formatDoorSize(width: number, height: number, width2: number | null): string {
    return `${width2 === null ? `${width}` : `${width} + ${width2}`} × ${height} см`;
  }

  private formatInteriorDoorSize(item: InteriorDoorItem): string {
    if (item.leafType !== 'Double') {
      return `${item.width} × ${item.height} см`;
    }

    return `${item.width} × ${item.height} см + ${item.width2 ?? 0} × ${item.height2 ?? item.height} см`;
  }

  private formatPanelingSizes(item: PanelingItem): string {
    return item.sizes.map((size) => `${size.width} × ${size.height} см`).join(' · ');
  }

  private getPanelingSizeArea(width: number, height: number): number {
    return Number(((width * height) / 10000).toFixed(2));
  }

  private formatArea(value: number): string {
    return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м²`;
  }

  private getInteriorDoorGlassLabel(item: InteriorDoorItem): string {
    return item.hasGlass ? 'со стеклом' : 'глухая';
  }

  private getEntranceDoorOpeningLabel(item: EntranceDoorItem): string {
    return this.entranceDoorOpeningLabels[item.opening] ?? 'Левое';
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
    if (item.fixatorCount !== null) {
      parts.push(`фиксаторов ${item.fixatorCount}`);
    }
    if (item.thumbturnCount !== null) {
      parts.push(`крутилок ${item.thumbturnCount}`);
    }
    if (item.lockCount !== null) {
      parts.push(`замков ${item.lockCount}`);
    }
    if (item.cylinderCount !== null) {
      parts.push(`барабанов ${item.cylinderCount}`);
    }
    if (item.hingeRightCount !== null) {
      parts.push(`петель правых ${item.hingeRightCount}`);
    }
    if (item.hingeLeftCount !== null) {
      parts.push(`петель левых ${item.hingeLeftCount}`);
    }

    return parts.join(' · ') || 'Набор комплектующих без дополнительных уточнений';
  }

  private getHardwarePositionsCount(item: HardwareItem): number {
    return [
      item.handleCount,
      item.lockCount,
      item.fixatorCount,
      item.clickCount,
      item.thumbturnCount,
      item.escutcheonCount,
      item.cylinderCount,
      item.boltCount,
      item.hingeCount,
      item.doorStopCount,
    ].filter((value) => value !== null && value > 0).length;
  }
}
