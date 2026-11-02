import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AiOrdersService } from './ai-orders.service';

describe('AI local drafts', () => {
  let service: AiOrdersService;
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.removeItem('ai_order_drafts_v1');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AiOrdersService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.removeItem('ai_order_drafts_v1');
  });
  it('saves text before any request and updates one draft', () => {
    service.setText('Три двери');
    service.setText('Три белые двери');
    expect(service.drafts().length).toBe(1);
    expect(JSON.parse(localStorage.getItem('ai_order_drafts_v1')!)[0].pendingText).toBe('Три белые двери');
    http.expectNone((r) => r.url.includes('/ai/'));
  });
  it('keeps pending text and previous order on a provider error', () => {
    service.setText('Три двери');
    service.send();
    http
      .expectOne((r) => r.url.endsWith('/ai/order-drafts/parse'))
      .flush({ message: 'Не подключён' }, { status: 503, statusText: 'Unavailable' });
    expect(service.active()!.pendingText).toBe('Три двери');
    expect(service.drafts().length).toBe(1);
    expect(service.busy()).toBeFalse();
  });
  it('does not apply an outdated reply over manual changes', () => {
    service.setText('Три двери');
    service.send();
    const request = http.expectOne((r) => r.url.endsWith('/ai/order-drafts/parse'));
    service.manual('header.name', 'Вручную');
    request.flush({
      requestId: request.request.body.requestId,
      draftId: request.request.body.draftId,
      baseRevision: request.request.body.baseRevision,
      schemaVersion: 1,
      proposedDraft: { header: { name: 'Модель' }, items: [], notes: [] },
      questions: [],
      changes: [],
      issues: [],
    });
    expect(service.active()!.order.header['name']).toBe('Вручную');
    expect(service.error()).toContain('не применён');
  });
  it('detects another tab revision without replacing local text', () => {
    service.setText('Мой текст');
    const stored = JSON.parse(localStorage.getItem('ai_order_drafts_v1')!);
    stored[0].revision++;
    localStorage.setItem('ai_order_drafts_v1', JSON.stringify(stored));
    expect(service.setText('Моё уточнение')).toBeFalse();
    expect(service.storageError()).toContain('другой вкладке');
    expect(service.active()!.pendingText).toBe('Мой текст');
  });
  it('reports a storage failure without creating a false saved draft', () => {
    spyOn(Storage.prototype, 'setItem').and.throwError('quota');
    expect(service.setText('Текст')).toBeFalse();
    expect(service.drafts().length).toBe(0);
    expect(service.storageError()).toBeTruthy();
  });
  it('ignores a late response after logout and cancels the request', () => {
    service.setText('Текст');
    service.send();
    const request = http.expectOne((r) => r.url.endsWith('/ai/order-drafts/parse'));
    service.hideForLogout();
    expect(request.cancelled).toBeTrue();
    expect(service.busy()).toBeFalse();
    expect(service.drafts().length).toBe(1);
  });
});
