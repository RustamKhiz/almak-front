import { Injectable } from '@angular/core';
import {
  DoorLeafType,
  EntranceDoorKind,
  EntranceDoorOpening,
  ExtensionItem,
  HardwareItem,
  InteriorDoorItem,
  MoldingItem,
  MoldingPlatbandType,
  OrderCreatePayload,
  PanelingItem,
  PanelingKind,
} from '../types/order.types';
import { PrintConstructorOptions } from '../common/dialogs/print-constructor-dialog/print-constructor.types';
import {
  MOLDING_COVERING_LABELS,
  EXTENSION_COVERING_LABELS,
  CAPITAL_COVERING_LABELS,
  PANELING_COVERING_LABELS,
} from '../common/constants/molding-catalog';

const STORE_PHONE = '+7 (989) 475-09-90';
const STORE_ADDRESS = 'г. Махачкала, ул. Акушинского 330';

interface CustomDocumentRow {
  key: string;
  type: string;
  title: string;
  size: string;
  color: string;
  comment: string;
  supplier: string;
  count: number;
  price: number;
  amount: number;
}

@Injectable({ providedIn: 'root' })
export class OrderDocumentService {
  createDocBlob(orderId: number, order: OrderCreatePayload): Blob {
    const html = this.buildOrderHtml(orderId, order);
    return new Blob(['\ufeff', html], { type: 'application/msword' });
  }

  createCustomDocBlob(orderId: number, order: OrderCreatePayload, options: PrintConstructorOptions): Blob {
    const html = this.buildCustomOrderHtml(orderId, order, options);
    return new Blob(['\ufeff', html], { type: 'application/msword' });
  }

  buildOrderHtml(orderId: number, order: OrderCreatePayload): string {
    const issueDate = this.escapeHtml(order.date);
    const totalAmount =
      order.interiorDoors.reduce((sum, item) => sum + this.getInteriorDoorTotal(item), 0) +
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
      order.moldings.reduce((sum, item) => sum + this.getMoldingDocumentRowCount(item), 0) +
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
          this.formatInteriorDoorSize(item),
          `${this.getLeafTypeLabel(item.leafType)}, ${item.color}, ${this.getInteriorDoorGlassLabel(item)}`,
          item.comment || '-',
          this.getInteriorDoorCount(item),
          this.getInteriorDoorTotal(item),
          this.getInteriorDoorTotal(item),
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
      .flatMap((item) => this.buildMoldingDocumentRows(item))
      .map((row) =>
        this.buildRow(
          rowNumber++,
          row.type,
          row.title,
          row.size,
          row.color,
          row.comment,
          row.count,
          row.price,
          row.amount,
        ),
      )
      .join('');
    const extensionRows = order.extensions
      .map((item) =>
        this.buildRow(
          rowNumber++,
          'Доборы',
          '-',
          `${item.width}x${item.height}`,
          `${item.color}, ${this.getExtensionCoveringLabel(item.covering)}`,
          item.comment || '-',
          item.quantityPerSet,
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
          this.formatPanelingSize(item),
          `${item.color}, ${this.getPanelingKindLabel(item.kind)}, ${this.getPanelingCoveringLabel(item.covering)}, общ. кв.м ${item.totalArea}`,
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
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            html, body { width: 100%; }
            body { font-family: "Times New Roman", serif; font-size: 10px; line-height: 1.15; color: #111; margin: 0; padding: 0; }
            .doc { border: 1px solid #111; padding: 10px 12px; }
            table.doc-header { width: 100%; margin: 0 0 8px 0; border-collapse: collapse; table-layout: fixed; border-bottom: 1px solid #111; }
            table.doc-header td { border: 0; padding: 0 0 6px 0; vertical-align: top; }
            .company-cell { width: 65%; }
            .title-cell { width: 35%; }
            table.company-wrap { width: 100%; margin: 0; border-collapse: collapse; table-layout: fixed; }
            table.company-wrap td { border: 0; padding: 0; vertical-align: top; }
            .logo-cell { width: 84px; }
            .logo { display: block; width: 76px; height: 76px; max-width: 76px; max-height: 76px; object-fit: contain; filter: grayscale(100%) contrast(120%); -webkit-filter: grayscale(100%) contrast(120%); }
            .company { font-size: 11px; }
            .company strong { font-size: 13px; }
            .order-title { text-align: right; }
            .order-title h1 { margin: 0; font-size: 18px; letter-spacing: 0.2px; }
            .order-title .num { margin-top: 2px; font-size: 12px; }
            .section-title { margin: 8px 0 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 4px 12px; margin-bottom: 4px; }
            .meta-line { border-bottom: 1px dashed #666; padding-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; table-layout: fixed; mso-table-layout-alt: fixed; }
            col.col-index { width: 26px; }
            col.col-type { width: 100px; }
            col.col-model { width: 85px; }
            col.col-size { width: 62px; }
            col.col-color { width: 122px; }
            col.col-comment { width: 108px; }
            col.col-count { width: 44px; }
            col.col-price { width: 68px; }
            col.col-amount { width: 65px; }
            th, td { border: 1px solid #111; padding: 3px 4px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
            th { text-align: center; font-weight: bold; font-size: 10px; line-height: 1.05; }
            td { font-size: 10px; line-height: 1.05; }
            td.num { text-align: center; white-space: nowrap; }
            td.money { text-align: right; white-space: nowrap; }
            .totals { margin-top: 8px; width: 260px; margin-left: auto; border: 1px solid #111; padding: 6px 8px; }
            .totals-row { display: flex; justify-content: space-between; gap: 12px; margin: 2px 0; }
            .comment { margin-top: 8px; min-height: 34px; border: 1px solid #111; padding: 6px 8px; }
            table.footer { margin-top: 12px; border-collapse: separate; border-spacing: 14px 0; table-layout: fixed; page-break-inside: avoid; break-inside: avoid; }
            table.footer td { border: 0; padding: 0; vertical-align: bottom; font-size: 10px; line-height: 1.15; }
            .footer-stamp-cell { width: 120px; }
            .sign-block { min-height: 58px; text-align: left; }
            .sign-block--manager { text-align: right; }
            .sign-line { border-bottom: 1px solid #111; height: 34px; margin-bottom: 5px; }
            .stamp { border: 1px dashed #111; height: 68px; line-height: 68px; text-align: center; font-weight: bold; }
            .muted { color: #444; font-size: 10px; margin-top: 6px; }
            .compact .doc { padding: 8px 10px; }
            .compact table.doc-header { margin-bottom: 6px; }
            .compact table.doc-header td { padding-bottom: 4px; }
            .compact .section-title { margin: 6px 0 3px; font-size: 11px; }
            .compact .meta-grid { gap: 3px 8px; }
            .compact th, .compact td { padding: 2px 3px; font-size: 9px; line-height: 1; }
            .compact .totals { margin-top: 6px; width: 240px; padding: 4px 6px; }
            .compact .comment { margin-top: 6px; min-height: 28px; padding: 4px 6px; }
            .compact .footer { margin-top: 8px; gap: 8px; }
            .compact .sign-block { min-height: 48px; }
            .compact .sign-line { height: 28px; }
            .compact .stamp { min-height: 56px; }
            .compact .muted { margin-top: 4px; font-size: 9px; }
            .ultra-compact .company { font-size: 10px; }
            .ultra-compact .company strong { font-size: 12px; }
            .ultra-compact .order-title h1 { font-size: 16px; }
            .ultra-compact .order-title .num { font-size: 11px; }
            .ultra-compact .meta-grid { grid-template-columns: 1fr 1fr 1fr; }
            .ultra-compact .totals { width: 220px; }
            .ultra-compact .comment { min-height: 24px; }
            .ultra-compact .footer-stamp-cell { width: 100px; }
            .ultra-compact .stamp { height: 48px; line-height: 48px; }
            @media print { #print-btn-wrap { display: none; } }
          </style>
        </head>
        <body class="${layoutMode}">
          ${this.buildPrintButton()}
          <div class="doc">
            ${this.buildHeader(orderId, issueDate)}
            <div class="section-title">Данные клиента</div>
            <div class="meta-grid">
              <div class="meta-line"><strong>ФИО:</strong> ${this.escapeHtml(order.name)}</div>
              <div class="meta-line"><strong>Телефон:</strong> ${this.escapeHtml(order.phone)}</div>
              <div class="meta-line"><strong>Доставка:</strong> ${order.needsDelivery ? 'Да' : 'Нет'}</div>
              <div class="meta-line"><strong>Адрес доставки:</strong> ${this.escapeHtml(order.deliveryAddress || '-')}</div>
            </div>
            <div class="section-title">Спецификация</div>
            <table>
              ${this.buildFullTableHead()}
              <tbody>${rows}</tbody>
            </table>
            <div class="totals"><div class="totals-row"><span>Общая сумма:</span><strong>${this.formatMoney(totalAmount)}</strong></div><div class="totals-row"><span>Скидка:</span><strong>${this.formatMoney(order.discount)}</strong></div><div class="totals-row"><span>Итого к оплате:</span><strong>${this.formatMoney(totalToPay)}</strong></div><div class="totals-row"><span>Внесено клиентом:</span><strong>${this.formatMoney(paidAmount)}</strong></div><div class="totals-row"><span>Долг клиента:</span><strong>${this.formatMoney(customerDebt)}</strong></div></div>
            <div class="comment"><strong>Комментарий:</strong> ${this.escapeHtml(order.comment)}</div>
            ${this.buildFooter()}
            <div class="muted">Документ сформирован автоматически в информационной системе.</div>
          </div>
        </body>
      </html>
    `;
  }

  buildCustomOrderHtml(orderId: number, order: OrderCreatePayload, options: PrintConstructorOptions): string {
    const normalizedOptions = this.normalizePrintOptions(options);
    const selectedKeys = new Set(normalizedOptions.selectedItemKeys);
    const rows = this.buildCustomRows(order).filter((row) => selectedKeys.has(row.key));
    const issueDate = this.escapeHtml(order.date);
    const selectedTotal = rows.reduce((sum, row) => sum + row.amount, 0);
    const totalToPay = Math.max(selectedTotal - (normalizedOptions.showDiscount ? order.discount : 0), 0);
    const paidAmount =
      order.payments.length > 0 ? order.payments.reduce((sum, payment) => sum + payment.amount, 0) : order.prepayment;
    const customerDebt = Math.max(totalToPay - paidAmount, 0);
    const layoutMode = rows.length >= 12 ? 'compact' : '';
    const hasPriceColumns = normalizedOptions.showPrices;
    const hasCommentColumn = normalizedOptions.showComments;
    const hasSupplierColumn = normalizedOptions.showSupplier;

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Заказ-наряд №${orderId}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            html, body { width: 100%; }
            body { font-family: "Times New Roman", serif; font-size: 10px; line-height: 1.15; color: #111; margin: 0; padding: 0; }
            .doc { border: 1px solid #111; padding: 10px 12px; }
            table.doc-header { width: 100%; margin: 0 0 8px 0; border-collapse: collapse; table-layout: fixed; border-bottom: 1px solid #111; }
            table.doc-header td { border: 0; padding: 0 0 6px 0; vertical-align: top; }
            .company-cell { width: 65%; }
            .title-cell { width: 35%; }
            table.company-wrap { width: 100%; margin: 0; border-collapse: collapse; table-layout: fixed; }
            table.company-wrap td { border: 0; padding: 0; vertical-align: top; }
            .logo-cell { width: 84px; }
            .logo { display: block; width: 76px; height: 76px; max-width: 76px; max-height: 76px; object-fit: contain; filter: grayscale(100%) contrast(120%); -webkit-filter: grayscale(100%) contrast(120%); }
            .company { font-size: 11px; }
            .company strong { font-size: 13px; }
            .order-title { text-align: right; }
            .order-title h1 { margin: 0; font-size: 18px; letter-spacing: 0.2px; }
            .order-title .num { margin-top: 2px; font-size: 12px; }
            .section-title { margin: 8px 0 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 12px; margin-bottom: 4px; }
            .meta-line { border-bottom: 1px dashed #666; padding-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; table-layout: fixed; mso-table-layout-alt: fixed; }
            col.col-index { width: 26px; }
            col.col-type { width: 100px; }
            col.col-model { width: 85px; }
            col.col-size { width: 62px; }
            col.col-color { width: 122px; }
            col.col-comment { width: 108px; }
            col.col-count { width: 44px; }
            col.col-price { width: 68px; }
            col.col-amount { width: 65px; }
            th, td { border: 1px solid #111; padding: 3px 4px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
            th { text-align: center; font-weight: bold; font-size: 10px; line-height: 1.05; }
            td { font-size: 10px; line-height: 1.05; }
            td.num { text-align: center; white-space: nowrap; }
            td.money { text-align: right; white-space: nowrap; }
            .totals { margin-top: 8px; width: 290px; margin-left: auto; border: 1px solid #111; padding: 6px 8px; }
            .totals-row { display: flex; justify-content: space-between; gap: 12px; margin: 2px 0; }
            .comment { margin-top: 8px; min-height: 34px; border: 1px solid #111; padding: 6px 8px; }
            table.footer { margin-top: 12px; border-collapse: separate; border-spacing: 14px 0; table-layout: fixed; page-break-inside: avoid; break-inside: avoid; }
            table.footer td { border: 0; padding: 0; vertical-align: bottom; font-size: 10px; line-height: 1.15; }
            .footer-stamp-cell { width: 120px; }
            .sign-block { min-height: 58px; text-align: left; }
            .sign-block--manager { text-align: right; }
            .sign-line { border-bottom: 1px solid #111; height: 34px; margin-bottom: 5px; }
            .stamp { border: 1px dashed #111; height: 68px; line-height: 68px; text-align: center; font-weight: bold; }
            .muted { color: #444; font-size: 10px; margin-top: 6px; }
            .compact .doc { padding: 8px 10px; }
            .compact th, .compact td { padding: 2px 3px; font-size: 9px; line-height: 1; }
            .compact .totals { width: 260px; padding: 4px 6px; }
            .compact table.footer { margin-top: 8px; border-spacing: 8px 0; }
            .compact .sign-block { min-height: 48px; }
            .compact .sign-line { height: 28px; }
            .compact .stamp { height: 56px; line-height: 56px; }
            @media print { #print-btn-wrap { display: none; } }
          </style>
        </head>
        <body class="${layoutMode}">
          ${this.buildPrintButton()}
          <div class="doc">
            ${this.buildHeader(orderId, issueDate)}
            ${this.buildCustomMetaBlock(order, normalizedOptions)}
            <div class="section-title">Спецификация</div>
            <table>
              ${this.buildCustomTableHead(hasPriceColumns, hasCommentColumn, hasSupplierColumn)}
              <tbody>${rows.map((row, index) => this.buildCustomTableRow(index + 1, row, hasPriceColumns, hasCommentColumn, hasSupplierColumn)).join('')}</tbody>
            </table>
            ${this.buildCustomTotalsBlock(selectedTotal, totalToPay, paidAmount, customerDebt, order.discount, normalizedOptions)}
            ${normalizedOptions.showComments ? `<div class="comment"><strong>Комментарий:</strong> ${this.escapeHtml(order.comment || '-')}</div>` : ''}
            ${normalizedOptions.showSignatures ? this.buildFooter() : ''}
            <div class="muted">Документ сформирован через конструктор печати.</div>
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
    return `<tr><td class="num">${index}</td><td>${this.escapeHtml(type)}</td><td>${this.escapeHtml(title)}</td><td class="num">${this.escapeHtml(size)}</td><td>${this.escapeHtml(color)}</td><td>${this.escapeHtml(comment)}</td><td class="num">${count}</td><td class="money">${this.formatMoney(price)}</td><td class="money">${this.formatMoney(amount)}</td></tr>`;
  }

  private buildHeader(orderId: number, issueDate: string): string {
    return `<table class="doc-header"><tbody><tr><td class="company-cell"><table class="company-wrap"><tbody><tr><td class="logo-cell"><img class="logo" src="${this.escapeHtml(this.getLogoSrc())}" alt="Логотип" width="76" height="76" /></td><td><div class="company"><div><strong>Двери Алмак</strong></div><div>ИП Хизриев С.С.</div><div>Тел.: ${this.escapeHtml(STORE_PHONE)}</div><div>${this.escapeHtml(STORE_ADDRESS)}</div></div></td></tr></tbody></table></td><td class="title-cell"><div class="order-title"><h1>ЗАКАЗ-НАРЯД</h1><div class="num">№ ${orderId} от ${issueDate}</div></div></td></tr></tbody></table>`;
  }

  private buildPrintButton(): string {
    return '<div id="print-btn-wrap" style="position:fixed;top:16px;right:16px;z-index:9999;"><button onclick="window.print()" style="padding:10px 20px;font-size:14px;font-family:sans-serif;cursor:pointer;background:#1976d2;color:#fff;border:none;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.3);">🖨 Напечатать</button></div>';
  }

  private buildFooter(): string {
    return '<table class="footer"><tbody><tr><td><div class="sign-block"><div class="sign-line"></div><div>Подпись клиента</div></div></td><td class="footer-stamp-cell"><div class="stamp">М.П.</div></td><td><div class="sign-block sign-block--manager"><div class="sign-line"></div><div>Подпись менеджера</div></div></td></tr></tbody></table>';
  }

  private buildFullTableHead(): string {
    return '<colgroup><col class="col-index" /><col class="col-type" /><col class="col-model" /><col class="col-size" /><col class="col-color" /><col class="col-comment" /><col class="col-count" /><col class="col-price" /><col class="col-amount" /></colgroup><thead><tr><th>№</th><th>Товар</th><th>Модель / позиция</th><th>Размер</th><th>Цвет / покрытие</th><th>Комментарий</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>';
  }

  private normalizePrintOptions(options: PrintConstructorOptions): PrintConstructorOptions {
    return {
      ...options,
      showTotals: options.showPrices && options.showTotals,
      showDiscount: options.showPrices && options.showTotals && options.showDiscount,
      showPayments: options.showPrices && options.showTotals && options.showPayments,
    };
  }

  private buildCustomMetaBlock(order: OrderCreatePayload, options: PrintConstructorOptions): string {
    if (!options.showCustomerInfo && !options.showDeliveryInfo) {
      return '';
    }

    const customerInfo = options.showCustomerInfo
      ? `<div class="meta-line"><strong>ФИО:</strong> ${this.escapeHtml(order.name)}</div><div class="meta-line"><strong>Телефон:</strong> ${this.escapeHtml(order.phone)}</div>`
      : '';
    const deliveryInfo = options.showDeliveryInfo
      ? `<div class="meta-line"><strong>Доставка:</strong> ${order.needsDelivery ? 'Да' : 'Нет'}</div><div class="meta-line"><strong>Адрес доставки:</strong> ${this.escapeHtml(order.deliveryAddress || '-')}</div>`
      : '';

    return `<div class="section-title">Данные клиента</div><div class="meta-grid">${customerInfo}${deliveryInfo}</div>`;
  }

  private buildCustomTableHead(showPrices: boolean, showComments: boolean, showSupplier: boolean): string {
    const commentCol = showComments ? '<col class="col-comment" />' : '';
    const supplierCol = showSupplier ? '<col class="col-comment" />' : '';
    const priceCols = showPrices ? '<col class="col-price" /><col class="col-amount" />' : '';
    const commentHead = showComments ? '<th>Комментарий</th>' : '';
    const supplierHead = showSupplier ? '<th>Поставщик</th>' : '';
    const priceHeads = showPrices ? '<th>Цена</th><th>Сумма</th>' : '';

    return `<colgroup><col class="col-index" /><col class="col-type" /><col class="col-model" /><col class="col-size" /><col class="col-color" />${commentCol}${supplierCol}<col class="col-count" />${priceCols}</colgroup><thead><tr><th>№</th><th>Товар</th><th>Модель / позиция</th><th>Размер</th><th>Цвет / покрытие</th>${commentHead}${supplierHead}<th>Кол-во</th>${priceHeads}</tr></thead>`;
  }

  private buildCustomTableRow(
    index: number,
    row: CustomDocumentRow,
    showPrices: boolean,
    showComments: boolean,
    showSupplier: boolean,
  ): string {
    const commentCell = showComments ? `<td>${this.escapeHtml(row.comment)}</td>` : '';
    const supplierCell = showSupplier ? `<td>${this.escapeHtml(row.supplier || '—')}</td>` : '';
    const priceCells = showPrices
      ? `<td class="money">${this.formatMoney(row.price)}</td><td class="money">${this.formatMoney(row.amount)}</td>`
      : '';

    return `<tr><td class="num">${index}</td><td>${this.escapeHtml(row.type)}</td><td>${this.escapeHtml(row.title)}</td><td class="num">${this.escapeHtml(row.size)}</td><td>${this.escapeHtml(row.color)}</td>${commentCell}${supplierCell}<td class="num">${row.count}</td>${priceCells}</tr>`;
  }

  private buildCustomTotalsBlock(
    selectedTotal: number,
    totalToPay: number,
    paidAmount: number,
    customerDebt: number,
    discount: number,
    options: PrintConstructorOptions,
  ): string {
    if (!options.showPrices || !options.showTotals) {
      return '';
    }

    const discountRow = options.showDiscount
      ? `<div class="totals-row"><span>Скидка:</span><strong>${this.formatMoney(discount)}</strong></div>`
      : '';
    const paymentRows = options.showPayments
      ? `<div class="totals-row"><span>Внесено клиентом:</span><strong>${this.formatMoney(paidAmount)}</strong></div><div class="totals-row"><span>Долг клиента:</span><strong>${this.formatMoney(customerDebt)}</strong></div>`
      : '';

    return `<div class="totals"><div class="totals-row"><span>Сумма выбранных товаров:</span><strong>${this.formatMoney(selectedTotal)}</strong></div>${discountRow}<div class="totals-row"><span>Итого к оплате:</span><strong>${this.formatMoney(totalToPay)}</strong></div>${paymentRows}</div>`;
  }

  private buildCustomRows(order: OrderCreatePayload): readonly CustomDocumentRow[] {
    return [
      ...order.interiorDoors.map(
        (item): CustomDocumentRow => ({
          key: `interiorDoor:${item.id}`,
          type: 'Межкомнатная дверь',
          title: item.model,
          size: this.formatInteriorDoorSize(item),
          color: `${this.getLeafTypeLabel(item.leafType)}, ${item.color}, ${this.getInteriorDoorGlassLabel(item)}`,
          comment: item.comment || '-',
          supplier: item.supplier,
          count: this.getInteriorDoorCount(item),
          price: this.getInteriorDoorTotal(item),
          amount: this.getInteriorDoorTotal(item),
        }),
      ),
      ...order.entranceDoors.map(
        (item): CustomDocumentRow => ({
          key: `entranceDoor:${item.id}`,
          type: 'Входная дверь',
          title: item.model,
          size: this.formatDoorSize(item.width, item.height, null),
          color: this.getEntranceColorLabel(item),
          comment: item.comment || '-',
          supplier: item.supplier,
          count: item.count,
          price: item.price,
          amount: item.price * item.count,
        }),
      ),
      ...order.moldings.flatMap((item) => this.buildMoldingDocumentRows(item)),
      ...order.extensions.map(
        (item): CustomDocumentRow => ({
          key: `extension:${item.id}`,
          type: 'Доборы',
          title: '-',
          size: `${item.width}x${item.height}`,
          color: `${item.color}, ${this.getExtensionCoveringLabel(item.covering)}`,
          comment: item.comment || '-',
          supplier: item.supplier,
          count: item.quantityPerSet,
          price: item.price,
          amount: this.getExtensionTotal(item),
        }),
      ),
      ...order.capitals.map(
        (item): CustomDocumentRow => ({
          key: `capital:${item.id}`,
          type: 'Капитель',
          title: item.name,
          size: `${item.width}x${item.height}`,
          color: `${item.color}, ${this.getCapitalCoveringLabel(item.covering)}`,
          comment: item.comment || '-',
          supplier: item.supplier,
          count: item.count,
          price: item.price,
          amount: this.getCapitalTotal(item),
        }),
      ),
      ...order.hardwares.map(
        (item): CustomDocumentRow => ({
          key: `hardware:${item.id}`,
          type: 'Фурнитура',
          title: this.getHardwareTitle(item),
          size: '-',
          color: this.getHardwareExecutionLabel(item),
          comment: item.comment || '-',
          supplier: item.supplier,
          count: this.getHardwareCount(item),
          price: this.getHardwareTotal(item),
          amount: this.getHardwareTotal(item),
        }),
      ),
      ...order.panelings.map(
        (item): CustomDocumentRow => ({
          key: `paneling:${item.id}`,
          type: 'Обшивка',
          title: `Обшивка ${item.color}`,
          size: this.formatPanelingSize(item),
          color: `${item.color}, ${this.getPanelingKindLabel(item.kind)}, ${this.getPanelingCoveringLabel(item.covering)}, общ. кв.м ${item.totalArea}`,
          comment: item.comment || '-',
          supplier: item.supplier,
          count: item.count,
          price: item.price,
          amount: this.getPanelingTotal(item),
        }),
      ),
    ];
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
          this.formatPanelingSize(item).length +
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

  private buildMoldingDocumentRows(item: MoldingItem): readonly CustomDocumentRow[] {
    const common = {
      key: `molding:${item.id}`,
      type: 'Погонаж',
      color: `${item.color}, ${this.getMoldingCoveringLabel(item.covering)}`,
      comment: item.comment || '-',
      supplier: item.supplier,
    };
    const rows: CustomDocumentRow[] = [];

    if (item.frameCount > 0 || item.framePrice > 0) {
      rows.push({
        ...common,
        title: `Коробка (${item.frameCount} шт.)`,
        size: item.frameLength !== null ? `${item.frameLength}` : '-',
        count: item.frameBoxCount,
        price: item.framePrice,
        amount: item.framePrice * item.frameBoxCount,
      });
    }

    if (item.platbandCount > 0 || item.platbandPrice > 0) {
      rows.push({
        ...common,
        title: `Наличник ${this.getMoldingPlatbandTypeLabel(item.platbandType)}${
          item.platbandFigure ? ` (${item.platbandFigure})` : ''
        }`,
        size: item.platbandLength !== null ? `${item.platbandLength}` : '-',
        count: item.platbandCount,
        price: item.platbandPrice,
        amount: (item.platbandPrice - item.platbandDeductionPrice) * item.platbandCount,
      });
    }

    if (item.rebateBarCount > 0 || item.rebateBarPrice > 0) {
      rows.push({
        ...common,
        title: 'Притворная планка',
        size: '-',
        count: item.rebateBarCount,
        price: item.rebateBarPrice,
        amount: item.rebateBarPrice * item.rebateBarCount,
      });
    }

    return rows;
  }

  private getMoldingDocumentRowCount(item: MoldingItem): number {
    return this.buildMoldingDocumentRows(item).length;
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
    opening: EntranceDoorOpening,
    painting: string | null,
    panelColor: string | null,
    hasPeephole: boolean | null,
  ): string {
    const details = [kind === EntranceDoorKind.Welded ? 'Сварная' : 'Фабричная'];
    details.push(leafType === DoorLeafType.Double ? 'Две створки' : 'Одна створка');
    details.push(`открывание: ${this.getEntranceOpeningLabel(opening).toLowerCase()}`);
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
    opening: EntranceDoorOpening;
    leafType: DoorLeafType;
    color: string;
    painting: string | null;
    panelColor: string | null;
    hasPeephole: boolean | null;
  }): string {
    const details = [item.color];
    details.push(item.kind === EntranceDoorKind.Welded ? 'сварочная' : 'фабричная');
    details.push(item.leafType === DoorLeafType.Double ? 'две створки' : 'одна створка');
    details.push(`открывание: ${this.getEntranceOpeningLabel(item.opening).toLowerCase()}`);
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

  private getEntranceOpeningLabel(value: EntranceDoorOpening): string {
    switch (value) {
      case EntranceDoorOpening.Right:
        return 'Правое';
      case EntranceDoorOpening.Left:
      default:
        return 'Левое';
    }
  }

  private getMoldingCoveringLabel(value: string): string {
    return MOLDING_COVERING_LABELS[value] ?? value;
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

  private getExtensionCoveringLabel(value: string): string {
    return EXTENSION_COVERING_LABELS[value] ?? value;
  }

  private getCapitalCoveringLabel(value: string): string {
    return CAPITAL_COVERING_LABELS[value] ?? value;
  }

  private getPanelingCoveringLabel(value: string): string {
    return PANELING_COVERING_LABELS[value] ?? value;
  }

  private getPanelingKindLabel(value: PanelingKind): string {
    switch (value) {
      case PanelingKind.Smooth:
        return 'Гладкая';
      case PanelingKind.Figure:
        return 'Фигурная';
      case PanelingKind.Baguette:
        return 'С багетом';
      default:
        return value;
    }
  }

  private getMoldingTotal(item: MoldingItem): number {
    return (
      item.framePrice * item.frameBoxCount +
      (item.platbandPrice - item.platbandDeductionPrice) * item.platbandCount +
      item.rebateBarPrice * item.rebateBarCount
    );
  }

  private getExtensionTotal(item: ExtensionItem): number {
    return item.totalArea * item.price;
  }

  private getPanelingTotal(item: PanelingItem): number {
    return item.totalArea * item.price;
  }

  private getCapitalTotal(item: { price: number; count: number }): number {
    return item.price * item.count;
  }

  private getInteriorDoorTotal(item: InteriorDoorItem): number {
    const firstLeafTotal = item.price * item.count;
    if (item.leafType !== DoorLeafType.Double) {
      return firstLeafTotal;
    }

    return firstLeafTotal + Number(item.price2 ?? 0) * Number(item.count2 ?? 0);
  }

  private getInteriorDoorCount(item: InteriorDoorItem): number {
    return item.count + (item.leafType === DoorLeafType.Double ? Number(item.count2 ?? 0) : 0);
  }

  private getInteriorDoorGlassLabel(item: InteriorDoorItem): string {
    if (!item.hasGlass) {
      return 'глухая';
    }

    return `со стеклом${item.glassComment ? `: ${item.glassComment}` : ''}`;
  }

  private getHardwareTitle(item: HardwareItem): string {
    return item.handleModel ? `Ручка ${item.handleModel}` : 'Ручка';
  }

  private getHardwareExecutionLabel(item: HardwareItem): string {
    const details: string[] = [];
    if (item.handleColor) {
      details.push(`цвет ручки: ${item.handleColor}`);
    }
    if (item.handleCount !== null || item.handlePrice !== null) {
      details.push(`ручка ${this.formatCountPrice(item.handleCount, item.handlePrice)}`);
    }
    if (item.fixatorCount !== null || item.fixatorPrice !== null) {
      details.push(`фиксатор ${this.formatCountPrice(item.fixatorCount, item.fixatorPrice)}`);
    }
    if (item.thumbturnCount !== null || item.thumbturnPrice !== null) {
      details.push(`крутилка ${this.formatCountPrice(item.thumbturnCount, item.thumbturnPrice)}`);
    }
    if (item.lockCount !== null || item.lockPrice !== null) {
      details.push(`замок ${this.formatCountPrice(item.lockCount, item.lockPrice)}`);
    }
    if (item.cylinderCount !== null || item.cylinderPrice !== null) {
      details.push(`барабан ${this.formatCountPrice(item.cylinderCount, item.cylinderPrice)}`);
    }
    if (item.escutcheonCount !== null || item.escutcheonPrice !== null) {
      details.push(`накладка ${this.formatCountPrice(item.escutcheonCount, item.escutcheonPrice)}`);
    }
    if (item.clickCount !== null || item.clickPrice !== null) {
      details.push(`щелчок ${this.formatCountPrice(item.clickCount, item.clickPrice)}`);
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
      Number(item.clickCount ?? 0) +
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
      this.getOptionalTotal(item.clickCount, item.clickPrice) +
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

  private formatInteriorDoorSize(item: InteriorDoorItem): string {
    if (item.leafType !== DoorLeafType.Double) {
      return `${item.width}x${item.height}`;
    }

    return `${item.width}x${item.height}+${item.width2 ?? 0}x${item.height2 ?? item.height}`;
  }

  private formatPanelingSize(item: PanelingItem): string {
    return item.sizes.map((size) => `${size.width}x${size.height}`).join('; ');
  }

  private formatCountPrice(count: number | null, price: number | null): string {
    return `${count ?? 0} x ${this.formatMoney(price ?? 0)}`;
  }

  private formatMoney(value: number): string {
    return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
  }

  private getOptionalTotal(count: number | null, price: number | null): number {
    return Number(count ?? 0) * Number(price ?? 0);
  }

  private getLogoSrc(): string {
    return new URL('logo-bw.jpg', document.baseURI).href;
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
