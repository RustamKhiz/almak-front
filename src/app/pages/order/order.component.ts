import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { OrderCreateComponent } from '../../components/order-create/order-create.component';

@Component({
  selector: 'app-order',
  imports: [OrderCreateComponent],
  templateUrl: './order.component.html',
  styleUrl: './order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly orderId = signal<number | null>(null);
  protected readonly draftId = signal<number | null>(null);
  protected readonly aiDraftId = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.orderId.set(id ? Number(id) : null);
    const draftId = this.route.snapshot.paramMap.get('draftId');
    this.draftId.set(draftId ? Number(draftId) : null);
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((params) => this.aiDraftId.set(params.get('aiDraft')));
  }
}
