import { AiOrdersService } from '../../ai-orders/ai-orders.service';
import {
  AI_SCHEMA,
  AiItem,
  AiOrder,
  AiValue,
  aiIssues,
  aiKnownAmount,
  aiToPayload,
} from '../../ai-orders/ai-order.types';
import { OrderDraftItemDialogComponent } from './order-draft-item-dialog/order-draft-item-dialog.component';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  computed,
  effect,
  untracked,
  inject,
  input,
  signal,
} from '@angular/core';
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
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, from, filter, finalize, switchMap } from 'rxjs';
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
import { ServerDraftsService } from '../../services/server-drafts.service';
import { ServerDraftStatusComponent } from '../server-draft-status/server-draft-status.component';
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
    RouterLink,
    ServerDraftStatusComponent,
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
export class OrderCreateComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly ordersService = inject(OrdersService);
  private readonly draftsService = inject(OrderDraftsService);
  private readonly catalogsService = inject(CatalogsService);

  protected readonly ai = inject(AiOrdersService);
  protected readonly server = inject(ServerDraftsService);
  protected readonly currentDraft = computed(
    () => this.server.records()[this.aiDraftId() || this.activeDraftId() || this.draftId() || ''],
  );
  protected readonly draftClosed = computed(() => !!this.currentDraft() && this.currentDraft().state !== 'active');
  readonly aiDraftId = input<string | null>(null);
  protected readonly aiImported = signal(false);
  protected readonly aiPartial = computed(() => !!this.aiDraftId() && !this.aiImported());
  protected readonly aiDraft = computed(() => this.ai.drafts().find((d) => d.id === this.aiDraftId()));
  protected readonly aiRemaining = computed(() => (this.aiDraft() ? aiIssues(this.aiDraft()!.order) : []));
  protected readonly draftAmount = computed(() => (this.aiDraft() ? aiKnownAmount(this.aiDraft()!.order) : null));

  readonly orderId = input<number | null>(null);
  readonly draftId = input<string | null>(null);

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
  protected readonly activeDraftId = signal<string | null>(null);

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
    needsDelivery: this.fb.control<boolean | null>(false),
    deliveryAddress: [''],
    comment: [''],
    status: [OrderStatus.Accepted, [Validators.required]],
    isPaid: [false, [Validators.required]],
    defaultColor: [''],
    defaultCovering: this.fb.control<string | null>(null),
    draftPrepayment: this.fb.control<number | null>(null, [Validators.min(0)]),
    draftDiscount: this.fb.control<number | null>(null, [Validators.min(0)]),
  });

  constructor() {
    this.bindFormTextNormalization();
    this.watchDeliveryChanges();
    this.watchDraftChanges();
    effect(() => {
      const draft = this.aiDraft();
      if (draft)
        untracked(() => {
          if (this.aiImported() && draft.editorState?.payload) this.applyOrder(draft.editorState.payload);
          else this.applyAiHeader(draft.order);
        });
    });
    effect(() => {
      const id = this.activeDraftId() || this.draftId();
      const row = id ? this.server.records()[id] : null;
      if (row?.kind === 'manual' && row.document.payload) untracked(() => this.applyOrder(row.document.payload!));
    });
    effect((onCleanup) => {
      const id = this.aiDraftId() || this.activeDraftId() || this.draftId();
      if (id) onCleanup(untracked(() => this.server.hold(id)));
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['draftId'] && !changes['draftId'].firstChange && this.draftId()) this.applyDraft(this.draftId()!);
    if (changes['aiDraftId'] && !changes['aiDraftId'].firstChange) {
      if (this.aiDraftId()) this.loadAiDraft();
      else {
        this.aiImported.set(false);
        this.activeDraftId.set(null);
        for (const collection of Object.values(this.itemCollections)) collection.set([]);
        this.form.reset(
          {
            name: '',
            phone: '',
            date: this.todayIso(),
            needsDelivery: false,
            deliveryAddress: '',
            comment: '',
            status: OrderStatus.Accepted,
            isPaid: false,
            defaultColor: '',
            defaultCovering: null,
          },
          { emitEvent: false },
        );
        this.prepayment.set(0);
        this.discount.set(0);
      }
    }
  }

  ngOnInit(): void {
    if (this.aiDraftId()) {
      this.loadAiDraft();
      return;
    }
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

  private holdDraftDialog(): () => void {
    const id = this.aiDraftId() || this.activeDraftId() || this.draftId();
    return id ? this.server.hold(id, true) : () => undefined;
  }

  protected onAddItemClick(entity: OrderItemEntity): void {
    if (this.aiPartial()) {
      if ((this.aiDraft()?.order.items.length ?? 0) >= 100) {
        this.submitError.set('В черновике может быть не более 100 товаров.');
        return;
      }
      const type = entity === OrderItemEntity.Frame || entity === OrderItemEntity.Platband ? 'molding' : entity;
      const fields: Record<string, AiValue> = {};
      const color = this.form.controls.defaultColor.value.trim();
      const covering = this.form.controls.defaultCovering.value;
      if (color && AI_SCHEMA.items[type].fields['color']) fields['color'] = color;
      if (covering && AI_SCHEMA.items[type].fields['covering']) fields['covering'] = covering;
      this.openDraftItemDialog({ itemId: crypto.randomUUID(), type, fields }, true);
      return;
    }
    if (entity === OrderItemEntity.Platband) {
      this.openAddPlatbandDialog();
      return;
    }

    const config = this.getEntityConfig(entity);

    this.dialog
      .open(config.dialogComponent as never, { width: ORDER_ITEM_DIALOG_WIDTH, data: config.createData })
      .afterClosed()
      .pipe(finalize(this.holdDraftDialog()))
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
      .pipe(finalize(this.holdDraftDialog()))
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

  protected onDraftItemEditClick(itemId: string): void {
    const item = this.aiDraft()?.order.items.find((product) => product.itemId === itemId);
    if (item) this.openDraftItemDialog(item, false);
  }

  private openDraftItemDialog(item: AiItem, create: boolean): void {
    const draftId = this.aiDraftId();
    if (!draftId) return;
    const before = structuredClone(item);
    this.dialog
      .open(OrderDraftItemDialogComponent, {
        width: ORDER_ITEM_DIALOG_WIDTH,
        data: {
          item: before,
          title: `${create ? 'Добавить' : 'Редактировать'}: ${AI_SCHEMA.items[item.type].label.toLowerCase()}`,
        },
      })
      .afterClosed()
      .pipe(finalize(this.holdDraftDialog()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((fields: Record<string, AiValue> | undefined) => {
        if (!fields) return;
        const changes = Object.entries(fields).filter(([key, value]) => (before.fields[key] ?? null) !== value);
        if (!create && !changes.length) return;
        if (
          !create &&
          !this.ai
            .drafts()
            .find((draft) => draft.id === draftId)
            ?.order.items.some((product) => product.itemId === item.itemId)
        ) {
          this.submitError.set('Товар уже удалён из черновика.');
          return;
        }
        this.ai.update(draftId, (draft) => {
          if (create) draft.order.items.push({ ...before, fields: { ...before.fields } });
          const target = draft.order.items.find((product) => product.itemId === item.itemId)!;
          for (const [key, value] of changes) {
            target.fields[key] = value;
            draft.fieldSources[`items.${item.itemId}.${key}`] = { text: 'Ручное исправление', manual: true };
          }
          if (create)
            for (const key of Object.keys(target.fields))
              draft.fieldSources[`items.${item.itemId}.${key}`] = { text: 'Ручное добавление', manual: true };
          draft.lastAppliedChange = undefined;
        });
      });
  }

  protected onDraftItemDuplicateClick(itemId: string): void {
    const id = this.aiDraftId();
    if (!id || (this.aiDraft()?.order.items.length ?? 0) >= 100) return;
    this.ai.update(id, (draft) => {
      const item = draft.order.items.find((product) => product.itemId === itemId);
      if (!item) return;
      const copy = { ...structuredClone(item), itemId: crypto.randomUUID() };
      draft.order.items.push(copy);
      for (const key of Object.keys(copy.fields))
        draft.fieldSources[`items.${copy.itemId}.${key}`] = { text: 'Ручное копирование', manual: true };
      draft.lastAppliedChange = undefined;
    });
  }

  protected onDraftItemRemoveClick(itemId: string): void {
    this.ai.deleteItem(itemId, this.aiDraftId()!);
  }

  protected onSaveClick(): void {
    if (this.aiDraftId()) {
      if (!this.saveAiEditor()) return;
      if (this.aiPartial()) {
        if (this.aiRemaining().length) {
          this.form.markAllAsTouched();
          this.submitError.set('Для создания заказа заполните обязательные данные. Черновик сохранён.');
          return;
        }
      }
    }
    const hasItems = this.aiPartial() ? !!this.aiDraft()?.order.items.length : this.hasOrderItems();
    this.showOrdersError.set(!hasItems);
    if (this.form.invalid || !hasItems) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.aiPartial() ? aiToPayload(this.aiDraft()!.order) : this.buildOrderPayload();

    const dialogData: ConfirmDialogData = {
      title: 'Сохранение заказа',
      message: 'Вы уверены, что хотите сохранить заказ?',
      confirmText: 'Да',
      cancelText: 'Нет',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: dialogData })
      .afterClosed()
      .pipe(finalize(this.holdDraftDialog()))
      .pipe(
        filter((isConfirmed) => isConfirmed === true),
        switchMap(() => {
          this.isSaving.set(true);
          this.submitError.set(null);
          return from(this.saveOrder(payload)).pipe(finalize(() => this.isSaving.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (savedOrderId) => {
          const activeDraftId = this.activeDraftId();
          if (activeDraftId) void this.server.loadOne(activeDraftId, savedOrderId).catch(() => undefined);
          const aiId = this.aiDraftId();
          if (aiId) {
            this.aiImported.set(false);
            this.ai.complete(aiId, savedOrderId);
          }
          this.router.navigate(['/order', savedOrderId]);
        },
        error: (error: unknown) => {
          const source = this.aiDraftId() || this.activeDraftId();
          if (source && error instanceof HttpErrorResponse && error.status === 409 && error.error?.current?.id) {
            this.server.conflict(source, error.error.current);
            this.submitError.set('Заказ не создан: черновик изменился. Проверьте варианты правок.');
            return;
          }
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.submitError.set('Сессия истекла. Войдите прежним аккаунтом и проверьте сохранение черновика.');
            return;
          }
          this.submitError.set(
            error instanceof HttpErrorResponse
              ? error.error?.message || 'Не удалось сохранить заказ.'
              : 'Сначала проверьте сохранение черновика и возможный конфликт правок.',
          );
        },
      });
  }

  protected async onSaveDraftClick(): Promise<void> {
    this.submitError.set(null);
    try {
      let id = this.aiDraftId();
      if (id) {
        if (!this.saveAiEditor()) return;
      } else id = this.saveDraft().temporaryId;
      await this.server.flush(id);
      this.draftMessage.set('Черновик сохранён на сервере.');
    } catch {
      this.submitError.set('Не удалось сохранить черновик. Введённые данные остаются в открытом окне.');
    }
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
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.autoSaveDraft());
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
      .pipe(finalize(this.holdDraftDialog()))
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
      .pipe(finalize(this.holdDraftDialog()))
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

  private async saveOrder(payload: OrderCreatePayload): Promise<number> {
    const id = this.orderId();
    if (this.isEditMode() && id) return firstValueFrom(this.ordersService.updateOrder(id, payload));
    let source = this.aiDraftId();
    if (source) {
      if (!this.saveAiEditor()) throw new Error('Черновик не найден');
    } else source = this.saveDraft().temporaryId;
    await this.server.flush(source);
    const row = this.server.records()[source];
    const current =
      row.kind === 'manual'
        ? row.document.payload!
        : row.document.editorState?.accepted && row.document.editorState.payload
          ? row.document.editorState.payload
          : aiToPayload(row.document.order!);
    return firstValueFrom(this.ordersService.createOrder(current, this.server.reference(source)));
  }

  private buildOrderPayload(): OrderCreatePayload {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      phone: value.phone,
      date: value.date,
      prepayment: this.prepayment(),
      discount: this.discount(),
      needsDelivery: value.needsDelivery === true,
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

  private loadAiDraft(): void {
    const d = this.aiDraft();
    this.aiImported.set(false);
    this.activeDraftId.set(null);
    this.isEditMode.set(false);
    if (!d) {
      this.submitError.set('Черновик не найден.');
      return;
    }
    const payload = this.aiDraft()?.editorState?.payload;
    if (payload) {
      this.applyOrder(payload);
      this.aiImported.set(true);
    } else {
      this.applyAiHeader(d.order);
    }
  }

  private applyAiHeader(order: AiOrder): void {
    const h = order.header;
    this.form.patchValue(
      {
        name: String(h['name'] ?? ''),
        phone: String(h['phone'] ?? ''),
        date: String(h['date'] ?? ''),
        comment: String(h['comment'] ?? ''),
        needsDelivery: typeof h['needsDelivery'] === 'boolean' ? h['needsDelivery'] : null,
        deliveryAddress: String(h['deliveryAddress'] ?? ''),
      },
      { emitEvent: false },
    );
    this.prepayment.set(Number(h['prepayment'] ?? 0));
    this.discount.set(Number(h['discount'] ?? 0));
    this.form.controls.draftPrepayment.setValue(typeof h['prepayment'] === 'number' ? h['prepayment'] : null, {
      emitEvent: false,
    });
    this.form.controls.draftDiscount.setValue(typeof h['discount'] === 'number' ? h['discount'] : null, {
      emitEvent: false,
    });
    this.syncDeliveryState(this.form.controls.needsDelivery.value, { clearAddressWhenDisabled: false });
  }

  private saveAiEditor(id = this.aiDraftId()): boolean {
    if (!id) return false;
    if (!this.aiImported()) {
      const current = this.ai.drafts().find((draft) => draft.id === id);
      if (!current) return false;
      const value = this.form.getRawValue();
      const header = {
        name: value.name.trim() || null,
        phone: value.phone || null,
        date: value.date || null,
        comment: value.comment.trim() || null,
        needsDelivery: value.needsDelivery,
        deliveryAddress: value.deliveryAddress.trim() || null,
        prepayment: value.draftPrepayment,
        discount: value.draftDiscount,
      };
      const changes = Object.entries(header).filter(([key, next]) => (current.order.header[key] ?? null) !== next);
      if (!changes.length) return true;
      return !!this.ai.update(id, (draft) => {
        for (const [key, next] of changes) {
          draft.order.header[key] = next;
          draft.fieldSources['header.' + key] = { text: 'Ручное исправление', manual: true };
        }
        draft.lastAppliedChange = undefined;
      });
    }
    const updated = this.ai.update(id, (d) => {
      d.editorState = { payload: this.buildOrderPayload(), accepted: true, defaultsConfirmed: true };
    });
    if (!updated) this.submitError.set(this.ai.storageError() || 'Не удалось сохранить черновик.');
    return !!updated;
  }

  private applyDraft(draftId: string): void {
    const draft = this.draftsService.getDraft(draftId);
    if (!draft) {
      this.submitError.set('Черновик не найден.');
      return;
    }

    this.activeDraftId.set(draft.temporaryId);
    this.applyOrder(draft.payload);
    this.isEditMode.set(false);
    this.draftMessage.set('Черновик загружен с сервера.');
  }

  private saveDraft() {
    const draft = this.draftsService.saveDraft(this.buildOrderPayload(), this.activeDraftId());
    this.activeDraftId.set(draft.temporaryId);
    return draft;
  }

  private autoSaveDraft(): void {
    if (this.aiDraftId()) {
      this.saveAiEditor();
      return;
    }
    if (this.isEditMode()) {
      return;
    }
    this.saveDraft();
  }

  private syncDeliveryState(needsDelivery: boolean | null, options?: { clearAddressWhenDisabled?: boolean }): void {
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
