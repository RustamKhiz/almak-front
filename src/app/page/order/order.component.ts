import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-order',  templateUrl: './order.component.html',
  styleUrl: './order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderComponent {}