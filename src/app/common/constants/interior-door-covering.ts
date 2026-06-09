// catalog key: 'interior_door_coverings'
// Fallback used when the catalog has no items.
export const INTERIOR_DOOR_COVERING_OPTIONS = ['Эмаль', 'Шпон', 'Тиснение', 'ПВХ'] as const;

export const DEFAULT_INTERIOR_DOOR_COVERING = 'Эмаль';

export const INTERIOR_DOOR_COVERING_LABELS: Readonly<Record<string, string>> = {
  Enamel: 'Эмаль',
  Veneer: 'Шпон',
  Embossing: 'Тиснение',
  PVC: 'ПВХ',
  Эмаль: 'Эмаль',
  Шпон: 'Шпон',
  Тиснение: 'Тиснение',
  ПВХ: 'ПВХ',
};
