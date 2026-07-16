import { ExtensionSize, PanelingSize } from '../types/order.types';
import { BackendExtension, BackendPaneling } from './order-api.types';

export function normalizePanelingSizes(item: BackendPaneling): PanelingSize[] {
  const parsedSizes = parsePanelingSizeList(item.size);
  if (parsedSizes.length > 1) {
    return parsedSizes;
  }

  if (item.sizes?.length) {
    return item.sizes.map((size) => ({ width: size.width, height: size.height }));
  }

  if (parsedSizes.length === 1) {
    return parsedSizes;
  }

  return [{ width: item.width, height: item.height }];
}

export function normalizeExtensionSizes(item: BackendExtension): ExtensionSize[] {
  if (item.sizes?.length) {
    const sizes = item.sizes
      .map((size) => ({
        width: size.width,
        height: size.height,
        quantity: size.quantity ?? 0,
      }))
      .filter((size) => size.width > 0 && size.height > 0 && size.quantity > 0);
    if (sizes.length) {
      return sizes;
    }
  }

  return [
    {
      width: item.width,
      height: item.height,
      quantity: item.quantityPerSet ?? 0.5,
    },
  ];
}

export function calculateExtensionTotalQuantity(sizes: readonly ExtensionSize[]): number {
  return Number(sizes.reduce((sum, size) => sum + size.quantity, 0).toFixed(2));
}

export function calculateExtensionTotalArea(sizes: readonly ExtensionSize[]): number {
  const totalArea = sizes.reduce((sum, size) => sum + (size.width * size.height * size.quantity) / 10000, 0);
  return Number(totalArea.toFixed(2));
}

export function calculatePanelingTotalArea(sizes: readonly PanelingSize[]): number {
  const totalArea = sizes.reduce((sum, size) => sum + (size.width * size.height) / 10000, 0);
  return Number(totalArea.toFixed(2));
}

export function getLegacyFrameThresholdCount(frameCount: number): number {
  const remainder = Number((frameCount % 2.5).toFixed(1));
  return Math.max(0, Math.round(remainder / 0.5));
}

export function toNonNegativeNumber(value: unknown, fallback = 0): number {
  const normalized = Number(value ?? fallback);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }
  return Math.max(0, normalized);
}

export function toNullableNonNegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return toNonNegativeNumber(value);
}

export function toPositiveInteger(value: unknown, fallback = 1): number {
  const normalized = Number(value ?? fallback);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }
  return Math.max(1, Math.round(normalized));
}

export function toNonNegativeInteger(value: unknown, fallback = 0): number {
  const normalized = Number(value ?? fallback);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }
  return Math.max(0, Math.round(normalized));
}

export function toNullablePositiveInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return toPositiveInteger(value);
}

export function toNullableNonNegativeInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return toNonNegativeInteger(value);
}

function parsePanelingSizeList(value?: string): PanelingSize[] {
  if (!value) {
    return [];
  }

  return value
    .split(';')
    .map((part) => part.trim())
    .map((part) => {
      const match = part.match(/^(\d+)\s*[xх×]\s*(\d+)$/i);
      if (!match) {
        return null;
      }
      return { width: Number(match[1]), height: Number(match[2]) };
    })
    .filter((size): size is PanelingSize => !!size && size.width > 0 && size.height > 0);
}
