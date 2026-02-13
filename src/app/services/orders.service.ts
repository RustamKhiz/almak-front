import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CoreService } from './core.service';
import { DoorItem, OrderCreatePayload, OrderStatus } from '../types/order.types';

type BackendOrder = {
  id: number;
  customer: string;
  phone: string;
  date: string;
  count: number;
  price: number;
  prepayment: number;
  comment: string;
  status: string;
  created_at?: string;
};

type BackendOrderPayload = {
  customer: string;
  phone: string;
  date: string;
  count: number;
  price: number;
  prepayment: number;
  comment: string;
  status: string;
};

export type OrderRecord = {
  id: number;
  customer: string;
  phone: string;
  date: string;
  count: number;
  price: number;
  prepayment: number;
  comment: string;
  status: OrderStatus;
};

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  constructor(
    private readonly http: HttpClient,
    private readonly coreService: CoreService,
  ) {}

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
    const count = Math.max(order.count, 1);
    const unitPrice = count > 0 ? order.price / count : order.price;
    const orders: DoorItem[] = [
      {
        id: 1,
        type: 'Entrance',
        model: 'Без детализации',
        price: unitPrice,
        color: '-',
        width: 0,
        height: 0,
        leafType: 'Single',
        count,
      },
    ];

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
    };
  }

  private mapBackendStatusToOrderStatus(status: string): OrderStatus {
    switch (status) {
      case 'progress':
        return OrderStatus.Progress;
      case 'completed':
        return OrderStatus.Completed;
      case 'accepted':
      default:
        return OrderStatus.Accepted;
    }
  }

  private mapOrderStatusToBackendStatus(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Progress:
        return 'progress';
      case OrderStatus.Completed:
        return 'completed';
      case OrderStatus.Accepted:
      default:
        return 'accepted';
    }
  }
}
