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
  protected readonly draftId = signal<string | null>(null);
  protected readonly aiDraftId = signal<string | null>(null);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((params) => {
      const id = params.get('id');
      this.orderId.set(id ? Number(id) : null);
      this.draftId.set(params.get('draftId'));
    });
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((params) => this.aiDraftId.set(params.get('aiDraft')));
  }
}
