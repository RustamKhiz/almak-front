import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
import { Observable, debounceTime, filter, finalize, switchMap } from 'rxjs';
import { CATALOG_KEYS } from '../../common/constants/catalog-keys';
import { INTERIOR_DOOR_COVERING_OPTIONS } from '../../common/constants/interior-door-covering';
import { MOLDING_COVERING_OPTIONS } from '../../common/constants/molding-catalog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../common/confirm-dialog/confirm-dialog.component';
import {
  PlatbandDialogComponent,
  PlatbandDialogData,
  PlatbandDialogResult,
} from '../../common/dialogs/platband-dialog/platband-dialog.component';
import { PhoneMaskDirective } from '../../common/directives/phone-mask.directive';
import { bindEachWordCapitalization, bindLeadingCapitalization } from '../../common/utils/form-text';
import { getOrderTotal } from '../../common/utils/order-calculations';
import { CatalogsService } from '../../services/catalogs.service';
import { OrderDraftsService } from '../../services/order-drafts.service';
import { OrdersService } from '../../services/orders.service';
import {
  CapitalItem,
  EntranceDoorItem,
  EntranceDoorOpening,
  ExtensionItem,
  HardwareItem,
  InteriorDoorItem,
  MoldingItem,
  OrderCreatePayload,
  OrderStatus,
  PanelingItem,
  SkirtingItem,
} from '../../types/order.types';
import {
  createOrderItemEntityConfig,
  ItemCollection,
  OrderItemCollections,
  OrderItemEntityConfig,
} from './order-item-dialog-config';
import { addItem, duplicateItem, findItemById, hasItems, removeItem, updateItem } from './order-item-helpers';
import { OrderItemActionEvent, OrderItemEntity, OrderEntityItem } from './order-item-types';
import { OrderItemsListComponent } from './order-items-list/order-items-list.component';

const ORDER_ITEM_DIALOG_WIDTH = '640px';
const MOLDING_SET_COUNT_PER_DOOR = 2.5;

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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly ordersService = inject(OrdersService);
  private readonly draftsService = inject(OrderDraftsService);
  private readonly catalogsService = inject(CatalogsService);

  readonly orderId = input<number | null>(null);
  readonly draftId = input<number | null>(null);

  protected readonly interiorDoors = signal<readonly InteriorDoorItem[]>([]);
  protected readonly entranceDoors = signal<readonly EntranceDoorItem[]>([]);
  protected readonly moldings = signal<readonly MoldingItem[]>([]);
  protected readonly extensions = signal<readonly ExtensionItem[]>([]);
  protected readonly capitals = signal<readonly CapitalItem[]>([]);
  protected readonly hardwares = signal<readonly HardwareItem[]>([]);
  protected readonly panelings = signal<readonly PanelingItem[]>([]);
  protected readonly skirtings = signal<readonly SkirtingItem[]>([]);

  private readonly itemCollections: OrderItemCollections = {
    interiorDoors: this.interiorDoors as ItemCollection<OrderEntityItem>,
    entranceDoors: this.entranceDoors as ItemCollection<OrderEntityItem>,
    moldings: this.moldings as ItemCollection<OrderEntityItem>,
    extensions: this.extensions as ItemCollection<OrderEntityItem>,
    capitals: this.capitals as ItemCollection<OrderEntityItem>,
    hardwares: this.hardwares as ItemCollection<OrderEntityItem>,
    panelings: this.panelings as ItemCollection<OrderEntityItem>,
    skirtings: this.skirtings as ItemCollection<OrderEntityItem>,
  };

  protected readonly showOrdersError = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly isLoadingOrder = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly draftMessage = signal<string | null>(null);
  protected readonly activeDraftId = signal<number | null>(null);

  protected readonly defaultCoveringOptions = toSignal(
    this.catalogsService.getItemsByKey(CATALOG_KEYS.interiorDoorCoverings, [...INTERIOR_DOOR_COVERING_OPTIONS]),
    { initialValue: [...INTERIOR_DOOR_COVERING_OPTIONS] as readonly string[] },
  );

  protected readonly prepayment = signal(0);
  protected readonly discount = signal(0);

  protected readonly orderItemEntity = OrderItemEntity;
  protected readonly orderTotal = computed(() => getOrderTotal(this.buildOrderPayload()));

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
    defaultCovering: this.fb.control<string | null>(null),
  });

  constructor() {
    this.bindFormTextNormalization();
    this.watchDeliveryChanges();
    this.watchDraftChanges();
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

    this.loadOrder(id);
  }

  protected onAddItemClick(entity: OrderItemEntity): void {
    if (entity === OrderItemEntity.Platband) {
      this.openAddPlatbandDialog();
      return;
    }

    const config = this.getEntityConfig(entity);

    this.dialog
      .open(config.dialogComponent as never, { width: ORDER_ITEM_DIALOG_WIDTH, data: config.createData })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: Omit<OrderEntityItem, 'id'> | undefined) => {
        if (!result) {
          return;
        }

        config.collection.set(addItem(config.collection(), result));
        this.onItemsChanged();
      });
  }

  protected onEditItemClick(entity: OrderItemEntity, id: number): void {
    if (entity === OrderItemEntity.Platband) {
      this.openEditPlatbandDialog(id);
      return;
    }

    const config = this.getEntityConfig(entity);
    const item = this.findById(config.collection(), id);
    if (!item) {
      return;
    }

    this.dialog
      .open(config.dialogComponent as never, {
        width: ORDER_ITEM_DIALOG_WIDTH,
        data: config.getEditData(item),
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: Omit<OrderEntityItem, 'id'> | undefined) => {
        if (!result) {
          return;
        }

        config.collection.set(updateItem(config.collection(), id, result));
        this.onItemsChanged();
      });
  }

  protected onRemoveItemClick(entity: OrderItemEntity, id: number): void {
    const config = this.getEntityConfig(entity);
    config.collection.set(removeItem(config.collection(), id));
    this.onItemsChanged();
  }

  protected onDuplicateItemClick(entity: OrderItemEntity, id: number): void {
    const config = this.getEntityConfig(entity);
    config.collection.set(duplicateItem(config.collection(), id));
    this.onItemsChanged();
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
    const hasItems = this.hasOrderItems();
    this.showOrdersError.set(!hasItems);
    if (this.form.invalid || !hasItems) {
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
          return this.saveOrder(payload).pipe(finalize(() => this.isSaving.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (savedOrderId) => {
          const activeDraftId = this.activeDraftId();
          if (activeDraftId) {
            this.draftsService.deleteDraft(activeDraftId);
          }
          this.router.navigate(['/order', savedOrderId]);
        },
        error: (error: unknown) => {
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

  private bindFormTextNormalization(): void {
    bindEachWordCapitalization(this.form.controls.name, this.destroyRef);
    bindLeadingCapitalization(this.form.controls.defaultColor, this.destroyRef);
  }

  private watchDeliveryChanges(): void {
    this.form.controls.needsDelivery.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((needsDelivery) => {
        this.syncDeliveryState(needsDelivery);
      });
  }

  private watchDraftChanges(): void {
    this.form.valueChanges.pipe(debounceTime(800), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.autoSaveDraft();
    });
  }

  private loadOrder(id: number): void {
    this.isEditMode.set(true);
    this.isLoadingOrder.set(true);

    this.ordersService
      .getOrder(id)
      .pipe(
        finalize(() => this.isLoadingOrder.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (order) => {
          this.applyOrder(order);
          this.submitError.set(null);
        },
        error: () => {
          this.submitError.set('Не удалось загрузить заказ для редактирования.');
        },
      });
  }

  private openAddPlatbandDialog(): void {
    const data: PlatbandDialogData = {
      mode: 'create',
      ...this.getDefaultDialogData(MOLDING_COVERING_OPTIONS),
      defaultSetCount: this.getDefaultMoldingSetCount(),
    };

    this.dialog
      .open(PlatbandDialogComponent, { width: ORDER_ITEM_DIALOG_WIDTH, data })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PlatbandDialogResult | undefined) => {
        if (!result?.length) {
          return;
        }

        let collection = this.moldings();
        for (const item of result) {
          collection = addItem(collection, item);
        }

        this.moldings.set(collection);
        this.onItemsChanged();
      });
  }

  private openEditPlatbandDialog(id: number): void {
    const item = this.findById(this.moldings(), id) as MoldingItem | undefined;
    if (!item) {
      return;
    }

    const data: PlatbandDialogData = { mode: 'edit', molding: item };

    this.dialog
      .open(PlatbandDialogComponent, { width: ORDER_ITEM_DIALOG_WIDTH, data })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: PlatbandDialogResult | undefined) => {
        if (!result?.length) {
          return;
        }

        this.moldings.set(updateItem(this.moldings(), id, result[0]));
        this.onItemsChanged();
      });
  }

  private findById<T extends { id: number }>(items: readonly T[], id: number): T | undefined {
    return findItemById(items, id);
  }

  private getEntityConfig(entity: OrderItemEntity): OrderItemEntityConfig {
    return createOrderItemEntityConfig(entity, this.itemCollections, {
      color: this.form.controls.defaultColor.value.trim(),
      covering: this.form.controls.defaultCovering.value,
      frameSetCount: this.getDefaultMoldingSetCount(),
    });
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

  private getDefaultMoldingSetCount(): number {
    const totalCount = this.interiorDoors().reduce((sum, door) => sum + door.count, 0);
    return totalCount * MOLDING_SET_COUNT_PER_DOOR;
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
      this.skirtings,
    ]);
  }

  private updateItemsValidationState(): void {
    if (this.hasOrderItems()) {
      this.showOrdersError.set(false);
    }
  }

  private onItemsChanged(): void {
    this.updateItemsValidationState();
    this.autoSaveDraft();
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
      skirtings: this.skirtings(),
    };
  }

  private applyOrder(order: OrderCreatePayload): void {
    this.interiorDoors.set(order.interiorDoors);
    this.entranceDoors.set(this.normalizeEntranceDoors(order.entranceDoors));
    this.moldings.set(order.moldings);
    this.extensions.set(order.extensions);
    this.capitals.set(order.capitals);
    this.hardwares.set(order.hardwares);
    this.panelings.set(order.panelings);
    this.skirtings.set(order.skirtings);

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
    this.updateItemsValidationState();
  }

  private normalizeEntranceDoors(items: readonly EntranceDoorItem[]): readonly EntranceDoorItem[] {
    return items.map((item) => ({
      ...item,
      opening: item.opening === EntranceDoorOpening.Right ? EntranceDoorOpening.Right : EntranceDoorOpening.Left,
    }));
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

  private autoSaveDraft(): void {
    if (this.isEditMode()) {
      return;
    }
    this.saveDraft();
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
