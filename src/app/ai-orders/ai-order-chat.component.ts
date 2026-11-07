import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AiOrdersService } from './ai-orders.service';
import { DatePipe } from '@angular/common';
import { ServerDraftStatusComponent } from '../components/server-draft-status/server-draft-status.component';
import { AiDraft } from './ai-order.types';
import { aiDisplayText, aiDisplayValue } from './ai-presentation';
import { AuthService } from '../services/auth.service';
import { ServerDraftsService } from '../services/server-drafts.service';

@Component({
  selector: 'app-ai-order-chat',
  imports: [FormsModule, MatIconModule, DatePipe, ServerDraftStatusComponent],
  templateUrl: './ai-order-chat.component.html',
  styleUrl: './ai-order-chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiOrderChatComponent implements OnDestroy {
  protected readonly ai = inject(AiOrdersService);
  protected readonly server = inject(ServerDraftsService);
  protected loadMoreChats(): void {
    void this.server.loadMore().catch(() => undefined);
  }
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');
  private readonly input = viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  private readonly history = viewChild<ElementRef<HTMLElement>>('history');
  protected readonly draft = computed(() => this.ai.drafts().find((d) => d.id === this.ai.activeId()));
  protected readonly width = signal(420);
  protected readonly height = signal(600);
  protected readonly text = signal('');
  protected readonly newMessages = signal(false);
  protected readonly chatListOpened = signal(false);
  protected readonly applying = signal(false);
  protected readonly chats = computed(() =>
    [...this.ai.drafts()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
  protected readonly canCompose = computed(() => !this.draft()?.orderId && !this.draft()?.editorState?.accepted);
  private drag: { x: number; y: number; width: number; height: number; axis: string } | null = null;
  private previousMessageCount = 0;
  private previousDraftId: string | null = null;
  constructor() {
    try {
      const size = JSON.parse(localStorage.getItem('ai_chat_size') ?? 'null');
      if (size && Number.isFinite(size.width) && Number.isFinite(size.height)) {
        this.width.set(Math.max(360, size.width));
        this.height.set(Math.max(420, size.height));
      }
    } catch {
      /* Use default dimensions. */
    }
    effect(() => {
      if (!this.auth.authenticated()) this.ai.hideForLogout();
    });
    effect(() => {
      const d = this.draft();
      if (!this.ai.storageError()) this.text.set(d?.pendingText ?? '');
    });
    effect(() => {
      if (this.ai.openSelection()) this.chatListOpened.set(false);
    });
    effect(() => {
      const opened = this.ai.opened();
      const d = this.draft();
      const count = d?.messages.length ?? 0;
      const id = d?.id ?? null;
      if (id !== this.previousDraftId) {
        this.previousDraftId = id;
        this.previousMessageCount = count;
        this.newMessages.set(false);
        if (opened) setTimeout(() => this.scrollBottom());
        return;
      }
      if (opened) {
        const el = this.history()?.nativeElement;
        const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        if (count !== this.previousMessageCount) {
          if (nearBottom) setTimeout(() => this.scrollBottom());
          else this.newMessages.set(true);
        }
        this.previousMessageCount = count;
      }
    });
  }
  ngOnDestroy(): void {
    this.ai.hideForLogout();
    this.endResize();
  }
  protected toggle(): void {
    if (this.ai.opened()) {
      this.minimize();
      return;
    }
    this.ai.open();
    setTimeout(() => this.input()?.nativeElement.focus());
  }
  protected minimize(): void {
    this.ai.opened.set(false);
    this.endResize();
    this.launcher()?.nativeElement.focus();
  }
  protected changed(value: string): void {
    this.text.set(value);
    this.ai.setText(value);
  }
  protected send(): void {
    if (!this.ai.setText(this.text())) return;
    this.ai.send();
  }
  protected key(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!this.ai.busy()) this.send();
    }
  }
  protected startNew(): void {
    if (!this.ai.setText(this.text())) return;
    this.ai.newChat();
    this.chatListOpened.set(false);
    this.text.set('');
    this.previousMessageCount = 0;
    setTimeout(() => this.input()?.nativeElement.focus());
  }
  protected chatTitle(chat: AiDraft): string {
    return (
      chat.editorState?.payload?.name ||
      String(chat.order.header['name'] || '') ||
      chat.sourceText.slice(0, 64) ||
      'Новый заказ'
    );
  }
  protected chatPreview(chat: AiDraft): string {
    return (
      chat.pendingText ||
      [...chat.messages].reverse().find((message) => message.role === 'user')?.text ||
      chat.sourceText ||
      'Новый заказ'
    );
  }
  protected toggleChatList(): void {
    if (this.canCompose() && !this.ai.setText(this.text())) return;
    this.chatListOpened.set(!this.chatListOpened());
    if (!this.chatListOpened()) setTimeout(() => this.scrollBottom());
  }
  protected switchChat(id: string): void {
    if (this.canCompose() && !this.ai.setText(this.text())) return;
    this.ai.open(id);
    this.chatListOpened.set(false);
    this.text.set(this.ai.active()?.pendingText ?? '');
    this.newMessages.set(false);
    setTimeout(() => this.scrollBottom());
  }
  protected async openEditor(): Promise<void> {
    const d = this.draft();
    if (!d) return;
    if (this.canCompose() && !this.ai.setText(this.text())) return;
    try {
      await this.ai.server.flush(d.id);
    } catch {
      this.ai.error.set('Сначала сохраните черновик или разрешите конфликт правок.');
      return;
    }
    this.ai.cancel();
    this.ai.opened.set(false);
    if (d.orderId || d.targetOrderId) this.router.navigate(['/order', d.orderId ?? d.targetOrderId]);
    else this.router.navigate(['/order'], { queryParams: { aiDraft: d.id } });
  }

  protected readonly changeValue = aiDisplayValue;
  protected readonly displayText = aiDisplayText;

  protected async applyEdit(draft: AiDraft): Promise<void> {
    if (this.applying() || this.ai.busy() || !draft.changes.length) return;
    this.applying.set(true);
    this.ai.error.set(null);
    try {
      await this.server.applyOrderEdit(draft.id, draft.changes);
    } catch (error) {
      if (this.ai.activeId() === draft.id) {
        this.ai.error.set(
          error instanceof HttpErrorResponse && error.error?.message
            ? error.error.message
            : 'Не удалось применить изменения. Проверьте актуальный список правок.',
        );
      }
    } finally {
      this.applying.set(false);
    }
  }
  protected startResize(event: PointerEvent, axis: string): void {
    if (window.innerWidth < 600) return;
    event.preventDefault();
    this.drag = {
      x: event.clientX,
      y: event.clientY,
      width: Math.min(this.width(), window.innerWidth - 48),
      height: Math.min(this.height(), window.innerHeight - 112),
      axis,
    };
  }
  @HostListener('document:pointermove', ['$event'])
  protected resize(event: PointerEvent): void {
    if (!this.drag) return;
    const d = this.drag;
    if (d.axis !== 'y') this.width.set(Math.max(360, Math.min(window.innerWidth - 48, d.width + d.x - event.clientX)));
    if (d.axis !== 'x')
      this.height.set(Math.max(420, Math.min(window.innerHeight - 112, d.height + d.y - event.clientY)));
  }
  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  protected endResize(): void {
    if (!this.drag) return;
    this.drag = null;
    this.persistSize();
  }
  private persistSize(): void {
    try {
      localStorage.setItem('ai_chat_size', JSON.stringify({ width: this.width(), height: this.height() }));
    } catch {
      /* Draft storage errors are handled separately. */
    }
  }
  protected escape(event: Event): void {
    if (event.defaultPrevented) return;
    event.stopPropagation();
    this.minimize();
  }
  protected scrollBottom(): void {
    const el = this.history()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
    this.newMessages.set(false);
  }
}
