import { inject } from '@angular/core';
import { ResolveFn, RedirectCommand, Router } from '@angular/router';
import { ServerDraftsService } from '../services/server-drafts.service';
import { AiOrdersService } from '../ai-orders/ai-orders.service';

export const draftsResolver: ResolveFn<boolean | RedirectCommand> = async (route) => {
  const server = inject(ServerDraftsService);
  const router = inject(Router);
  const ai = inject(AiOrdersService);
  await server.initialize();
  const id = route.queryParamMap.get('aiDraft') || route.paramMap.get('draftId');
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return new RedirectCommand(router.parseUrl('/drafts'));
  if (id) {
    await server.loadOne(id);
    const draft = server.records()[id];
    if (draft?.targetOrderId) {
      if (draft.state !== 'archived') ai.open(id);
      return new RedirectCommand(router.createUrlTree(['/order', draft.targetOrderId]));
    }
  }
  return true;
};
