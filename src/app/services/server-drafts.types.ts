import { AiDraft, AiMessage, AiOrder, AiSource, AiChange } from '../ai-orders/ai-order.types';
import { OrderCreatePayload } from '../types/order.types';

export interface DraftDocument {
  sourceText: string;
  pendingText: string;
  order?: AiOrder;
  payload?: OrderCreatePayload;
  fieldSources: Record<string, AiSource>;
  questions: string[];
  changes: AiChange[];
  lastAppliedChange?: AiDraft['lastAppliedChange'];
  editorState?: AiDraft['editorState'];
}
export interface ServerDraft {
  id: string;
  kind: 'ai' | 'manual';
  revision: number;
  state: 'active' | 'converted' | 'archived';
  document: DraftDocument;
  messages: AiMessage[];
  createdBy: number | null;
  updatedBy: number;
  importedBy?: number;
  creator?: { id: number; login: string; name: string };
  editor?: { id: number; login: string; name: string };
  orderId?: number;
  createdAt: string;
  updatedAt: string;
  localVersion?: number;
}
export const emptyDraftDocument = (): DraftDocument => ({
  sourceText: '',
  pendingText: '',
  fieldSources: {},
  questions: [],
  changes: [],
});
