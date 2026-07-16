import { Injectable } from '@angular/core';
import { getOrderTotal } from '../common/utils/order-calculations';
import {
  BackendOrderStatus,
  CapitalCovering,
  CapitalItem,
  DoorLeafType,
  EntranceDoorItem,
  EntranceDoorKind,
  EntranceDoorOpening,
  ExtensionCovering,
  ExtensionItem,
  HardwareItem,
  InteriorDoorCovering,
  InteriorDoorItem,
  MoldingCovering,
  MoldingItem,
  MoldingPlatbandType,
  OrderCreatePayload,
  OrderItemType,
  OrderPayment,
  OrderStatus,
  PanelingCovering,
  PanelingItem,
  PanelingKind,
  SkirtingItem,
} from '../types/order.types';
import {
  BackendCapital,
  BackendEntranceDoor,
  BackendExtension,
  BackendHardware,
  BackendInteriorDoor,
  BackendMolding,
  BackendOrder,
  BackendOrderPayload,
  BackendOrderPayment,
  BackendPaneling,
  BackendSkirting,
} from './order-api.types';
import * as normalizers from './order-normalizers';

export interface OrderRecord {
  id: number;
  customer: string;
  phone: string;
  date: string;
  price: number;
  prepayment: number;
  discount: number;
  comment: string;
  status: OrderStatus;
  isPaid: boolean;
}

@Injectable({ providedIn: 'root' })
export class OrderMapper {
  toRecord(order: BackendOrder): OrderRecord {
    return {
      id: order.id,
      customer: order.customer,
      phone: order.phone,
      date: order.date,
      price: order.price,
      prepayment: order.prepayment,
      discount: order.discount ?? 0,
      comment: order.comment ?? '',
      status: this.toOrderStatus(order.status),
      isPaid: order.isPaid ?? false,
    };
  }

  toCreatePayload(order: BackendOrder): OrderCreatePayload {
    return {
      name: order.customer,
      phone: order.phone,
      date: order.date,
      prepayment: order.prepayment,
      discount: order.discount ?? 0,
      needsDelivery: order.needsDelivery ?? false,
      deliveryAddress: order.deliveryAddress ?? '',
      comment: order.comment ?? '',
      status: this.toOrderStatus(order.status),
      isPaid: order.isPaid ?? false,
      payments: (order.payments ?? []).map((item) => this.mapPayment(item)),
      interiorDoors: (order.interiorDoors ?? []).map((item) => this.mapInteriorDoor(item)),
      entranceDoors: (order.entranceDoors ?? []).map((item) => this.mapEntranceDoor(item)),
      moldings: (order.moldings ?? []).map((item) => this.mapMolding(item)),
      extensions: (order.extensions ?? []).map((item) => this.mapExtension(item)),
      capitals: (order.capitals ?? []).map((item) => this.mapCapital(item)),
      hardwares: (order.hardwares ?? []).map((item) => this.mapHardware(item)),
      panelings: (order.panelings ?? []).map((item) => this.mapPaneling(item)),
      skirtings: (order.skirtings ?? []).map((item) => this.mapSkirting(item)),
    };
  }

  toBackendPayload(payload: OrderCreatePayload): BackendOrderPayload {
    return {
      customer: payload.name,
      phone: payload.phone,
      date: payload.date,
      price: getOrderTotal(payload),
      prepayment: payload.prepayment,
      discount: payload.discount,
      needsDelivery: payload.needsDelivery,
      deliveryAddress: payload.deliveryAddress,
      comment: payload.comment,
      status: this.toBackendStatus(payload.status),
      isPaid: payload.isPaid,
      interiorDoors: payload.interiorDoors.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        model: item.model,
        color: item.color,
        price: normalizers.toNonNegativeNumber(item.price),
        price2: normalizers.toNullableNonNegativeNumber(item.price2),
        width: normalizers.toPositiveInteger(item.width),
        width2: normalizers.toNullablePositiveInteger(item.width2),
        height: normalizers.toPositiveInteger(item.height),
        height2: normalizers.toNullablePositiveInteger(item.height2),
        hasGlass: item.hasGlass,
        glassComment: item.glassComment,
        leafType: item.leafType,
        count: normalizers.toPositiveInteger(item.count),
        count2: normalizers.toNullablePositiveInteger(item.count2),
        covering: item.covering,
        rebateBarCount: normalizers.toNonNegativeInteger(item.rebateBarCount),
        rebateBarPrice: normalizers.toNullableNonNegativeNumber(item.rebateBarPrice),
        comment: item.comment,
      })),
      entranceDoors: payload.entranceDoors.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        kind: item.kind,
        opening: item.opening || EntranceDoorOpening.Left,
        leafType: item.leafType,
        model: item.model,
        width: item.width,
        height: item.height,
        color: item.color,
        painting: item.painting,
        panelColor: item.panelColor,
        hasPeephole: item.hasPeephole,
        count: item.count,
        price: item.price,
        comment: item.comment,
      })),
      moldings: payload.moldings.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        frameLength: normalizers.toNullableNonNegativeInteger(item.frameLength),
        framePrice: normalizers.toNonNegativeNumber(item.framePrice),
        frameSetCount: normalizers.toNonNegativeInteger(item.frameSetCount),
        frameBoxCount: normalizers.toNonNegativeInteger(item.frameBoxCount),
        frameThresholdCount: 0,
        frameThresholdPrice: 0,
        frameCount: normalizers.toNonNegativeNumber(item.frameCount),
        platbandType: item.platbandType,
        platbandFigure: item.platbandFigure,
        platbandLength: normalizers.toNullableNonNegativeInteger(item.platbandLength),
        platbandPrice: normalizers.toNonNegativeNumber(item.platbandPrice),
        platbandSetCount: normalizers.toNonNegativeInteger(item.platbandSetCount),
        platbandCount: normalizers.toNonNegativeNumber(item.platbandCount),
        platbandDeductionPrice: normalizers.toNonNegativeNumber(item.platbandDeductionPrice),
        rebateBarCount: normalizers.toNonNegativeInteger(item.rebateBarCount),
        rebateBarPrice: normalizers.toNonNegativeNumber(item.rebateBarPrice),
        color: item.color,
        covering: item.covering,
        comment: item.comment,
      })),
      extensions: payload.extensions.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        color: item.color,
        covering: item.covering,
        width: item.width,
        height: item.height,
        sizes: item.sizes,
        setCount: item.setCount,
        quantityPerSet: item.quantityPerSet,
        totalArea: item.totalArea,
        comment: item.comment,
        count: item.count,
        price: item.price,
      })),
      capitals: payload.capitals.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        name: item.name,
        color: item.color,
        covering: item.covering,
        width: item.width,
        height: item.height,
        price: item.price,
        comment: item.comment,
        count: item.count,
      })),
      hardwares: payload.hardwares.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        handleModel: item.handleModel || null,
        handleColor: item.handleColor || null,
        handleCount: item.handleCount,
        handlePrice: item.handlePrice,
        lockCount: item.lockCount,
        lockPrice: item.lockPrice,
        fixatorCount: item.fixatorCount,
        fixatorPrice: item.fixatorPrice,
        clickCount: item.clickCount,
        clickPrice: item.clickPrice,
        thumbturnCount: item.thumbturnCount,
        thumbturnPrice: item.thumbturnPrice,
        escutcheonCount: item.escutcheonCount,
        escutcheonPrice: item.escutcheonPrice,
        cylinderCount: item.cylinderCount,
        cylinderPrice: item.cylinderPrice,
        boltCount: item.boltCount,
        boltPrice: item.boltPrice,
        hingeRightCount: item.hingeRightCount,
        hingeLeftCount: item.hingeLeftCount,
        hingeCount: item.hingeCount,
        hingePrice: item.hingePrice,
        doorStopCount: item.doorStopCount,
        doorStopPrice: item.doorStopPrice,
        comment: item.comment,
      })),
      panelings: payload.panelings.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        color: item.color,
        width: item.width,
        height: item.height,
        covering: item.covering,
        kind: item.kind,
        sizes: item.sizes,
        totalArea: item.totalArea,
        count: item.count,
        price: item.price,
        comment: item.comment,
      })),
      skirtings: payload.skirtings.map((item) => ({
        supplier: item.supplier,
        costPrice: item.costPrice,
        model: item.model,
        color: item.color,
        height: normalizers.toPositiveInteger(item.height),
        length: normalizers.toNonNegativeNumber(item.length),
        count: normalizers.toPositiveInteger(item.count),
        price: normalizers.toNonNegativeNumber(item.price),
        comment: item.comment,
      })),
    };
  }

  toOrderStatus(status: BackendOrderStatus): OrderStatus {
    switch (status) {
      case BackendOrderStatus.Ordered:
        return OrderStatus.Ordered;
      case BackendOrderStatus.Received:
        return OrderStatus.Received;
      case BackendOrderStatus.CustomerNotified:
        return OrderStatus.CustomerNotified;
      case BackendOrderStatus.Issued:
        return OrderStatus.Issued;
      case BackendOrderStatus.Completed:
        return OrderStatus.Completed;
      default:
        return OrderStatus.Accepted;
    }
  }

  private toBackendStatus(status: OrderStatus): BackendOrderStatus {
    switch (status) {
      case OrderStatus.Ordered:
        return BackendOrderStatus.Ordered;
      case OrderStatus.Received:
        return BackendOrderStatus.Received;
      case OrderStatus.CustomerNotified:
        return BackendOrderStatus.CustomerNotified;
      case OrderStatus.Issued:
        return BackendOrderStatus.Issued;
      case OrderStatus.Completed:
        return BackendOrderStatus.Completed;
      default:
        return BackendOrderStatus.Accepted;
    }
  }

  private mapPayment(payment: BackendOrderPayment): OrderPayment {
    return {
      id: payment.id,
      amount: payment.amount,
      comment: payment.comment ?? '',
      createdAt: payment.createdAt ?? '',
      reversalOfPaymentId: payment.reversalOfPaymentId ?? null,
      reversedByPaymentId: payment.reversedByPaymentId ?? null,
    };
  }

  private mapInteriorDoor(door: BackendInteriorDoor): InteriorDoorItem {
    return {
      id: door.id,
      type: OrderItemType.InteriorDoor,
      supplier: door.supplier ?? '',
      costPrice: door.costPrice ?? 0,
      model: door.model,
      color: door.color ?? '',
      price: door.price,
      price2: door.price2 ?? null,
      width: door.width,
      width2: door.width2 ?? null,
      height: door.height,
      height2: door.height2 ?? null,
      hasGlass: door.hasGlass ?? false,
      glassComment: door.glassComment ?? '',
      leafType: door.leafType === DoorLeafType.Double ? DoorLeafType.Double : DoorLeafType.Single,
      count: door.count,
      count2: door.count2 ?? null,
      covering: this.mapInteriorCovering(door.covering),
      rebateBarCount: door.rebateBarCount ?? 0,
      rebateBarPrice: door.rebateBarPrice ?? null,
      comment: door.comment ?? '',
    };
  }

  private mapEntranceDoor(door: BackendEntranceDoor): EntranceDoorItem {
    return {
      id: door.id,
      type: OrderItemType.EntranceDoor,
      supplier: door.supplier ?? '',
      costPrice: door.costPrice ?? 0,
      kind: door.kind === EntranceDoorKind.Welded ? EntranceDoorKind.Welded : EntranceDoorKind.Factory,
      opening: door.opening === EntranceDoorOpening.Right ? EntranceDoorOpening.Right : EntranceDoorOpening.Left,
      leafType: door.leafType === DoorLeafType.Double ? DoorLeafType.Double : DoorLeafType.Single,
      model: door.model,
      width: door.width,
      height: door.height,
      color: door.color,
      painting: door.painting ?? null,
      panelColor: door.panelColor ?? null,
      hasPeephole: door.hasPeephole ?? null,
      count: door.count,
      price: door.price,
      comment: door.comment ?? '',
    };
  }

  private mapMolding(item: BackendMolding): MoldingItem {
    return {
      id: item.id,
      type: OrderItemType.Molding,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      frameLength: item.frameLength ?? null,
      framePrice: item.framePrice,
      frameSetCount: item.frameSetCount ?? Math.floor(item.frameCount / 2.5),
      frameBoxCount: item.frameBoxCount ?? 0,
      frameThresholdCount: item.frameThresholdCount ?? normalizers.getLegacyFrameThresholdCount(item.frameCount),
      frameThresholdPrice: item.frameThresholdPrice ?? 500,
      frameCount: item.frameCount,
      platbandType: this.mapMoldingPlatbandType(item.platbandType),
      platbandFigure: item.platbandFigure ?? null,
      platbandLength: item.platbandLength ?? null,
      platbandPrice: item.platbandPrice,
      platbandSetCount: item.platbandSetCount ?? Number((item.platbandCount / 2.5).toFixed(1)),
      platbandCount: item.platbandCount,
      platbandDeductionPrice: item.platbandDeductionPrice ?? 0,
      rebateBarCount: item.rebateBarCount ?? 0,
      rebateBarPrice: item.rebateBarPrice ?? 0,
      color: item.color ?? '',
      covering: this.mapMoldingCovering(item.covering),
      comment: item.comment ?? '',
    };
  }

  private mapExtension(item: BackendExtension): ExtensionItem {
    const sizes = normalizers.normalizeExtensionSizes(item);
    const totalQuantity = normalizers.calculateExtensionTotalQuantity(sizes);
    return {
      id: item.id,
      type: OrderItemType.Extension,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      color: item.color ?? '',
      covering: this.mapExtensionCovering(item.covering),
      width: item.width,
      height: item.height,
      sizes,
      setCount: item.setCount ?? Number(((item.quantityPerSet ?? totalQuantity) / 2.5).toFixed(1)),
      quantityPerSet: item.quantityPerSet ?? totalQuantity,
      totalArea: item.totalArea ?? normalizers.calculateExtensionTotalArea(sizes),
      comment: item.comment ?? '',
      count: item.count,
      price: item.price,
    };
  }

  private mapCapital(item: BackendCapital): CapitalItem {
    return {
      id: item.id,
      type: OrderItemType.Capital,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      name: item.name ?? '',
      color: item.color ?? '',
      covering: this.mapCapitalCovering(item.covering),
      width: item.width,
      height: item.height,
      price: item.price,
      comment: item.comment ?? '',
      count: item.count,
    };
  }

  private mapHardware(item: BackendHardware): HardwareItem {
    return {
      id: item.id,
      type: OrderItemType.Hardware,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      handleModel: item.handleModel ?? '',
      handleColor: item.handleColor ?? '',
      handleCount: item.handleCount ?? null,
      handlePrice: item.handlePrice ?? null,
      lockCount: item.lockCount ?? null,
      lockPrice: item.lockPrice ?? null,
      fixatorCount: item.fixatorCount ?? null,
      fixatorPrice: item.fixatorPrice ?? null,
      clickCount: item.clickCount ?? null,
      clickPrice: item.clickPrice ?? null,
      thumbturnCount: item.thumbturnCount ?? null,
      thumbturnPrice: item.thumbturnPrice ?? null,
      escutcheonCount: item.escutcheonCount ?? null,
      escutcheonPrice: item.escutcheonPrice ?? null,
      cylinderCount: item.cylinderCount ?? null,
      cylinderPrice: item.cylinderPrice ?? null,
      boltCount: item.boltCount ?? null,
      boltPrice: item.boltPrice ?? null,
      hingeRightCount: item.hingeRightCount ?? item.hingeCount ?? null,
      hingeLeftCount: item.hingeLeftCount ?? null,
      hingeCount: item.hingeCount ?? null,
      hingePrice: item.hingePrice ?? null,
      doorStopCount: item.doorStopCount ?? null,
      doorStopPrice: item.doorStopPrice ?? null,
      comment: item.comment ?? '',
    };
  }

  private mapPaneling(item: BackendPaneling): PanelingItem {
    const sizes = normalizers.normalizePanelingSizes(item);
    const calculatedArea = normalizers.calculatePanelingTotalArea(sizes);
    const totalArea = item.sizes?.length
      ? calculatedArea
      : Number(((item.totalArea ?? calculatedArea) * (item.count ?? 1)).toFixed(2));
    return {
      id: item.id,
      type: OrderItemType.Paneling,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      color: item.color ?? '',
      size: `${item.width}x${item.height}`,
      width: item.width,
      height: item.height,
      covering: this.mapPanelingCovering(item.covering),
      kind: this.mapPanelingKind(item.kind),
      sizes,
      totalArea,
      count: item.count,
      price: item.price,
      comment: item.comment ?? '',
    };
  }

  private mapSkirting(item: BackendSkirting): SkirtingItem {
    return {
      id: item.id,
      type: OrderItemType.Skirting,
      supplier: item.supplier ?? '',
      costPrice: item.costPrice ?? 0,
      model: item.model ?? '',
      color: item.color ?? '',
      height: item.height,
      length: item.length,
      count: item.count,
      price: item.price,
      comment: item.comment ?? '',
    };
  }

  private mapInteriorCovering(value?: string): InteriorDoorCovering {
    switch (value) {
      case InteriorDoorCovering.Enamel:
      case InteriorDoorCovering.Veneer:
      case InteriorDoorCovering.Embossing:
      case InteriorDoorCovering.PVC:
        return value;
      default:
        return InteriorDoorCovering.PVC;
    }
  }

  private mapMoldingCovering(value?: string): MoldingCovering {
    switch (value) {
      case MoldingCovering.Enamel:
      case MoldingCovering.Veneer:
      case MoldingCovering.Embossing:
      case MoldingCovering.PVC:
        return value;
      default:
        return MoldingCovering.Enamel;
    }
  }

  private mapExtensionCovering(value?: string): ExtensionCovering {
    switch (value) {
      case ExtensionCovering.Enamel:
      case ExtensionCovering.Veneer:
      case ExtensionCovering.Embossing:
        return value;
      default:
        return ExtensionCovering.Enamel;
    }
  }

  private mapCapitalCovering(value?: string): CapitalCovering {
    switch (value) {
      case CapitalCovering.Enamel:
      case CapitalCovering.Veneer:
      case CapitalCovering.Embossing:
        return value;
      default:
        return CapitalCovering.Enamel;
    }
  }

  private mapPanelingCovering(value?: string): PanelingCovering {
    switch (value) {
      case PanelingCovering.Enamel:
      case PanelingCovering.Veneer:
      case PanelingCovering.Embossing:
      case PanelingCovering.PVC:
        return value;
      default:
        return PanelingCovering.Enamel;
    }
  }

  private mapPanelingKind(value?: string): PanelingKind {
    switch (value) {
      case PanelingKind.Smooth:
      case PanelingKind.Figure:
      case PanelingKind.Baguette:
        return value;
      default:
        return PanelingKind.Smooth;
    }
  }

  private mapMoldingPlatbandType(value?: string): MoldingPlatbandType {
    switch (value) {
      case MoldingPlatbandType.Oval:
      case MoldingPlatbandType.Smooth:
      case MoldingPlatbandType.Figure:
        return value;
      default:
        return MoldingPlatbandType.Oval;
    }
  }
}
