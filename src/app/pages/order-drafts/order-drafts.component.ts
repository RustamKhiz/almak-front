import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { aiKnownAmount } from '../../ai-orders/ai-order.types';
import { getOrderTotal } from '../../common/utils/order-calculations';
import { AuthService } from '../../services/auth.service';
import { ServerDraftsService } from '../../services/server-drafts.service';
import { ServerDraft } from '../../services/server-drafts.types';

@Component({
  selector: 'app-order-drafts',
  imports: [DatePipe, DecimalPipe, FormsModule, MatButtonModule],
  templateUrl: './order-drafts.component.html',
  styleUrl: './order-drafts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDraftsComponent {
  protected readonly server = inject(ServerDraftsService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly scope = signal('all');
  protected readonly search = signal('');
  protected readonly archived = signal(false);
  protected readonly actionError = signal('');
  protected readonly drafts = computed(() =>
    this.server
      .rows()
      .filter((row) => row.state === (this.archived() ? 'archived' : 'active'))
      .filter(
        (row) =>
          this.scope() !== 'mine' ||
          row.createdBy === this.auth.profile()?.id ||
          row.importedBy === this.auth.profile()?.id,
      )
      .filter((row) =>
        (this.title(row) + ' ' + this.phone(row))
          .toLocaleLowerCase()
          .includes(this.search().toLocaleLowerCase().trim()),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
  protected title(row: ServerDraft): string {
    return (
      row.document.payload?.name ||
      row.document.editorState?.payload?.name ||
      String(row.document.order?.header['name'] || '') ||
      'Новый заказ'
    );
  }
  protected phone(row: ServerDraft): string {
    return (
      row.document.payload?.phone ||
      row.document.editorState?.payload?.phone ||
      String(row.document.order?.header['phone'] || '')
    );
  }
  protected count(row: ServerDraft): number {
    if (row.kind === 'ai') return row.document.order?.items.length ?? 0;
    const p = row.document.payload!;
    return (
      p.interiorDoors.length +
      p.entranceDoors.length +
      p.moldings.length +
      p.extensions.length +
      p.capitals.length +
      p.hardwares.length +
      p.panelings.length +
      p.skirtings.length
    );
  }
  protected amount(row: ServerDraft): number | null {
    if (row.kind === 'manual') return getOrderTotal(row.document.payload!);
    if (row.document.editorState?.payload) return getOrderTotal(row.document.editorState.payload);
    const amount = row.document.order && aiKnownAmount(row.document.order);
    return amount?.complete ? amount.amount : null;
  }
  protected async open(row: ServerDraft): Promise<void> {
    try {
      await this.server.flush(row.id);
    } catch {
      this.actionError.set('Не удалось сохранить черновик. Сначала разрешите ошибку сохранения.');
      return;
    }
    if (row.kind === 'ai') void this.router.navigate(['/order'], { queryParams: { aiDraft: row.id } });
    else void this.router.navigate(['/drafts', row.id]);
  }
  protected refresh(): void {
    void (this.archived() ? this.server.loadArchive() : this.server.refresh()).catch(() =>
      this.actionError.set('Не удалось обновить список. Повторите попытку.'),
    );
  }
  protected loadMore(): void {
    void (this.archived() ? this.server.loadArchive(true) : this.server.loadMore()).catch(() =>
      this.actionError.set('Не удалось загрузить список. Повторите попытку.'),
    );
  }
  protected toggleArchive(): void {
    this.archived.update((value) => !value);
    this.refresh();
  }
  protected async restore(row: ServerDraft): Promise<void> {
    try {
      await this.server.action(row.id, 'restore');
      await this.server.loadArchive();
    } catch {
      this.actionError.set('Не удалось восстановить черновик. Повторите попытку.');
    }
  }
  protected async archive(row: ServerDraft): Promise<void> {
    this.actionError.set('');
    try {
      await this.server.action(row.id, 'archive');
    } catch {
      this.actionError.set('Не удалось отправить черновик в архив. Проверьте сохранение и возможный конфликт правок.');
    }
  }
}
