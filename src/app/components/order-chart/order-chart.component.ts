import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { getOrderStatusLabel, ORDER_STATUS_OPTIONS } from '../../common/constants/order-status';
import {
  getCapitalTotal,
  getExtensionTotal,
  getHardwareTotal,
  getInteriorDoorTotal,
  getMoldingTotal,
  getPanelingTotal,
} from '../../common/utils/order-calculations';
import { OrderRecord, OrdersService } from '../../services/orders.service';
import { OrderCreatePayload, OrderStatus } from '../../types/order.types';

@Component({
  selector: 'app-order-chart',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
  ],
  templateUrl: './order-chart.component.html',
  styleUrl: './order-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderChartComponent implements OnDestroy {
  private readonly revenueCanvas = viewChild<ElementRef<HTMLCanvasElement>>('revenueCanvas');
  private readonly ordersCanvas = viewChild<ElementRef<HTMLCanvasElement>>('ordersCanvas');
  private readonly statusCanvas = viewChild<ElementRef<HTMLCanvasElement>>('statusCanvas');
  private readonly paymentCanvas = viewChild<ElementRef<HTMLCanvasElement>>('paymentCanvas');
  private readonly supplierCanvas = viewChild<ElementRef<HTMLCanvasElement>>('supplierCanvas');

  private readonly ordersService = inject(OrdersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly charts: Chart[] = [];
  private allOrders: readonly OrderRecord[] = [];
  private allFullOrders: readonly OrderCreatePayload[] = [];

  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly metrics = signal<readonly ChartMetric[]>([]);
  protected readonly hasData = signal(false);
  protected readonly filteredOrders = signal<readonly OrderRecord[]>([]);
  protected readonly isLoadingSuppliers = signal(true);
  protected readonly statusOptions = ORDER_STATUS_OPTIONS;
  protected readonly filterForm = this.fb.group({
    dateFrom: [null as Date | null],
    dateTo: [null as Date | null],
    status: [null as OrderStatus | null],
    payment: ['all' as PaymentFilter],
  });

  constructor() {
    Chart.register(...registerables);

    effect(() => {
      this.isLoading();
      this.loadError();
      this.hasData();
      this.filteredOrders();
      this.isLoadingSuppliers();
      this.revenueCanvas();
      this.ordersCanvas();
      this.statusCanvas();
      this.paymentCanvas();
      this.supplierCanvas();

      this.renderChartsIfReady();
    });

    this.ordersService
      .getOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.allOrders = orders;
          this.hasData.set(orders.length > 0);
          this.applyFilters();
          this.loadError.set(null);
          this.isLoading.set(false);
          this.loadFullOrders();
        },
        error: () => {
          this.loadError.set('Не удалось загрузить данные для графиков.');
          this.isLoading.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private renderChartsIfReady(): void {
    const canvases = this.getCanvases();
    const orders = this.filteredOrders();

    if (this.isLoading() || this.loadError() || this.allOrders.length === 0) {
      return;
    }

    if (orders.length === 0) {
      this.destroyCharts();
      return;
    }

    if (!canvases) {
      return;
    }

    this.destroyCharts();
    this.renderRevenueChart(canvases.revenue, orders);
    this.renderOrdersChart(canvases.orders, orders);
    this.renderStatusChart(canvases.status, orders);
    this.renderPaymentChart(canvases.payment, orders);

    if (!this.isLoadingSuppliers() && canvases.supplier) {
      const supplierStats = this.getFilteredSupplierStats();
      this.renderSupplierChart(canvases.supplier, supplierStats);
    }
  }

  private loadFullOrders(): void {
    const ids = this.allOrders.map((o) => o.id);
    if (ids.length === 0) {
      this.isLoadingSuppliers.set(false);
      return;
    }

    forkJoin(ids.map((id) => this.ordersService.getOrder(id)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.allFullOrders = orders;
          this.isLoadingSuppliers.set(false);
        },
        error: () => {
          this.isLoadingSuppliers.set(false);
        },
      });
  }

  private getFilteredSupplierStats(): readonly SupplierStat[] {
    const { dateFrom, dateTo, status, payment } = this.filterForm.getRawValue();
    const fromTime = dateFrom ? this.getStartOfDay(dateFrom).getTime() : null;
    const toTime = dateTo ? this.getEndOfDay(dateTo).getTime() : null;

    const filtered = this.allFullOrders.filter((order) => {
      const orderTime = new Date(order.date).getTime();
      if (fromTime !== null && orderTime < fromTime) return false;
      if (toTime !== null && orderTime > toTime) return false;
      if (status && order.status !== status) return false;
      if (payment === 'paid' && !order.isPaid) return false;
      if (payment === 'unpaid' && order.isPaid) return false;
      return true;
    });

    return this.aggregateSuppliers(filtered);
  }

  private aggregateSuppliers(orders: readonly OrderCreatePayload[]): readonly SupplierStat[] {
    const stats = new Map<string, { count: number; amount: number }>();

    const add = (supplier: string, amount: number) => {
      const key = supplier || 'Не указан';
      const cur = stats.get(key) ?? { count: 0, amount: 0 };
      stats.set(key, { count: cur.count + 1, amount: cur.amount + amount });
    };

    for (const order of orders) {
      for (const item of order.interiorDoors) add(item.supplier, getInteriorDoorTotal(item));
      for (const item of order.entranceDoors) add(item.supplier, item.price * item.count);
      for (const item of order.moldings) add(item.supplier, getMoldingTotal(item));
      for (const item of order.extensions) add(item.supplier, getExtensionTotal(item));
      for (const item of order.capitals) add(item.supplier, getCapitalTotal(item));
      for (const item of order.hardwares) add(item.supplier, getHardwareTotal(item));
      for (const item of order.panelings) add(item.supplier, getPanelingTotal(item));
    }

    return [...stats.entries()]
      .map(([name, { count, amount }]) => ({ name, count, amount }))
      .sort((a, b) => b.count - a.count);
  }

  private renderSupplierChart(canvas: HTMLCanvasElement, stats: readonly SupplierStat[]): void {
    this.createChart(canvas, {
      type: 'bar',
      data: {
        labels: stats.map((s) => s.name),
        datasets: [
          {
            label: 'Позиций',
            data: stats.map((s) => s.count),
            backgroundColor: stats.map((s) => (s.name === 'Не указан' ? '#d1d5db' : '#6366f1')),
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const stat = stats[ctx.dataIndex];
                return [`Позиций: ${stat.count}`, `Сумма: ${this.formatMoney(stat.amount)}`];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#e5e7eb' },
            ticks: { color: '#6b7280', precision: 0 },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#374151' },
          },
        },
      },
    });
  }

  protected onApplyFilters(): void {
    this.applyFilters();
  }

  protected onClearFilters(): void {
    this.filterForm.reset({
      dateFrom: null,
      dateTo: null,
      status: null,
      payment: 'all',
    });
    this.applyFilters();
  }

  protected getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }

  private renderRevenueChart(canvas: HTMLCanvasElement, orders: readonly OrderRecord[]): void {
    const monthly = this.getMonthlyGroups(orders);
    this.createChart(canvas, {
      type: 'line',
      data: {
        labels: monthly.map((item) => item.label),
        datasets: [
          {
            label: 'Сумма заказов',
            data: monthly.map((item) => item.total),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.14)',
            fill: true,
            tension: 0.35,
          },
          {
            label: 'Оплачено',
            data: monthly.map((item) => item.paid),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: this.getChartOptions(' ₽'),
    });
  }

  private renderOrdersChart(canvas: HTMLCanvasElement, orders: readonly OrderRecord[]): void {
    const monthly = this.getMonthlyGroups(orders);
    this.createChart(canvas, {
      type: 'bar',
      data: {
        labels: monthly.map((item) => item.label),
        datasets: [
          {
            label: 'Количество заказов',
            data: monthly.map((item) => item.count),
            backgroundColor: '#f59e0b',
            borderRadius: 6,
          },
        ],
      },
      options: this.getChartOptions(' шт.'),
    });
  }

  private renderStatusChart(canvas: HTMLCanvasElement, orders: readonly OrderRecord[]): void {
    const statusCounts = ORDER_STATUS_OPTIONS.map((status) => ({
      label: getOrderStatusLabel(status),
      value: orders.filter((order) => order.status === status).length,
    })).filter((item) => item.value > 0);

    this.createChart(canvas, {
      type: 'doughnut',
      data: {
        labels: statusCounts.map((item) => item.label),
        datasets: [
          {
            data: statusCounts.map((item) => item.value),
            backgroundColor: ['#2563eb', '#f59e0b', '#14b8a6', '#8b5cf6', '#ef4444', '#059669'],
            borderWidth: 0,
          },
        ],
      },
      options: this.getDoughnutOptions(),
    });
  }

  private renderPaymentChart(canvas: HTMLCanvasElement, orders: readonly OrderRecord[]): void {
    const paid = orders.filter((order) => order.isPaid).length;
    const unpaid = orders.length - paid;

    this.createChart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Оплачено', 'Не оплачено'],
        datasets: [
          {
            data: [paid, unpaid],
            backgroundColor: ['#059669', '#dc2626'],
            borderWidth: 0,
          },
        ],
      },
      options: this.getDoughnutOptions(),
    });
  }

  private applyFilters(): void {
    const { dateFrom, dateTo, status, payment } = this.filterForm.getRawValue();
    const fromTime = dateFrom ? this.getStartOfDay(dateFrom).getTime() : null;
    const toTime = dateTo ? this.getEndOfDay(dateTo).getTime() : null;

    const filtered = this.allOrders.filter((order) => {
      const orderDate = new Date(order.date);
      const orderTime = orderDate.getTime();

      if (fromTime !== null && (!Number.isFinite(orderTime) || orderTime < fromTime)) {
        return false;
      }

      if (toTime !== null && (!Number.isFinite(orderTime) || orderTime > toTime)) {
        return false;
      }

      if (status && order.status !== status) {
        return false;
      }

      if (payment === 'paid' && !order.isPaid) {
        return false;
      }

      if (payment === 'unpaid' && order.isPaid) {
        return false;
      }

      return true;
    });

    this.filteredOrders.set(filtered);
    this.metrics.set(this.buildMetrics(filtered));
  }

  private getCanvases(): ChartCanvases | null {
    const revenue = this.revenueCanvas()?.nativeElement;
    const orders = this.ordersCanvas()?.nativeElement;
    const status = this.statusCanvas()?.nativeElement;
    const payment = this.paymentCanvas()?.nativeElement;

    if (!revenue || !orders || !status || !payment) {
      return null;
    }

    return { revenue, orders, status, payment, supplier: this.supplierCanvas()?.nativeElement };
  }

  private buildMetrics(orders: readonly OrderRecord[]): readonly ChartMetric[] {
    const total = orders.reduce((sum, order) => sum + this.getTotalToPay(order), 0);
    const paid = orders.reduce((sum, order) => sum + order.prepayment, 0);
    const debt = orders.reduce((sum, order) => sum + this.getDebt(order), 0);
    const average = orders.length ? total / orders.length : 0;

    return [
      { label: 'Заказов', value: this.formatNumber(orders.length) },
      { label: 'Сумма заказов', value: this.formatMoney(total) },
      { label: 'Оплачено', value: this.formatMoney(paid) },
      { label: 'Долг', value: this.formatMoney(debt) },
      { label: 'Средний чек', value: this.formatMoney(average) },
    ];
  }

  private getMonthlyGroups(orders: readonly OrderRecord[]): readonly MonthlyGroup[] {
    const groups = new Map<string, MonthlyGroup>();

    for (const order of orders) {
      const date = new Date(order.date);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
      const current = groups.get(key) ?? { key, label, total: 0, paid: 0, debt: 0, count: 0 };

      current.total += this.getTotalToPay(order);
      current.paid += order.prepayment;
      current.debt += this.getDebt(order);
      current.count += 1;
      groups.set(key, current);
    }

    return [...groups.values()].sort((first, second) => first.key.localeCompare(second.key));
  }

  private createChart<TType extends ChartType>(canvas: HTMLCanvasElement, config: ChartConfiguration<TType>): void {
    this.charts.push(new Chart(canvas, config) as Chart);
  }

  private getChartOptions(suffix: string): ChartConfiguration<'line' | 'bar'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            color: '#374151',
            font: { size: 12 },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${this.formatNumber(Number(context.raw))}${suffix}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6b7280' },
        },
        y: {
          beginAtZero: true,
          grid: { color: '#e5e7eb' },
          ticks: { color: '#6b7280' },
        },
      },
    };
  }

  private getDoughnutOptions(): ChartConfiguration<'doughnut'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            color: '#374151',
            font: { size: 12 },
          },
        },
      },
    };
  }

  private destroyCharts(): void {
    while (this.charts.length) {
      this.charts.pop()?.destroy();
    }
  }

  private getTotalToPay(order: OrderRecord): number {
    return Math.max(order.price - order.discount, 0);
  }

  private getDebt(order: OrderRecord): number {
    return Math.max(this.getTotalToPay(order) - order.prepayment, 0);
  }

  private formatMoney(value: number): string {
    return `${this.formatNumber(value)} ₽`;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
  }

  private getStartOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private getEndOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }
}

interface ChartMetric {
  label: string;
  value: string;
}

interface MonthlyGroup {
  key: string;
  label: string;
  total: number;
  paid: number;
  debt: number;
  count: number;
}

interface ChartCanvases {
  revenue: HTMLCanvasElement;
  orders: HTMLCanvasElement;
  status: HTMLCanvasElement;
  payment: HTMLCanvasElement;
  supplier?: HTMLCanvasElement;
}

interface SupplierStat {
  name: string;
  count: number;
  amount: number;
}

type PaymentFilter = 'all' | 'paid' | 'unpaid';
