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
    const issueDate = this.escapeHtml(order.date);
    const totalAmount = order.orders.reduce((sum, item) => sum + item.price * item.count, 0);
    const amountDue = Math.max(totalAmount - order.prepayment, 0);
    const rows = order.orders
      .map(
        (item, index) => `
          <tr>
            <td class="num">${index + 1}</td>
            <td>${this.escapeHtml(this.getDoorTypeLabel(item.type))}</td>
            <td>${this.escapeHtml(item.model)}</td>
            <td>${this.escapeHtml(item.color)}</td>
            <td class="num">${item.width}x${item.height}</td>
            <td>${this.escapeHtml(this.getLeafTypeLabel(item.leafType))}</td>
            <td class="num">${item.count}</td>
            <td class="money">${item.price}</td>
            <td class="money">${item.price * item.count}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Заказ-наряд №${orderId}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: "Times New Roman", serif;
              font-size: 14px;
              line-height: 1.35;
              color: #111;
              margin: 0;
              padding: 26px;
            }
            .doc {
              border: 1px solid #111;
              padding: 18px;
            }
            .doc-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 14px;
              border-bottom: 1px solid #111;
              padding-bottom: 10px;
            }
            .company {
              font-size: 13px;
            }
            .company strong {
              font-size: 15px;
            }
            .order-title {
              text-align: right;
            }
            .order-title h1 {
              margin: 0;
              font-size: 22px;
              letter-spacing: 0.4px;
            }
            .order-title .num {
              margin-top: 4px;
              font-size: 14px;
            }
            .section-title {
              margin: 12px 0 8px;
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px 24px;
              margin-bottom: 8px;
            }
            .meta-line {
              border-bottom: 1px dashed #666;
              padding-bottom: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #111;
              padding: 6px;
              vertical-align: top;
            }
            th {
              text-align: center;
              font-weight: bold;
            }
            td.num {
              text-align: center;
              white-space: nowrap;
            }
            td.money {
              text-align: right;
              white-space: nowrap;
            }
            .totals {
              margin-top: 12px;
              width: 320px;
              margin-left: auto;
              border: 1px solid #111;
              padding: 8px 10px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin: 4px 0;
            }
            .comment {
              margin-top: 14px;
              min-height: 56px;
              border: 1px solid #111;
              padding: 8px;
            }
            .footer {
              margin-top: 20px;
              display: grid;
              grid-template-columns: 1fr 1fr 170px;
              gap: 16px;
              align-items: end;
            }
            .sign-block {
              min-height: 72px;
            }
            .sign-line {
              border-bottom: 1px solid #111;
              height: 34px;
              margin-bottom: 6px;
            }
            .stamp {
              border: 1px dashed #111;
              height: 90px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
            }
            .muted {
              color: #444;
              font-size: 12px;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="doc">
            <div class="doc-header">
              <div class="company">
                <div><strong>ООО "АЛМАК"</strong></div>
                <div>Заказ-наряд на поставку дверей</div>
              </div>
              <div class="order-title">
                <h1>ЗАКАЗ-НАРЯД</h1>
                <div class="num">№ ${orderId} от ${issueDate}</div>
              </div>
            </div>

            <div class="section-title">Данные клиента</div>
            <div class="meta-grid">
              <div class="meta-line"><strong>ФИО:</strong> ${this.escapeHtml(order.name)}</div>
              <div class="meta-line"><strong>Телефон:</strong> ${this.escapeHtml(order.phone)}</div>
              <div class="meta-line"><strong>Дата заказа:</strong> ${issueDate}</div>
              <div class="meta-line"><strong>Количество позиций:</strong> ${order.quantity}</div>
            </div>

            <div class="section-title">Спецификация</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 34px;">№</th>
                  <th>Тип двери</th>
                  <th>Модель</th>
                  <th>Цвет</th>
                  <th style="width: 84px;">Размер</th>
                  <th style="width: 102px;">Створка</th>
                  <th style="width: 62px;">Кол-во</th>
                  <th style="width: 76px;">Цена</th>
                  <th style="width: 86px;">Сумма</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="totals">
              <div class="totals-row"><span>Общая сумма:</span><strong>${totalAmount}</strong></div>
              <div class="totals-row"><span>Предоплата:</span><strong>${order.prepayment}</strong></div>
              <div class="totals-row"><span>К оплате:</span><strong>${amountDue}</strong></div>
            </div>

            <div class="comment">
              <strong>Комментарий:</strong> ${this.escapeHtml(order.comment)}
            </div>

            <div class="footer">
              <div class="sign-block">
                <div class="sign-line"></div>
                <div>Подпись клиента</div>
              </div>
              <div class="sign-block">
                <div class="sign-line"></div>
                <div>Подпись менеджера</div>
              </div>
              <div class="stamp">М.П.</div>
            </div>
            <div class="muted">Документ сформирован автоматически в информационной системе.</div>
          </div>
        </body>
      </html>
    `;
  }

  private getDoorTypeLabel(value: string): string {
    if (value === 'Entrance') {
      return 'Входная';
    }
    if (value === 'Interior') {
      return 'Межкомнатная';
    }
    return value;
  }

  private getLeafTypeLabel(value: string): string {
    if (value === 'Single') {
      return 'Одна створка';
    }
    if (value === 'Double') {
      return 'Две створки';
    }
    return value;
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
