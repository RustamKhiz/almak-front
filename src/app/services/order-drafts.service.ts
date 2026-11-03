import { Injectable, computed, inject } from '@angular/core';
import { OrderCreatePayload } from '../types/order.types';
import { ServerDraftsService } from './server-drafts.service';
import { emptyDraftDocument } from './server-drafts.types';

export interface OrderDraft {
  temporaryId: string;
  updatedAt: string;
  payload: OrderCreatePayload;
}
@Injectable({ providedIn: 'root' })
export class OrderDraftsService {
  readonly server = inject(ServerDraftsService);
  readonly drafts = computed<readonly OrderDraft[]>(() =>
    this.server
      .rows()
      .filter((row) => row.kind === 'manual' && row.state === 'active' && row.document.payload)
      .map((row) => ({ temporaryId: row.id, updatedAt: row.updatedAt, payload: row.document.payload! })),
  );
  getDrafts(): readonly OrderDraft[] {
    return this.drafts();
  }
  getDraft(id: string): OrderDraft | null {
    return this.drafts().find((d) => d.temporaryId === id) ?? null;
  }
  saveDraft(payload: OrderCreatePayload, id?: string | null): OrderDraft {
    if (id) {
      if (
        !this.server.update(id, (doc) => {
          doc.payload = payload;
        })
      )
        throw new Error('Черновик уже закрыт или не найден');
    } else id = this.server.create('manual', { ...emptyDraftDocument(), payload }).id;
    const row = this.server.records()[id];
    return { temporaryId: id, updatedAt: row.updatedAt, payload };
  }
  deleteDraft(id: string): void {
    void this.server.action(id, 'archive').catch(() => undefined);
  }
  deleteAllDrafts(): void {
    for (const draft of this.drafts()) this.deleteDraft(draft.temporaryId);
  }
}
