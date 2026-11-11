import { TestBed, ComponentFixture, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
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
  function mockMicrophone() {
    const stopTrack = jasmine.createSpy('stopTrack');
    spyOn(navigator.mediaDevices, 'getUserMedia').and.resolveTo({
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream);
    const recorder = {
      state: 'inactive',
      mimeType: 'audio/webm',
      ondataavailable: null as ((event: { data: Blob }) => void) | null,
      onstop: null as (() => void) | null,
      start() {
        this.state = 'recording';
      },
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['test audio'], { type: this.mimeType }) });
        this.onstop?.();
      },
    };
    const createRecorder = spyOn(window, 'MediaRecorder').and.returnValue(recorder as unknown as MediaRecorder);
    Object.assign(createRecorder, { isTypeSupported: () => true });
    return stopTrack;
  }
  const transcription = (request: { url: string }) => request.url.endsWith('/ai/order-drafts/transcribe');

  it('shows microphone activity during recording and clears it on cancel', fakeAsync(() => {
    mockMicrophone();
    let amplitude = 0;
    const close = jasmine.createSpy('close').and.resolveTo();
    spyOn(window, 'AudioContext').and.returnValue({
      createAnalyser: () => ({
        getFloatTimeDomainData: (samples: Float32Array) => samples.fill(amplitude),
      }),
      createMediaStreamSource: () => ({ connect: () => undefined }),
      resume: () => Promise.resolve(),
      close,
    } as unknown as AudioContext);
    ai.open(add('Клиент', ''));
    fixture = TestBed.createComponent(AiOrderChatComponent);
    fixture.detectChanges();
    button('Диктовать сообщение').click();
    http.expectOne(transcription).flush({ enabled: true });
    flushMicrotasks();
    tick(64);
    fixture.detectChanges();
    const meter: HTMLElement = fixture.nativeElement.querySelector('.voice-meter');
    expect(meter.style.getPropertyValue('--level')).toBe('0');
    const bar = meter.children[2] as HTMLElement;
    expect(bar.style.getPropertyValue('--peak')).toBe('19px');
    expect(getComputedStyle(bar).height).toBe('3px');
    amplitude = 0.2;
    tick(64);
    fixture.detectChanges();
    expect(meter.style.getPropertyValue('--level')).toBe('1');
    button('Отменить запись').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.voice-meter')).toBeNull();
    expect(close).toHaveBeenCalledTimes(1);
    http.expectNone(transcription);
  }));

  it('appends the transcript after one minute and waits for manual send', fakeAsync(() => {
    const stopTrack = mockMicrophone();
    ai.open(add('Клиент', 'Начало заказа.'));
    const send = spyOn(ai, 'send');
    fixture = TestBed.createComponent(AiOrderChatComponent);
    fixture.detectChanges();
    button('Диктовать сообщение').click();
    http.expectOne(transcription).flush({ enabled: true });
    flushMicrotasks();
    fixture.detectChanges();
    const timer = (): string | undefined => fixture.nativeElement.querySelector('.voice-timer')?.textContent.trim();
    expect(timer()).toBe('0:00 / 1:00');
    tick(59_999);
    fixture.detectChanges();
    expect(timer()).toBe('0:59 / 1:00');
    http.expectNone(transcription);
    tick(1);
    fixture.detectChanges();
    expect(timer()).toBeUndefined();
    const upload = http.expectOne(transcription);
    expect(upload.request.method).toBe('POST');
    expect((upload.request.body as Blob).type).toBe('audio/webm');
    upload.flush({ text: 'Две двери.' });
    fixture.detectChanges();
    expect(ai.active()?.pendingText).toBe('Начало заказа. Две двери.');
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    button('Отправить').click();
    expect(send).toHaveBeenCalledTimes(1);
    tick();
  }));

  it('discards a cancelled recording and keeps the typed text', fakeAsync(() => {
    const stopTrack = mockMicrophone();
    ai.open(add('Клиент', 'Набранный текст'));
    fixture = TestBed.createComponent(AiOrderChatComponent);
    fixture.detectChanges();
    button('Диктовать сообщение').click();
    http.expectOne(transcription).flush({ enabled: true });
    flushMicrotasks();
    fixture.detectChanges();
    button('Отменить запись').click();
    tick(60_000);
    http.expectNone(transcription);
    expect(ai.active()?.pendingText).toBe('Набранный текст');
    expect(stopTrack).toHaveBeenCalledTimes(1);
  }));
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
  it('preserves multiline input when minimizing and reopening without sending it', async () => {
    const id = add('Клиент', '');
    ai.open(id);
    await render();
    const send = spyOn(TestBed.inject(ServerDraftsService), 'send').and.resolveTo();
    const input: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    input.value = 'Первая дверь\nВторая дверь\nПредоплата 10000';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }),
    );
    await settle();
    expect(send).not.toHaveBeenCalled();
    button('Свернуть чат').click();
    await settle();
    button('Помощник по заказам').click();
    await settle();
    expect(fixture.nativeElement.querySelector('textarea').value).toBe(input.value);
    expect(ai.active()!.pendingText).toBe(input.value);
    expect(button('Отправить').disabled).toBeFalse();
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
