import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  AfterViewInit,
  inject,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { PhoneFormatPipe } from '../../common/pipes/phone-format.pipe';
import { OrdersService, OrderRecord } from '../../services/orders.service';
import { OrderStatus } from '../../types/order.types';

@Component({
  selector: 'app-orders-table',
  imports: [CommonModule, MatTableModule, MatChipsModule, MatSortModule, PhoneFormatPipe],
  templateUrl: './orders-table.component.html',
  styleUrl: './orders-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersTableComponent implements OnInit, AfterViewInit {
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sort = viewChild(MatSort);

  protected readonly dataSource = new MatTableDataSource<OrderRecord>([]);
  protected readonly displayedColumns = [
    'id',
    'customer',
    'phone',
    'date',
    'count',
    'price',
    'prepayment',
    'comment',
    'status',
  ] as const;

  protected readonly statusLabels: Record<OrderStatus, string> = {
    [OrderStatus.Accepted]: 'Принят',
    [OrderStatus.Progress]: 'В процессе',
    [OrderStatus.Completed]: 'Завершен',
  };

  private readonly sortAccessors: Record<string, (item: OrderRecord) => string | number> = {
    id: (item) => item.id,
    date: (item) => new Date(item.date).getTime(),
    count: (item) => item.count,
    price: (item) => item.price,
    prepayment: (item) => item.prepayment,
    customer: (item) => item.customer.toLocaleLowerCase(),
    phone: (item) => item.phone,
    comment: (item) => item.comment.toLocaleLowerCase(),
    status: (item) => item.status,
  };

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item, property) =>
      this.sortAccessors[property]?.(item) ?? '';

    this.ordersService
      .getOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((orders) => (this.dataSource.data = [...orders]));
  }

  ngAfterViewInit(): void {
    const sort = this.sort();

    if (!sort) {
      return;
    }

    this.dataSource.sort = sort;
    sort.active = 'date';
    sort.direction = 'asc';
    sort.disableClear = true;
    sort.sortChange.emit({ active: 'date', direction: 'asc' });
  }

  protected onRowClick(row: OrderRecord): void {
    void this.router.navigate(['/order', row.id]);
  }

  protected getStatusLabel(status: OrderStatus): string {
    return this.statusLabels[status] || 'Неизвестный статус';
  }
}
