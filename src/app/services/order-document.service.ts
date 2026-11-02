import { Injectable, inject } from '@angular/core';
import { PrintConstructorOptions } from '../common/dialogs/print-constructor-dialog/print-constructor.types';
import { OrderCreatePayload } from '../types/order.types';
import { OrderDocumentHtmlBuilderService } from './order-document-html-builder.service';

@Injectable({ providedIn: 'root' })
export class OrderDocumentService {
  private readonly htmlBuilder = inject(OrderDocumentHtmlBuilderService);

  createDocBlob(orderId: number, order: OrderCreatePayload): Blob {
    return this.createBlob(this.buildOrderHtml(orderId, order));
  }

  createCustomDocBlob(orderId: number, order: OrderCreatePayload, options: PrintConstructorOptions): Blob {
    return this.createBlob(this.buildCustomOrderHtml(orderId, order, options));
  }

  buildOrderHtml(orderId: number, order: OrderCreatePayload): string {
    return this.htmlBuilder.buildOrderHtml(orderId, order);
  }

  buildCustomOrderHtml(orderId: number, order: OrderCreatePayload, options: PrintConstructorOptions): string {
    return this.htmlBuilder.buildCustomOrderHtml(orderId, order, options);
  }

  private createBlob(html: string): Blob {
    return new Blob(['\ufeff', html], { type: 'application/msword' });
  }
}
