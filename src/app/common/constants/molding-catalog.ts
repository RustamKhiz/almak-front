import { MoldingPlatbandType, PanelingKind } from '../../types/order.types';

export const MOLDING_PLATBAND_TYPE_OPTIONS: readonly MoldingPlatbandType[] = [
  MoldingPlatbandType.Oval,
  MoldingPlatbandType.Smooth,
  MoldingPlatbandType.Figure,
] as const;

export const MOLDING_PLATBAND_TYPE_LABELS: Readonly<Record<MoldingPlatbandType, string>> = {
  [MoldingPlatbandType.Oval]: 'Овальный',
  [MoldingPlatbandType.Smooth]: 'Гладкий',
  [MoldingPlatbandType.Figure]: 'Фигурный',
};

// catalog key: 'molding_coverings'
export const MOLDING_COVERING_OPTIONS = ['Эмаль', 'Шпон', 'Тиснение', 'ПВХ'] as const;

export const MOLDING_COVERING_LABELS: Readonly<Record<string, string>> = {
  Enamel: 'Эмаль',
  Veneer: 'Шпон',
  Embossing: 'Тиснение',
  PVC: 'ПВХ',
  Эмаль: 'Эмаль',
  Шпон: 'Шпон',
  Тиснение: 'Тиснение',
  ПВХ: 'ПВХ',
};

// catalog key: 'extension_coverings'
export const EXTENSION_COVERING_OPTIONS = ['Эмаль', 'Шпон', 'Тиснение'] as const;

export const EXTENSION_COVERING_LABELS: Readonly<Record<string, string>> = {
  Enamel: 'Эмаль',
  Veneer: 'Шпон',
  Embossing: 'Тиснение',
  Эмаль: 'Эмаль',
  Шпон: 'Шпон',
  Тиснение: 'Тиснение',
};

// catalog key: 'capital_coverings'
export const CAPITAL_COVERING_OPTIONS = ['Эмаль', 'Шпон', 'Тиснение'] as const;

export const CAPITAL_COVERING_LABELS: Readonly<Record<string, string>> = {
  Enamel: 'Эмаль',
  Veneer: 'Шпон',
  Embossing: 'Тиснение',
  Эмаль: 'Эмаль',
  Шпон: 'Шпон',
  Тиснение: 'Тиснение',
};

// catalog key: 'paneling_coverings'
export const PANELING_COVERING_OPTIONS = ['Эмаль', 'Шпон', 'Тиснение', 'ПВХ'] as const;

export const PANELING_COVERING_LABELS: Readonly<Record<string, string>> = {
  Enamel: 'Эмаль',
  Veneer: 'Шпон',
  Embossing: 'Тиснение',
  PVC: 'ПВХ',
  Эмаль: 'Эмаль',
  Шпон: 'Шпон',
  Тиснение: 'Тиснение',
  ПВХ: 'ПВХ',
};

export const PANELING_KIND_OPTIONS: readonly PanelingKind[] = [
  PanelingKind.Smooth,
  PanelingKind.Figure,
  PanelingKind.Baguette,
] as const;

export const PANELING_KIND_LABELS: Readonly<Record<PanelingKind, string>> = {
  [PanelingKind.Smooth]: 'Гладкая',
  [PanelingKind.Figure]: 'Фигурная',
  [PanelingKind.Baguette]: 'С багетом',
};

export const DEFAULT_MOLDING_COVERING = 'Эмаль';
export const DEFAULT_MOLDING_PLATBAND_TYPE = MoldingPlatbandType.Oval;
export const DEFAULT_EXTENSION_COVERING = 'Эмаль';
export const DEFAULT_CAPITAL_COVERING = 'Эмаль';
export const DEFAULT_PANELING_COVERING = 'Эмаль';
export const DEFAULT_PANELING_KIND = PanelingKind.Smooth;
