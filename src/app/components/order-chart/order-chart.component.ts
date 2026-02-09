import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-order-chart',
  templateUrl: './order-chart.component.html',
  styleUrl: './order-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderChartComponent {}