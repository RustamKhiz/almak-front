import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../services/auth.service';
import { ServerDraftsService } from '../services/server-drafts.service';
import { stubDraftTransport } from '../testing/server-drafts.stub.spec';
import { AiOrdersService } from './ai-orders.service';

describe('Server-backed AI conversations', () => {
  let service: AiOrdersService;
  let server: ServerDraftsService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { authenticated: signal(true), profile: signal(null) } },
      ],
    });
    server = stubDraftTransport();
    service = TestBed.inject(AiOrdersService);
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('edits one shared document without writing another local draft copy', () => {
    const before = localStorage.getItem('ai_order_drafts_v1');
    service.setText('Первое');
    const id = service.activeId();
    service.setText('Второе');
    expect(service.drafts().length).toBe(1);
    expect(service.activeId()).toBe(id);
    expect(server.records()[id!].document.pendingText).toBe('Второе');
    service.manual('header.name', 'Клиент');
    expect(server.records()[id!].document.order!.header['name']).toBe('Клиент');
    expect(server.records()[id!].document.fieldSources['header.name'].manual).toBeTrue();
    expect(localStorage.getItem('ai_order_drafts_v1')).toBe(before);
  });
  it('keeps text and partial products when the server/provider cannot finish', async () => {
    spyOn(server, 'send').and.rejectWith(new Error('offline'));
    service.setText('Три двери');
    service.manual('header.name', 'Клиент');
    service.send();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(service.active()!.pendingText).toBe('Три двери');
    expect(service.active()!.order.header['name']).toBe('Клиент');
    expect(service.error()).toBeTruthy();
  });
  it('does not create a blank record just for opening a new chat', () => {
    service.newChat();
    service.setText('');
    service.opened.set(false);
    service.open();
    expect(service.drafts().length).toBe(0);
  });
});
