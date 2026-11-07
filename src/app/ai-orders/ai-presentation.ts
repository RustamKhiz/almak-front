import { AI_SCHEMA, AiValue } from './ai-order.types';

export function aiDisplayValue(value: AiValue, path: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  if (typeof value !== 'string') return String(value);
  const field = path.split('.').at(-1);
  if (field === 'type') return AI_SCHEMA.items[value]?.label ?? value;
  for (const item of Object.values(AI_SCHEMA.items)) {
    const label = item.fields[field ?? '']?.valueLabels?.[value];
    if (label) return label;
  }
  return value;
}

const explanationLabels: Record<string, string> = {};
for (const kind of Object.keys(AI_SCHEMA.items).sort()) {
  const item = AI_SCHEMA.items[kind];
  explanationLabels[kind.toLowerCase()] = item.label;
  for (const field of Object.values(item.fields)) {
    for (const [code, label] of Object.entries(field.valueLabels ?? {})) {
      explanationLabels[code.toLowerCase()] ??= label;
    }
  }
}

export function aiDisplayText(text: string): string {
  return text.replace(/[A-Za-z][A-Za-z0-9_]*/g, (word) => explanationLabels[word.toLowerCase()] ?? word);
}
