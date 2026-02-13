import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OrderCreateComponent } from '../../components/order-create/order-create.component';

@Component({
  selector: 'app-order',
  imports: [OrderCreateComponent],
  templateUrl: './order.component.html',
  styleUrl: './order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly orderId = signal<number | undefined>(undefined);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.orderId.set(id ? Number(id) : undefined);
  }
}
