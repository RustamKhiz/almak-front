import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { OrderCreateComponent } from './order-create.component';
import { AiOrdersService } from '../../ai-orders/ai-orders.service';
import { OrdersService } from '../../services/orders.service';
import { CatalogsService } from '../../services/catalogs.service';

describe('Opening incomplete AI drafts in the order editor', () => {
  let fixture: ComponentFixture<OrderCreateComponent>;
  let ai: AiOrdersService;
  let id: string;
  let orders: { createOrder: jasmine.Spy };
  const clear = () => {
    localStorage.removeItem('ai_order_drafts_v1');
    localStorage.removeItem('ai_order_active_chat_v1');
  };
  beforeEach(async () => {
    clear();
    orders = { createOrder: jasmine.createSpy('createOrder').and.returnValue(of(777)) };
    await TestBed.configureTestingModule({
      imports: [OrderCreateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: OrdersService, useValue: orders },
        { provide: CatalogsService, useValue: { getItemsByKey: () => of([]) } },
      ],
    })
      .overrideProvider(MatDialog, { useValue: { open: () => ({ afterClosed: () => of(true) }) } })
      .compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    ai = TestBed.inject(AiOrdersService);
    id = ai.create('Рустам, две двери')!.id;
    ai.update(id, (d) => {
      d.order = {
        header: { name: 'Рустам' },
        items: [
          { itemId: 'one', type: 'interiorDoor', fields: { model: 'Верона', width: 80, height: 200, count: 2 } },
          { itemId: 'two', type: 'interiorDoor', fields: { model: 'Верона', width: 70, height: 200, count: 1 } },
        ],
        notes: [],
      };
      d.editorState = { payload: null, accepted: false, defaultsConfirmed: false };
    });
  });
  afterEach(() => {
    fixture?.destroy();
    TestBed.inject(HttpTestingController).verify();
    clear();
  });
  async function open() {
    fixture = TestBed.createComponent(OrderCreateComponent);
    fixture.componentRef.setInput('aiDraftId', id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  function click(text: string) {
    const b = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (el) => el.textContent!.trim() === text,
    )!;
    expect(b).toBeTruthy();
    b.click();
  }
  it('opens the normal editor with missing fields and without an approval gate', async () => {
    await open();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')!.textContent).toContain('Черновик заказа');
    expect(el.textContent).not.toContain('Проверка черновика заказа');
    expect(el.textContent).not.toContain('Перенести в форму');
    expect(el.textContent).not.toContain('Подтверждаю:');
    expect((el.querySelector('[formControlName="name"]') as HTMLInputElement).value).toBe('Рустам');
    expect((el.querySelector('[formControlName="phone"]') as HTMLInputElement).value).toBe('');
    expect((el.querySelector('[formControlName="date"]') as HTMLInputElement).value).toBe('');
    expect(ai.active()!.order.items[0].fields['price']).toBeUndefined();
    click('Сохранить черновик');
    fixture.detectChanges();
    expect(ai.active()!.editorState!.accepted).toBeFalse();
    expect(orders.createOrder).not.toHaveBeenCalled();
  });
  it('saves an incomplete header edit without filling unknown prices or delivery', async () => {
    await open();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName="name"]');
    input.value = 'Алексей';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(ai.active()!.order.header['name']).toBe('Алексей');
    expect(ai.active()!.order.header['needsDelivery']).toBeUndefined();
    expect(ai.active()!.order.items[0].fields['price']).toBeUndefined();
    expect(ai.active()!.fieldSources['header.name'].manual).toBeTrue();
  });
  it('allows a draft containing just a name and validates only final creation', async () => {
    ai.update(id, (d) => {
      d.order.items = [];
    });
    await open();
    click('Сохранить черновик');
    expect(ai.active()!.order.header['name']).toBe('Рустам');
    click('Сохранить');
    fixture.detectChanges();
    expect(orders.createOrder).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Для создания заказа заполните обязательные данные');
  });
  it('refreshes the header when AI refines the draft while the editor is open', async () => {
    await open();
    ai.update(id, (d) => {
      d.order.header['phone'] = '79000000000';
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    click('Сохранить черновик');
    expect(ai.active()!.order.header['phone']).toBe('79000000000');
    expect(ai.active()!.editorState!.accepted).toBeFalse();
  });
  it('creates a complete order through the existing confirmation flow', async () => {
    ai.update(id, (d) => {
      Object.assign(d.order.header, { phone: '79000000000', date: '2026-11-02', needsDelivery: false });
      for (const item of d.order.items)
        Object.assign(item.fields, {
          price: 12000,
          color: 'Белый',
          covering: 'Эмаль',
          leafType: 'Single',
          hasGlass: false,
        });
    });
    await open();
    click('Сохранить');
    fixture.detectChanges();
    expect(orders.createOrder).toHaveBeenCalledTimes(1);
    const payload = orders.createOrder.calls.mostRecent().args[0];
    expect(payload.interiorDoors.length).toBe(2);
    expect(payload.interiorDoors[0].price).toBe(12000);
    expect(ai.active()!.orderId).toBe(777);
  });
});
