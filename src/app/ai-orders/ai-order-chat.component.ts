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
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AiOrdersService } from './ai-orders.service';
import { AiDraftCardComponent } from './ai-draft-card.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-ai-order-chat',
  imports: [FormsModule, MatIconModule, AiDraftCardComponent],
  templateUrl: './ai-order-chat.component.html',
  styleUrl: './ai-order-chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiOrderChatComponent implements OnDestroy {
  protected readonly ai = inject(AiOrdersService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');
  private readonly input = viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  private readonly card = viewChild('draftCard', { read: ElementRef });
  private readonly history = viewChild<ElementRef<HTMLElement>>('history');
  protected readonly draft = computed(() => this.ai.drafts().find((d) => d.id === this.ai.activeId()));
  protected readonly width = signal(420);
  protected readonly height = signal(600);
  protected readonly text = signal('');
  protected readonly newMessages = signal(false);
  protected readonly sizeMenu = signal(false);
  private drag: { x: number; y: number; width: number; height: number; axis: string } | null = null;
  private previousMessageCount = 0;
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
      const opened = this.ai.opened();
      const d = this.draft();
      const count = d?.messages.length ?? 0;
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
    this.text.set('');
    this.previousMessageCount = 0;
    setTimeout(() => this.input()?.nativeElement.focus());
  }
  protected openEditor(): void {
    const d = this.draft();
    if (!d) return;
    if (this.text().trim() && !d.editorState) {
      this.ai.error.set('Сначала отправьте набранное уточнение или очистите поле. Текст сохранён.');
      return;
    }
    if (
      !d.editorState &&
      !this.ai.update(d.id, (item) => {
        item.editorState = { payload: null, accepted: false, defaultsConfirmed: false };
      })
    )
      return;
    this.ai.cancel();
    this.ai.opened.set(false);
    this.router.navigate(['/order'], { queryParams: { aiDraft: d.id } });
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
  protected setSize(large: boolean): void {
    this.width.set(large ? 680 : 420);
    this.height.set(large ? 760 : 600);
    this.sizeMenu.set(false);
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
  protected showCard(): void {
    this.card()?.nativeElement.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  protected scrollBottom(): void {
    const el = this.history()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
    this.newMessages.set(false);
  }
}
