import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { getOrderTotal } from '../../common/utils/order-calculations';
import { OrderDraft, OrderDraftsService } from '../../services/order-drafts.service';

@Component({
  selector: 'app-order-drafts',
  imports: [DatePipe, DecimalPipe, MatButtonModule, RouterModule],
  templateUrl: './order-drafts.component.html',
  styleUrl: './order-drafts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDraftsComponent {
  private readonly draftsService = inject(OrderDraftsService);

  protected readonly drafts = signal<readonly OrderDraft[]>(this.draftsService.getDrafts());
  protected readonly hasDrafts = computed(() => this.drafts().length > 0);

  protected onDeleteClick(event: MouseEvent, temporaryId: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.draftsService.deleteDraft(temporaryId);
    this.drafts.set(this.draftsService.getDrafts());
  }

  protected onDeleteAllClick(): void {
    this.draftsService.deleteAllDrafts();
    this.drafts.set([]);
  }

  protected getDraftTitle(draft: OrderDraft): string {
    return draft.payload.name || `Черновик #${draft.temporaryId}`;
  }

  protected getDraftItemsCount(draft: OrderDraft): number {
    const payload = draft.payload;
    return (
      payload.interiorDoors.length +
      payload.entranceDoors.length +
      payload.moldings.length +
      payload.extensions.length +
      payload.capitals.length +
      payload.hardwares.length +
      payload.panelings.length +
      payload.skirtings.length
    );
  }

  protected getDraftTotal(draft: OrderDraft): number {
    return getOrderTotal(draft.payload);
  }
}
