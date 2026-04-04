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
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from '../../common/constants/order-status';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../common/confirm-dialog/confirm-dialog.component';
import {
  EntranceDoorDialogComponent,
  EntranceDoorDialogData,
  EntranceDoorDialogResult,
} from '../../common/dialogs/entrance-door-dialog/entrance-door-dialog.component';
import {
  InteriorDoorDialogComponent,
  InteriorDoorDialogData,
  InteriorDoorDialogResult,
} from '../../common/dialogs/interior-door-dialog/interior-door-dialog.component';
import {
  MoldingDialogComponent,
  MoldingDialogData,
  MoldingDialogResult,
} from '../../common/dialogs/molding-dialog/molding-dialog.component';
import { PhoneMaskDirective } from '../../common/directives/phone-mask.directive';
import { OrdersService } from '../../services/orders.service';
import {
  EntranceDoorItem,
  InteriorDoorItem,
  MoldingCovering,
  MoldingItem,
  MoldingPlatbandType,
  OrderCreatePayload,
  OrderItemType,
  OrderStatus,
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
  protected readonly showOrdersError = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly prepayment = signal(0);
  protected readonly discount = signal(0);
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly doorLeafTypeLabels = DOOR_LEAF_TYPE_LABELS;
  protected readonly doorCoveringLabels = INTERIOR_DOOR_COVERING_LABELS;
  protected readonly moldingPlatbandTypeLabels: Record<MoldingPlatbandType, string> = {
    [MoldingPlatbandType.Oval]: 'овальный',
    [MoldingPlatbandType.Smooth]: 'гладкий',
    [MoldingPlatbandType.Figure]: 'фигурный',
  };
  protected readonly moldingCoveringLabels: Record<MoldingCovering, string> = {
    [MoldingCovering.Enamel]: 'Эмаль',
    [MoldingCovering.Veneer]: 'Шпон',
    [MoldingCovering.Embossing]: 'Тиснение',
    [MoldingCovering.PVC]: 'ПВХ',
  };
  protected readonly orderTotal = computed(
    () =>
      this.interiorDoors().reduce((total, item) => total + item.price * item.count, 0) +
      this.entranceDoors().reduce((total, item) => total + item.price * item.count, 0) +
      this.moldings().reduce((total, item) => total + this.getMoldingTotal(item), 0),
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
    const orderId = this.orderId();

    if (!orderId) {
      return;
    }

    this.isEditMode.set(true);
    this.ordersService
      .getOrder(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((order) => {
        this.applyOrder(order);
      });
  }

  protected onAddInteriorDoorClick(): void {
    const dialogRef = this.dialog.open(InteriorDoorDialogComponent, {
      width: '520px',
      data: {
        mode: 'create',
      } as InteriorDoorDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: InteriorDoorDialogResult) => {
        if (!result) {
          return;
        }

        const current = this.interiorDoors();
        this.interiorDoors.set([...current, { ...result, type: OrderItemType.InteriorDoor, id: this.nextId(current) }]);
        this.syncQuantity();
      });
  }

  protected onAddEntranceDoorClick(): void {
    const dialogRef = this.dialog.open(EntranceDoorDialogComponent, {
      width: '640px',
      data: {
        mode: 'create',
      } as EntranceDoorDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: EntranceDoorDialogResult) => {
        if (!result) {
          return;
        }

        const current = this.entranceDoors();
        this.entranceDoors.set([...current, { ...result, type: OrderItemType.EntranceDoor, id: this.nextId(current) }]);
        this.syncQuantity();
      });
  }

  protected onAddMoldingClick(): void {
    const dialogRef = this.dialog.open(MoldingDialogComponent, {
      width: '640px',
      data: {
        mode: 'create',
      } as MoldingDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: MoldingDialogResult) => {
        if (!result) {
          return;
        }

        const current = this.moldings();
        this.moldings.set([...current, { ...result, type: OrderItemType.Molding, id: this.nextId(current) }]);
        this.syncQuantity();
      });
  }

  protected onAddExtensionClick(): void {
    /* empty */
  }

  protected onAddCapitalClick(): void {
    /* empty */
  }

  protected onAddHardwareClick(): void {
    /* empty */
  }

  protected onEditInteriorDoorClick(id: number): void {
    const current = this.interiorDoors();
    const door = current.find((item) => item.id === id);
    if (!door) {
      return;
    }

    const dialogRef = this.dialog.open(InteriorDoorDialogComponent, {
      width: '600px',
      data: {
        mode: 'edit',
        door,
      } as InteriorDoorDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: InteriorDoorDialogResult) => {
        if (!result) {
          return;
        }

        this.interiorDoors.set(current.map((item) => (item.id === id ? { ...item, ...result } : item)));
        this.syncQuantity();
      });
  }

  protected onRemoveInteriorDoorClick(id: number): void {
    const current = this.interiorDoors();
    this.interiorDoors.set(current.filter((item) => item.id !== id));
    this.syncQuantity();
  }

  protected onDuplicateInteriorDoorClick(id: number): void {
    const current = this.interiorDoors();
    const sourceIndex = current.findIndex((item) => item.id === id);

    if (sourceIndex === -1) {
      return;
    }

    const duplicatedDoor = {
      ...current[sourceIndex],
      id: this.nextId(current),
    };

    this.interiorDoors.set([...current.slice(0, sourceIndex + 1), duplicatedDoor, ...current.slice(sourceIndex + 1)]);
    this.syncQuantity();
  }

  protected onEditEntranceDoorClick(id: number): void {
    const current = this.entranceDoors();
    const door = current.find((item) => item.id === id);
    if (!door) {
      return;
    }

    const dialogRef = this.dialog.open(EntranceDoorDialogComponent, {
      width: '640px',
      data: {
        mode: 'edit',
        door,
      } as EntranceDoorDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: EntranceDoorDialogResult) => {
        if (!result) {
          return;
        }

        this.entranceDoors.set(current.map((item) => (item.id === id ? { ...item, ...result } : item)));
        this.syncQuantity();
      });
  }

  protected onRemoveEntranceDoorClick(id: number): void {
    const current = this.entranceDoors();
    this.entranceDoors.set(current.filter((item) => item.id !== id));
    this.syncQuantity();
  }

  protected onDuplicateEntranceDoorClick(id: number): void {
    const current = this.entranceDoors();
    const sourceIndex = current.findIndex((item) => item.id === id);

    if (sourceIndex === -1) {
      return;
    }

    const duplicatedDoor = {
      ...current[sourceIndex],
      id: this.nextId(current),
    };

    this.entranceDoors.set([...current.slice(0, sourceIndex + 1), duplicatedDoor, ...current.slice(sourceIndex + 1)]);
    this.syncQuantity();
  }

  protected onEditMoldingClick(id: number): void {
    const current = this.moldings();
    const molding = current.find((item) => item.id === id);
    if (!molding) {
      return;
    }

    const dialogRef = this.dialog.open(MoldingDialogComponent, {
      width: '640px',
      data: {
        mode: 'edit',
        molding,
      } as MoldingDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: MoldingDialogResult) => {
        if (!result) {
          return;
        }

        this.moldings.set(current.map((item) => (item.id === id ? { ...item, ...result } : item)));
        this.syncQuantity();
      });
  }

  protected onRemoveMoldingClick(id: number): void {
    const current = this.moldings();
    this.moldings.set(current.filter((item) => item.id !== id));
    this.syncQuantity();
  }

  protected onDuplicateMoldingClick(id: number): void {
    const current = this.moldings();
    const sourceIndex = current.findIndex((item) => item.id === id);

    if (sourceIndex === -1) {
      return;
    }

    const duplicatedMolding = {
      ...current[sourceIndex],
      id: this.nextId(current),
    };

    this.moldings.set([...current.slice(0, sourceIndex + 1), duplicatedMolding, ...current.slice(sourceIndex + 1)]);
    this.syncQuantity();
  }

  protected onSaveClick(): void {
    const hasOrders = this.interiorDoors().length > 0 || this.entranceDoors().length > 0 || this.moldings().length > 0;
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
    };

    const dialogData: ConfirmDialogData = {
      title: 'Подтверждение',
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
      .subscribe((savedOrderId) => {
        this.router.navigate(['/order', savedOrderId]);
      });
  }

  protected onBackToOrderClick(): void {
    const orderId = this.orderId();

    if (!this.isEditMode() || !orderId) {
      return;
    }

    this.router.navigate(['/order', orderId]);
  }

  private nextId(current: readonly { id: number }[]): number {
    return current.length ? Math.max(...current.map((item) => item.id)) + 1 : 1;
  }

  private syncQuantity(): void {
    if (this.interiorDoors().length || this.entranceDoors().length || this.moldings().length) {
      this.showOrdersError.set(false);
    }
  }

  private saveOrder(payload: OrderCreatePayload): Observable<number> {
    const orderId = this.orderId();

    if (this.isEditMode() && orderId) {
      return this.ordersService.updateOrder(orderId, payload);
    }

    return this.ordersService.createOrder(payload);
  }

  private applyOrder(order: OrderCreatePayload): void {
    this.interiorDoors.set(order.interiorDoors);
    this.entranceDoors.set(order.entranceDoors);
    this.moldings.set(order.moldings);
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

  protected getMoldingTotal(item: MoldingItem): number {
    return (
      Number(item.framePrice ?? 0) * Number(item.frameCount ?? 0) +
      Number(item.platbandPrice ?? 0) * Number(item.platbandCount ?? 0)
    );
  }

  private syncDeliveryState(
    needsDelivery: boolean,
    options?: {
      clearAddressWhenDisabled?: boolean;
    },
  ): void {
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
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
