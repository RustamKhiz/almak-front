import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { Observable, filter, switchMap } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../common/confirm-dialog/confirm-dialog.component';
import {
  INTERIOR_DOOR_COVERING_LABELS,
  INTERIOR_DOOR_COVERING_OPTIONS,
} from '../../common/constants/interior-door-covering';
import {
  CAPITAL_COVERING_OPTIONS,
  EXTENSION_COVERING_OPTIONS,
  MOLDING_COVERING_OPTIONS,
  PANELING_COVERING_OPTIONS,
} from '../../common/constants/molding-catalog';
import {
  CapitalDialogComponent,
  CapitalDialogData,
} from '../../common/dialogs/capital-dialog/capital-dialog.component';
import {
  EntranceDoorDialogComponent,
  EntranceDoorDialogData,
} from '../../common/dialogs/entrance-door-dialog/entrance-door-dialog.component';
import {
  ExtensionDialogComponent,
  ExtensionDialogData,
} from '../../common/dialogs/extension-dialog/extension-dialog.component';
import {
  HardwareDialogComponent,
  HardwareDialogData,
} from '../../common/dialogs/hardware-dialog/hardware-dialog.component';
import {
  InteriorDoorDialogComponent,
  InteriorDoorDialogData,
} from '../../common/dialogs/interior-door-dialog/interior-door-dialog.component';
import {
  MoldingDialogComponent,
  MoldingDialogData,
} from '../../common/dialogs/molding-dialog/molding-dialog.component';
import {
  PanelingDialogComponent,
  PanelingDialogData,
} from '../../common/dialogs/paneling-dialog/paneling-dialog.component';
import { PhoneMaskDirective } from '../../common/directives/phone-mask.directive';
import { getCustomerDebt, getOrderTotal, getTotalToPay } from '../../common/utils/order-calculations';
import { OrderDraftsService } from '../../services/order-drafts.service';
import { OrdersService } from '../../services/orders.service';
import {
  CapitalItem,
  EntranceDoorItem,
  ExtensionItem,
  HardwareItem,
  InteriorDoorCovering,
  InteriorDoorItem,
  MoldingItem,
  OrderCreatePayload,
  OrderStatus,
  PanelingItem,
} from '../../types/order.types';
import { addItem, duplicateItem, findItemById, hasItems, removeItem, updateItem } from './order-item-helpers';
import { OrderItemActionEvent, OrderItemEntity, OrderEntityItem } from './order-item-types';
import { OrderItemsListComponent } from './order-items-list/order-items-list.component';
import { bindLeadingCapitalization } from '../../common/utils/form-text';

interface ItemCollection<T> {
  (): readonly T[];
  set(value: readonly T[]): void;
}

interface OrderItemEntityConfig {
  collection: ItemCollection<OrderEntityItem>;
  dialogComponent: object;
  createData: object;
  getEditData: (item: OrderEntityItem) => object;
}

@Component({
  selector: 'app-order-create',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    PhoneMaskDirective,
    OrderItemsListComponent,
  ],
  templateUrl: './order-create.component.html',
  styleUrl: './order-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly ordersService = inject(OrdersService);
  private readonly draftsService = inject(OrderDraftsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly orderId = input<number | null>(null);
  readonly draftId = input<number | null>(null);

  protected readonly interiorDoors = signal<readonly InteriorDoorItem[]>([]);
  protected readonly entranceDoors = signal<readonly EntranceDoorItem[]>([]);
  protected readonly moldings = signal<readonly MoldingItem[]>([]);
  protected readonly extensions = signal<readonly ExtensionItem[]>([]);
  protected readonly capitals = signal<readonly CapitalItem[]>([]);
  protected readonly hardwares = signal<readonly HardwareItem[]>([]);
  protected readonly panelings = signal<readonly PanelingItem[]>([]);
  protected readonly showOrdersError = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly isLoadingOrder = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly draftMessage = signal<string | null>(null);
  protected readonly activeDraftId = signal<number | null>(null);
  protected readonly defaultCoveringOptions = INTERIOR_DOOR_COVERING_OPTIONS;
  protected readonly defaultCoveringLabels = INTERIOR_DOOR_COVERING_LABELS;
  protected readonly prepayment = signal(0);
  protected readonly discount = signal(0);
  protected readonly orderItemEntity = OrderItemEntity;
  protected readonly orderTotal = computed(() =>
    getOrderTotal({
      ...this.buildOrderPayload(),
      prepayment: this.prepayment(),
      discount: this.discount(),
    }),
  );
  protected readonly totalToPay = computed(() =>
    getTotalToPay({
      ...this.buildOrderPayload(),
      prepayment: this.prepayment(),
      discount: this.discount(),
    }),
  );
  protected readonly customerDebt = computed(() =>
    getCustomerDebt({
      ...this.buildOrderPayload(),
      prepayment: this.prepayment(),
      discount: this.discount(),
    }),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^7\d{10}$/)]],
    date: [this.todayIso(), [Validators.required]],
    needsDelivery: [false],
    deliveryAddress: [''],
    comment: [''],
    status: [OrderStatus.Accepted, [Validators.required]],
    isPaid: [false, [Validators.required]],
    defaultColor: [''],
    defaultCovering: [null as InteriorDoorCovering | null],
  });

  constructor() {
    bindLeadingCapitalization(this.form.controls.name, this.destroyRef);
    bindLeadingCapitalization(this.form.controls.defaultColor, this.destroyRef);

    this.form.controls.needsDelivery.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((needsDelivery) => {
        this.syncDeliveryState(needsDelivery === true);
      });
  }

  ngOnInit(): void {
    const draftId = this.draftId();
    if (draftId) {
      this.applyDraft(draftId);
      return;
    }

    const id = this.orderId();
    if (!id) {
      return;
    }

    this.isEditMode.set(true);
    this.isLoadingOrder.set(true);
    this.ordersService
      .getOrder(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.applyOrder(order);
          this.submitError.set(null);
          this.isLoadingOrder.set(false);
        },
        error: () => {
          this.submitError.set('Не удалось загрузить заказ для редактирования.');
          this.isLoadingOrder.set(false);
        },
      });
  }

  protected onAddItemClick(entity: OrderItemEntity): void {
    const config = this.getEntityConfig(entity);

    this.dialog
      .open(config.dialogComponent as never, { width: '640px', data: config.createData })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: Omit<OrderEntityItem, 'id'> | undefined) => {
        if (!result) {
          return;
        }

        config.collection.set(addItem(config.collection(), result));
        this.syncQuantity();
      });
  }

  protected onEditItemClick(entity: OrderItemEntity, id: number): void {
    const config = this.getEntityConfig(entity);
    const item = this.findById(config.collection(), id);
    if (!item) {
      return;
    }

    this.dialog
      .open(config.dialogComponent as never, { width: '640px', data: config.getEditData(item) })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: Omit<OrderEntityItem, 'id'> | undefined) => {
        if (!result) {
          return;
        }

        config.collection.set(updateItem(config.collection(), id, result));
        this.syncQuantity();
      });
  }

  protected onRemoveItemClick(entity: OrderItemEntity, id: number): void {
    const config = this.getEntityConfig(entity);
    config.collection.set(removeItem(config.collection(), id));
    this.syncQuantity();
  }

  protected onDuplicateItemClick(entity: OrderItemEntity, id: number): void {
    const config = this.getEntityConfig(entity);
    config.collection.set(duplicateItem(config.collection(), id));
    this.syncQuantity();
  }

  protected onItemEditClick(event: OrderItemActionEvent): void {
    this.onEditItemClick(event.entity, event.id);
  }

  protected onItemDuplicateClick(event: OrderItemActionEvent): void {
    this.onDuplicateItemClick(event.entity, event.id);
  }

  protected onItemRemoveClick(event: OrderItemActionEvent): void {
    this.onRemoveItemClick(event.entity, event.id);
  }

  protected onSaveClick(): void {
    const hasOrders = this.hasOrderItems();
    this.showOrdersError.set(!hasOrders);
    if (this.form.invalid || !hasOrders) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildOrderPayload();

    const dialogData: ConfirmDialogData = {
      title: 'Сохранение заказа',
      message: 'Вы уверены, что хотите сохранить заказ?',
      confirmText: 'Да',
      cancelText: 'Нет',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: dialogData })
      .afterClosed()
      .pipe(
        filter((isConfirmed) => isConfirmed === true),
        switchMap(() => {
          this.isSaving.set(true);
          this.submitError.set(null);
          return this.saveOrder(payload);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (savedOrderId) => {
          this.isSaving.set(false);
          const activeDraftId = this.activeDraftId();
          if (activeDraftId) {
            this.draftsService.deleteDraft(activeDraftId);
          }
          this.router.navigate(['/order', savedOrderId]);
        },
        error: (error: unknown) => {
          this.isSaving.set(false);
          if (error instanceof HttpErrorResponse && error.status === 401) {
            const draft = this.saveDraft();
            this.submitError.set(`Сессия истекла. Заказ сохранен как черновик #${draft.temporaryId}.`);
            return;
          }
          this.submitError.set('Не удалось сохранить заказ.');
        },
      });
  }

  protected onSaveDraftClick(): void {
    const draft = this.saveDraft();
    this.draftMessage.set(`Черновик #${draft.temporaryId} сохранен.`);
    this.submitError.set(null);
  }

  protected onBackToOrderClick(): void {
    const id = this.orderId();
    if (this.isEditMode() && id) {
      this.router.navigate(['/order', id]);
    }
  }

  private findById<T extends { id: number }>(items: readonly T[], id: number): T | undefined {
    return findItemById(items, id);
  }

  private getEntityConfig(entity: OrderItemEntity): OrderItemEntityConfig {
    switch (entity) {
      case OrderItemEntity.InteriorDoor:
        return {
          collection: this.interiorDoors as ItemCollection<OrderEntityItem>,
          dialogComponent: InteriorDoorDialogComponent,
          createData: {
            mode: 'create',
            ...this.getDefaultDialogData(INTERIOR_DOOR_COVERING_OPTIONS),
          } as InteriorDoorDialogData,
          getEditData: (item) => ({ mode: 'edit', door: item as InteriorDoorItem }) as InteriorDoorDialogData,
        };
      case OrderItemEntity.EntranceDoor:
        return {
          collection: this.entranceDoors as ItemCollection<OrderEntityItem>,
          dialogComponent: EntranceDoorDialogComponent,
          createData: { mode: 'create', ...this.getDefaultDialogData() } as EntranceDoorDialogData,
          getEditData: (item) => ({ mode: 'edit', door: item as EntranceDoorItem }) as EntranceDoorDialogData,
        };
      case OrderItemEntity.Molding:
        return {
          collection: this.moldings as ItemCollection<OrderEntityItem>,
          dialogComponent: MoldingDialogComponent,
          createData: { mode: 'create', ...this.getDefaultDialogData(MOLDING_COVERING_OPTIONS) } as MoldingDialogData,
          getEditData: (item) => ({ mode: 'edit', molding: item as MoldingItem }) as MoldingDialogData,
        };
      case OrderItemEntity.Extension:
        return {
          collection: this.extensions as ItemCollection<OrderEntityItem>,
          dialogComponent: ExtensionDialogComponent,
          createData: {
            mode: 'create',
            ...this.getDefaultDialogData(EXTENSION_COVERING_OPTIONS),
          } as ExtensionDialogData,
          getEditData: (item) => ({ mode: 'edit', extension: item as ExtensionItem }) as ExtensionDialogData,
        };
      case OrderItemEntity.Capital:
        return {
          collection: this.capitals as ItemCollection<OrderEntityItem>,
          dialogComponent: CapitalDialogComponent,
          createData: { mode: 'create', ...this.getDefaultDialogData(CAPITAL_COVERING_OPTIONS) } as CapitalDialogData,
          getEditData: (item) => ({ mode: 'edit', capital: item as CapitalItem }) as CapitalDialogData,
        };
      case OrderItemEntity.Hardware:
        return {
          collection: this.hardwares as ItemCollection<OrderEntityItem>,
          dialogComponent: HardwareDialogComponent,
          createData: { mode: 'create' } as HardwareDialogData,
          getEditData: (item) => ({ mode: 'edit', hardware: item as HardwareItem }) as HardwareDialogData,
        };
      case OrderItemEntity.Paneling:
        return {
          collection: this.panelings as ItemCollection<OrderEntityItem>,
          dialogComponent: PanelingDialogComponent,
          createData: { mode: 'create', ...this.getDefaultDialogData(PANELING_COVERING_OPTIONS) } as PanelingDialogData,
          getEditData: (item) => ({ mode: 'edit', paneling: item as PanelingItem }) as PanelingDialogData,
        };
    }
  }

  private getDefaultDialogData<TCovering extends string>(
    coveringOptions?: readonly TCovering[],
  ): {
    defaultColor?: string;
    defaultCovering?: TCovering;
  } {
    const defaultColor = this.form.controls.defaultColor.value.trim();
    const defaultCovering = this.form.controls.defaultCovering.value;

    return {
      ...(defaultColor ? { defaultColor } : {}),
      ...(defaultCovering && coveringOptions?.includes(defaultCovering as TCovering)
        ? { defaultCovering: defaultCovering as TCovering }
        : {}),
    };
  }

  private hasOrderItems(): boolean {
    return hasItems([
      this.interiorDoors,
      this.entranceDoors,
      this.moldings,
      this.extensions,
      this.capitals,
      this.hardwares,
      this.panelings,
    ]);
  }

  private syncQuantity(): void {
    if (this.hasOrderItems()) {
      this.showOrdersError.set(false);
    }
  }

  private saveOrder(payload: OrderCreatePayload): Observable<number> {
    const id = this.orderId();
    return this.isEditMode() && id
      ? this.ordersService.updateOrder(id, payload)
      : this.ordersService.createOrder(payload);
  }

  private buildOrderPayload(): OrderCreatePayload {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      phone: value.phone,
      date: value.date,
      prepayment: this.prepayment(),
      discount: this.discount(),
      needsDelivery: value.needsDelivery,
      deliveryAddress: value.deliveryAddress.trim(),
      comment: value.comment.trim(),
      status: value.status,
      isPaid: value.isPaid,
      payments: [],
      interiorDoors: this.interiorDoors(),
      entranceDoors: this.entranceDoors(),
      moldings: this.moldings(),
      extensions: this.extensions(),
      capitals: this.capitals(),
      hardwares: this.hardwares(),
      panelings: this.panelings(),
    };
  }

  private applyOrder(order: OrderCreatePayload): void {
    this.interiorDoors.set(order.interiorDoors);
    this.entranceDoors.set(order.entranceDoors);
    this.moldings.set(order.moldings);
    this.extensions.set(order.extensions);
    this.capitals.set(order.capitals);
    this.hardwares.set(order.hardwares);
    this.panelings.set(order.panelings);

    this.form.patchValue(
      {
        name: order.name,
        phone: order.phone,
        date: order.date,
        comment: order.comment,
        status: order.status,
        isPaid: order.isPaid,
      },
      { emitEvent: false },
    );

    this.form.controls.needsDelivery.setValue(order.needsDelivery, { emitEvent: false });
    this.form.controls.deliveryAddress.setValue(order.deliveryAddress, { emitEvent: false });

    this.prepayment.set(order.prepayment);
    this.discount.set(order.discount);

    this.syncDeliveryState(order.needsDelivery, { clearAddressWhenDisabled: false });
    this.syncQuantity();
  }

  private applyDraft(draftId: number): void {
    const draft = this.draftsService.getDraft(draftId);
    if (!draft) {
      this.submitError.set('Черновик не найден.');
      return;
    }

    this.activeDraftId.set(draft.temporaryId);
    this.applyOrder(draft.payload);
    this.isEditMode.set(false);
    this.draftMessage.set(`Открыт черновик #${draft.temporaryId}.`);
  }

  private saveDraft() {
    const draft = this.draftsService.saveDraft(this.buildOrderPayload(), this.activeDraftId());
    this.activeDraftId.set(draft.temporaryId);
    return draft;
  }

  private syncDeliveryState(needsDelivery: boolean, options?: { clearAddressWhenDisabled?: boolean }): void {
    const clearAddressWhenDisabled = options?.clearAddressWhenDisabled ?? true;
    if (needsDelivery) {
      this.form.controls.deliveryAddress.addValidators([Validators.required]);
    } else {
      this.form.controls.deliveryAddress.removeValidators([Validators.required]);
      if (clearAddressWhenDisabled) {
        this.form.controls.deliveryAddress.setValue('', { emitEvent: false });
      }
    }
    this.form.controls.deliveryAddress.updateValueAndValidity({ emitEvent: false });
  }

  private todayIso(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
