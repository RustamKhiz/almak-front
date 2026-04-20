import { Injectable } from '@angular/core';
import {
  CapitalCovering,
  DoorLeafType,
  EntranceDoorKind,
  ExtensionCovering,
  ExtensionItem,
  HardwareItem,
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
      order.capitals.reduce((sum, item) => sum + this.getCapitalTotal(item), 0) +
      order.hardwares.reduce((sum, item) => sum + this.getHardwareTotal(item), 0) +
      order.panelings.reduce((sum, item) => sum + this.getPanelingTotal(item), 0);
    const totalToPay = Math.max(totalAmount - order.discount, 0);
    const paidAmount =
      order.payments.length > 0 ? order.payments.reduce((sum, payment) => sum + payment.amount, 0) : order.prepayment;
    const customerDebt = Math.max(totalToPay - paidAmount, 0);
    const rowCount =
      order.interiorDoors.length +
      order.entranceDoors.length +
      order.moldings.length +
      order.extensions.length +
      order.capitals.length +
      order.hardwares.length +
      order.panelings.length;
    const layoutMode = this.getLayoutMode(order, rowCount);

    let rowNumber = 1;
    const interiorRows = order.interiorDoors
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Межкомнатная дверь',
          item.model,
          this.formatDoorSize(item.width, item.height, item.width2),
          `${this.getLeafTypeLabel(item.leafType)}, ${item.color}${item.hasGlass ? `, со стеклом${item.glassComment ? `: ${item.glassComment}` : ''}` : ''}`,
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
          'Входная дверь',
          item.model,
          this.formatDoorSize(item.width, item.height, null),
          this.getEntranceColorLabel(item),
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
          this.getMoldingSizeLabel(item),
          `${item.color}, ${this.getMoldingCoveringLabel(item.covering)}`,
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
          `${item.color}, ${this.getExtensionCoveringLabel(item.covering)}, ${item.quantityPerSet} в компл., общ. кв.м ${item.totalArea}`,
          item.comment || '-',
          item.count,
          item.price,
          this.getExtensionTotal(item),
        ),
      )
      .join('');
    const capitalRows = order.capitals
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Капитель',
          item.name,
          `${item.width}x${item.height}`,
          `${item.color}, ${this.getCapitalCoveringLabel(item.covering)}`,
          item.comment || '-',
          item.count,
          item.price,
          this.getCapitalTotal(item),
        ),
      )
      .join('');
    const hardwareRows = order.hardwares
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Фурнитура',
          this.getHardwareTitle(item),
          '-',
          this.getHardwareExecutionLabel(item),
          item.comment || '-',
          this.getHardwareCount(item),
          this.getHardwareTotal(item),
          this.getHardwareTotal(item),
        ),
      )
      .join('');
    const panelingRows = order.panelings
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Обшивка',
          `Обшивка ${item.color}`,
          `${item.width}x${item.height}`,
          `${item.color}, ${this.getPanelingCoveringLabel(item.covering)}, ${item.quantityPerSet} в компл., общ. кв.м ${item.totalArea}`,
          item.comment || '-',
          item.count,
          item.price,
          this.getPanelingTotal(item),
        ),
      )
      .join('');
    const rows = `${interiorRows}${entranceRows}${moldingRows}${extensionRows}${capitalRows}${hardwareRows}${panelingRows}`;

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Заказ-наряд №${orderId}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            html, body { width: 100%; }
            body { font-family: "Times New Roman", serif; font-size: 11px; line-height: 1.15; color: #111; margin: 0; padding: 0; }
            .doc { border: 1px solid #111; padding: 10px 12px; }
            .doc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 8px; border-bottom: 1px solid #111; padding-bottom: 6px; }
            .company-wrap { display: flex; align-items: flex-start; gap: 12px; }
            .logo { width: 72px; height: auto; object-fit: contain; }
            .company { font-size: 11px; }
            .company strong { font-size: 13px; }
            .order-title { text-align: right; }
            .order-title h1 { margin: 0; font-size: 18px; letter-spacing: 0.2px; }
            .order-title .num { margin-top: 2px; font-size: 12px; }
            .section-title { margin: 8px 0 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 4px 12px; margin-bottom: 4px; }
            .meta-line { border-bottom: 1px dashed #666; padding-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; table-layout: fixed; }
            th, td { border: 1px solid #111; padding: 3px 4px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
            th { text-align: center; font-weight: bold; font-size: 10px; line-height: 1.05; }
            td { font-size: 10px; line-height: 1.05; }
            td.num { text-align: center; white-space: nowrap; }
            td.money { text-align: right; white-space: nowrap; }
            .totals { margin-top: 8px; width: 260px; margin-left: auto; border: 1px solid #111; padding: 6px 8px; }
            .totals-row { display: flex; justify-content: space-between; gap: 12px; margin: 2px 0; }
            .comment { margin-top: 8px; min-height: 34px; border: 1px solid #111; padding: 6px 8px; }
            .footer { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr 110px; gap: 12px; align-items: end; }
            .sign-block { min-height: 42px; }
            .sign-line { border-bottom: 1px solid #111; height: 22px; margin-bottom: 4px; }
            .stamp { border: 1px dashed #111; height: 54px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
            .muted { color: #444; font-size: 10px; margin-top: 6px; }
            .compact .doc { padding: 8px 10px; }
            .compact .doc-header { margin-bottom: 6px; padding-bottom: 4px; }
            .compact .section-title { margin: 6px 0 3px; font-size: 11px; }
            .compact .meta-grid { gap: 3px 8px; }
            .compact th, .compact td { padding: 2px 3px; font-size: 9px; line-height: 1; }
            .compact .totals { margin-top: 6px; width: 240px; padding: 4px 6px; }
            .compact .comment { margin-top: 6px; min-height: 28px; padding: 4px 6px; }
            .compact .footer { margin-top: 8px; gap: 8px; }
            .compact .sign-block { min-height: 36px; }
            .compact .sign-line { height: 18px; }
            .compact .stamp { height: 46px; }
            .compact .muted { margin-top: 4px; font-size: 9px; }
            .ultra-compact .company { font-size: 10px; }
            .ultra-compact .company strong { font-size: 12px; }
            .ultra-compact .order-title h1 { font-size: 16px; }
            .ultra-compact .order-title .num { font-size: 11px; }
            .ultra-compact .meta-grid { grid-template-columns: 1fr 1fr 1fr; }
            .ultra-compact .totals { width: 220px; }
            .ultra-compact .comment { min-height: 24px; }
            .ultra-compact .footer { grid-template-columns: 1fr 1fr 90px; }
            .ultra-compact .stamp { height: 40px; }
          </style>
        </head>
        <body class="${layoutMode}">
          <div class="doc">
            <div class="doc-header"><div class="company-wrap"><img class="logo" src="/logo.jpg" alt="Логотип" /><div class="company"><div><strong>Двери Алмак</strong></div><div>ИП Хизриев С.С.</div></div></div><div class="order-title"><h1>ЗАКАЗ-НАРЯД</h1><div class="num">№ ${orderId} от ${issueDate}</div></div></div>
            <div class="section-title">Данные клиента</div>
            <div class="meta-grid">
              <div class="meta-line"><strong>ФИО:</strong> ${this.escapeHtml(order.name)}</div>
              <div class="meta-line"><strong>Телефон:</strong> ${this.escapeHtml(order.phone)}</div>
              <div class="meta-line"><strong>Доставка:</strong> ${order.needsDelivery ? 'Да' : 'Нет'}</div>
              <div class="meta-line"><strong>Адрес доставки:</strong> ${this.escapeHtml(order.deliveryAddress || '-')}</div>
            </div>
            <div class="section-title">Спецификация</div>
            <table>
              <thead><tr><th style="width: 28px;">№</th><th style="width: 110px;">Товар</th><th>Модель / позиция</th><th style="width: 68px;">Размер</th><th style="width: 138px;">Цвет / покрытие</th><th style="width: 120px;">Комментарий</th><th style="width: 48px;">Кол-во</th><th style="width: 64px;">Цена</th><th style="width: 68px;">Сумма</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="totals"><div class="totals-row"><span>Общая сумма:</span><strong>${totalAmount}</strong></div><div class="totals-row"><span>Скидка:</span><strong>${order.discount}</strong></div><div class="totals-row"><span>Итого к оплате:</span><strong>${totalToPay}</strong></div><div class="totals-row"><span>Внесено клиентом:</span><strong>${paidAmount}</strong></div><div class="totals-row"><span>Долг клиента:</span><strong>${customerDebt}</strong></div></div>
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
    size: string,
    color: string,
    comment: string,
    count: number,
    price: number,
    amount: number,
  ): string {
    return `<tr><td class="num">${index}</td><td>${this.escapeHtml(type)}</td><td>${this.escapeHtml(title)}</td><td class="num">${this.escapeHtml(size)}</td><td>${this.escapeHtml(color)}</td><td>${this.escapeHtml(comment)}</td><td class="num">${count}</td><td class="money">${price}</td><td class="money">${amount}</td></tr>`;
  }

  private getLayoutMode(order: OrderCreatePayload, rowCount: number): string {
    const detailsLength =
      order.name.length +
      order.phone.length +
      order.deliveryAddress.length +
      order.comment.length +
      order.interiorDoors.reduce(
        (sum, item) => sum + item.model.length + item.color.length + item.glassComment.length + item.comment.length,
        0,
      ) +
      order.entranceDoors.reduce(
        (sum, item) =>
          sum +
          item.model.length +
          item.color.length +
          (item.panelColor?.length ?? 0) +
          (item.painting?.length ?? 0) +
          item.comment.length,
        0,
      ) +
      order.moldings.reduce((sum, item) => sum + item.color.length + item.comment.length, 0) +
      order.extensions.reduce((sum, item) => sum + item.color.length + item.comment.length, 0) +
      order.capitals.reduce((sum, item) => sum + item.name.length + item.color.length + item.comment.length, 0) +
      order.hardwares.reduce(
        (sum, item) => sum + item.handleModel.length + item.handleColor.length + item.comment.length,
        0,
      ) +
      order.panelings.reduce(
        (sum, item) =>
          sum +
          item.color.length +
          `${item.width}x${item.height}`.length +
          `${item.quantityPerSet}`.length +
          `${item.totalArea}`.length +
          item.comment.length,
        0,
      );
    const densityScore = rowCount * 10 + Math.ceil(detailsLength / 90);

    if (densityScore >= 155) {
      return 'compact ultra-compact';
    }

    if (densityScore >= 95) {
      return 'compact';
    }

    return '';
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
    leafType: DoorLeafType,
    painting: string | null,
    panelColor: string | null,
    hasPeephole: boolean | null,
  ): string {
    const details = [kind === EntranceDoorKind.Welded ? 'Сварная' : 'Фабричная'];
    details.push(leafType === DoorLeafType.Double ? 'Две створки' : 'Одна створка');
    if (painting) {
      details.push(`покр.: ${painting}`);
    }
    if (panelColor) {
      details.push(`панель: ${panelColor}`);
    }
    if (hasPeephole !== null) {
      details.push(`глазок: ${hasPeephole ? '+' : '-'}`);
    }
    return details.join(', ');
  }

  private getEntranceColorLabel(item: {
    kind: EntranceDoorKind;
    leafType: DoorLeafType;
    color: string;
    painting: string | null;
    panelColor: string | null;
    hasPeephole: boolean | null;
  }): string {
    const details = [item.color];
    details.push(item.kind === EntranceDoorKind.Welded ? 'сварочная' : 'фабричная');
    details.push(item.leafType === DoorLeafType.Double ? 'две створки' : 'одна створка');
    if (item.painting) {
      details.push(`покрытие: ${item.painting}`);
    }
    if (item.panelColor) {
      details.push(`цвет обшивки: ${item.panelColor}`);
    }
    if (item.hasPeephole !== null) {
      details.push(`глазок: ${item.hasPeephole ? 'есть' : 'нет'}`);
    }
    return details.join(', ');
  }

  private getMoldingTitle(item: MoldingItem): string {
    return `Коробка + наличник ${this.getMoldingPlatbandTypeLabel(item.platbandType)}${item.platbandFigure ? ` (${item.platbandFigure})` : ''}`;
  }

  private getMoldingExecutionLabel(item: MoldingItem): string {
    return `Цвет ${item.color}, притвор ${item.rebateBarCount} шт.`;
  }

  private getMoldingSizeLabel(item: MoldingItem): string {
    const frame = item.frameLength !== null ? `${item.frameLength}` : '-';
    const platband = item.platbandLength !== null ? `${item.platbandLength}` : '-';
    return `кор. ${frame}; нал. ${platband}`;
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
    return item.totalArea * item.price * item.count;
  }

  private getPanelingTotal(item: PanelingItem): number {
    return item.totalArea * item.price * item.count;
  }

  private getCapitalTotal(item: { price: number; count: number }): number {
    return item.price * item.count;
  }

  private getHardwareTitle(item: HardwareItem): string {
    const parts: string[] = [];
    if (item.handleModel) {
      parts.push(`Ручка ${item.handleModel}`);
    }
    if (item.lockCount !== null || item.lockPrice !== null) {
      parts.push('Замок');
    }
    if (item.fixatorCount !== null || item.fixatorPrice !== null) {
      parts.push('Фиксатор');
    }
    if (item.thumbturnCount !== null) {
      parts.push('Крутилка');
    }
    if (item.escutcheonCount !== null) {
      parts.push('Накладка');
    }
    if (item.cylinderCount !== null) {
      parts.push('Барабан');
    }
    if (item.boltCount !== null) {
      parts.push('Шпингалет');
    }
    if (item.hingeCount !== null) {
      parts.push('Петли');
    }
    if (item.doorStopCount !== null) {
      parts.push('Ограничитель');
    }
    return parts.join(', ') || 'Фурнитура';
  }

  private getHardwareExecutionLabel(item: HardwareItem): string {
    const details: string[] = [];
    if (item.handleColor) {
      details.push(`цвет ручки: ${item.handleColor}`);
    }
    if (item.handleCount !== null || item.handlePrice !== null) {
      details.push(`ручка ${this.formatCountPrice(item.handleCount, item.handlePrice)}`);
    }
    if (item.lockCount !== null || item.lockPrice !== null) {
      details.push(`замок ${this.formatCountPrice(item.lockCount, item.lockPrice)}`);
    }
    if (item.fixatorCount !== null || item.fixatorPrice !== null) {
      details.push(`фиксатор ${this.formatCountPrice(item.fixatorCount, item.fixatorPrice)}`);
    }
    if (item.thumbturnCount !== null || item.thumbturnPrice !== null) {
      details.push(`крутилка ${this.formatCountPrice(item.thumbturnCount, item.thumbturnPrice)}`);
    }
    if (item.escutcheonCount !== null || item.escutcheonPrice !== null) {
      details.push(`накладка ${this.formatCountPrice(item.escutcheonCount, item.escutcheonPrice)}`);
    }
    if (item.cylinderCount !== null || item.cylinderPrice !== null) {
      details.push(`барабан ${this.formatCountPrice(item.cylinderCount, item.cylinderPrice)}`);
    }
    if (item.boltCount !== null || item.boltPrice !== null) {
      details.push(`шпингалет ${this.formatCountPrice(item.boltCount, item.boltPrice)}`);
    }
    if (item.hingeCount !== null || item.hingePrice !== null) {
      details.push(`петли ${this.formatCountPrice(item.hingeCount, item.hingePrice)}`);
    }
    if (item.doorStopCount !== null || item.doorStopPrice !== null) {
      details.push(`ограничитель ${this.formatCountPrice(item.doorStopCount, item.doorStopPrice)}`);
    }
    return details.join(', ') || '-';
  }

  private getHardwareCount(item: HardwareItem): number {
    return (
      Number(item.handleCount ?? 0) +
      Number(item.lockCount ?? 0) +
      Number(item.fixatorCount ?? 0) +
      Number(item.thumbturnCount ?? 0) +
      Number(item.escutcheonCount ?? 0) +
      Number(item.cylinderCount ?? 0) +
      Number(item.boltCount ?? 0) +
      Number(item.hingeCount ?? 0) +
      Number(item.doorStopCount ?? 0)
    );
  }

  private getHardwareTotal(item: HardwareItem): number {
    return (
      this.getOptionalTotal(item.handleCount, item.handlePrice) +
      this.getOptionalTotal(item.lockCount, item.lockPrice) +
      this.getOptionalTotal(item.fixatorCount, item.fixatorPrice) +
      this.getOptionalTotal(item.thumbturnCount, item.thumbturnPrice) +
      this.getOptionalTotal(item.escutcheonCount, item.escutcheonPrice) +
      this.getOptionalTotal(item.cylinderCount, item.cylinderPrice) +
      this.getOptionalTotal(item.boltCount, item.boltPrice) +
      this.getOptionalTotal(item.hingeCount, item.hingePrice) +
      this.getOptionalTotal(item.doorStopCount, item.doorStopPrice)
    );
  }

  private formatDoorSize(width: number, height: number, width2: number | null): string {
    return `${width2 === null ? `${width}` : `${width}+${width2}`}x${height}`;
  }

  private formatCountPrice(count: number | null, price: number | null): string {
    return `${count ?? 0} x ${price ?? 0}`;
  }

  private getOptionalTotal(count: number | null, price: number | null): number {
    return Number(count ?? 0) * Number(price ?? 0);
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
