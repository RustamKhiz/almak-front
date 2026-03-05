import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CoreService } from './core.service';
import { BackendOrderStatus, DoorItem, OrderCreatePayload, OrderStatus } from '../types/order.types';

interface BackendOrder {
  id: number;
  customer: string;
  phone: string;
  date: string;
  count: number;
  price: number;
  prepayment: number;
  comment: string;
  status: BackendOrderStatus;
  orders?: BackendDoor[];
  created_at?: string;
}

interface BackendDoor {
  id: number;
  order_id: number;
  type: string;
  model: string;
  price: number;
  color: string;
  width: number;
  height: number;
  leafType: string;
  count: number;
}

interface BackendOrderPayload {
  customer: string;
  phone: string;
  date: string;
  count: number;
  price: number;
  prepayment: number;
  comment: string;
  status: BackendOrderStatus;
  orders: BackendDoorPayload[];
}

interface BackendDoorPayload {
  type: string;
  model: string;
  price: number;
  color: string;
  width: number;
  height: number;
  leafType: string;
  count: number;
}

interface BackendOrderStatusPayload {
  status: number;
}

export interface OrderRecord {
  id: number;
  customer: string;
  phone: string;
  date: string;
  count: number;
  price: number;
  prepayment: number;
  comment: string;
  status: OrderStatus;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly coreService: CoreService = inject(CoreService);

  getOrders(): Observable<readonly OrderRecord[]> {
    return this.http
      .get<BackendOrder[]>(`${this.coreService.apiBaseUrl}/orders`)
      .pipe(map((orders) => orders.map((item) => this.mapBackendOrderToRecord(item))));
  }

  getOrder(id: number): Observable<OrderCreatePayload> {
    return this.http
      .get<BackendOrder>(`${this.coreService.apiBaseUrl}/orders/${id}`)
      .pipe(map((order) => this.mapBackendOrderToCreatePayload(order)));
  }

  createOrder(payload: OrderCreatePayload): Observable<number> {
    return this.http
      .post<BackendOrder>(`${this.coreService.apiBaseUrl}/orders`, this.mapCreatePayloadToBackend(payload))
      .pipe(map((order) => order.id));
  }

  updateOrder(id: number, payload: OrderCreatePayload): Observable<number> {
    return this.http
      .put<BackendOrder>(`${this.coreService.apiBaseUrl}/orders/${id}`, this.mapCreatePayloadToBackend(payload))
      .pipe(map((order) => order.id));
  }

  updateOrderStatus(id: number, status: OrderStatus): Observable<OrderStatus> {
    const payload: BackendOrderStatusPayload = { status };
    return this.http
      .patch<BackendOrder>(`${this.coreService.apiBaseUrl}/orders/${id}/status`, payload)
      .pipe(map((order) => this.mapBackendStatusToOrderStatus(order.status)));
  }

  deleteOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.coreService.apiBaseUrl}/orders/${id}`);
  }

  private mapBackendOrderToRecord(order: BackendOrder): OrderRecord {
    return {
      id: order.id,
      customer: order.customer,
      phone: order.phone,
      date: order.date,
      count: order.count,
      price: order.price,
      prepayment: order.prepayment,
      comment: order.comment ?? '',
      status: this.mapBackendStatusToOrderStatus(order.status),
    };
  }

  private mapBackendOrderToCreatePayload(order: BackendOrder): OrderCreatePayload {
    const orders = (order.orders ?? []).map((item) => this.mapBackendDoorToDoorItem(item));

    return {
      name: order.customer,
      phone: order.phone,
      date: order.date,
      prepayment: order.prepayment,
      quantity: order.count,
      comment: order.comment ?? '',
      status: this.mapBackendStatusToOrderStatus(order.status),
      orders,
    };
  }

  private mapCreatePayloadToBackend(payload: OrderCreatePayload): BackendOrderPayload {
    const total = payload.orders.reduce((sum, item) => sum + item.price * item.count, 0);
    return {
      customer: payload.name,
      phone: payload.phone,
      date: payload.date,
      count: payload.quantity,
      price: total,
      prepayment: payload.prepayment,
      comment: payload.comment,
      status: this.mapOrderStatusToBackendStatus(payload.status),
      orders: payload.orders.map((item) => ({
        type: item.type,
        model: item.model,
        price: item.price,
        color: item.color,
        width: item.width,
        height: item.height,
        leafType: item.leafType,
        count: item.count,
      })),
    };
  }

  private mapBackendDoorToDoorItem(door: BackendDoor): DoorItem {
    return {
      id: door.id,
      type: door.type === 'Interior' ? 'Interior' : 'Entrance',
      model: door.model,
      price: door.price,
      color: door.color,
      width: door.width,
      height: door.height,
      leafType: door.leafType === 'Double' ? 'Double' : 'Single',
      count: door.count,
    };
  }

  private mapBackendStatusToOrderStatus(status: BackendOrderStatus): OrderStatus {
    switch (status) {
      case BackendOrderStatus.Progress:
        return OrderStatus.Progress;
      case BackendOrderStatus.Completed:
        return OrderStatus.Completed;
      case BackendOrderStatus.Accepted:
      default:
        return OrderStatus.Accepted;
    }
  }

  private mapOrderStatusToBackendStatus(status: OrderStatus): BackendOrderStatus {
    switch (status) {
      case OrderStatus.Progress:
        return BackendOrderStatus.Progress;
      case OrderStatus.Completed:
        return BackendOrderStatus.Completed;
      case OrderStatus.Accepted:
      default:
        return BackendOrderStatus.Accepted;
    }
  }
}
