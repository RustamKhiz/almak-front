import {
  CapitalCovering,
  ExtensionCovering,
  MoldingCovering,
  MoldingPlatbandType,
  PanelingCovering,
} from '../../types/order.types';

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

export const MOLDING_COVERING_OPTIONS: readonly MoldingCovering[] = [
  MoldingCovering.Enamel,
  MoldingCovering.Veneer,
  MoldingCovering.Embossing,
  MoldingCovering.PVC,
] as const;

export const MOLDING_COVERING_LABELS: Readonly<Record<MoldingCovering, string>> = {
  [MoldingCovering.Enamel]: 'Эмаль',
  [MoldingCovering.Veneer]: 'Шпон',
  [MoldingCovering.Embossing]: 'Тиснение',
  [MoldingCovering.PVC]: 'ПВХ',
};

export const EXTENSION_COVERING_OPTIONS: readonly ExtensionCovering[] = [
  ExtensionCovering.Enamel,
  ExtensionCovering.Veneer,
  ExtensionCovering.Embossing,
] as const;

export const EXTENSION_COVERING_LABELS: Readonly<Record<ExtensionCovering, string>> = {
  [ExtensionCovering.Enamel]: 'Эмаль',
  [ExtensionCovering.Veneer]: 'Шпон',
  [ExtensionCovering.Embossing]: 'Тиснение',
};

export const CAPITAL_COVERING_OPTIONS: readonly CapitalCovering[] = [
  CapitalCovering.Enamel,
  CapitalCovering.Veneer,
  CapitalCovering.Embossing,
] as const;

export const CAPITAL_COVERING_LABELS: Readonly<Record<CapitalCovering, string>> = {
  [CapitalCovering.Enamel]: 'Эмаль',
  [CapitalCovering.Veneer]: 'Шпон',
  [CapitalCovering.Embossing]: 'Тиснение',
};

export const PANELING_COVERING_OPTIONS: readonly PanelingCovering[] = [
  PanelingCovering.Enamel,
  PanelingCovering.Veneer,
  PanelingCovering.Embossing,
  PanelingCovering.PVC,
] as const;

export const PANELING_COVERING_LABELS: Readonly<Record<PanelingCovering, string>> = {
  [PanelingCovering.Enamel]: 'Эмаль',
  [PanelingCovering.Veneer]: 'Шпон',
  [PanelingCovering.Embossing]: 'Тиснение',
  [PanelingCovering.PVC]: 'ПВХ',
};

export const DEFAULT_MOLDING_COVERING = MoldingCovering.Enamel;
export const DEFAULT_MOLDING_PLATBAND_TYPE = MoldingPlatbandType.Oval;
export const DEFAULT_EXTENSION_COVERING = ExtensionCovering.Enamel;
export const DEFAULT_CAPITAL_COVERING = CapitalCovering.Enamel;
export const DEFAULT_PANELING_COVERING = PanelingCovering.Enamel;
