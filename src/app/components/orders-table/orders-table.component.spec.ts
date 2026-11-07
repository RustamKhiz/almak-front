import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { OrderRecord, OrdersService } from '../../services/orders.service';
import { OrderStatus } from '../../types/order.types';
import { OrdersTableComponent } from './orders-table.component';

describe('Bulk order deletion', () => {
  it('confirms only the visible page selection and keeps the other orders', async () => {
    const rows: OrderRecord[] = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      customer: 'Test',
      phone: '79000000000',
      date: '2026-11-07',
      price: 0,
      prepayment: 0,
      discount: 0,
      comment: '',
      status: OrderStatus.Accepted,
      isPaid: false,
    }));
    const deleteOrders = jasmine.createSpy('deleteOrders').and.returnValue(of(undefined));
    const open = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(false) });
    await TestBed.configureTestingModule({
      imports: [OrdersTableComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { can: () => true } },
        { provide: OrdersService, useValue: { getOrders: () => of(rows), deleteOrders } },
      ],
    })
      .overrideProvider(MatDialog, { useValue: { open } })
      .compileComponents();
    const fixture = TestBed.createComponent(OrdersTableComponent);
    const table: HTMLElement = fixture.nativeElement;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await settle();
    const idsOnPage = Array.from(table.querySelectorAll('.mat-column-id'))
      .map((cell) => cell.textContent?.trim())
      .filter((label): label is string => !!label?.startsWith('#'))
      .map((label) => Number(label.slice(1)));
    expect(idsOnPage.length).toBe(10);
    table.querySelector<HTMLInputElement>('th.mat-column-select input')!.click();
    await settle();
    const removeButton = () =>
      Array.from(table.querySelectorAll('button')).find(
        (button) => button.textContent?.trim() === 'Удалить выбранные',
      )!;
    removeButton().click();
    await settle();
    expect(deleteOrders).not.toHaveBeenCalled();
    open.and.returnValue({ afterClosed: () => of(true) });
    removeButton().click();
    await settle();
    expect(deleteOrders).toHaveBeenCalledOnceWith([...idsOnPage].sort((a, b) => a - b));
    expect(table.querySelectorAll('td.mat-column-id').length).toBe(2);
  });
});
