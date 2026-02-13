import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import {
  DoorDialogComponent,
  DoorDialogData,
  DoorDialogResult,
} from '../order-door-dialog/order-door-dialog.component';

export type DoorType = 'Entrance' | 'Interior';
export type DoorLeafType = 'Single' | 'Double';

export type DoorItem = {
  id: number;
  type: DoorType;
  model: string;
  price: number;
  color: string;
  width: number;
  height: number;
  leafType: DoorLeafType;
  count: number;
};

export type OrderCustomerForm = {
  name: string;
  phone: string;
  date: string;
  prepayment: number;
  quantity: number;
};

export type OrderCreatePayload = OrderCustomerForm & {
  orders: readonly DoorItem[];
};

@Component({
  selector: 'app-order-create',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './order-create.component.html',
  styleUrl: './order-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly doors = signal<readonly DoorItem[]>([]);
  protected readonly showOrdersError = signal(false);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    date: [this.todayIso(), [Validators.required]],
    prepayment: [0, [Validators.required, Validators.min(0)]],
    quantity: [{ value: 0, disabled: true }, [Validators.required, Validators.min(1)]],
  });

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
      orders: this.doors(),
    };

    console.log('Order payload', payload);
    this.createOrder(payload);
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

  private createOrder(payload: OrderCreatePayload): void {
    console.log('Creating order (mock)...', payload);
    setTimeout(() => {
      const createdId = 1;
      void this.router.navigate(['/order', createdId]);
    }, 400);
  }

  private todayIso(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
