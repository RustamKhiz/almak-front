import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, DestroyRef, NgZone, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom, Observable, Subject, takeUntil } from 'rxjs';
import { AuthService } from './auth.service';
import { CoreService } from './core.service';
import { DraftDocument, ServerDraft } from './server-drafts.types';

interface WriteOperation {
  serial: number;
  requestId: string;
  document: DraftDocument;
  revision: number;
  create: boolean;
}

@Injectable({ providedIn: 'root' })
export class ServerDraftsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly url = `${inject(CoreService).apiBaseUrl}/order-drafts`;
  private readonly ordersUrl = `${inject(CoreService).apiBaseUrl}/orders`;
  readonly orderEditApplied = new Subject<number>();
  readonly records = signal<Record<string, ServerDraft>>({});
  readonly rows = computed(() => Object.values(this.records()));
  readonly listedIds = signal<string[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly total = signal(0);
  readonly archivedIds = signal<string[]>([]);
  readonly archivedTotal = signal(0);
  readonly archiveLoading = signal(false);
  readonly dirty = signal<ReadonlySet<string>>(new Set());
  readonly errors = signal<Record<string, string>>({});
  readonly conflicts = signal<Record<string, ServerDraft>>({});
  readonly loadError = signal<string | null>(null);
  readonly legacyCount = signal(0);
  readonly importing = signal(false);
  readonly importMessage = signal('');
  private confirmed = new Map<string, ServerDraft>();
  private operations = new Map<string, WriteOperation>();
  private chains = new Map<string, Promise<void>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private sending = new Map<string, { text: string; id: string }>();
  private scopeChanged = new Subject<void>();
  private epoch = 0;
  private userId: number | null = null;
  private initial: Promise<void> | null = null;
  private pages = 1;
  private holds = new Map<string, number>();
  private modals = new Map<string, number>();
  private activeSends = new Set<string>();
  private copies = new Map<string, { serial: number | undefined; id: string }>();
  private copying = new Map<string, Promise<string>>();
  private recoveries = new Map<
    number,
    {
      records: Record<string, ServerDraft>;
      confirmed: Map<string, ServerDraft>;
      operations: Map<string, WriteOperation>;
      dirty: ReadonlySet<string>;
      errors: Record<string, string>;
      conflicts: Record<string, ServerDraft>;
    }
  >();

  constructor() {
    const stopCloseListener = window.almakDesktop?.onSaveBeforeClose?.(async () => {
      try {
        await this.flushAll();
        return this.dirty().size === 0 && this.recoveries.size === 0;
      } catch {
        return false;
      }
    });
    this.destroyRef.onDestroy(() => stopCloseListener?.());
    effect(() => {
      const id = this.auth.profile()?.id ?? null;
      untracked(() => {
        if (id !== this.userId) this.reset(id);
        if (id) void this.initialize().catch(() => undefined);
      });
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (this.dirty().size || this.recoveries.size) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const onFocus = () => {
      if (this.loaded()) void this.refresh().catch(() => undefined);
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('focus', onFocus);
    const interval = this.zone.runOutsideAngular(() =>
      setInterval(() => {
        if (this.loaded() && !document.hidden) void this.refresh().catch(() => undefined);
      }, 15000),
    );
    this.destroyRef.onDestroy(() => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('focus', onFocus);
      for (const timer of this.timers.values()) clearTimeout(timer);
    });
  }
  private request<T>(request: Observable<T>): Promise<T> {
    return firstValueFrom(request.pipe(takeUntil(this.scopeChanged)));
  }
  private reset(id: number | null): void {
    if (this.userId && this.dirty().size)
      this.recoveries.set(this.userId, {
        records: structuredClone(this.records()),
        confirmed: new Map(this.confirmed),
        operations: new Map(this.operations),
        dirty: new Set(this.dirty()),
        errors: { ...this.errors() },
        conflicts: { ...this.conflicts() },
      });
    this.epoch++;
    this.scopeChanged.next();
    this.userId = id;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.operations.clear();
    this.chains.clear();
    this.confirmed.clear();
    this.sending.clear();
    this.activeSends.clear();
    this.copies.clear();
    this.copying.clear();
    this.records.set({});
    this.listedIds.set([]);
    this.archivedIds.set([]);
    this.archivedTotal.set(0);
    this.archiveLoading.set(false);
    this.dirty.set(new Set());
    this.errors.set({});
    this.conflicts.set({});
    this.loaded.set(false);
    this.loading.set(false);
    this.loadError.set(null);
    this.initial = null;
    this.pages = 1;
    this.legacyCount.set(0);
    this.importMessage.set('');
    this.importing.set(false);
    const recovery = id ? this.recoveries.get(id) : undefined;
    if (recovery) {
      this.records.set(recovery.records);
      this.confirmed = recovery.confirmed;
      this.operations = recovery.operations;
      this.dirty.set(recovery.dirty);
      this.errors.set(recovery.errors);
      this.conflicts.set(recovery.conflicts);
      this.recoveries.delete(id!);
    }
  }
  async initialize(): Promise<void> {
    if (!this.auth.authenticated()) return;
    if (!this.auth.profile()) await this.request(this.auth.loadProfile());
    const id = this.auth.profile()?.id;
    if (!id) throw new Error('Не удалось определить пользователя');
    if (this.userId !== id) this.reset(id);
    if (this.loaded()) return;
    if (!this.initial) {
      const epoch = this.epoch;
      this.initial = this.refresh()
        .then(() => {
          if (epoch === this.epoch) this.countLegacy();
        })
        .finally(() => {
          if (epoch === this.epoch) this.initial = null;
        });
    }
    return this.initial;
  }
  private normalize(row: ServerDraft): ServerDraft {
    row.messages ??= [];
    row.document.fieldSources ??= {};
    row.document.questions ??= [];
    row.document.changes ??= [];
    row.document.pendingText ??= '';
    row.document.sourceText ??= '';
    return row;
  }
  private setRecord(row: ServerDraft): void {
    this.records.update((all) => ({ ...all, [row.id]: row }));
  }
  hold(id: string, modal = false): () => void {
    const counter = modal ? this.modals : this.holds;
    counter.set(id, (counter.get(id) ?? 0) + 1);
    return () => {
      const count = (counter.get(id) ?? 1) - 1;
      if (count <= 0) counter.delete(id);
      else counter.set(id, count);
    };
  }
  private adopt(row: ServerDraft, force = false): void {
    this.normalize(row);
    const local = this.records()[row.id];
    if (this.dirty().has(row.id)) return;
    const previous = this.confirmed.get(row.id);
    if (!force && this.activeSends.has(row.id)) return;
    if (
      !force &&
      previous &&
      this.holds.has(row.id) &&
      (previous.revision !== row.revision || previous.state !== row.state)
    ) {
      this.conflict(row.id, row);
      return;
    }
    if (
      previous &&
      previous.revision === row.revision &&
      previous.state === row.state &&
      JSON.stringify(previous.messages) === JSON.stringify(row.messages)
    )
      return;
    this.confirmed.set(row.id, structuredClone(row));
    this.setRecord({ ...row, localVersion: (local?.localVersion ?? 0) + 1 });
  }
  async refresh(): Promise<void> {
    if (this.loading() || !this.auth.authenticated()) return;
    const epoch = this.epoch;
    this.loading.set(true);
    try {
      const ids: string[] = [];
      let total = 0;
      for (let page = 0; page < this.pages; page++) {
        const result = await this.request(
          this.http.get<{ items: ServerDraft[]; total: number }>(this.url, {
            params: { limit: 100, offset: page * 100 },
          }),
        );
        if (epoch !== this.epoch) return;
        total = result.total;
        for (const row of result.items) {
          this.adopt(row);
          ids.push(row.id);
        }
        if (ids.length >= total) break;
      }
      this.listedIds.set(ids);
      this.total.set(total);
      if (ids.length >= total) {
        this.records.update((all) =>
          Object.fromEntries(
            Object.entries(all).map(([id, row]) => [
              id,
              !ids.includes(id) && !this.dirty().has(id) && !this.holds.has(id)
                ? { ...row, state: 'archived' as const }
                : row,
            ]),
          ),
        );
      }
      if (ids.length >= total)
        for (const id of this.holds.keys()) {
          if (!ids.includes(id) && !this.dirty().has(id) && this.confirmed.has(id)) {
            void this.request(this.http.get<ServerDraft>(`${this.url}/${id}`))
              .then((row) => {
                if (epoch === this.epoch) this.adopt(row);
              })
              .catch(() => undefined);
          }
        }
      this.loaded.set(true);
      this.loadError.set(null);
    } catch (error) {
      if (epoch === this.epoch) this.loadError.set('Не удалось загрузить черновики. Повторите попытку.');
      throw error;
    } finally {
      if (epoch === this.epoch) this.loading.set(false);
    }
  }
  async loadMore(): Promise<void> {
    this.pages++;
    await this.refresh();
  }
  async loadArchive(more = false): Promise<void> {
    if (this.archiveLoading()) return;
    const epoch = this.epoch;
    this.archiveLoading.set(true);
    try {
      const result = await this.request(
        this.http.get<{ items: ServerDraft[]; total: number }>(this.url, {
          params: { archived: true, limit: 100, offset: more ? this.archivedIds().length : 0 },
        }),
      );
      if (epoch !== this.epoch) return;
      for (const row of result.items) this.adopt(row);
      this.archivedIds.set([...new Set([...(more ? this.archivedIds() : []), ...result.items.map((row) => row.id)])]);
      this.archivedTotal.set(result.total);
    } finally {
      if (epoch === this.epoch) this.archiveLoading.set(false);
    }
  }
  async startOrderEdit(orderId: number): Promise<string> {
    await this.initialize();
    const epoch = this.epoch;
    const row = await this.request(
      this.http.post<ServerDraft>(`${this.ordersUrl}/${orderId}/ai-edit`, { id: crypto.randomUUID() }),
    );
    if (epoch !== this.epoch) throw new Error('Account changed');
    this.adopt(row);
    return row.id;
  }

  async applyOrderEdit(id: string, reviewedChanges: DraftDocument['changes']): Promise<void> {
    const epoch = this.epoch;
    await this.flush(id);
    const row = this.records()[id];
    if (
      epoch !== this.epoch ||
      !row?.targetOrderId ||
      JSON.stringify(row.document.changes) !== JSON.stringify(reviewedChanges)
    ) {
      throw new Error('Preview changed');
    }
    const result = await this.request(
      this.http.post<ServerDraft>(`${this.url}/${id}/apply`, {
        baseRevision: this.reference(id).draftRevision,
      }),
    );
    if (epoch !== this.epoch) return;
    this.adopt(result, true);
    this.orderEditApplied.next(row.targetOrderId);
  }

  async repeatOrder(
    orderId: number,
    request: { requestId: string; copyComment: boolean; copyDiscount: boolean },
  ): Promise<string> {
    const epoch = this.epoch;
    const row = await this.request(this.http.post<ServerDraft>(`${this.ordersUrl}/${orderId}/repeat`, request));
    if (epoch !== this.epoch) throw new Error('Account changed');
    this.adopt(row);
    return row.id;
  }

  async loadOne(id: string, convertedOrderId?: number): Promise<void> {
    await this.initialize();
    const epoch = this.epoch;
    const row = await this.request(this.http.get<ServerDraft>(`${this.url}/${id}`));
    if (epoch === this.epoch) {
      const ownConversion =
        convertedOrderId &&
        row.orderId === convertedOrderId &&
        JSON.stringify(this.records()[id]?.document) === JSON.stringify(this.confirmed.get(id)?.document);
      if (ownConversion) {
        this.dirty.update((set) => {
          const next = new Set(set);
          next.delete(id);
          return next;
        });
        this.errors.update((all) => {
          const next = { ...all };
          delete next[id];
          return next;
        });
        this.conflicts.update((all) => {
          const next = { ...all };
          delete next[id];
          return next;
        });
      }
      this.adopt(row, !!ownConversion);
    }
  }
  create(kind: ServerDraft['kind'], document: DraftDocument, id = crypto.randomUUID()): ServerDraft {
    const now = new Date().toISOString();
    const row: ServerDraft = {
      id,
      kind,
      revision: 0,
      state: 'active',
      document: structuredClone(document),
      messages: [],
      createdBy: this.userId,
      updatedBy: this.userId ?? 0,
      createdAt: now,
      updatedAt: now,
      localVersion: 1,
    };
    this.setRecord(row);
    this.markDirty(id);
    return row;
  }
  update(id: string, mutate: (document: DraftDocument) => void): ServerDraft | null {
    const before = this.records()[id];
    if (!before || before.state !== 'active') return null;
    const row = structuredClone(before);
    mutate(row.document);
    if (JSON.stringify(before.document) === JSON.stringify(row.document)) return before;
    row.localVersion = (before.localVersion ?? 0) + 1;
    row.updatedAt = new Date().toISOString();
    this.setRecord(row);
    this.markDirty(id);
    return row;
  }
  private markDirty(id: string): void {
    this.dirty.update((set) => new Set([...set, id]));
    clearTimeout(this.timers.get(id));
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        void this.flush(id).catch(() => undefined);
      }, 350),
    );
  }
  conflict(id: string, current: ServerDraft): void {
    this.conflicts.update((all) => ({ ...all, [id]: this.normalize(current) }));
    this.dirty.update((set) => new Set([...set, id]));
    this.errors.update((all) => ({
      ...all,
      [id]: 'Черновик изменён другим пользователем. Ваш вариант остаётся в этом окне.',
    }));
  }
  flush(id: string): Promise<void> {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    const running = this.chains.get(id);
    if (running) return running;
    const epoch = this.epoch;
    const work = (async () => {
      while (this.dirty().has(id)) {
        if (this.conflicts()[id]) throw new Error('Сначала разрешите конфликт черновика');
        const row = this.records()[id];
        if (!row) throw new Error('Черновик не найден');
        let operation = this.operations.get(id);
        if (!operation) {
          operation = {
            serial: row.localVersion ?? 0,
            requestId: crypto.randomUUID(),
            document: structuredClone(row.document),
            revision: this.confirmed.get(id)?.revision ?? 0,
            create: !this.confirmed.has(id),
          };
          this.operations.set(id, operation);
        }
        try {
          const body = {
            id,
            kind: row.kind,
            baseRevision: operation.revision,
            requestId: operation.requestId,
            document: operation.document,
          };
          const saved = this.normalize(
            await this.request(
              operation.create
                ? this.http.post<ServerDraft>(this.url, body)
                : this.http.put<ServerDraft>(`${this.url}/${id}`, body),
            ),
          );
          if (epoch !== this.epoch) return;
          this.confirmed.set(id, structuredClone(saved));
          this.operations.delete(id);
          const latest = this.records()[id];
          if (latest.localVersion === operation.serial) {
            this.dirty.update((set) => {
              const next = new Set(set);
              next.delete(id);
              return next;
            });
            this.setRecord({ ...saved, localVersion: latest.localVersion });
          } else {
            this.setRecord({ ...saved, document: latest.document, localVersion: latest.localVersion });
          }
          this.errors.update((all) => {
            const next = { ...all };
            delete next[id];
            return next;
          });
          if (!this.listedIds().includes(id)) this.listedIds.update((ids) => [id, ...ids]);
        } catch (error) {
          if (epoch !== this.epoch) return;
          if (error instanceof HttpErrorResponse && error.status === 409 && error.error?.current?.id)
            this.conflict(id, error.error.current);
          else
            this.errors.update((all) => ({
              ...all,
              [id]: 'Изменения ещё не сохранены на сервере. Проверьте соединение и повторите.',
            }));
          throw error;
        }
      }
    })();
    this.chains.set(id, work);
    void work
      .finally(() => {
        if (this.chains.get(id) === work) this.chains.delete(id);
      })
      .catch(() => undefined);
    return work;
  }
  async flushAll(): Promise<void> {
    await Promise.all([...this.dirty()].map((id) => this.flush(id)));
  }
  status(id: string): string {
    if (this.errors()[id]) return this.errors()[id];
    return this.dirty().has(id) ? 'Сохраняется…' : 'Сохранено на сервере';
  }
  reference(id: string): { draftId: string; draftRevision: number } {
    const row = this.confirmed.get(id);
    if (!row || this.dirty().has(id)) throw new Error('Сначала сохраните черновик на сервере');
    return { draftId: id, draftRevision: row.revision };
  }
  async action(id: string, action: 'archive' | 'restore' | 'undo'): Promise<void> {
    await this.flush(id);
    const epoch = this.epoch;
    const serial = this.records()[id]?.localVersion;
    try {
      const row = await this.request(
        this.http.post<ServerDraft>(`${this.url}/${id}/${action}`, {
          baseRevision: this.confirmed.get(id)?.revision,
          requestId: crypto.randomUUID(),
        }),
      );
      if (epoch === this.epoch) {
        if (this.dirty().has(id) || this.records()[id]?.localVersion !== serial) this.conflict(id, row);
        else this.adopt(row, true);
      }
    } catch (error) {
      if (epoch === this.epoch && error instanceof HttpErrorResponse && error.error?.current?.id)
        this.conflict(id, error.error.current);
      throw error;
    }
  }
  async send(id: string, text: string): Promise<void> {
    await this.flush(id);
    const epoch = this.epoch;
    const row = this.records()[id];
    let request = this.sending.get(id);
    if (!request || request.text !== text) {
      request = { text, id: crypto.randomUUID() };
      this.sending.set(id, request);
    }
    const serial = row.localVersion;
    this.activeSends.add(id);
    if (row.messages.at(-1)?.role !== 'user' || row.messages.at(-1)?.text !== text)
      this.setRecord({
        ...row,
        messages: [...row.messages, { role: 'user', text, createdAt: new Date().toISOString() }],
      });
    try {
      const result = await this.request(
        this.http.post<ServerDraft>(`${this.url}/${id}/messages`, {
          text,
          baseRevision: this.confirmed.get(id)?.revision,
          requestId: request.id,
        }),
      );
      if (epoch !== this.epoch) return;
      this.sending.delete(id);
      if (this.records()[id]?.localVersion !== serial || this.dirty().has(id) || this.modals.has(id))
        this.conflict(id, result);
      else this.adopt(result, true);
    } catch (error) {
      if (epoch !== this.epoch) return;
      if (error instanceof HttpErrorResponse && error.error?.current?.id) this.conflict(id, error.error.current);
      // Fetching history after a provider failure must not erase pending local input.
      this.activeSends.delete(id);
      if (!this.dirty().has(id)) await this.loadOne(id).catch(() => undefined);
      throw error;
    } finally {
      if (epoch === this.epoch) this.activeSends.delete(id);
    }
  }
  async useServer(id: string): Promise<void> {
    if (
      !window.confirm(
        'Загрузить серверную версию вместо несохранённых правок? Сначала можно сохранить свой вариант отдельной копией.',
      )
    )
      return;
    const current = this.conflicts()[id];
    if (!current) return;
    clearTimeout(this.timers.get(id));
    this.operations.delete(id);
    this.dirty.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
    this.conflicts.update((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });
    this.errors.update((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });
    this.adopt(current, true);
    await this.loadOne(id);
  }
  copyConflict(id: string): Promise<string> {
    const running = this.copying.get(id);
    if (running) return running;
    const work = this.saveConflictCopy(id);
    this.copying.set(id, work);
    void work
      .finally(() => {
        if (this.copying.get(id) === work) this.copying.delete(id);
      })
      .catch(() => undefined);
    return work;
  }
  private async saveConflictCopy(id: string): Promise<string> {
    const row = this.records()[id];
    if (!row || this.conflicts()[id]?.orderId) throw new Error('Заказ уже создан; откройте его по ссылке');
    const epoch = this.epoch;
    const serial = row.localVersion;
    const previous = this.copies.get(id);
    const copy =
      previous?.serial === serial && this.records()[previous.id]
        ? this.records()[previous.id]
        : this.create(row.kind, row.document);
    this.copies.set(id, { serial, id: copy.id });
    await this.flush(copy.id);
    if (epoch !== this.epoch) throw new Error('Аккаунт изменён');
    if (this.records()[id]?.localVersion !== serial) return copy.id;
    this.dirty.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
    this.operations.delete(id);
    this.errors.update((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });
    const current = this.conflicts()[id];
    this.conflicts.update((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });
    if (current) this.adopt(current, true);
    return copy.id;
  }
  private countLegacy(): void {
    try {
      const ai = JSON.parse(localStorage.getItem('ai_order_drafts_v1') ?? '[]');
      const manual = JSON.parse(localStorage.getItem('order_drafts') ?? '[]');
      this.legacyCount.set((Array.isArray(ai) ? ai.length : 0) + (Array.isArray(manual) ? manual.length : 0));
    } catch {
      this.importMessage.set('Не удалось прочитать прежние черновики. Исходные данные не удалены.');
    }
  }
  async importLegacy(): Promise<void> {
    const epoch = this.epoch;
    this.importing.set(true);
    this.importMessage.set('');
    let succeeded = 0;
    const failed: string[] = [];
    try {
      let source = localStorage.getItem('draft_import_source_v1');
      if (!source) {
        source = crypto.randomUUID();
        localStorage.setItem('draft_import_source_v1', source);
      }
      const groups = [
        ['ai', JSON.parse(localStorage.getItem('ai_order_drafts_v1') ?? '[]')],
        ['manual', JSON.parse(localStorage.getItem('order_drafts') ?? '[]')],
      ] as const;
      for (const [kind, entries] of groups) {
        if (!Array.isArray(entries)) throw new Error('Некорректный список');
        for (const entry of entries) {
          if (epoch !== this.epoch) return;
          const legacyId = kind === 'ai' ? entry.id : entry.temporaryId;
          const key = kind === 'ai' ? `ai:${legacyId}` : `manual:${source}:${legacyId}`;
          try {
            if (legacyId == null) throw new Error('Нет идентификатора');
            const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)))]
              .map((n) => n.toString(16).padStart(2, '0'))
              .join('');
            const id =
              kind === 'ai' && /^[0-9a-f-]{36}$/i.test(String(legacyId))
                ? String(legacyId)
                : `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
            const document: DraftDocument =
              kind === 'ai'
                ? {
                    sourceText: entry.sourceText ?? '',
                    pendingText: entry.pendingText ?? '',
                    order: entry.order,
                    fieldSources: entry.fieldSources ?? {},
                    questions: entry.questions ?? [],
                    changes: entry.changes ?? [],
                    lastAppliedChange: entry.lastAppliedChange,
                    editorState: entry.editorState,
                  }
                : {
                    sourceText: '',
                    pendingText: '',
                    payload: entry.payload,
                    fieldSources: {},
                    questions: [],
                    changes: [],
                  };
            if (epoch !== this.epoch) return;
            const result = await this.request(
              this.http.post<ServerDraft>(`${this.url}/import`, {
                id,
                kind,
                sourceKey: key,
                document,
                messages: entry.messages ?? [],
                orderId: entry.orderId,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
              }),
            );
            if (epoch !== this.epoch) return;
            this.adopt(result);
            succeeded++;
          } catch {
            if (epoch !== this.epoch) return;
            failed.push(String(legacyId ?? 'без номера'));
          }
        }
      }
      this.importMessage.set(
        `Перенесено или уже было перенесено: ${succeeded}.${failed.length ? ' Не перенесено: ' + failed.length + '. Исходные записи сохранены; можно повторить перенос.' : ' Исходные записи на этом устройстве сохранены.'}`,
      );
      await this.refresh();
    } catch {
      if (epoch !== this.epoch) return;
      this.importMessage.set('Перенос не завершён. Исходные данные сохранены, можно повторить попытку.');
    } finally {
      if (epoch === this.epoch) this.importing.set(false);
    }
  }
}
