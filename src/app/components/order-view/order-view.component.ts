import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { FileDownloadService } from '../../services/file-download.service';
import { OrderDocumentService } from '../../services/order-document.service';
import { OrdersService } from '../../services/orders.service';
import { OrderPrintService } from '../../services/order-print.service';
import { OrderCreatePayload } from '../../types/order.types';

export type OrderViewState = {
  id: number;
  data: OrderCreatePayload;
};

@Component({
  selector: 'app-order-view',
  imports: [MatButtonModule, RouterModule],
  templateUrl: './order-view.component.html',
  styleUrl: './order-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderViewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orderDocumentService = inject(OrderDocumentService);
  private readonly fileDownloadService = inject(FileDownloadService);
  private readonly orderPrintService = inject(OrderPrintService);
  private readonly ordersService = inject(OrdersService);

  protected readonly isLoading = signal(true);
  protected readonly state = signal<OrderViewState | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.fetchOrder(id);
  }

  private fetchOrder(id: number): void {
    this.isLoading.set(true);
    this.ordersService.getOrder(id).subscribe((data) => {
      this.state.set({ id, data });
      this.isLoading.set(false);
    });
  }

  protected onDownloadClick(): void {
    const current = this.state();
    if (!current) {
      return;
    }

    const blob = this.orderDocumentService.createDocBlob(current.id, current.data);
    this.fileDownloadService.download(blob, `order-${current.id}.doc`);
  }

  protected onPrintClick(): void {
    const current = this.state();
    if (!current) {
      return;
    }

    const html = this.orderDocumentService.buildOrderHtml(current.id, current.data);
    this.orderPrintService.printHtml(html);
  }
}
