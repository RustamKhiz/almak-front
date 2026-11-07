import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient, HttpRequest } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { ServerDraftsService } from './server-drafts.service';
import { DraftDocument, ServerDraft, emptyDraftDocument } from './server-drafts.types';
import { emptyAiOrder } from '../ai-orders/ai-order.types';
import { UserProfile } from './auth.types';

describe('Server draft persistence', () => {
  let server: ServerDraftsService;
  let http: HttpTestingController;
  const user: UserProfile = { id: 1, login: 'one', name: '', role: 'manager', permissions: [] };
  let profile: ReturnType<typeof signal<UserProfile | null>>;
  let saveBeforeClose: (() => Promise<boolean>) | undefined;
  const originalDesktop = window.almakDesktop;
  const key = 'ai_order_drafts_v1';
  const doc = (name = 'Client'): DraftDocument => ({
    ...emptyDraftDocument(),
    order: { ...emptyAiOrder(), header: { name } },
  });
  const saved = (id: string, document: DraftDocument, revision = 1): ServerDraft => ({
    id,
    kind: document.payload ? 'manual' : 'ai',
    document: structuredClone(document),
    revision,
    state: 'active',
    messages: [],
    createdBy: 1,
    updatedBy: 1,
    createdAt: '2026-11-03T09:00:00Z',
    updatedAt: '2026-11-03T09:00:00Z',
  });
  const url = (request: HttpRequest<unknown>) => request.url.includes('/order-drafts');
  beforeEach(async () => {
    window.almakDesktop = {
      platform: 'win32',
      version: 'test',
      getUpdateState: async () => ({ status: 'idle', revision: 0 }),
      checkForUpdates: async () => ({ status: 'idle', revision: 0 }),
      onUpdateState: () => () => undefined,
      installUpdate: () => undefined,
      onSaveBeforeClose: (callback) => {
        saveBeforeClose = callback;
        return () => undefined;
      },
    };
    localStorage.removeItem(key);
    localStorage.removeItem('order_drafts');
    localStorage.removeItem('draft_import_source_v1');
    profile = signal<UserProfile | null>(user);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { profile, authenticated: signal(true) } },
      ],
    });
    server = TestBed.inject(ServerDraftsService);
    http = TestBed.inject(HttpTestingController);
    TestBed.flushEffects();
    http.expectOne((r) => url(r) && r.method === 'GET').flush({ items: [], total: 0 });
    await server.initialize();
  });
  afterEach(() => {
    window.almakDesktop = originalDesktop;
    http.verify();
    localStorage.removeItem(key);
    localStorage.removeItem('order_drafts');
    localStorage.removeItem('draft_import_source_v1');
  });
  async function create() {
    const row = server.create('ai', doc());
    const promise = server.flush(row.id);
    const req = http.expectOne((r) => url(r) && r.method === 'POST');
    req.flush(saved(row.id, req.request.body.document));
    await promise;
    return row.id;
  }
  async function nextRequest(predicate: (r: HttpRequest<unknown>) => boolean): Promise<TestRequest> {
    for (let i = 0; i < 100; i++) {
      const requests = http.match(predicate);
      if (requests.length) {
        expect(requests.length).toBe(1);
        return requests[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    throw new Error('Expected request did not arrive');
  }

  it('uses server acknowledgement as the saved state and does not create a local draft copy', async () => {
    const row = server.create('ai', doc());
    expect(server.status(row.id)).toBe('Сохраняется…');
    const promise = server.flush(row.id);
    const req = http.expectOne((r) => url(r) && r.method === 'POST');
    expect(req.request.body.document.order.header.name).toBe('Client');
    expect(localStorage.getItem(key)).toBeNull();
    req.flush(saved(row.id, req.request.body.document));
    await promise;
    expect(server.status(row.id)).toBe('Сохранено на сервере');
    expect(server.reference(row.id).draftRevision).toBe(1);
  });
  it('queues newer typing behind a write using the acknowledged next revision', async () => {
    const id = await create();
    server.update(id, (d) => {
      d.order!.header['name'] = 'First';
    });
    const promise = server.flush(id);
    const first = http.expectOne((r) => url(r) && r.method === 'PUT');
    server.update(id, (d) => {
      d.order!.header['phone'] = '79000000000';
    });
    first.flush(saved(id, first.request.body.document, 2));
    const second = await nextRequest((r) => url(r) && r.method === 'PUT');
    expect(second.request.body.baseRevision).toBe(2);
    expect(second.request.body.document.order.header.phone).toBe('79000000000');
    second.flush(saved(id, second.request.body.document, 3));
    await promise;
    expect(server.records()[id].document.order!.header['phone']).toBe('79000000000');
    expect(server.dirty().size).toBe(0);
  });
  it('flushes an unsent multiline message before desktop close and restores it from the server', async () => {
    const id = await create();
    const text = 'Две двери 80 × 200\nПредоплата 10000';
    server.update(id, (d) => {
      d.pendingText = text;
    });
    let finished = false;
    const closing = saveBeforeClose!().then((result) => {
      finished = true;
      return result;
    });
    const request = http.expectOne((r) => url(r) && r.method === 'PUT');
    expect(finished).toBeFalse();
    expect(request.request.body.document.pendingText).toBe(text);
    const remote = saved(id, request.request.body.document, 2);
    request.flush(remote);
    expect(await closing).toBeTrue();
    profile.set(null);
    TestBed.flushEffects();
    profile.set(user);
    TestBed.flushEffects();
    http.expectOne((r) => url(r) && r.method === 'GET').flush({ items: [remote], total: 1 });
    await server.initialize();
    expect(server.records()[id].document.pendingText).toBe(text);
  });
  it('refuses desktop close if the latest text cannot be saved', async () => {
    const id = await create();
    server.update(id, (d) => {
      d.pendingText = 'Новое уточнение';
    });
    const closing = saveBeforeClose!();
    http.expectOne((r) => url(r) && r.method === 'PUT').flush({}, { status: 503, statusText: 'Offline' });
    expect(await closing).toBeFalse();
    expect(server.records()[id].document.pendingText).toBe('Новое уточнение');
    expect(server.dirty().has(id)).toBeTrue();
  });
  it('retries the same operation after an uncertain response before saving newer edits', async () => {
    const id = await create();
    server.update(id, (d) => {
      d.order!.header['name'] = 'Uncertain';
    });
    const first = server.flush(id);
    const rejection = expectAsync(first).toBeRejected();
    const request = http.expectOne((r) => url(r) && r.method === 'PUT');
    const body = request.request.body;
    request.flush({ message: 'network interrupted' }, { status: 503, statusText: 'Unavailable' });
    await rejection;
    server.update(id, (d) => {
      d.order!.header['name'] = 'Newer';
    });
    const retry = server.flush(id);
    const repeated = http.expectOne((r) => url(r) && r.method === 'PUT');
    expect(repeated.request.body.requestId).toBe(body.requestId);
    expect(repeated.request.body.document.order.header.name).toBe('Uncertain');
    repeated.flush(saved(id, body.document, 2));
    const next = await nextRequest((r) => url(r) && r.method === 'PUT');
    expect(next.request.body.baseRevision).toBe(2);
    expect(next.request.body.document.order.header.name).toBe('Newer');
    next.flush(saved(id, next.request.body.document, 3));
    await retry;
    expect(server.records()[id].document.order!.header['name']).toBe('Newer');
  });
  it('retains the local variant on conflict and never replaces it with polling', async () => {
    const id = await create();
    server.update(id, (d) => {
      d.order!.header['name'] = 'My edit';
    });
    const promise = server.flush(id);
    const rejection = expectAsync(promise).toBeRejected();
    const remote = saved(id, doc('Other manager'), 2);
    http
      .expectOne((r) => url(r) && r.method === 'PUT')
      .flush({ code: 'DRAFT_CONFLICT', current: remote }, { status: 409, statusText: 'Conflict' });
    await rejection;
    const refresh = server.refresh();
    http.expectOne((r) => url(r) && r.method === 'GET').flush({ items: [remote], total: 1 });
    await refresh;
    expect(server.records()[id].document.order!.header['name']).toBe('My edit');
    expect(server.conflicts()[id].document.order!.header['name']).toBe('Other manager');
    spyOn(window, 'confirm').and.returnValue(true);
    const reload = server.useServer(id);
    const request = await nextRequest((r) => url(r) && r.method === 'GET');
    request.flush(remote);
    await reload;
    expect(server.records()[id].document.order!.header['name']).toBe('Other manager');
    expect(server.dirty().size).toBe(0);
  });
  it('accepts its own order conversion without showing a false edit conflict', async () => {
    const id = await create();
    const release = server.hold(id);
    const converted: ServerDraft = { ...saved(id, doc(), 2), state: 'converted', orderId: 42 };
    const poll = server.refresh();
    http.expectOne((r) => url(r) && r.method === 'GET').flush({ items: [converted], total: 1 });
    await poll;
    expect(server.conflicts()[id]).toBeDefined();
    const acknowledge = server.loadOne(id, 42);
    (await nextRequest((r) => url(r) && r.method === 'GET')).flush(converted);
    await acknowledge;
    expect(server.conflicts()[id]).toBeUndefined();
    expect(server.dirty().has(id)).toBeFalse();
    expect(server.records()[id].orderId).toBe(42);
    release();
  });
  it('does not discard newer local edits when acknowledging conversion', async () => {
    const id = await create();
    server.update(id, (d) => {
      d.order!.header['name'] = 'Later edit';
    });
    const acknowledge = server.loadOne(id, 42);
    (await nextRequest((r) => url(r) && r.method === 'GET')).flush({
      ...saved(id, doc(), 2),
      state: 'converted',
      orderId: 42,
    });
    await acknowledge;
    expect(server.records()[id].document.order!.header['name']).toBe('Later edit');
    expect(server.dirty().has(id)).toBeTrue();
  });
  it('does not expose unsaved work to another account and restores it for the original account', async () => {
    const id = await create();
    server.update(id, (d) => {
      d.order!.header['name'] = 'Private pending edit';
    });
    const write = server.flush(id);
    const request = http.expectOne((r) => url(r) && r.method === 'PUT');
    profile.set(null);
    TestBed.flushEffects();
    expect(server.rows().length).toBe(0);
    profile.set({ ...user, id: 2, login: 'two' });
    TestBed.flushEffects();
    http.expectOne((r) => url(r) && r.method === 'GET').flush({ items: [], total: 0 });
    await server.initialize();
    expect(request.cancelled).toBeTrue();
    await write;
    expect(server.rows().length).toBe(0);
    profile.set(user);
    TestBed.flushEffects();
    http
      .expectOne((r) => url(r) && r.method === 'GET')
      .flush({ items: [saved(id, request.request.body.document, 2)], total: 1 });
    await server.initialize();
    expect(server.records()[id].document.order!.header['name']).toBe('Private pending edit');
    const retry = server.flush(id);
    const repeated = http.expectOne((r) => url(r) && r.method === 'PUT');
    expect(repeated.request.body.requestId).toBe(request.request.body.requestId);
    repeated.flush(saved(id, repeated.request.body.document, 2));
    await retry;
    expect(server.dirty().size).toBe(0);
  });
  it('imports both legacy formats while preserving newer editor payloads, history and local originals', async () => {
    const payload = {
      name: 'Manual newer edit',
      phone: '',
      date: '',
      prepayment: 0,
      discount: 0,
      needsDelivery: false,
      deliveryAddress: '',
      comment: '',
      status: 'accepted',
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
    };
    const legacy = [
      {
        id: crypto.randomUUID(),
        sourceText: 'old',
        pendingText: 'pending',
        order: doc('Older partial value').order,
        messages: [{ role: 'user', text: 'Old message', createdAt: '2026-10-01T10:00:00Z' }],
        editorState: { payload, accepted: true, defaultsConfirmed: true },
      },
    ];
    const raw = JSON.stringify(legacy);
    const manualRaw = JSON.stringify([{ temporaryId: 1, payload, updatedAt: '2026-10-01T10:00:00Z' }]);
    localStorage.setItem(key, raw);
    localStorage.setItem('order_drafts', manualRaw);
    const promise = server.importLegacy();
    const ai = await nextRequest((r) => r.url.endsWith('/import'));
    expect(ai.request.body.document.editorState.payload.name).toBe('Manual newer edit');
    expect(ai.request.body.messages[0].text).toBe('Old message');
    const first = { ...saved(ai.request.body.id, ai.request.body.document), messages: legacy[0].messages };
    ai.flush(first);
    const manual = await nextRequest((r) => r.url.endsWith('/import'));
    expect(manual.request.body.sourceKey).toContain('manual:');
    expect(manual.request.body.document.payload.name).toBe('Manual newer edit');
    const second = saved(manual.request.body.id, manual.request.body.document);
    manual.flush(second);
    const refresh = await nextRequest((r) => url(r) && r.method === 'GET');
    refresh.flush({ items: [first, second], total: 2 });
    await promise;
    expect(server.rows().length).toBe(2);
    expect(localStorage.getItem(key)).toBe(raw);
    expect(localStorage.getItem('order_drafts')).toBe(manualRaw);
  });
});
