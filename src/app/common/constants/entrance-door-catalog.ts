import { EntranceDoorKind } from '../../types/order.types';

export const ENTRANCE_DOOR_KIND_OPTIONS: readonly EntranceDoorKind[] = [
  EntranceDoorKind.Factory,
  EntranceDoorKind.Welded,
] as const;

export const ENTRANCE_DOOR_KIND_LABELS: Readonly<Record<EntranceDoorKind, string>> = {
  [EntranceDoorKind.Factory]: 'Фабричная',
  [EntranceDoorKind.Welded]: 'Сварочная',
};

export const ENTRANCE_DOOR_WIDTH_OPTIONS = [86, 96, 110, 120, 130, 140] as const;
export const ENTRANCE_DOOR_HEIGHT_OPTIONS = [180, 190, 205, 210, 220, 230, 240] as const;

export const ENTRANCE_DOOR_PAINTING_OPTIONS = ['Порошковая', 'Молотковая'] as const;
export const ENTRANCE_DOOR_PANEL_COLOR_OPTIONS = ['Темный', 'Светлый'] as const;
