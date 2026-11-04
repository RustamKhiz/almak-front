import { TestBed } from '@angular/core/testing';
import { ServerDraftsService } from '../services/server-drafts.service';

// UI-only transport stub. The real queue, CAS, retry and import are covered by
// server-drafts.service.spec and PostgreSQL API integration tests.
export function stubDraftTransport(savedOrder?: jasmine.Spy): ServerDraftsService {
  const server = TestBed.inject(ServerDraftsService);
  spyOn(server, 'initialize').and.resolveTo();
  spyOn(server, 'refresh').and.resolveTo();
  spyOn(server, 'flush').and.callFake(async (id) => {
    server.dirty.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  });
  spyOn(server, 'reference').and.callFake((id) => ({ draftId: id, draftRevision: 1 }));
  spyOn(server, 'loadOne').and.callFake(async (id) => {
    if (savedOrder?.calls.count())
      server.records.update((all) => ({ ...all, [id]: { ...all[id], state: 'converted', orderId: 777 } }));
  });
  return server;
}
