import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ServerDraftsService } from '../services/server-drafts.service';
import { emptyDraftDocument } from '../services/server-drafts.types';
import { AiDraft, AiOrder, AiValue, AI_SCHEMA, emptyAiOrder } from './ai-order.types';

@Injectable({ providedIn: 'root' })
export class AiOrdersService {
  readonly server = inject(ServerDraftsService);
  readonly drafts = computed<readonly AiDraft[]>(() =>
    this.server
      .rows()
      .filter((row) => row.kind === 'ai' && row.state !== 'archived')
      .map((row) => ({
        schemaVersion: 1,
        id: row.id,
        revision: row.localVersion ?? row.revision,
        orderId: row.orderId,
        targetOrderId: row.targetOrderId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        sourceText: row.document.sourceText,
        pendingText: row.document.pendingText,
        order: row.document.order ?? emptyAiOrder(),
        messages: row.messages,
        fieldSources: row.document.fieldSources,
        questions: row.document.questions,
        changes: row.document.changes,
        lastAppliedChange: row.document.lastAppliedChange,
        editorState: row.document.editorState,
      })),
  );
  readonly activeId = signal<string | null>(null);
  readonly openSelection = signal(0);
  readonly opened = signal(false);
  readonly busy = signal(false);
  readonly unread = signal(false);
  readonly error = signal<string | null>(null);
  readonly storageError = computed(
    () => this.server.loadError() || (this.activeId() ? this.server.errors()[this.activeId()!] : null) || null,
  );
  private requestToken: string | null = null;
  private selectionInitialized = false;

  active(): AiDraft | null {
    return this.drafts().find((d) => d.id === this.activeId()) ?? null;
  }
  reload(): void {
    void this.server.refresh().catch(() => undefined);
  }
  create(text: string): AiDraft | null {
    const row = this.server.create('ai', {
      ...emptyDraftDocument(),
      sourceText: text,
      pendingText: text,
      order: emptyAiOrder(),
    });
    this.activeId.set(row.id);
    this.selectionInitialized = true;
    return this.active();
  }
  update(id: string, mutate: (draft: AiDraft) => void): AiDraft | null {
    const before = this.drafts().find((d) => d.id === id);
    if (!before) return null;
    const next = structuredClone(before);
    mutate(next);
    const updated = this.server.update(id, (doc) => {
      doc.sourceText = next.sourceText;
      doc.pendingText = next.pendingText;
      doc.order = next.order;
      doc.fieldSources = next.fieldSources;
      doc.questions = next.questions;
      doc.changes = next.changes;
      doc.lastAppliedChange = next.lastAppliedChange;
      doc.editorState = next.editorState;
    });
    return updated ? (this.drafts().find((d) => d.id === id) ?? null) : null;
  }
  setText(text: string): boolean {
    const draft = this.active();
    if (!draft) return !text.trim() || !!this.create(text);
    if (draft.pendingText === text) return true;
    return !!this.update(draft.id, (d) => {
      d.pendingText = text;
      if (!d.messages.length) d.sourceText = text;
    });
  }
  open(id?: string): void {
    void this.server.initialize().catch(() => undefined);
    if (id) {
      if (this.activeId() !== id) this.cancel();
      this.activeId.set(id);
      this.openSelection.update((value) => value + 1);
    } else if (!this.activeId() && !this.selectionInitialized)
      this.activeId.set([...this.drafts()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id ?? null);
    this.selectionInitialized = true;
    this.opened.set(true);
    this.unread.set(false);
    this.error.set(null);
  }
  newChat(): void {
    this.cancel();
    this.selectionInitialized = true;
    this.activeId.set(null);
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
    this.requestToken = null;
    this.busy.set(false);
  }
  remove(id: string): boolean {
    void this.server.action(id, 'archive').catch(() => this.error.set('Не удалось отправить переписку в архив'));
    return true;
  }
  removeAll(): boolean {
    for (const draft of this.drafts()) this.remove(draft.id);
    return true;
  }
  removeUnfinished(): boolean {
    for (const draft of this.drafts()) if (!draft.orderId) this.remove(draft.id);
    return true;
  }
  complete(id: string, orderId: number): boolean {
    if (!Number.isSafeInteger(orderId) || orderId < 1) return false;
    void this.server.loadOne(id, orderId).catch(() => undefined);
    return true;
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
        for (const path of Object.keys(d.fieldSources))
          if (path.startsWith(`items.${itemId}.`)) delete d.fieldSources[path];
      });
  }
  undo(): void {
    const draft = this.active();
    if (!draft?.lastAppliedChange || draft.orderId) return;
    void this.server
      .action(draft.id, 'undo')
      .catch(() => this.error.set('Не удалось отменить изменение. Проверьте состояние черновика.'));
  }
  send(): void {
    const draft = this.active();
    if (!draft || draft.orderId || draft.editorState?.accepted || this.busy()) return;
    const text = draft.pendingText.trim();
    if (!text || text.length > 10000) return;
    this.error.set(null);
    this.busy.set(true);
    const token = crypto.randomUUID();
    this.requestToken = token;
    void this.server
      .send(draft.id, text)
      .then(() => {
        if (this.requestToken === token && !this.opened()) this.unread.set(true);
      })
      .catch((error: unknown) => {
        if (this.requestToken === token)
          this.error.set(
            error instanceof HttpErrorResponse
              ? error.error?.message || 'Не удалось получить ответ. Можно повторить.'
              : 'Сначала сохраните черновик и разрешите конфликт правок.',
          );
      })
      .finally(() => {
        if (this.requestToken === token) {
          this.busy.set(false);
          this.requestToken = null;
        }
      });
  }
  replaceOrder(id: string, order: AiOrder): void {
    this.update(id, (d) => {
      d.order = order;
    });
  }
}
