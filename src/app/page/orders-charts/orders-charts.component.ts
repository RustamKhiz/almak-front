import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OrderChartComponent } from '../../components/order-chart/order-chart.component';

@Component({
  selector: 'app-orders-charts',
  imports: [OrderChartComponent],
  templateUrl: './orders-charts.component.html',
  styleUrl: './orders-charts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersChartsComponent {}