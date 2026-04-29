import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { getOrderPaymentLabel, getOrderStatusLabel, ORDER_STATUS_OPTIONS } from '../../common/constants/order-status';
import { PhoneFormatPipe } from '../../common/pipes/phone-format.pipe';
import { OrdersService, OrderRecord } from '../../services/orders.service';
import { OrderStatus } from '../../types/order.types';
import { OrdersTableFilters, OrdersTableFiltersComponent } from './orders-table-filters/orders-table-filters.component';

@Component({
  selector: 'app-orders-table',
  imports: [
    CommonModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    PhoneFormatPipe,
    OrdersTableFiltersComponent,
  ],
  templateUrl: './orders-table.component.html',
  styleUrl: './orders-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: MatPaginatorIntl,
      useFactory: () => {
        const intl = new MatPaginatorIntl();
        intl.itemsPerPageLabel = 'количество элементов на странице';
        return intl;
      },
    },
  ],
})
export class OrdersTableComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sort = viewChild(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  protected readonly dataSource = new MatTableDataSource<OrderRecord>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly displayedColumns = [
    'id',
    'customer',
    'phone',
    'date',
    'price',
    'prepayment',
    'payment',
    'comment',
    'status',
  ] as const;
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  private allOrders: OrderRecord[] = [];
  private activeFilters: OrdersTableFilters | null = null;

  private readonly sortAccessors: Record<string, (item: OrderRecord) => string | number> = {
    id: (item) => item.id,
    date: (item) => new Date(item.date).getTime(),
    price: (item) => item.price,
    prepayment: (item) => item.prepayment,
    payment: (item) => (item.isPaid ? 1 : 0),
    customer: (item) => item.customer.toLocaleLowerCase(),
    phone: (item) => item.phone,
    comment: (item) => item.comment.toLocaleLowerCase(),
    status: (item) => item.status,
  };

  constructor() {
    effect(() => {
      const sort = this.sort();
      if (!sort) {
        return;
      }

      this.dataSource.sort = sort;
      sort.active = 'date';
      sort.direction = 'desc';
      sort.disableClear = true;
      sort.sortChange.emit({ active: 'date', direction: 'desc' });
    });

    effect(() => {
      const paginator = this.paginator();
      if (!paginator) {
        return;
      }

      this.dataSource.paginator = paginator;
    });
  }

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item, property) => this.sortAccessors[property]?.(item) ?? '';

    this.ordersService
      .getOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.allOrders = [...orders];
          this.applyFilters();
          this.loadError.set(null);
          this.isLoading.set(false);
        },
        error: () => {
          this.loadError.set('Не удалось загрузить список заказов.');
          this.isLoading.set(false);
        },
      });
  }

  protected onRowClick(row: OrderRecord): void {
    this.router.navigate(['/order', row.id]);
  }

  protected onStatusClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  protected onPaymentClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  protected onStatusChange(orderId: number, status: OrderStatus): void {
    this.ordersService
      .updateOrderStatus(orderId, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nextStatus) => {
          this.allOrders = this.allOrders.map((order) =>
            order.id === orderId ? { ...order, status: nextStatus } : order,
          );
          this.applyFilters();
        },
        error: () => {
          this.loadError.set('Не удалось обновить статус заказа.');
        },
      });
  }

  protected onPaymentStatusChange(orderId: number, isPaid: boolean): void {
    this.ordersService
      .updateOrderPaymentStatus(orderId, isPaid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nextPaymentStatus) => {
          this.allOrders = this.allOrders.map((order) =>
            order.id === orderId ? { ...order, isPaid: nextPaymentStatus } : order,
          );
          this.applyFilters();
        },
        error: () => {
          this.loadError.set('Не удалось обновить статус оплаты.');
        },
      });
  }

  protected getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }

  protected getPaymentLabel(isPaid: boolean): string {
    return getOrderPaymentLabel(isPaid);
  }

  protected onFiltersApply(filters: OrdersTableFilters): void {
    this.activeFilters = filters;
    this.applyFilters();
    this.paginator()?.firstPage();
  }

  protected onFiltersClear(): void {
    this.activeFilters = null;
    this.applyFilters();
    this.paginator()?.firstPage();
  }

  private applyFilters(): void {
    const filters = this.activeFilters;

    if (!filters) {
      this.dataSource.data = [...this.allOrders];
      return;
    }

    const customerQuery = filters.customer.toLocaleLowerCase();
    const phoneQuery = filters.phone;

    this.dataSource.data = this.allOrders.filter((order) => {
      if (filters.orderId && order.id !== filters.orderId) {
        return false;
      }

      if (customerQuery && !order.customer.toLocaleLowerCase().includes(customerQuery)) {
        return false;
      }

      if (phoneQuery && !order.phone.includes(phoneQuery)) {
        return false;
      }

      if (filters.date && this.toIsoDate(order.date) !== filters.date) {
        return false;
      }

      if (filters.status && order.status !== filters.status) {
        return false;
      }

      return true;
    });
  }

  private toIsoDate(value: string): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
