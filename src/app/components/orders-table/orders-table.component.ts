import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EMPTY, finalize, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../common/confirm-dialog/confirm-dialog.component';
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
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
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
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sort = viewChild(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  protected readonly dataSource = new MatTableDataSource<OrderRecord>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly canDelete = computed(() => this.auth.can('orders.delete'));
  protected readonly selected = signal<ReadonlySet<number>>(new Set());
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal('');
  protected readonly selectionLimit = 100;
  private readonly visibleOrders = signal<readonly OrderRecord[]>([]);
  protected readonly selectedOnPage = computed(
    () => this.visibleOrders().filter((order) => this.selected().has(order.id)).length,
  );
  protected readonly allOnPageSelected = computed(
    () => this.visibleOrders().length > 0 && this.selectedOnPage() === this.visibleOrders().length,
  );
  protected readonly canTogglePage = computed(
    () =>
      !this.deleting() &&
      this.visibleOrders().length > 0 &&
      this.selected().size + this.visibleOrders().length - this.selectedOnPage() <= this.selectionLimit,
  );
  protected readonly displayedColumns = computed(() => [
    ...(this.canDelete() ? ['select'] : []),
    'id',
    'customer',
    'phone',
    'date',
    'price',
    'prepayment',
    'payment',
    'comment',
    'status',
  ]);
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  private allOrders: OrderRecord[] = [];
  private activeFilters: OrdersTableFilters | null = null;

  private readonly sortAccessors: Record<string, (item: OrderRecord) => string | number> = {
    id: (item) => item.id,
    date: (item) => new Date(item.date).getTime(),
    price: (item) => this.getTotalToPay(item),
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
    this.dataSource
      .connect()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((orders) => this.visibleOrders.set(orders));

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

  protected toggleSelection(id: number, checked: boolean): void {
    if (this.deleting()) return;
    this.selected.update((selected) => {
      const next = new Set(selected);
      if (!checked) next.delete(id);
      else if (next.size < this.selectionLimit) next.add(id);
      return next;
    });
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected togglePage(checked: boolean): void {
    if (!this.canTogglePage()) return;
    this.selected.update((selected) => {
      const next = new Set(selected);
      for (const order of this.visibleOrders()) {
        if (checked) next.add(order.id);
        else next.delete(order.id);
      }
      return next;
    });
  }

  protected deleteSelected(): void {
    const ids = [...this.selected()].sort((a, b) => a - b);
    if (!ids.length || this.deleting() || !this.canDelete()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    const data: ConfirmDialogData = {
      title: 'Удалить выбранные заказы?',
      message: `Выбрано заказов: ${ids.length}. Номера: ${ids.map((id) => '#' + id).join(', ')}. Товары и платежи этих заказов тоже будут удалены. Отменить это действие нельзя.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
    };
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data })
      .afterClosed()
      .pipe(
        switchMap((confirmed) => (confirmed ? this.ordersService.deleteOrders(ids) : EMPTY)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: () => {
          const removed = new Set(ids);
          this.allOrders = this.allOrders.filter((order) => !removed.has(order.id));
          this.selected.set(new Set());
          this.applyFilters();
        },
        error: () => this.deleteError.set('Не удалось удалить выбранные заказы. Повторите попытку.'),
      });
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

  protected getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }

  protected getPaymentLabel(isPaid: boolean): string {
    return getOrderPaymentLabel(isPaid);
  }

  protected getTotalToPay(order: OrderRecord): number {
    return Math.max(order.price - order.discount, 0);
  }

  protected onFiltersApply(filters: OrdersTableFilters): void {
    this.selected.set(new Set());
    this.activeFilters = filters;
    this.applyFilters();
    this.paginator()?.firstPage();
  }

  protected onFiltersClear(): void {
    this.selected.set(new Set());
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
