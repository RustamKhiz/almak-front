import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OrderCreateComponent } from '../../components/order-create/order-create.component';

@Component({
  selector: 'app-order',
  imports: [OrderCreateComponent],
  templateUrl: './order.component.html',
  styleUrl: './order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderComponent {}
