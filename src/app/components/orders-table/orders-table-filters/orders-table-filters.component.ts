import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { PhoneMaskDirective } from '../../../common/directives/phone-mask.directive';
import { getOrderStatusLabel, ORDER_STATUS_OPTIONS } from '../../../common/constants/order-status';
import { OrderStatus } from '../../../types/order.types';
import { MatIconModule } from '@angular/material/icon';

export interface OrdersTableFilters {
  orderId: number | null;
  customer: string;
  phone: string;
  date: string | null;
  status: OrderStatus | null;
}

@Component({
  selector: 'app-orders-table-filters',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatIconModule,
    PhoneMaskDirective,
  ],
  templateUrl: './orders-table-filters.component.html',
  styleUrl: './orders-table-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersTableFiltersComponent {
  private readonly fb = inject(FormBuilder);
  readonly applyClick = output<OrdersTableFilters>();
  readonly clearClick = output<void>();

  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  protected readonly form = this.fb.group({
    orderId: [null as number | null],
    customer: [''],
    phone: [''],
    date: [null as Date | null],
    status: [null as OrderStatus | null],
  });

  protected hasAnyValue(): boolean {
    const { orderId, customer, phone, date, status } = this.form.getRawValue();

    return Boolean(orderId || customer?.trim().length || phone?.trim().length || date || status);
  }

  protected onApplyClick(): void {
    if (!this.hasAnyValue()) {
      return;
    }

    const { orderId, customer, phone, date, status } = this.form.getRawValue();

    this.applyClick.emit({
      orderId: orderId ?? null,
      customer: customer?.trim() ?? '',
      phone: phone?.trim() ?? '',
      date: date ? this.toIsoDate(date) : null,
      status: status ?? null,
    });
  }

  protected onClearClick(): void {
    this.form.reset({
      orderId: null,
      customer: '',
      phone: '',
      date: null,
      status: null,
    });
    this.clearClick.emit();
  }

  protected getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
