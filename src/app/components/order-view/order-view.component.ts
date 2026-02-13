import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DoorItem, OrderCreatePayload } from '../order-create/order-create.component';

export type OrderViewState = {
  id: number;
  data: OrderCreatePayload;
};

@Component({
  selector: 'app-order-view',
  templateUrl: './order-view.component.html',
  styleUrl: './order-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderViewComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly isLoading = signal(true);
  protected readonly state = signal<OrderViewState | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.fetchOrder(id);
  }

  private fetchOrder(id: number): void {
    this.isLoading.set(true);
    setTimeout(() => {
      const data = this.mockOrder(id);
      this.state.set({ id, data });
      this.isLoading.set(false);
    }, 400);
  }

  private mockOrder(id: number): OrderCreatePayload {
    const orders: DoorItem[] = [
      {
        id: 1,
        type: 'Entrance',
        model: 'Nordic',
        price: 450,
        color: 'White',
        width: 90,
        height: 210,
        leafType: 'Single',
        count: 1,
      },
    ];

    return {
      name: 'Иван Петров',
      phone: '+7 900 000-00-00',
      date: this.todayIso(),
      prepayment: 100,
      quantity: orders.reduce((sum, item) => sum + item.count, 0),
      orders,
    };
  }

  private todayIso(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
