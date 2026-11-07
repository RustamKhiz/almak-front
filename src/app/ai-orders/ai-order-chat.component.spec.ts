import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ServerDraftsService } from '../services/server-drafts.service';
import { stubDraftTransport } from '../testing/server-drafts.stub.spec';
import { signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AiOrderChatComponent } from './ai-order-chat.component';
import { AiOrdersService } from './ai-orders.service';

describe('Floating AI chat', () => {
  let fixture: ComponentFixture<AiOrderChatComponent>;
  let ai: AiOrdersService;
  let http: HttpTestingController;
  const clear = () => {
    localStorage.removeItem('ai_order_drafts_v1');
    localStorage.removeItem('ai_order_active_chat_v1');
  };
  beforeEach(async () => {
    clear();
    await TestBed.configureTestingModule({
      imports: [AiOrderChatComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { authenticated: signal(true), profile: signal(null) } },
      ],
    }).compileComponents();
    stubDraftTransport();
    ai = TestBed.inject(AiOrdersService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    fixture?.destroy();
    http.verify();
    clear();
  });
  function add(name: string, pending: string) {
    const d = ai.create(name)!;
    ai.update(d.id, (value) => {
      value.order.header['name'] = name;
      value.pendingText = pending;
    });
    TestBed.inject(ServerDraftsService).records.update((all) => ({
      ...all,
      [d.id]: { ...all[d.id], messages: [{ role: 'user', text: name, createdAt: new Date().toISOString() }] },
    }));
    return d.id;
  }
  async function render() {
    fixture = TestBed.createComponent(AiOrderChatComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  async function settle() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  function button(label: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (el) => el.getAttribute('aria-label') === label || el.textContent!.trim() === label,
    )!;
  }
  it('contains only text entry and draft links, without field editors or technical footnotes', async () => {
    const id = add('Магомед', '');
    ai.open(id);
    await render();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.chat-window');
    expect(panel.querySelectorAll('select, input, app-ai-draft-card').length).toBe(0);
    expect(panel.querySelector('textarea')).toBeTruthy();
    expect(panel.textContent).not.toContain('DeepSeek');
    expect(panel.textContent).not.toContain('Черновик появится после ввода');
    expect(panel.textContent).not.toContain('не синхронизируются');
    expect(panel.textContent).not.toContain('Сохранено на сервере');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    button('Открыть черновик').click();
    await settle();
    expect(navigate).toHaveBeenCalledWith(['/order'], { queryParams: { aiDraft: id } });
    expect(ai.drafts()[0].editorState).toBeUndefined();
  });
  it('shows save failures with retry while routine save status stays hidden', async () => {
    const id = add('Тестовый заказ', '');
    ai.open(id);
    await render();
    expect(fixture.nativeElement.textContent).not.toContain('Сохранено на сервере');
    TestBed.inject(ServerDraftsService).errors.set({ [id]: 'Не удалось сохранить изменения.' });
    await settle();
    expect(fixture.nativeElement.textContent).toContain('Не удалось сохранить изменения.');
    expect(button('Повторить сохранение')).toBeTruthy();
  });
  it('opens the current draft from the latest assistant reply only', async () => {
    const id = add('Клиент', '');
    const server = TestBed.inject(ServerDraftsService);
    server.records.update((rows) => ({
      ...rows,
      [id]: {
        ...rows[id],
        messages: [
          ...rows[id].messages,
          { role: 'assistant', text: 'Черновик создан.', createdAt: new Date().toISOString() },
          { role: 'user', text: 'Две двери', createdAt: new Date().toISOString() },
          { role: 'assistant', text: 'Добавлено две двери.', createdAt: new Date().toISOString() },
        ],
      },
    }));
    ai.open(id);
    await render();
    const messages = fixture.nativeElement.querySelectorAll('.message');
    expect(messages[1].querySelector('button')).toBeNull();
    const link: HTMLButtonElement = messages[3].querySelector('button');
    expect(link.textContent).toContain('Открыть черновик');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    link.click();
    await settle();
    expect(navigate).toHaveBeenCalledWith(['/order'], { queryParams: { aiDraft: id } });
  });
  it('switches conversations without losing either pending text or history', async () => {
    const first = add('Первый', 'Уточнение первого');
    const second = add('Второй', 'Уточнение второго');
    ai.open(second);
    await render();
    button('История чатов').click();
    await settle();
    expect(fixture.nativeElement.querySelectorAll('.chat-entry').length).toBe(2);
    const firstEntry = Array.from(
      fixture.nativeElement.querySelectorAll('.chat-entry') as NodeListOf<HTMLButtonElement>,
    ).find((el) => el.textContent!.includes('Первый'))!;
    firstEntry.click();
    await settle();
    expect(ai.activeId()).toBe(first);
    expect(fixture.nativeElement.querySelector('textarea').value).toBe('Уточнение первого');
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.value = 'Новое уточнение первого';
    textarea.dispatchEvent(new Event('input'));
    await settle();
    button('История чатов').click();
    await settle();
    Array.from(fixture.nativeElement.querySelectorAll('.chat-entry') as NodeListOf<HTMLButtonElement>)
      .find((el) => el.textContent!.includes('Второй'))!
      .click();
    await settle();
    expect(ai.activeId()).toBe(second);
    expect(fixture.nativeElement.querySelector('textarea').value).toBe('Уточнение второго');
    expect(ai.drafts().find((d) => d.id === first)!.pendingText).toBe('Новое уточнение первого');
    expect(ai.drafts().find((d) => d.id === first)!.messages[0].text).toBe('Первый');
  });
  it('shows the working copy diff and applies it only to its target order after confirmation', async () => {
    const id = add('Тестовый заказ', '');
    const server = TestBed.inject(ServerDraftsService);
    const changes = [{ path: 'items.door.width', label: 'Позиция 1 · Ширина', before: 80, after: 70 }];
    server.records.update((rows) => ({
      ...rows,
      [id]: { ...rows[id], targetOrderId: 42, document: { ...rows[id].document, changes } },
    }));
    const apply = spyOn(server, 'applyOrderEdit').and.resolveTo();
    ai.open(id);
    await render();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.chat-window');
    expect(panel.textContent).toContain('Редактирование заказа №42');
    expect(panel.textContent).toContain('80 → 70');
    expect(apply).not.toHaveBeenCalled();
    button('Применить к заказу №42').click();
    await settle();
    expect(apply).toHaveBeenCalledOnceWith(id, changes);
  });
  it('keeps an in-flight operation bound to its original conversation when switching', async () => {
    const first = add('Первый', 'Описание первого');
    const second = add('Второй', '');
    const server = TestBed.inject(ServerDraftsService);
    let finish!: () => void;
    spyOn(server, 'send').and.callFake(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    ai.open(first);
    await render();
    ai.send();
    ai.open(second);
    expect(ai.activeId()).toBe(second);
    expect(ai.busy()).toBeFalse();
    finish();
    await settle();
    expect(ai.activeId()).toBe(second);
    expect(ai.drafts().find((d) => d.id === first)!.pendingText).toBe('Описание первого');
  });
  it('shows saved order conversations in history with a link to that order', async () => {
    const id = add('Клиент', '');
    TestBed.inject(ServerDraftsService).records.update((all) => ({
      ...all,
      [id]: { ...all[id], state: 'converted', orderId: 42 },
    }));
    ai.open(id);
    await render();
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    button('Открыть заказ').click();
    await settle();
    expect(navigate).toHaveBeenCalledWith(['/order', 42]);
    ai.open(id);
    await settle();
    button('История чатов').click();
    await settle();
    expect(fixture.nativeElement.querySelector('.chat-entry').textContent).toContain('Заказ №42');
  });
});
