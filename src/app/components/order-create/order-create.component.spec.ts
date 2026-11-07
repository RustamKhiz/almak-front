import { signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { stubDraftTransport } from '../../testing/server-drafts.stub.spec';
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
import { OrderDraftItemDialogComponent } from './order-draft-item-dialog/order-draft-item-dialog.component';
import { AI_SCHEMA, AiValue } from '../../ai-orders/ai-order.types';
import { ServerDraftsService } from '../../services/server-drafts.service';
import { emptyDraftDocument } from '../../services/server-drafts.types';
import { OrderStatus } from '../../types/order.types';
import { OrderDocumentService } from '../../services/order-document.service';

describe('Opening incomplete AI drafts in the order editor', () => {
  let fixture: ComponentFixture<OrderCreateComponent>;
  let ai: AiOrdersService;
  let id: string;
  let orders: { createOrder: jasmine.Spy };
  let dialog: { open: jasmine.Spy };
  const clear = () => {
    localStorage.removeItem('ai_order_drafts_v1');
    localStorage.removeItem('ai_order_active_chat_v1');
  };
  beforeEach(async () => {
    clear();
    orders = { createOrder: jasmine.createSpy('createOrder').and.returnValue(of(777)) };
    dialog = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(true) }) };
    await TestBed.configureTestingModule({
      imports: [OrderCreateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { authenticated: signal(false), profile: signal(null) } },
        { provide: OrdersService, useValue: orders },
        { provide: CatalogsService, useValue: { getItemsByKey: () => of([]) } },
      ],
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    stubDraftTransport(orders.createOrder);
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
  it('opens a repeated order with a blank date and saves edits to its copied discount', async () => {
    const server = TestBed.inject(ServerDraftsService);
    const row = server.create('manual', {
      ...emptyDraftDocument(),
      payload: {
        name: 'Тестовый клиент',
        phone: '79000000000',
        date: '',
        prepayment: 0,
        discount: 300,
        needsDelivery: false,
        deliveryAddress: '',
        comment: '',
        status: OrderStatus.Accepted,
        isPaid: false,
        payments: [],
        interiorDoors: [],
        entranceDoors: [],
        moldings: [],
        extensions: [],
        capitals: [],
        hardwares: [],
        panelings: [],
        skirtings: [],
      },
    });
    server.records.update((rows) => ({ ...rows, [row.id]: { ...rows[row.id], sourceOrderId: 42 } }));
    fixture = TestBed.createComponent(OrderCreateComponent);
    fixture.componentRef.setInput('draftId', row.id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('a[href="/order/42"]')?.textContent).toContain('заказа №42');
    expect(el.querySelector<HTMLInputElement>('[formControlName="date"]')?.value).toBe('');
    const discount = el.querySelector<HTMLInputElement>('[formControlName="draftDiscount"]')!;
    expect(discount.value).toBe('300');
    discount.value = '125';
    discount.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(server.records()[row.id].document.payload?.discount).toBe(125);
  });
  it('opens the normal editor with missing fields and without an approval gate', async () => {
    await open();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')!.textContent).toContain('Черновик заказа');
    expect(el.textContent).not.toContain('Проверка черновика заказа');
    expect(el.textContent).not.toContain('Перенести в форму');
    expect(el.textContent).not.toContain('Подтверждаю:');
    expect(el.querySelector('app-ai-draft-card')).toBeNull();
    expect(el.querySelectorAll('app-order-items-list .door-item').length).toBe(2);
    expect(el.querySelector('.door-section__title')!.textContent).toContain('Межкомнатные двери');
    expect(el.querySelector('.door-item')!.textContent).toContain('Верона');
    expect(el.querySelector('.door-item')!.textContent).toContain('80');
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
    await fixture.whenStable();
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
    await fixture.whenStable();
    fixture.detectChanges();
    expect(orders.createOrder).toHaveBeenCalledTimes(1);
    const payload = orders.createOrder.calls.mostRecent().args[0];
    expect(payload.interiorDoors.length).toBe(2);
    expect(payload.interiorDoors[0].price).toBe(12000);
    expect(ai.active()!.orderId).toBe(777);
    const html = TestBed.inject(OrderDocumentService).buildOrderHtml(777, payload);
    const printed = new DOMParser().parseFromString(html, 'text/html').body.textContent!;
    expect(printed).toContain('Рустам');
    expect(printed).toContain('Верона');
    expect(printed).not.toMatch(/NaN|undefined|\[object Object\]/);
  });
  it('edits a product through the list and preserves its identity and unknown fields after reopening', async () => {
    await open();
    dialog.open.and.returnValue({ afterClosed: () => of({ ...ai.active()!.order.items[0].fields, price: 12000 }) });
    fixture.nativeElement.querySelector('.door-item button[aria-label="Редактировать"]').click();
    fixture.detectChanges();
    expect(dialog.open.calls.mostRecent().args[0]).toBe(OrderDraftItemDialogComponent);
    const product = ai.active()!.order.items[0];
    expect(product.itemId).toBe('one');
    expect(product.fields['price']).toBe(12000);
    expect(product.fields['covering']).toBeUndefined();
    expect(ai.active()!.fieldSources['items.one.price'].manual).toBeTrue();
    fixture.destroy();
    ai.reload();
    await open();
    expect(fixture.nativeElement.querySelectorAll('.door-item').length).toBe(2);
    expect(ai.active()!.order.items[0].fields['price']).toBe(12000);
  });
  it('duplicates and removes products through the standard list actions', async () => {
    await open();
    fixture.nativeElement.querySelector('.door-item button[aria-label="Дублировать"]').click();
    fixture.detectChanges();
    expect(ai.active()!.order.items.length).toBe(3);
    expect(ai.active()!.order.items[2].itemId).not.toBe('one');
    expect(ai.active()!.order.items[2].fields).toEqual(ai.active()!.order.items[0].fields);
    fixture.nativeElement.querySelector('.door-item button[aria-label="Удалить"]').click();
    fixture.detectChanges();
    expect(ai.active()!.order.items.map((item) => item.itemId)).not.toContain('one');
    expect(fixture.nativeElement.querySelectorAll('.door-item').length).toBe(2);
  });
  it('updates products in place when the chat changes quantities and adds another type', async () => {
    await open();
    ai.update(id, (draft) => {
      draft.order.items[0].fields['count'] = 4;
      draft.order.items.push({
        itemId: 'hardware',
        type: 'hardware',
        fields: { handleModel: 'Ручка', handleCount: 3 },
      });
    });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.door-item').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.door-item').textContent).toContain('4');
    expect(fixture.nativeElement.textContent).toContain('Ручка');
    expect(ai.active()!.editorState!.accepted).toBeFalse();
  });
  it('renders every supported product type even when it contains only one field', async () => {
    ai.update(id, (draft) => {
      draft.order.items = Object.keys(AI_SCHEMA.items).map((type) => ({
        itemId: type,
        type,
        fields: { comment: 'Проверка' },
      }));
    });
    await open();
    expect(fixture.nativeElement.querySelectorAll('.door-item').length).toBe(8);
    expect(fixture.nativeElement.textContent).not.toContain('NaN');
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
    click('Сохранить черновик');
    expect(ai.active()!.order.items.length).toBe(8);
  });
  it('adds a product from the regular menu only after saving the item dialog', async () => {
    await open();
    dialog.open.and.returnValue({ afterClosed: () => of({ model: 'Новая дверь' }) });
    click('Добавить');
    fixture.detectChanges();
    const button = Array.from(document.querySelectorAll('button')).find(
      (el) => el.textContent!.trim() === 'Входная дверь',
    )!;
    button.click();
    fixture.detectChanges();
    expect(ai.active()!.order.items.length).toBe(3);
    expect(ai.active()!.order.items[2].type).toBe('entranceDoor');
    expect(ai.active()!.order.items[2].fields['model']).toBe('Новая дверь');
    expect(ai.active()!.order.items[2].fields['price']).toBeUndefined();
  });
  it('does not add an empty product when the item dialog is cancelled', async () => {
    await open();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) });
    click('Добавить');
    fixture.detectChanges();
    const button = Array.from(document.querySelectorAll('button')).find(
      (el) => el.textContent!.trim() === 'Входная дверь',
    )!;
    button.click();
    fixture.detectChanges();
    expect(ai.active()!.order.items.length).toBe(2);
  });
  it('keeps the draft editable in chat after cancelling final creation', async () => {
    ai.update(id, (draft) => {
      Object.assign(draft.order.header, { phone: '79000000000', date: '2026-11-02', needsDelivery: false });
      for (const item of draft.order.items)
        Object.assign(item.fields, {
          price: 12000,
          color: 'Белый',
          covering: 'Эмаль',
          leafType: 'Single',
          hasGlass: false,
        });
    });
    await open();
    dialog.open.and.returnValue({ afterClosed: () => of(false) });
    click('Сохранить');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(orders.createOrder).not.toHaveBeenCalled();
    expect(ai.active()!.editorState!.accepted).toBeFalse();
    expect(fixture.nativeElement.querySelectorAll('.door-item').length).toBe(2);
  });
  it('saves amounts from the normal order form without replacing unknown amounts with zero', async () => {
    await open();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName="draftPrepayment"]');
    input.value = '10000';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(ai.active()!.order.header['prepayment']).toBe(10000);
    expect(ai.active()!.order.header['discount']).toBeUndefined();
  });
  it('converts all product categories into real order collections on final save', async () => {
    ai.update(id, (draft) => {
      draft.order.header = { name: 'Тест', phone: '79000000000', date: '2026-11-02', needsDelivery: false };
      draft.order.items = Object.entries(AI_SCHEMA.items).map(([type, def]) => {
        const fields: Record<string, AiValue> = {};
        for (const [key, field] of Object.entries(def.fields)) {
          if (!field.required) continue;
          fields[key] = field.type === 'number' ? 1 : field.type === 'boolean' ? false : (field.options?.[0] ?? 'Тест');
        }
        if (type === 'hardware') Object.assign(fields, { handleCount: 2, handlePrice: 100 });
        return { itemId: type, type, fields };
      });
    });
    await open();
    click('Сохранить');
    await fixture.whenStable();
    expect(orders.createOrder).toHaveBeenCalledTimes(1);
    const payload = orders.createOrder.calls.mostRecent().args[0];
    for (const definition of Object.values(AI_SCHEMA.items)) expect(payload[definition.collection].length).toBe(1);
  });
});
