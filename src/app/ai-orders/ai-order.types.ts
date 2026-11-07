import schemaData from './schema.json';
import { OrderCreatePayload, OrderItemType, OrderStatus } from '../types/order.types';

export type AiValue = string | number | boolean | null;
export interface AiField {
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  integer?: boolean;
  unit?: string;
}
export interface AiItemDefinition {
  label: string;
  collection: string;
  fields: Record<string, AiField>;
}
export const AI_SCHEMA = schemaData as { header: Record<string, AiField>; items: Record<string, AiItemDefinition> };
export interface AiItem {
  itemId: string;
  type: string;
  fields: Record<string, AiValue>;
}
export interface AiOrder {
  header: Record<string, AiValue>;
  items: AiItem[];
  notes: string[];
}
export interface AiSource {
  text: string;
  manual: boolean;
}
export interface AiMessage {
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}
export interface AiChange {
  path: string;
  label: string;
  before: AiValue;
  after: AiValue;
}
export interface AiIssue {
  path: string;
  message: string;
}
export interface AiDraft {
  targetOrderId?: number;
  schemaVersion: 1;
  orderId?: number;
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  sourceText: string;
  messages: AiMessage[];
  pendingText: string;
  order: AiOrder;
  fieldSources: Record<string, AiSource>;
  questions: string[];
  changes: AiChange[];
  lastAppliedChange?: { order: AiOrder; fieldSources: Record<string, AiSource> };
  editorState?: { payload: OrderCreatePayload | null; accepted: boolean; defaultsConfirmed: boolean };
}
export interface AiParseResponse {
  requestId: string;
  draftId: string;
  baseRevision: number;
  schemaVersion: number;
  proposedDraft: AiOrder;
  questions: string[];
  issues: AiIssue[];
  changes: AiChange[];
}
export function emptyAiOrder(): AiOrder {
  return { header: {}, items: [], notes: [] };
}
export function aiIssues(order: AiOrder): AiIssue[] {
  const result: AiIssue[] = [];
  const check = (prefix: string, fields: Record<string, AiValue>, definitions: Record<string, AiField>) => {
    for (const [key, def] of Object.entries(definitions)) {
      const value = fields[key];
      if (def.required && (value == null || value === ''))
        result.push({ path: prefix + key, message: `Не указано: ${def.label}` });
      if (
        typeof value === 'number' &&
        (!Number.isFinite(value) ||
          value < (def.min ?? 0) ||
          value > (def.max ?? 1e9) ||
          (def.integer && !Number.isInteger(value)))
      )
        result.push({ path: prefix + key, message: `Проверьте: ${def.label}` });
    }
  };
  check('header.', order.header, AI_SCHEMA.header);
  const phone = order.header['phone'];
  if (phone && !/^7\d{10}$/.test(String(phone)))
    result.push({ path: 'header.phone', message: 'Телефон: 11 цифр с начальной 7' });
  const date = order.header['date'];
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || Number.isNaN(Date.parse(String(date)))))
    result.push({ path: 'header.date', message: 'Проверьте дату заказа' });
  if (order.header['needsDelivery'] === true && !order.header['deliveryAddress'])
    result.push({ path: 'header.deliveryAddress', message: 'Укажите адрес доставки' });
  for (const item of order.items) {
    const prefix = `items.${item.itemId}.`;
    check(prefix, item.fields, AI_SCHEMA.items[item.type].fields);
    if (item.type === 'interiorDoor' && item.fields['hasGlass'] === true && !item.fields['glassComment'])
      result.push({ path: prefix + 'glassComment', message: 'Опишите стекло' });
    if (item.type === 'interiorDoor' && item.fields['leafType'] === 'Double')
      for (const key of ['width2', 'height2', 'count2', 'price2']) {
        if (item.fields[key] == null)
          result.push({
            path: prefix + key,
            message: `Второе полотно: ${AI_SCHEMA.items[item.type].fields[key].label}`,
          });
      }
    if (item.type === 'hardware') {
      let found = false;
      for (const [key, value] of Object.entries(item.fields))
        if (key.endsWith('Count') && value != null && Number(value) > 0) {
          found = true;
          const price = key.replace(/Count$/, 'Price');
          if (AI_SCHEMA.items[item.type].fields[price] && item.fields[price] == null)
            result.push({
              path: prefix + price,
              message: `Укажите: ${AI_SCHEMA.items[item.type].fields[price].label}`,
            });
        }
      if (!found) result.push({ path: prefix + 'handleCount', message: 'Укажите состав фурнитуры' });
    }
  }
  if (!order.items.length) result.push({ path: 'items', message: 'Добавьте хотя бы одну товарную позицию' });
  return result;
}

// Called only when creating the final order after completeness validation.
// Incomplete orders are never passed to the legacy mapper or total calculators.
export function aiToPayload(order: AiOrder): OrderCreatePayload {
  if (aiIssues(order).length) throw new Error('Сначала заполните обязательные данные');
  const h = order.header;
  const payload: OrderCreatePayload = {
    name: String(h['name']),
    phone: String(h['phone']),
    date: String(h['date']),
    prepayment: Number(h['prepayment'] ?? 0),
    discount: Number(h['discount'] ?? 0),
    needsDelivery: h['needsDelivery'] === true,
    deliveryAddress: String(h['deliveryAddress'] ?? ''),
    comment: [h['comment'], ...order.notes].filter(Boolean).join('\n'),
    status: OrderStatus.Accepted,
    isPaid: false,
    payments: [],
    interiorDoors: [],
    entranceDoors: [],
    moldings: [],
    extensions: [],
    capitals: [],
    hardwares: [],
    panelings: [],
    skirtings: [],
  };
  for (const [index, item] of order.items.entries()) {
    const def = AI_SCHEMA.items[item.type];
    const values: Record<string, unknown> = { id: index + 1, type: item.type as OrderItemType };
    for (const [key, field] of Object.entries(def.fields)) {
      values[key] = item.fields[key] ?? (field.type === 'number' ? 0 : field.type === 'boolean' ? false : '');
    }
    const nullable: Record<string, string[]> = {
      interiorDoor: ['price2', 'width2', 'height2', 'count2', 'rebateBarPrice'],
      entranceDoor: ['painting', 'panelColor', 'hasPeephole'],
      molding: ['frameLength', 'platbandFigure', 'platbandLength'],
    };
    for (const key of nullable[item.type] ?? []) values[key] = item.fields[key] ?? null;
    if (item.type === 'extension' || item.type === 'paneling') {
      const width = Number(values['width']),
        height = Number(values['height']);
      const quantity = item.type === 'extension' ? Number(values['quantityPerSet']) : 1;
      values['sizes'] =
        item.type === 'extension'
          ? [{ width, height, quantity: quantity * Number(values['count']) }]
          : Array.from({ length: Number(values['count']) }, () => ({ width, height }));
      values['totalArea'] = Number(((width * height * quantity * Number(values['count'])) / 10000).toFixed(2));
      values['size'] = `${width}x${height}`;
      if (item.type === 'extension') values['setCount'] = 0;
      if (item.type === 'extension') {
        values['quantityPerSet'] = quantity * Number(values['count']);
        values['count'] = 1;
      }
    }
    if (item.type === 'hardware')
      for (const key of Object.keys(def.fields))
        if (key.endsWith('Count') || key.endsWith('Price')) values[key] = item.fields[key] ?? null;
    // The dictionary's collection is constrained by the eight checked item types.
    (payload[def.collection as keyof OrderCreatePayload] as unknown as Record<string, unknown>[]).push(values);
  }
  return payload;
}
export function aiFieldLabel(path: string, order: AiOrder): string {
  const parts = path.split('.');
  if (parts[0] === 'header') return AI_SCHEMA.header[parts[1]]?.label ?? path;
  const item = order.items.find((i) => i.itemId === parts[1]);
  return item
    ? `${AI_SCHEMA.items[item.type].label}: ${AI_SCHEMA.items[item.type].fields[parts[2]]?.label ?? parts[2]}`
    : path;
}
export function isAiOrder(value: unknown): value is AiOrder {
  if (!value || typeof value !== 'object') return false;
  const order = value as AiOrder;
  if (
    !order.header ||
    typeof order.header !== 'object' ||
    Array.isArray(order.header) ||
    !Array.isArray(order.items) ||
    order.items.length > 100 ||
    !Array.isArray(order.notes) ||
    !order.notes.every((n) => typeof n === 'string')
  )
    return false;
  const validFields = (fields: Record<string, AiValue>, defs: Record<string, AiField>) =>
    !!fields &&
    typeof fields === 'object' &&
    !Array.isArray(fields) &&
    Object.entries(fields).every(
      ([key, v]) =>
        defs[key] && (v === null || (typeof v === defs[key].type && (typeof v !== 'number' || Number.isFinite(v)))),
    );
  if (!validFields(order.header, AI_SCHEMA.header)) return false;
  const ids = new Set<string>();
  for (const item of order.items) {
    if (
      !item ||
      typeof item.itemId !== 'string' ||
      ids.has(item.itemId) ||
      !AI_SCHEMA.items[item.type] ||
      !validFields(item.fields, AI_SCHEMA.items[item.type].fields)
    )
      return false;
    ids.add(item.itemId);
  }
  return true;
}

export function aiKnownAmount(order: AiOrder): { amount: number; complete: boolean; hasKnown: boolean } {
  let amount = 0,
    complete = order.items.length > 0,
    hasKnown = false;
  for (const item of order.items) {
    const f = item.fields;
    const number = (key: string) => (typeof f[key] === 'number' ? Number(f[key]) : null);
    const line = (count: string, price: string): number | null =>
      number(count) !== null && number(price) !== null ? number(count)! * number(price)! : null;
    let value: number | null = null;
    switch (item.type) {
      case 'interiorDoor': {
        value = line('count', 'price');
        if (f['leafType'] === 'Double') {
          const second = line('count2', 'price2');
          const rebate = number('rebateBarCount') ? line('rebateBarCount', 'rebateBarPrice') : 0;
          value = value !== null && second !== null && rebate !== null ? value + second + rebate : null;
        } else if (f['leafType'] !== 'Single') value = null;
        break;
      }
      case 'entranceDoor':
      case 'capital':
        value = line('count', 'price');
        break;
      case 'skirting': {
        const base = line('count', 'price');
        value = base !== null && number('length') !== null ? base * number('length')! : null;
        break;
      }
      case 'extension':
      case 'paneling': {
        const keys =
          item.type === 'extension'
            ? ['width', 'height', 'quantityPerSet', 'count', 'price']
            : ['width', 'height', 'count', 'price'];
        if (keys.every((k) => number(k) !== null)) value = keys.reduce((total, k) => total * number(k)!, 1) / 10000;
        break;
      }
      case 'molding': {
        const frame = line('frameBoxCount', 'framePrice');
        if (frame !== null && ['platbandPrice', 'platbandSetCount', 'platbandCount'].every((k) => number(k) !== null))
          value =
            frame + number('platbandPrice')! * Math.max(number('platbandCount')! - number('platbandSetCount')!, 0);
        break;
      }
      case 'hardware': {
        let total = 0,
          found = false,
          known = true;
        for (const key of Object.keys(AI_SCHEMA.items['hardware'].fields))
          if (key.endsWith('Count') && number(key) !== null && number(key)! > 0) {
            const price = key.replace(/Count$/, 'Price');
            if (!AI_SCHEMA.items['hardware'].fields[price]) continue;
            found = true;
            const part = line(key, price);
            if (part === null) known = false;
            else total += part;
          }
        if (found && known) value = total;
        break;
      }
    }
    if (value === null) complete = false;
    else {
      hasKnown = true;
      amount += value;
    }
  }
  // Unresolved notes can describe additional products, so the amount is never final.
  if (order.notes.length) complete = false;
  return { amount: Math.round(amount * 100) / 100, complete, hasKnown };
}
