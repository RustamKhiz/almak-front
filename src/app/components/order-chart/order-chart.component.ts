import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { getOrderStatusLabel, ORDER_STATUS_OPTIONS } from '../../common/constants/order-status';
import { OrderRecord, OrdersService } from '../../services/orders.service';

@Component({
  selector: 'app-order-chart',
  imports: [CommonModule],
  templateUrl: './order-chart.component.html',
  styleUrl: './order-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('revenueCanvas') private readonly revenueCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersCanvas') private readonly ordersCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusCanvas') private readonly statusCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('paymentCanvas') private readonly paymentCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly ordersService = inject(OrdersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly charts: Chart[] = [];
  private orders: readonly OrderRecord[] = [];
  private isViewReady = false;

  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly metrics = signal<readonly ChartMetric[]>([]);
  protected readonly hasData = signal(false);

  constructor() {
    Chart.register(...registerables);

    this.ordersService
      .getOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.orders = orders;
          this.hasData.set(orders.length > 0);
          this.metrics.set(this.buildMetrics(orders));
          this.loadError.set(null);
          this.isLoading.set(false);
          this.renderChartsIfReady();
        },
        error: () => {
          this.loadError.set('Не удалось загрузить данные для графиков.');
          this.isLoading.set(false);
        },
      });
  }

  ngAfterViewInit(): void {
    this.isViewReady = true;
    this.renderChartsIfReady();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private renderChartsIfReady(): void {
    if (!this.isViewReady || this.isLoading() || this.loadError() || this.orders.length === 0) {
      return;
    }

    this.destroyCharts();
    this.renderRevenueChart();
    this.renderOrdersChart();
    this.renderStatusChart();
    this.renderPaymentChart();
  }

  private renderRevenueChart(): void {
    const canvas = this.revenueCanvas?.nativeElement;
    if (!canvas) {
      return;
    }

    const monthly = this.getMonthlyGroups(this.orders);
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

  private renderOrdersChart(): void {
    const canvas = this.ordersCanvas?.nativeElement;
    if (!canvas) {
      return;
    }

    const monthly = this.getMonthlyGroups(this.orders);
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

  private renderStatusChart(): void {
    const canvas = this.statusCanvas?.nativeElement;
    if (!canvas) {
      return;
    }

    const statusCounts = ORDER_STATUS_OPTIONS.map((status) => ({
      label: getOrderStatusLabel(status),
      value: this.orders.filter((order) => order.status === status).length,
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

  private renderPaymentChart(): void {
    const canvas = this.paymentCanvas?.nativeElement;
    if (!canvas) {
      return;
    }

    const paid = this.orders.filter((order) => order.isPaid).length;
    const unpaid = this.orders.length - paid;

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
