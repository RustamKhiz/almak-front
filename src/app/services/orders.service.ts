import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export enum OrderStatus {
  Accepted = 0,
  Progress = 1,
  Completed = 2,
}

export type OrderRecord = {
  id: number;
  customer: string;
  phone: string;
  date: string;
  count: number;
  price: number;
  prepayment: number;
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
        customer: 'Elena Petrova',
        phone: '+7 (415) 555-0132',
        date: '2026-02-03',
        count: 2,
        price: 52000,
        prepayment: 15000,
        status: OrderStatus.Accepted,
      },
      {
        id: 102,
        customer: 'Maksim Orlov',
        phone: '+7 (415) 555-0198',
        date: '2026-02-05',
        count: 4,
        price: 98000,
        prepayment: 30000,
        status: OrderStatus.Progress,
      },
      {
        id: 103,
        customer: 'Irina Volkova',
        phone: '+7 (415) 555-0144',
        date: '2026-02-06',
        count: 1,
        price: 28000,
        prepayment: 8000,
        status: OrderStatus.Completed,
      },
      {
        id: 104,
        customer: 'Anton Smirnov',
        phone: '+7 (415) 555-0177',
        date: '2026-02-07',
        count: 3,
        price: 43000,
        prepayment: 12000,
        status: OrderStatus.Accepted,
      },
    ]).pipe(delay(350));
  }
}
