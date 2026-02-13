import { Injectable } from '@angular/core';
import { OrderCreatePayload } from '../types/order.types';

@Injectable({
  providedIn: 'root',
})
export class OrderDocumentService {
  createDocBlob(orderId: number, order: OrderCreatePayload): Blob {
    const html = this.buildOrderHtml(orderId, order);
    return new Blob(['\ufeff', html], { type: 'application/msword' });
  }

  buildOrderHtml(orderId: number, order: OrderCreatePayload): string {
    const rows = order.orders
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${this.escapeHtml(item.type)}</td>
            <td>${this.escapeHtml(item.model)}</td>
            <td>${this.escapeHtml(item.color)}</td>
            <td>${item.width}x${item.height}</td>
            <td>${this.escapeHtml(item.leafType)}</td>
            <td>${item.count}</td>
            <td>${item.price}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Заказ №${orderId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 16px; }
            h2 { margin: 24px 0 12px; }
            .meta { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Заказ №${orderId}</h1>
          <h2>Клиент</h2>
          <div class="meta"><b>Имя:</b> ${this.escapeHtml(order.name)}</div>
          <div class="meta"><b>Телефон:</b> ${this.escapeHtml(order.phone)}</div>
          <div class="meta"><b>Дата:</b> ${this.escapeHtml(order.date)}</div>
          <div class="meta"><b>Предоплата:</b> ${order.prepayment}</div>
          <div class="meta"><b>Количество:</b> ${order.quantity}</div>
          <div class="meta"><b>Комментарий:</b> ${this.escapeHtml(order.comment)}</div>

          <h2>Товары</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Тип</th>
                <th>Модель</th>
                <th>Цвет</th>
                <th>Размер</th>
                <th>Створка</th>
                <th>Кол-во</th>
                <th>Цена</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
