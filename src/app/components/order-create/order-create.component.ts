import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { Observable, filter, switchMap } from 'rxjs';
import { DOOR_LEAF_TYPE_LABELS, DOOR_TYPE_LABELS } from '../../common/constants/door-catalog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../common/confirm-dialog/confirm-dialog.component';
import {
  DoorDialogComponent,
  DoorDialogData,
  DoorDialogResult,
} from '../order-door-dialog/order-door-dialog.component';
import { PhoneMaskDirective } from '../../common/directives/phone-mask.directive';
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from '../../common/constants/order-status';
import { OrdersService } from '../../services/orders.service';
import { DoorItem, OrderCreatePayload, OrderStatus } from '../../types/order.types';

@Component({
  selector: 'app-order-create',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
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

  protected readonly doors = signal<readonly DoorItem[]>([]);
  protected readonly showOrdersError = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly doorTypeLabels = DOOR_TYPE_LABELS;
  protected readonly doorLeafTypeLabels = DOOR_LEAF_TYPE_LABELS;
  protected readonly totalPrice = computed(() =>
    this.doors().reduce((total, item) => total + Number(item.price ?? 0) * Number(item.count ?? 0), 0),
  );

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^7\d{10}$/)]],
    date: [this.todayIso(), [Validators.required]],
    prepayment: [0, [Validators.required, Validators.min(1)]],
    quantity: [{ value: 0, disabled: true }, [Validators.required, Validators.min(1)]],
    comment: [''],
    status: [OrderStatus.Accepted, [Validators.required]],
  });

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

  protected onAddDoorClick(): void {
    const dialogRef = this.dialog.open(DoorDialogComponent, {
      width: '520px',
      data: {
        mode: 'create',
      } as DoorDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: DoorDialogResult) => {
        if (!result) {
          return;
        }

        const current = this.doors();
        this.doors.set([...current, { ...result, id: this.nextId(current) }]);
        this.syncQuantity();
      });
  }

  protected onAddMoldingClick(): void {
    /* empty */
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

  protected onEditDoorClick(id: number): void {
    const current = this.doors();
    const door = current.find((item) => item.id === id);
    if (!door) {
      return;
    }

    const dialogRef = this.dialog.open(DoorDialogComponent, {
      width: '600px',
      data: {
        mode: 'edit',
        door,
      } as DoorDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: DoorDialogResult) => {
        if (!result) {
          return;
        }

        this.doors.set(current.map((item) => (item.id === id ? { ...item, ...result } : item)));
        this.syncQuantity();
      });
  }

  protected onRemoveDoorClick(id: number): void {
    const current = this.doors();
    this.doors.set(current.filter((item) => item.id !== id));
    this.syncQuantity();
  }

  protected onSaveClick(): void {
    const hasOrders = this.doors().length > 0;
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
      quantity: this.totalQuantity(),
      comment: value.comment ?? '',
      status: Number(value.status ?? OrderStatus.Accepted) as OrderStatus,
      orders: this.doors(),
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
      .subscribe((id) => {
        void this.router.navigate(['/order', id]);
      });
  }

  private nextId(current: readonly DoorItem[]): number {
    return current.length ? Math.max(...current.map((item) => item.id)) + 1 : 1;
  }

  private totalQuantity(): number {
    return this.doors().reduce((total, item) => total + Number(item.count ?? 0), 0);
  }

  private syncQuantity(): void {
    this.form.controls.quantity.setValue(this.totalQuantity(), { emitEvent: false });
    if (this.doors().length) {
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
    this.doors.set(order.orders);
    this.form.patchValue({
      name: order.name,
      phone: order.phone,
      date: order.date,
      prepayment: order.prepayment,
      comment: order.comment,
      status: order.status,
    });
    this.syncQuantity();
  }

  private todayIso(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
