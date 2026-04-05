import { Injectable } from '@angular/core';
import {
  CapitalCovering,
  DoorLeafType,
  EntranceDoorKind,
  ExtensionCovering,
  ExtensionItem,
  MoldingCovering,
  MoldingItem,
  MoldingPlatbandType,
  OrderCreatePayload,
  PanelingCovering,
  PanelingItem,
} from '../types/order.types';

@Injectable({ providedIn: 'root' })
export class OrderDocumentService {
  createDocBlob(orderId: number, order: OrderCreatePayload): Blob {
    const html = this.buildOrderHtml(orderId, order);
    return new Blob(['\ufeff', html], { type: 'application/msword' });
  }

  buildOrderHtml(orderId: number, order: OrderCreatePayload): string {
    const issueDate = this.escapeHtml(order.date);
    const totalAmount =
      order.interiorDoors.reduce((sum, item) => sum + item.price * item.count, 0) +
      order.entranceDoors.reduce((sum, item) => sum + item.price * item.count, 0) +
      order.moldings.reduce((sum, item) => sum + this.getMoldingTotal(item), 0) +
      order.extensions.reduce((sum, item) => sum + this.getExtensionTotal(item), 0) +
      order.panelings.reduce((sum, item) => sum + this.getPanelingTotal(item), 0);
    const totalToPay = Math.max(totalAmount - order.discount, 0);
    const customerDebt = Math.max(totalToPay - order.prepayment, 0);

    let rowNumber = 1;
    const interiorRows = order.interiorDoors
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Межкомнатная',
          item.model,
          item.hasGlass ? 'Со стеклом' : 'Глухая',
          this.formatDoorSize(item.width, item.height, item.width2),
          this.getLeafTypeLabel(item.leafType),
          item.comment || '-',
          item.count,
          item.price,
          item.price * item.count,
        ),
      )
      .join('');
    const entranceRows = order.entranceDoors
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Входная',
          item.model,
          this.getEntranceExecutionLabel(item.kind, item.painting, item.panelColor, item.hasPeephole),
          this.formatDoorSize(item.width, item.height, null),
          item.color,
          item.comment || '-',
          item.count,
          item.price,
          item.price * item.count,
        ),
      )
      .join('');
    const moldingRows = order.moldings
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Погонаж',
          this.getMoldingTitle(item),
          this.getMoldingExecutionLabel(item),
          this.getMoldingSizeLabel(item),
          this.getMoldingCoveringLabel(item.covering),
          item.comment || '-',
          item.frameCount + item.platbandCount,
          this.getMoldingTotal(item),
          this.getMoldingTotal(item),
        ),
      )
      .join('');
    const extensionRows = order.extensions
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Доборы',
          `Доборы ${item.color}`,
          `${item.width}x${item.height}`,
          `${item.width}x${item.height}`,
          this.getExtensionCoveringLabel(item.covering),
          item.comment || '-',
          item.count,
          item.price,
          item.price * item.count,
        ),
      )
      .join('');
    const capitalRows = order.capitals
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Капитель',
          item.name,
          `цвет ${item.color}`,
          `${item.width}x${item.height}`,
          this.getCapitalCoveringLabel(item.covering),
          item.comment || '-',
          item.count,
          0,
          0,
        ),
      )
      .join('');
    const panelingRows = order.panelings
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Обшивка',
          `Обшивка ${item.color}`,
          item.size,
          item.size,
          this.getPanelingCoveringLabel(item.covering),
          item.comment || '-',
          item.count,
          item.price,
          item.price * item.count,
        ),
      )
      .join('');
    const rows = `${interiorRows}${entranceRows}${moldingRows}${extensionRows}${capitalRows}${panelingRows}`;

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Заказ-наряд №${orderId}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: "Times New Roman", serif; font-size: 14px; line-height: 1.35; color: #111; margin: 0; padding: 26px; }
            .doc { border: 1px solid #111; padding: 18px; }
            .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; border-bottom: 1px solid #111; padding-bottom: 10px; }
            .company { font-size: 13px; }
            .company strong { font-size: 15px; }
            .order-title { text-align: right; }
            .order-title h1 { margin: 0; font-size: 22px; letter-spacing: 0.4px; }
            .order-title .num { margin-top: 4px; font-size: 14px; }
            .section-title { margin: 12px 0 8px; font-size: 16px; font-weight: bold; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 8px; }
            .meta-line { border-bottom: 1px dashed #666; padding-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #111; padding: 6px; vertical-align: top; }
            th { text-align: center; font-weight: bold; }
            td.num { text-align: center; white-space: nowrap; }
            td.money { text-align: right; white-space: nowrap; }
            .totals { margin-top: 12px; width: 320px; margin-left: auto; border: 1px solid #111; padding: 8px 10px; }
            .totals-row { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; }
            .comment { margin-top: 14px; min-height: 56px; border: 1px solid #111; padding: 8px; }
            .footer { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr 170px; gap: 16px; align-items: end; }
            .sign-block { min-height: 72px; }
            .sign-line { border-bottom: 1px solid #111; height: 34px; margin-bottom: 6px; }
            .stamp { border: 1px dashed #111; height: 90px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
            .muted { color: #444; font-size: 12px; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="doc">
            <div class="doc-header"><div class="company"><div><strong>ООО "АЛМАК"</strong></div><div>Заказ-наряд на поставку дверей и комплектующих</div></div><div class="order-title"><h1>ЗАКАЗ-НАРЯД</h1><div class="num">№ ${orderId} от ${issueDate}</div></div></div>
            <div class="section-title">Данные клиента</div>
            <div class="meta-grid">
              <div class="meta-line"><strong>ФИО:</strong> ${this.escapeHtml(order.name)}</div>
              <div class="meta-line"><strong>Телефон:</strong> ${this.escapeHtml(order.phone)}</div>
              <div class="meta-line"><strong>Дата заказа:</strong> ${issueDate}</div>
              <div class="meta-line"><strong>Доставка:</strong> ${order.needsDelivery ? 'Да' : 'Нет'}</div>
              <div class="meta-line"><strong>Адрес доставки:</strong> ${this.escapeHtml(order.deliveryAddress || '-')}</div>
            </div>
            <div class="section-title">Спецификация</div>
            <table>
              <thead><tr><th style="width: 34px;">№</th><th>Тип</th><th>Модель / позиция</th><th>Исполнение</th><th style="width: 84px;">Размер</th><th style="width: 102px;">Цвет / покрытие</th><th>Комментарий</th><th style="width: 62px;">Кол-во</th><th style="width: 76px;">Цена</th><th style="width: 86px;">Сумма</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="totals"><div class="totals-row"><span>Общая сумма:</span><strong>${totalAmount}</strong></div><div class="totals-row"><span>Скидка:</span><strong>${order.discount}</strong></div><div class="totals-row"><span>Итого к оплате:</span><strong>${totalToPay}</strong></div><div class="totals-row"><span>Предоплата:</span><strong>${order.prepayment}</strong></div><div class="totals-row"><span>Долг клиента:</span><strong>${customerDebt}</strong></div></div>
            <div class="comment"><strong>Комментарий:</strong> ${this.escapeHtml(order.comment)}</div>
            <div class="footer"><div class="sign-block"><div class="sign-line"></div><div>Подпись клиента</div></div><div class="sign-block"><div class="sign-line"></div><div>Подпись менеджера</div></div><div class="stamp">М.П.</div></div>
            <div class="muted">Документ сформирован автоматически в информационной системе.</div>
          </div>
        </body>
      </html>
    `;
  }

  private buildRow(
    index: number,
    type: string,
    title: string,
    execution: string,
    size: string,
    color: string,
    comment: string,
    count: number,
    price: number,
    amount: number,
  ): string {
    return `<tr><td class="num">${index}</td><td>${this.escapeHtml(type)}</td><td>${this.escapeHtml(title)}</td><td>${this.escapeHtml(execution)}</td><td class="num">${this.escapeHtml(size)}</td><td>${this.escapeHtml(color)}</td><td>${this.escapeHtml(comment)}</td><td class="num">${count}</td><td class="money">${price}</td><td class="money">${amount}</td></tr>`;
  }

  private getLeafTypeLabel(value: string): string {
    switch (value) {
      case DoorLeafType.Single:
        return 'Одна створка';
      case DoorLeafType.Double:
        return 'Две створки';
      default:
        return value;
    }
  }
  private getEntranceExecutionLabel(
    kind: EntranceDoorKind,
    painting: string | null,
    panelColor: string | null,
    hasPeephole: boolean | null,
  ): string {
    const details = [kind === EntranceDoorKind.Welded ? 'Сварочная' : 'Фабричная'];
    if (painting) {
      details.push(`покраска: ${painting}`);
    }
    if (panelColor) {
      details.push(`обшивка: ${panelColor}`);
    }
    if (hasPeephole !== null) {
      details.push(`глазок: ${hasPeephole ? 'есть' : 'нет'}`);
    }
    return details.join(', ');
  }
  private getMoldingTitle(item: MoldingItem): string {
    return `Коробка + наличник ${this.getMoldingPlatbandTypeLabel(item.platbandType)}${item.platbandFigure ? ` (${item.platbandFigure})` : ''}`;
  }
  private getMoldingExecutionLabel(item: MoldingItem): string {
    return `Цвет ${item.color}, притворная планка ${item.rebateBarCount}`;
  }
  private getMoldingSizeLabel(item: MoldingItem): string {
    const frame = item.frameLength !== null ? `коробка ${item.frameLength}` : 'коробка -';
    const platband = item.platbandLength !== null ? `наличник ${item.platbandLength}` : 'наличник -';
    return `${frame}; ${platband}`;
  }
  private getMoldingCoveringLabel(value: MoldingCovering): string {
    switch (value) {
      case MoldingCovering.Enamel:
        return 'Эмаль';
      case MoldingCovering.Veneer:
        return 'Шпон';
      case MoldingCovering.Embossing:
        return 'Тиснение';
      case MoldingCovering.PVC:
        return 'ПВХ';
      default:
        return value;
    }
  }
  private getMoldingPlatbandTypeLabel(value: MoldingPlatbandType): string {
    switch (value) {
      case MoldingPlatbandType.Oval:
        return 'овальный';
      case MoldingPlatbandType.Smooth:
        return 'гладкий';
      case MoldingPlatbandType.Figure:
        return 'фигурный';
      default:
        return value;
    }
  }
  private getExtensionCoveringLabel(value: ExtensionCovering): string {
    switch (value) {
      case ExtensionCovering.Enamel:
        return 'Эмаль';
      case ExtensionCovering.Veneer:
        return 'Шпон';
      case ExtensionCovering.Embossing:
        return 'Тиснение';
      default:
        return value;
    }
  }
  private getCapitalCoveringLabel(value: CapitalCovering): string {
    switch (value) {
      case CapitalCovering.Enamel:
        return 'Эмаль';
      case CapitalCovering.Veneer:
        return 'Шпон';
      case CapitalCovering.Embossing:
        return 'Тиснение';
      default:
        return value;
    }
  }
  private getPanelingCoveringLabel(value: PanelingCovering): string {
    switch (value) {
      case PanelingCovering.Enamel:
        return 'Эмаль';
      case PanelingCovering.Veneer:
        return 'Шпон';
      case PanelingCovering.Embossing:
        return 'Тиснение';
      case PanelingCovering.PVC:
        return 'ПВХ';
      default:
        return value;
    }
  }
  private getMoldingTotal(item: MoldingItem): number {
    return item.framePrice * item.frameCount + item.platbandPrice * item.platbandCount;
  }
  private getExtensionTotal(item: ExtensionItem): number {
    return item.price * item.count;
  }
  private getPanelingTotal(item: PanelingItem): number {
    return item.price * item.count;
  }
  private formatDoorSize(width: number, height: number, width2: number | null): string {
    return `${width2 === null ? `${width}` : `${width}+${width2}`}x${height}`;
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
