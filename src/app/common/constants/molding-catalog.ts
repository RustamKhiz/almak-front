import { MoldingCovering, MoldingPlatbandType } from '../../types/order.types';

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

export const DEFAULT_MOLDING_COVERING = MoldingCovering.Enamel;
export const DEFAULT_MOLDING_PLATBAND_TYPE = MoldingPlatbandType.Oval;
