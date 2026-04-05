import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, effect, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { getOrderStatusLabel, ORDER_STATUS_OPTIONS } from '../../common/constants/order-status';
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
})
export class OrdersTableComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sort = viewChild(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  protected readonly dataSource = new MatTableDataSource<OrderRecord>([]);
  protected readonly displayedColumns = [
    'id',
    'customer',
    'phone',
    'date',
    'price',
    'prepayment',
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
      sort.direction = 'asc';
      sort.disableClear = true;
      sort.sortChange.emit({ active: 'date', direction: 'asc' });
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
      .subscribe((orders) => {
        this.allOrders = [...orders];
        this.applyFilters();
      });
  }

  protected onRowClick(row: OrderRecord): void {
    this.router.navigate(['/order', row.id]);
  }

  protected onStatusClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  protected onStatusChange(orderId: number, status: OrderStatus): void {
    this.ordersService
      .updateOrderStatus(orderId, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((nextStatus) => {
        this.allOrders = this.allOrders.map((order) =>
          order.id === orderId ? { ...order, status: nextStatus } : order,
        );
        this.applyFilters();
      });
  }

  protected getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
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

    const normalizedCustomer = filters.customer.toLocaleLowerCase();
    const normalizedPhone = filters.phone;

    this.dataSource.data = this.allOrders.filter((order) => {
      if (filters.orderId && order.id !== filters.orderId) {
        return false;
      }

      if (normalizedCustomer && !order.customer.toLocaleLowerCase().includes(normalizedCustomer)) {
        return false;
      }

      if (normalizedPhone && !order.phone.includes(normalizedPhone)) {
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
