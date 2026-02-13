import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DoorItem, OrderCreatePayload, OrderStatus } from '../types/order.types';

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
  getOrders(): Observable<readonly OrderRecord[]> {
    return of([
      {
        id: 101,
        customer: 'Елена Петрова',
        phone: '+7 (415) 555-0132',
        date: '2026-02-03',
        count: 2,
        price: 52000,
        prepayment: 15000,
        comment: 'Доставка после 18:00',
        status: OrderStatus.Accepted,
      },
      {
        id: 102,
        customer: 'Максим Орлов',
        phone: '+7 (415) 555-0198',
        date: '2026-02-05',
        count: 4,
        price: 98000,
        prepayment: 30000,
        comment: 'Поднять на 3 этаж',
        status: OrderStatus.Progress,
      },
      {
        id: 103,
        customer: 'Ирина Волкова',
        phone: '+7 (415) 555-0144',
        date: '2026-02-06',
        count: 1,
        price: 28000,
        prepayment: 8000,
        comment: 'Позвонить за час',
        status: OrderStatus.Completed,
      },
      {
        id: 104,
        customer: 'Антон Смирнов',
        phone: '+7 (415) 555-0177',
        date: '2026-02-07',
        count: 3,
        price: 43000,
        prepayment: 12000,
        comment: 'Согласовать цвет',
        status: OrderStatus.Accepted,
      },
    ]).pipe(delay(350));
  }

  getOrder(id: number): Observable<OrderCreatePayload> {
    const orders: DoorItem[] = [
      {
        id: 1,
        type: 'Entrance',
        model: 'Nordic',
        price: 450,
        color: 'White',
        width: 90,
        height: 210,
        leafType: 'Single',
        count: 1,
      },
    ];

    return of({
      name: 'Иван Петров',
      phone: '+7 900 000-00-00',
      date: '2026-02-07',
      prepayment: 100,
      quantity: orders.reduce((sum, item) => sum + item.count, 0),
      comment: `Заказ ${id} (мок)`,
      status: OrderStatus.Accepted,
      orders,
    }).pipe(delay(400));
  }

  createOrder(): Observable<number> {
    return of(1).pipe(delay(400));
  }

  updateOrder(id: number, payload: OrderCreatePayload): Observable<number> {
    return of(id).pipe(delay(400));
  }
}
