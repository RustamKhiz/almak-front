import { Injectable } from '@angular/core';
import { OrderCreatePayload } from '../types/order.types';

export interface OrderDraft {
  temporaryId: number;
  updatedAt: string;
  payload: OrderCreatePayload;
}

@Injectable({
  providedIn: 'root',
})
export class OrderDraftsService {
  private readonly draftsKey = 'order_drafts';
  private readonly nextIdKey = 'order_drafts_next_id';

  getDrafts(): readonly OrderDraft[] {
    return this.readDrafts().sort((a, b) => this.getTimestamp(b.updatedAt) - this.getTimestamp(a.updatedAt));
  }

  getDraft(temporaryId: number): OrderDraft | null {
    return this.readDrafts().find((draft) => draft.temporaryId === temporaryId) ?? null;
  }

  saveDraft(payload: OrderCreatePayload, temporaryId?: number | null): OrderDraft {
    const drafts = this.readDrafts();
    const nextTemporaryId = temporaryId ?? this.getNextTemporaryId();
    const draft: OrderDraft = {
      temporaryId: nextTemporaryId,
      updatedAt: new Date().toISOString(),
      payload,
    };
    const index = drafts.findIndex((item) => item.temporaryId === nextTemporaryId);
    if (index >= 0) {
      drafts[index] = draft;
    } else {
      drafts.push(draft);
    }
    this.writeDrafts(drafts);
    return draft;
  }

  deleteDraft(temporaryId: number): void {
    this.writeDrafts(this.readDrafts().filter((draft) => draft.temporaryId !== temporaryId));
  }

  deleteAllDrafts(): void {
    localStorage.removeItem(this.draftsKey);
    localStorage.removeItem(this.nextIdKey);
  }

  private readDrafts(): OrderDraft[] {
    const rawValue = localStorage.getItem(this.draftsKey);
    if (!rawValue) {
      return [];
    }

    try {
      const value = JSON.parse(rawValue) as OrderDraft[];
      return Array.isArray(value) ? value.filter((draft) => Number.isFinite(draft.temporaryId) && !!draft.payload) : [];
    } catch {
      return [];
    }
  }

  private writeDrafts(drafts: readonly OrderDraft[]): void {
    localStorage.setItem(this.draftsKey, JSON.stringify(drafts));
  }

  private getNextTemporaryId(): number {
    const currentId = Number(localStorage.getItem(this.nextIdKey) ?? 0);
    const nextId = Number.isFinite(currentId) && currentId > 0 ? currentId : 1;
    localStorage.setItem(this.nextIdKey, String(nextId + 1));
    return nextId;
  }

  private getTimestamp(value: string): number {
    return value ? new Date(value).getTime() : 0;
  }
}
