import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
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
        { provide: AuthService, useValue: { authenticated: signal(true) } },
      ],
    }).compileComponents();
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
      value.messages = [{ role: 'user', text: name, createdAt: new Date().toISOString() }];
      value.pendingText = pending;
    });
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
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    button('Открыть черновик').click();
    expect(navigate).toHaveBeenCalledWith(['/order'], { queryParams: { aiDraft: id } });
    expect(ai.drafts()[0].editorState).toBeUndefined();
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
  it('cancels a pending request when another chat is selected', async () => {
    const first = add('Первый', 'Описание первого');
    const second = add('Второй', '');
    ai.open(first);
    await render();
    ai.send();
    const request = http.expectOne((r) => r.url.endsWith('/ai/order-drafts/parse'));
    button('История чатов').click();
    await settle();
    Array.from(fixture.nativeElement.querySelectorAll('.chat-entry') as NodeListOf<HTMLButtonElement>)
      .find((el) => el.textContent!.includes('Второй'))!
      .click();
    await settle();
    expect(request.cancelled).toBeTrue();
    expect(ai.activeId()).toBe(second);
    expect(ai.drafts().find((d) => d.id === first)!.pendingText).toBe('Описание первого');
  });
  it('shows saved order conversations in history with a link to that order', async () => {
    const id = add('Клиент', '');
    ai.complete(id, 42);
    ai.open(id);
    await render();
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    button('Открыть заказ').click();
    expect(navigate).toHaveBeenCalledWith(['/order', 42]);
    ai.open(id);
    await settle();
    button('История чатов').click();
    await settle();
    expect(fixture.nativeElement.querySelector('.chat-entry').textContent).toContain('Заказ №42');
  });
});
