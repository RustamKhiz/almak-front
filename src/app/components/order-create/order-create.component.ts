import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import {
  DoorDialogComponent,
  DoorDialogData,
  DoorDialogResult,
} from '../order-door-dialog/order-door-dialog.component';
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

  @Input() orderId?: number;

  protected readonly doors = signal<readonly DoorItem[]>([]);
  protected readonly showOrdersError = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly statusOptions: readonly OrderStatus[] = [
    OrderStatus.Accepted,
    OrderStatus.Progress,
    OrderStatus.Completed,
  ];
  protected readonly statusLabels: Record<OrderStatus, string> = {
    [OrderStatus.Accepted]: 'Принят',
    [OrderStatus.Progress]: 'В процессе',
    [OrderStatus.Completed]: 'Завершен',
  };

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    date: [this.todayIso(), [Validators.required]],
    prepayment: [0, [Validators.required, Validators.min(0)]],
    quantity: [{ value: 0, disabled: true }, [Validators.required, Validators.min(1)]],
    comment: [''],
    status: [OrderStatus.Accepted, [Validators.required]],
  });

  ngOnInit(): void {
    if (!this.orderId) {
      return;
    }

    this.isEditMode.set(true);
    this.ordersService.getOrder(this.orderId).subscribe((order) => {
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

    dialogRef.afterClosed().subscribe((result: DoorDialogResult) => {
      if (!result) {
        return;
      }

      const current = this.doors();
      this.doors.set([...current, { ...result, id: this.nextId(current) }]);
      this.syncQuantity();
    });
  }

  protected onEditDoorClick(id: number): void {
    const current = this.doors();
    const door = current.find((item) => item.id === id);
    if (!door) {
      return;
    }

    const dialogRef = this.dialog.open(DoorDialogComponent, {
      width: '520px',
      data: {
        mode: 'edit',
        door,
      } as DoorDialogData,
    });

    dialogRef.afterClosed().subscribe((result: DoorDialogResult) => {
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

    console.log('Order payload', payload);
    this.saveOrder(payload);
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

  private saveOrder(payload: OrderCreatePayload): void {
    if (this.isEditMode() && this.orderId) {
      this.ordersService.updateOrder(this.orderId, payload).subscribe((id) => {
        void this.router.navigate(['/order', id]);
      });
      return;
    }

    this.ordersService.createOrder().subscribe((id) => {
      void this.router.navigate(['/order', id]);
    });
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
