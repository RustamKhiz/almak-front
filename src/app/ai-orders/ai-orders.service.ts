import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { isAiOrder } from './ai-order.types';
import { CoreService } from '../services/core.service';
import { AiDraft, AiOrder, AiParseResponse, AiValue, AI_SCHEMA, emptyAiOrder } from './ai-order.types';

// TODO(ai-chat-backend): replace localStorage with authenticated server-side chats/drafts,
// migrate existing local records, and keep this API as the UI persistence boundary.
const KEY = 'ai_order_drafts_v1';
const ACTIVE_KEY = 'ai_order_active_chat_v1';
@Injectable({ providedIn: 'root' })
export class AiOrdersService {
  private readonly http = inject(HttpClient);
  private readonly core = inject(CoreService);
  readonly drafts = signal<readonly AiDraft[]>([]);
  readonly activeId = signal<string | null>(null);
  readonly opened = signal(false);
  readonly busy = signal(false);
  readonly unread = signal(false);
  readonly error = signal<string | null>(null);
  readonly storageError = signal<string | null>(null);
  private subscription: Subscription | null = null;
  private requestId: string | null = null;
  private selectionInitialized = false;
  constructor() {
    this.reload();
    window.addEventListener('storage', (event) => {
      if (event.key === KEY) {
        if (this.activeId())
          this.storageError.set('Черновики изменены в другой вкладке. Обновите данные перед продолжением.');
        else this.reload();
      }
    });
  }
  active(): AiDraft | null {
    return this.drafts().find((d) => d.id === this.activeId()) ?? null;
  }
  private read(): AiDraft[] {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const drafts: AiDraft[] = JSON.parse(raw);
    if (
      !Array.isArray(drafts) ||
      drafts.some(
        (d) =>
          d.schemaVersion !== 1 ||
          typeof d.id !== 'string' ||
          !Number.isInteger(d.revision) ||
          (d.orderId !== undefined && (!Number.isSafeInteger(d.orderId) || d.orderId <= 0)) ||
          !isAiOrder(d.order) ||
          !Array.isArray(d.order.items) ||
          !Array.isArray(d.messages) ||
          typeof d.pendingText !== 'string' ||
          !Array.isArray(d.questions) ||
          !Array.isArray(d.changes) ||
          !d.fieldSources ||
          typeof d.fieldSources !== 'object' ||
          d.messages.some((m) => !m || typeof m.text !== 'string' || !['user', 'assistant'].includes(m.role)),
      )
    )
      throw new Error('Не удалось прочитать черновики. Сохранённые данные не удалены.');
    return drafts;
  }
  reload(): void {
    try {
      this.drafts.set(this.read());
      this.storageError.set(null);
    } catch {
      this.storageError.set('Не удалось прочитать локальные черновики. Данные не удалены.');
    }
  }
  private write(next: AiDraft[], expected: AiDraft | null): boolean {
    try {
      const current = this.read();
      if (expected) {
        const saved = current.find((d) => d.id === expected.id);
        if (!saved || saved.revision !== expected.revision) {
          throw new Error('Черновик изменён в другой вкладке. Откройте актуальную версию; ваш ввод остаётся в чате.');
        }
      }
      localStorage.setItem(KEY, JSON.stringify(next));
      this.drafts.set(next);
      this.storageError.set(null);
      return true;
    } catch (error) {
      this.storageError.set(
        error instanceof Error ? error.message : 'Не удалось сохранить черновик на этом устройстве.',
      );
      return false;
    }
  }
  create(text: string): AiDraft | null {
    const now = new Date().toISOString();
    const draft: AiDraft = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      revision: 0,
      createdAt: now,
      updatedAt: now,
      sourceText: text,
      messages: [],
      pendingText: text,
      order: emptyAiOrder(),
      fieldSources: {},
      questions: [],
      changes: [],
    };
    try {
      if (this.write([...this.read(), draft], null)) {
        this.activeId.set(draft.id);
        this.selectionInitialized = true;
        this.persistSelection(draft.id);
        return draft;
      }
    } catch {
      this.storageError.set('Не удалось сохранить черновик. Текст остаётся в чате.');
    }
    return null;
  }
  update(id: string, mutate: (draft: AiDraft) => void): AiDraft | null {
    const before = this.drafts().find((d) => d.id === id);
    if (!before) return null;
    const next = structuredClone(before);
    mutate(next);
    next.revision++;
    next.updatedAt = new Date().toISOString();
    try {
      const all = this.read();
      if (
        this.write(
          all.map((d) => (d.id === id ? next : d)),
          before,
        )
      )
        return next;
    } catch {
      this.storageError.set('Не удалось сохранить черновик.');
    }
    return null;
  }
  setText(text: string): boolean {
    const draft = this.active();
    if (!draft) {
      if (!text.trim()) return true;
      return !!this.create(text);
    }
    if (draft.pendingText === text) return true;
    return !!this.update(draft.id, (d) => {
      d.pendingText = text;
      if (!d.messages.length) d.sourceText = text;
    });
  }
  private persistSelection(id: string | null): void {
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* Selecting a chat must not prevent reading a successfully saved draft. */
    }
  }
  open(id?: string): void {
    if (id) {
      if (this.activeId() !== id) this.cancel();
      this.activeId.set(id);
    } else if (!this.activeId() && !this.selectionInitialized) {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(ACTIVE_KEY);
      } catch {
        /* Fall back to the latest chat. */
      }
      const latest = [...this.drafts()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      this.activeId.set(this.drafts().some((draft) => draft.id === saved) ? saved : (latest?.id ?? null));
    }
    this.selectionInitialized = true;
    this.persistSelection(this.activeId());
    this.opened.set(true);
    this.unread.set(false);
    this.error.set(null);
  }
  newChat(): void {
    this.cancel();
    this.selectionInitialized = true;
    this.activeId.set(null);
    this.persistSelection(null);
    this.error.set(null);
    this.opened.set(true);
  }
  hideForLogout(): void {
    this.selectionInitialized = false;
    this.cancel();
    this.opened.set(false);
    this.activeId.set(null);
    this.unread.set(false);
  }
  cancel(): void {
    this.requestId = null;
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.busy.set(false);
  }
  remove(id: string): boolean {
    const draft = this.drafts().find((d) => d.id === id);
    if (!draft) return true;
    try {
      if (
        !this.write(
          this.read().filter((d) => d.id !== id),
          draft,
        )
      )
        return false;
    } catch {
      return false;
    }
    if (this.activeId() === id) {
      this.cancel();
      this.activeId.set(null);
      this.persistSelection(null);
    }
    return true;
  }
  removeAll(): boolean {
    try {
      localStorage.removeItem(KEY);
      this.drafts.set([]);
      this.cancel();
      this.activeId.set(null);
      this.storageError.set(null);
      return true;
    } catch {
      this.storageError.set('Не удалось удалить черновики.');
      return false;
    }
  }
  complete(id: string, orderId: number): boolean {
    return !!this.update(id, (draft) => {
      draft.orderId = orderId;
      draft.pendingText = '';
    });
  }
  removeUnfinished(): boolean {
    try {
      const completed = this.read().filter((draft) => !!draft.orderId);
      if (!this.write(completed, null)) return false;
      if (!completed.some((draft) => draft.id === this.activeId())) {
        this.cancel();
        this.activeId.set(null);
      }
      return true;
    } catch {
      this.storageError.set('Не удалось удалить черновики.');
      return false;
    }
  }
  manual(path: string, value: AiValue, id?: string): void {
    const draft = id ? this.drafts().find((d) => d.id === id) : this.active();
    if (!draft) return;
    this.update(draft.id, (d) => {
      const parts = path.split('.');
      if (parts[0] === 'header') d.order.header[parts[1]] = value;
      else {
        const item = d.order.items.find((i) => i.itemId === parts[1]);
        if (item) item.fields[parts[2]] = value;
      }
      d.fieldSources[path] = { text: 'Ручное исправление', manual: true };
      d.lastAppliedChange = undefined;
    });
  }
  addItem(type: string, id?: string): void {
    const draft = id ? this.drafts().find((d) => d.id === id) : this.active();
    if (draft && draft.order.items.length < 100 && AI_SCHEMA.items[type])
      this.update(draft.id, (d) => {
        d.lastAppliedChange = undefined;
        d.order.items.push({ itemId: crypto.randomUUID(), type, fields: {} });
      });
  }
  deleteItem(itemId: string, id?: string): void {
    const draft = id ? this.drafts().find((d) => d.id === id) : this.active();
    if (draft)
      this.update(draft.id, (d) => {
        d.lastAppliedChange = undefined;
        d.order.items = d.order.items.filter((i) => i.itemId !== itemId);
        for (const p of Object.keys(d.fieldSources)) if (p.startsWith(`items.${itemId}.`)) delete d.fieldSources[p];
      });
  }
  undo(): void {
    const draft = this.active();
    if (!draft?.lastAppliedChange || draft.editorState?.accepted || draft.orderId) return;
    this.update(draft.id, (d) => {
      d.order = d.lastAppliedChange!.order;
      d.fieldSources = d.lastAppliedChange!.fieldSources;
      d.lastAppliedChange = undefined;
      d.questions = [];
      d.changes = [];
      d.messages.push({
        role: 'assistant',
        text: 'Последнее изменение отменено.',
        createdAt: new Date().toISOString(),
      });
    });
  }
  send(): void {
    const draft = this.active();
    if (!draft || draft.editorState?.accepted || draft.orderId || this.busy()) return;
    const text = draft.pendingText.trim();
    if (!text || text.length > 10000) return;
    this.error.set(null);
    const saved = this.update(draft.id, (d) => {
      const last = d.messages.at(-1);
      if (last?.role !== 'user' || last.text !== text)
        d.messages.push({ role: 'user', text, createdAt: new Date().toISOString() });
    });
    if (!saved) return;
    const history = saved.messages.slice(0, -1);
    if (history.filter((m) => m.role === 'user').length >= 20) {
      this.error.set('Достигнут лимит уточнений. Продолжите в форме.');
      return;
    }
    const requestId = crypto.randomUUID();
    this.requestId = requestId;
    this.busy.set(true);
    this.subscription = this.http
      .post<AiParseResponse>(`${this.core.apiBaseUrl}/ai/order-drafts/parse`, {
        requestId,
        draftId: saved.id,
        baseRevision: saved.revision,
        schemaVersion: 1,
        mode: saved.messages.some((message) => message.role === 'assistant') ? 'refine' : 'initial',
        text,
        currentDraft: saved.order,
        fieldSources: saved.fieldSources,
        history: history.map((m) => ({ role: m.role, text: m.text })),
      })
      .subscribe({
        next: (response) => {
          if (this.requestId !== requestId) return;
          this.busy.set(false);
          this.requestId = null;
          const current = this.active();
          if (
            !current ||
            current.id !== saved.id ||
            current.revision !== saved.revision ||
            response.baseRevision !== saved.revision ||
            response.requestId !== requestId ||
            response.draftId !== saved.id ||
            response.schemaVersion !== 1
          ) {
            this.error.set('Черновик изменился во время запроса. Ответ не применён; отправьте уточнение ещё раз.');
            return;
          }
          const updated = this.update(saved.id, (d) => {
            d.lastAppliedChange = { order: structuredClone(d.order), fieldSources: structuredClone(d.fieldSources) };
            d.order = response.proposedDraft;
            d.questions = response.questions;
            d.changes = response.changes;
            d.pendingText = '';
            for (const c of response.changes) d.fieldSources[c.path] = { text: text.slice(0, 300), manual: false };
            d.messages.push({
              role: 'assistant',
              text: [
                d.messages.some((message) => message.role === 'assistant')
                  ? 'Черновик обновлён.'
                  : 'Черновик подготовлен.',
                ...response.questions.slice(0, 3),
              ].join('\n\n'),
              createdAt: new Date().toISOString(),
            });
          });
          if (updated && !this.opened()) this.unread.set(true);
        },
        error: (err: HttpErrorResponse) => {
          if (this.requestId !== requestId) return;
          this.busy.set(false);
          this.requestId = null;
          this.error.set(err.error?.message ?? 'Не удалось получить ответ. Текст сохранён; можно повторить.');
        },
      });
  }
  replaceOrder(id: string, order: AiOrder): void {
    this.update(id, (d) => {
      d.order = order;
    });
  }
}
