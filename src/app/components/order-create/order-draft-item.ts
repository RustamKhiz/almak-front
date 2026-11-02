import { AI_SCHEMA, AiItem, AiValue, aiKnownAmount } from '../../ai-orders/ai-order.types';

export const DRAFT_ITEM_GROUPS: Record<string, string> = {
  interiorDoor: 'Межкомнатные двери',
  entranceDoor: 'Входные двери',
  molding: 'Коробки и наличники',
  extension: 'Доборы',
  capital: 'Капители',
  hardware: 'Фурнитура',
  paneling: 'Обшивка',
  skirting: 'Плинтус',
};

const VALUE_LABELS: Record<string, string> = {
  Single: 'Одностворчатая',
  Double: 'Двустворчатая',
  left: 'Левое',
  right: 'Правое',
  factory: 'Фабричная',
  welded: 'Сварочная',
  oval: 'Овальный',
  smooth: 'Гладкий',
  figure: 'Фигурный',
  baguette: 'Багет',
};

export function draftValueLabel(value: AiValue): string {
  return typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : (VALUE_LABELS[String(value)] ?? String(value));
}

export function draftItemTitle(item: AiItem): string {
  const name = item.fields['model'] || item.fields['name'] || item.fields['handleModel'];
  return AI_SCHEMA.items[item.type].label + (name ? ` · ${name}` : '');
}

export function draftItemDetails(item: AiItem): string {
  const fields = AI_SCHEMA.items[item.type].fields;
  const dimensions = item.fields['width'] != null && item.fields['height'] != null;
  const details = Object.entries(fields)
    .filter(([key]) => !['model', 'name', 'handleModel', 'costPrice'].includes(key))
    .filter(([key]) => item.fields[key] != null && item.fields[key] !== '')
    .filter(([key]) => !dimensions || (key !== 'width' && key !== 'height'))
    .map(([key, field]) => `${field.label}: ${draftValueLabel(item.fields[key])}`)
    .join(' · ');
  return [dimensions ? `${item.fields['width']} × ${item.fields['height']} см` : '', details]
    .filter(Boolean)
    .join(' · ');
}

export function draftItemAmount(item: AiItem): number | null {
  const total = aiKnownAmount({ header: {}, items: [item], notes: [] });
  return total.complete ? total.amount : null;
}
