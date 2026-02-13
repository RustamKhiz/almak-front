import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, AfterViewInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { OrdersService, OrderRecord } from '../../services/orders.service';
import { OrderStatus } from '../../types/order.types';

@Component({
  selector: 'app-orders-table',
  imports: [CommonModule, MatTableModule, MatChipsModule, MatSortModule],
  templateUrl: './orders-table.component.html',
  styleUrl: './orders-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersTableComponent implements OnInit, AfterViewInit {
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

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

  @ViewChild(MatSort) private readonly sort?: MatSort;

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'date':
          return new Date(item.date).getTime();
        case 'id':
          return item.id;
        case 'count':
          return item.count;
        case 'price':
          return item.price;
        case 'prepayment':
          return item.prepayment;
        case 'customer':
          return item.customer;
        case 'phone':
          return item.phone;
        case 'comment':
          return item.comment;
        case 'status':
          return item.status;
        default:
          return '';
      }
    };

    this.ordersService
      .getOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((orders) => this.dataSource.data = [...orders]);
  }

  ngAfterViewInit(): void {
    if (!this.sort) {
      return;
    }

    this.dataSource.sort = this.sort;
    this.sort.active = 'date';
    this.sort.direction = 'asc';
    this.sort.disableClear = true;
    this.sort.sortChange.emit({ active: 'date', direction: 'asc' });
  }

  protected onRowClick(row: OrderRecord): void {
    this.ordersService.createOrder().subscribe((id) => {
      void this.router.navigate(['/order', id]);
    });
  }
}

