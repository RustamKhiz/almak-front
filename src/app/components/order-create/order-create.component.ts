import { DecimalPipe } from '@angular/common';
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
import { DOOR_LEAF_TYPE_LABELS } from '../../common/constants/door-catalog';
import { INTERIOR_DOOR_COVERING_LABELS } from '../../common/constants/interior-door-covering';
import {
  CAPITAL_COVERING_LABELS,
  EXTENSION_COVERING_LABELS,
  MOLDING_COVERING_LABELS,
  MOLDING_PLATBAND_TYPE_LABELS,
  PANELING_COVERING_LABELS,
} from '../../common/constants/molding-catalog';
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from '../../common/constants/order-status';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../common/confirm-dialog/confirm-dialog.component';
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
  InteriorDoorDialogComponent,
  InteriorDoorDialogData,
} from '../../common/dialogs/interior-door-dialog/interior-door-dialog.component';
import {
  HardwareDialogComponent,
  HardwareDialogData,
} from '../../common/dialogs/hardware-dialog/hardware-dialog.component';
import {
  MoldingDialogComponent,
  MoldingDialogData,
} from '../../common/dialogs/molding-dialog/molding-dialog.component';
import {
  PanelingDialogComponent,
  PanelingDialogData,
} from '../../common/dialogs/paneling-dialog/paneling-dialog.component';
import { PhoneMaskDirective } from '../../common/directives/phone-mask.directive';
import { OrdersService } from '../../services/orders.service';
import {
  CapitalCovering,
  CapitalItem,
  EntranceDoorItem,
  ExtensionCovering,
  ExtensionItem,
  HardwareItem,
  InteriorDoorItem,
  MoldingCovering,
  MoldingItem,
  MoldingPlatbandType,
  OrderCreatePayload,
  OrderItemType,
  OrderStatus,
  PanelingCovering,
  PanelingItem,
} from '../../types/order.types';

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
  ],
  templateUrl: './order-create.component.html',
  styleUrl: './order-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly orderId = input.required<number>();

  protected readonly interiorDoors = signal<readonly InteriorDoorItem[]>([]);
  protected readonly entranceDoors = signal<readonly EntranceDoorItem[]>([]);
  protected readonly moldings = signal<readonly MoldingItem[]>([]);
  protected readonly extensions = signal<readonly ExtensionItem[]>([]);
  protected readonly capitals = signal<readonly CapitalItem[]>([]);
  protected readonly hardwares = signal<readonly HardwareItem[]>([]);
  protected readonly panelings = signal<readonly PanelingItem[]>([]);
  protected readonly showOrdersError = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly prepayment = signal(0);
  protected readonly discount = signal(0);
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly doorLeafTypeLabels = DOOR_LEAF_TYPE_LABELS;
  protected readonly doorCoveringLabels = INTERIOR_DOOR_COVERING_LABELS;
  protected readonly moldingPlatbandTypeLabels: Record<MoldingPlatbandType, string> = MOLDING_PLATBAND_TYPE_LABELS;
  protected readonly moldingCoveringLabels: Record<MoldingCovering, string> = MOLDING_COVERING_LABELS;
  protected readonly extensionCoveringLabels: Record<ExtensionCovering, string> = EXTENSION_COVERING_LABELS;
  protected readonly capitalCoveringLabels: Record<CapitalCovering, string> = CAPITAL_COVERING_LABELS;
  protected readonly panelingCoveringLabels: Record<PanelingCovering, string> = PANELING_COVERING_LABELS;
  protected readonly orderTotal = computed(
    () =>
      this.interiorDoors().reduce((sum, item) => sum + item.price * item.count, 0) +
      this.entranceDoors().reduce((sum, item) => sum + item.price * item.count, 0) +
      this.moldings().reduce((sum, item) => sum + this.getMoldingTotal(item), 0) +
      this.extensions().reduce((sum, item) => sum + this.getExtensionTotal(item), 0) +
      this.capitals().reduce((sum, item) => sum + this.getCapitalTotal(item), 0) +
      this.hardwares().reduce((sum, item) => sum + this.getHardwareTotal(item), 0) +
      this.panelings().reduce((sum, item) => sum + this.getPanelingTotal(item), 0),
  );
  protected readonly totalToPay = computed(() => Math.max(this.orderTotal() - this.discount(), 0));
  protected readonly customerDebt = computed(() => Math.max(this.totalToPay() - this.prepayment(), 0));

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^7\d{10}$/)]],
    date: [this.todayIso(), [Validators.required]],
    prepayment: [0, [Validators.required, Validators.min(0)]],
    discount: [0, [Validators.required, Validators.min(0)]],
    needsDelivery: [false],
    deliveryAddress: [''],
    comment: [''],
    status: [OrderStatus.Accepted, [Validators.required]],
  });

  constructor() {
    this.form.controls.prepayment.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.prepayment.set(Number(value ?? 0));
    });
    this.form.controls.discount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.discount.set(Number(value ?? 0));
    });
    this.form.controls.needsDelivery.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((needsDelivery) => {
        this.syncDeliveryState(needsDelivery === true);
      });
  }

  ngOnInit(): void {
    const id = this.orderId();
    if (!id) {
      return;
    }

    this.isEditMode.set(true);
    this.ordersService
      .getOrder(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((order) => this.applyOrder(order));
  }

  protected onAddInteriorDoorClick(): void {
    this.openCreateDialog(
      InteriorDoorDialogComponent,
      { mode: 'create' } as InteriorDoorDialogData,
      this.interiorDoors,
    );
  }
  protected onAddEntranceDoorClick(): void {
    this.openCreateDialog(
      EntranceDoorDialogComponent,
      { mode: 'create' } as EntranceDoorDialogData,
      this.entranceDoors,
    );
  }
  protected onAddMoldingClick(): void {
    this.openCreateDialog(MoldingDialogComponent, { mode: 'create' } as MoldingDialogData, this.moldings);
  }
  protected onAddExtensionClick(): void {
    this.openCreateDialog(ExtensionDialogComponent, { mode: 'create' } as ExtensionDialogData, this.extensions);
  }
  protected onAddCapitalClick(): void {
    this.openCreateDialog(CapitalDialogComponent, { mode: 'create' } as CapitalDialogData, this.capitals);
  }
  protected onAddHardwareClick(): void {
    this.openCreateDialog(HardwareDialogComponent, { mode: 'create' } as HardwareDialogData, this.hardwares);
  }
  protected onAddPanelingClick(): void {
    this.openCreateDialog(PanelingDialogComponent, { mode: 'create' } as PanelingDialogData, this.panelings);
  }

  protected onEditInteriorDoorClick(id: number): void {
    this.openEditDialog(
      InteriorDoorDialogComponent,
      { mode: 'edit', door: this.findById(this.interiorDoors(), id) } as InteriorDoorDialogData,
      this.interiorDoors,
      id,
    );
  }
  protected onEditEntranceDoorClick(id: number): void {
    this.openEditDialog(
      EntranceDoorDialogComponent,
      { mode: 'edit', door: this.findById(this.entranceDoors(), id) } as EntranceDoorDialogData,
      this.entranceDoors,
      id,
    );
  }
  protected onEditMoldingClick(id: number): void {
    this.openEditDialog(
      MoldingDialogComponent,
      { mode: 'edit', molding: this.findById(this.moldings(), id) } as MoldingDialogData,
      this.moldings,
      id,
    );
  }
  protected onEditExtensionClick(id: number): void {
    this.openEditDialog(
      ExtensionDialogComponent,
      { mode: 'edit', extension: this.findById(this.extensions(), id) } as ExtensionDialogData,
      this.extensions,
      id,
    );
  }
  protected onEditCapitalClick(id: number): void {
    this.openEditDialog(
      CapitalDialogComponent,
      { mode: 'edit', capital: this.findById(this.capitals(), id) } as CapitalDialogData,
      this.capitals,
      id,
    );
  }
  protected onEditHardwareClick(id: number): void {
    this.openEditDialog(
      HardwareDialogComponent,
      { mode: 'edit', hardware: this.findById(this.hardwares(), id) } as HardwareDialogData,
      this.hardwares,
      id,
    );
  }
  protected onEditPanelingClick(id: number): void {
    this.openEditDialog(
      PanelingDialogComponent,
      { mode: 'edit', paneling: this.findById(this.panelings(), id) } as PanelingDialogData,
      this.panelings,
      id,
    );
  }

  protected onRemoveInteriorDoorClick(id: number): void {
    this.removeItem(this.interiorDoors, id);
  }
  protected onRemoveEntranceDoorClick(id: number): void {
    this.removeItem(this.entranceDoors, id);
  }
  protected onRemoveMoldingClick(id: number): void {
    this.removeItem(this.moldings, id);
  }
  protected onRemoveExtensionClick(id: number): void {
    this.removeItem(this.extensions, id);
  }
  protected onRemoveCapitalClick(id: number): void {
    this.removeItem(this.capitals, id);
  }
  protected onRemoveHardwareClick(id: number): void {
    this.removeItem(this.hardwares, id);
  }
  protected onRemovePanelingClick(id: number): void {
    this.removeItem(this.panelings, id);
  }

  protected onDuplicateInteriorDoorClick(id: number): void {
    this.duplicateItem(this.interiorDoors, id);
  }
  protected onDuplicateEntranceDoorClick(id: number): void {
    this.duplicateItem(this.entranceDoors, id);
  }
  protected onDuplicateMoldingClick(id: number): void {
    this.duplicateItem(this.moldings, id);
  }
  protected onDuplicateExtensionClick(id: number): void {
    this.duplicateItem(this.extensions, id);
  }
  protected onDuplicateCapitalClick(id: number): void {
    this.duplicateItem(this.capitals, id);
  }
  protected onDuplicateHardwareClick(id: number): void {
    this.duplicateItem(this.hardwares, id);
  }
  protected onDuplicatePanelingClick(id: number): void {
    this.duplicateItem(this.panelings, id);
  }

  protected onSaveClick(): void {
    const hasOrders = this.hasOrderItems();
    this.showOrdersError.set(!hasOrders);
    if (this.form.invalid || !hasOrders) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: OrderCreatePayload = {
      name: value.name ?? '',
      phone: value.phone ?? '',
      date: value.date ?? this.todayIso(),
      prepayment: Number(value.prepayment ?? 0),
      discount: Number(value.discount ?? 0),
      needsDelivery: Boolean(value.needsDelivery),
      deliveryAddress: value.deliveryAddress ?? '',
      comment: value.comment ?? '',
      status: Number(value.status ?? OrderStatus.Accepted) as OrderStatus,
      interiorDoors: this.interiorDoors(),
      entranceDoors: this.entranceDoors(),
      moldings: this.moldings(),
      extensions: this.extensions(),
      capitals: this.capitals(),
      hardwares: this.hardwares(),
      panelings: this.panelings(),
    };

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
        switchMap(() => this.saveOrder(payload)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((savedOrderId) => this.router.navigate(['/order', savedOrderId]));
  }

  protected onBackToOrderClick(): void {
    const id = this.orderId();
    if (this.isEditMode() && id) {
      this.router.navigate(['/order', id]);
    }
  }

  protected getMoldingTotal(item: MoldingItem): number {
    return item.framePrice * item.frameCount + item.platbandPrice * item.platbandCount;
  }
  protected getExtensionTotal(item: ExtensionItem): number {
    return item.price * item.count;
  }
  protected getPanelingTotal(item: PanelingItem): number {
    return item.price * item.count;
  }
  protected getCapitalTotal(item: CapitalItem): number {
    return item.price * item.count;
  }
  protected getHardwareTotal(item: HardwareItem): number {
    return (
      getOptionalTotal(item.handleCount, item.handlePrice) +
      getOptionalTotal(item.mechanismCount, item.mechanismPrice) +
      getOptionalTotal(item.thumbturnCount, item.thumbturnPrice) +
      getOptionalTotal(item.escutcheonCount, item.escutcheonPrice) +
      getOptionalTotal(item.cylinderCount, item.cylinderPrice) +
      getOptionalTotal(item.boltCount, item.boltPrice) +
      getOptionalTotal(item.hingeCount, item.hingePrice) +
      getOptionalTotal(item.doorStopCount, item.doorStopPrice)
    );
  }

  private openCreateDialog<T extends { id: number; type: OrderItemType }, R extends Omit<T, 'id'>>(
    component: object,
    data: object,
    target: { (): readonly T[]; set(value: readonly T[]): void },
  ): void {
    this.dialog
      .open(component as never, { width: '640px', data })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: R | undefined) => {
        if (!result) {
          return;
        }
        const current = target();
        target.set([...current, { ...result, id: this.nextId(current) } as unknown as T]);
        this.syncQuantity();
      });
  }

  private openEditDialog<T extends { id: number }, R extends Omit<T, 'id'>>(
    component: object,
    data: object,
    target: { (): readonly T[]; set(value: readonly T[]): void },
    id: number,
  ): void {
    const item = this.findById(target(), id);
    if (!item) {
      return;
    }
    this.dialog
      .open(component as never, { width: '640px', data })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: R | undefined) => {
        if (!result) {
          return;
        }
        target.set(target().map((current) => (current.id === id ? { ...current, ...result } : current)));
        this.syncQuantity();
      });
  }

  private removeItem<T extends { id: number }>(
    target: { (): readonly T[]; set(value: readonly T[]): void },
    id: number,
  ): void {
    target.set(target().filter((item) => item.id !== id));
    this.syncQuantity();
  }

  private duplicateItem<T extends { id: number }>(
    target: { (): readonly T[]; set(value: readonly T[]): void },
    id: number,
  ): void {
    const current = target();
    const sourceIndex = current.findIndex((item) => item.id === id);
    if (sourceIndex === -1) {
      return;
    }
    const duplicated = { ...current[sourceIndex], id: this.nextId(current) };
    target.set([...current.slice(0, sourceIndex + 1), duplicated, ...current.slice(sourceIndex + 1)]);
    this.syncQuantity();
  }

  private findById<T extends { id: number }>(items: readonly T[], id: number): T | undefined {
    return items.find((item) => item.id === id);
  }
  private nextId(current: readonly { id: number }[]): number {
    return current.length ? Math.max(...current.map((item) => item.id)) + 1 : 1;
  }
  private hasOrderItems(): boolean {
    return (
      this.interiorDoors().length > 0 ||
      this.entranceDoors().length > 0 ||
      this.moldings().length > 0 ||
      this.extensions().length > 0 ||
      this.capitals().length > 0 ||
      this.hardwares().length > 0 ||
      this.panelings().length > 0
    );
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
        prepayment: order.prepayment,
        discount: order.discount,
        comment: order.comment,
        status: order.status,
      },
      { emitEvent: false },
    );
    this.form.controls.needsDelivery.setValue(order.needsDelivery, { emitEvent: false });
    this.syncDeliveryState(order.needsDelivery, { clearAddressWhenDisabled: false });
    this.form.controls.deliveryAddress.setValue(order.deliveryAddress, { emitEvent: false });
    this.prepayment.set(Number(order.prepayment ?? 0));
    this.discount.set(Number(order.discount ?? 0));
    this.syncQuantity();
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

function getOptionalTotal(count: number | null, price: number | null): number {
  return Number(count ?? 0) * Number(price ?? 0);
}
