import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ServerDraftsService } from '../../services/server-drafts.service';

@Component({
  selector: 'app-server-draft-status',
  imports: [MatButtonModule, RouterLink],
  template: `
    @if (!draftId() && server.loadError()) {
      <div class="status error" role="alert">
        {{ server.loadError() }} <button mat-button type="button" (click)="refresh()">Повторить</button>
      </div>
    }
    @for (id of ids(); track id) {
      <div class="status" [class.error]="!!server.errors()[id]" aria-live="polite">
        {{ server.status(id) }}
        @if (server.conflicts()[id]; as current) {
          <button mat-button type="button" (click)="download(id)">Скачать мой вариант</button>
          @if (current.orderId) {
            <a [routerLink]="['/order', current.orderId]">Заказ №{{ current.orderId }} уже создан</a>
          } @else if (!current.targetOrderId) {
            <button mat-button type="button" [disabled]="busy()" (click)="copy(id)">
              Сохранить мой вариант отдельной копией
            </button>
          }
          <button mat-button type="button" [disabled]="busy()" (click)="useServer(id)">
            Загрузить серверную версию
          </button>
        } @else if (server.errors()[id]) {
          <button mat-button type="button" [disabled]="busy()" (click)="retry(id)">Повторить сохранение</button>
        }
      </div>
    }
    @if (actionError()) {
      <div class="status error" role="alert">{{ actionError() }}</div>
    }
  `,
  styles: [
    `
      .status {
        padding: 8px 12px;
        font-size: 12px;
        line-height: 1.5;
        color: #536c9a;
        overflow-wrap: anywhere;
      }
      .error {
        background: #fff0ef;
        color: #a32935;
      }
      .status a {
        margin-left: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerDraftStatusComponent {
  protected readonly server = inject(ServerDraftsService);
  private readonly router = inject(Router);
  readonly draftId = input<string | null>(null);
  protected readonly ids = computed(() => (this.draftId() ? [this.draftId()!] : Object.keys(this.server.errors())));
  protected readonly busy = signal(false);
  protected readonly actionError = signal('');
  private async run(action: () => Promise<unknown>): Promise<void> {
    this.busy.set(true);
    this.actionError.set('');
    try {
      await action();
    } catch {
      this.actionError.set('Не удалось завершить действие. Ваш вариант остаётся в открытом окне.');
    } finally {
      this.busy.set(false);
    }
  }
  protected refresh(): void {
    void this.run(() => this.server.refresh());
  }
  protected retry(id: string): void {
    void this.run(() => this.server.flush(id));
  }
  protected useServer(id: string): void {
    void this.run(() => this.server.useServer(id));
  }
  protected copy(id: string): void {
    void this.run(async () => {
      const newId = await this.server.copyConflict(id);
      return this.server.records()[newId].kind === 'ai'
        ? this.router.navigate(['/order'], { queryParams: { aiDraft: newId } })
        : this.router.navigate(['/drafts', newId]);
    });
  }
  protected download(id: string): void {
    const row = this.server.records()[id];
    if (!row) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(row, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `draft-${id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
