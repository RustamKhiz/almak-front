import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  effect,
  inject,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { environment } from '../../../environments/environment';
import { version } from '../../../../package.json';
import { AuthService } from '../../services/auth.service';
import { ServerDraftsService } from '../../services/server-drafts.service';

export interface DesktopUpdateState {
  status: 'idle' | 'checking' | 'downloading' | 'ready' | 'current' | 'error' | 'unsupported';
  revision: number;
  percent?: number;
}

declare global {
  interface Window {
    almakDesktop?: {
      platform: string;
      version: string;
      getUpdateState: () => Promise<DesktopUpdateState>;
      checkForUpdates: () => Promise<DesktopUpdateState>;
      onUpdateState: (callback: (state: DesktopUpdateState) => void) => () => void;
      installUpdate: () => void;
    };
  }
}

@Component({
  selector: 'app-navigation-menu',
  imports: [MatListModule, RouterLink, RouterLinkActive],
  templateUrl: './navigation-menu.component.html',
  styleUrl: './navigation-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationMenuComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  constructor() {
    effect((onCleanup) => {
      if (!this.auth.authenticated()) return;
      const subscription = this.auth.loadProfile().subscribe({
        error: () => {
          /* Auth interceptor handles expired sessions. */
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }
  readonly showDesktopDownload = environment.showDesktopDownload;
  readonly desktopDownloadUrl = environment.desktopDownloadUrl;
  readonly isElectron = !!window.almakDesktop;
  readonly appVersion = window.almakDesktop?.version ?? version;
  private readonly destroyRef = inject(DestroyRef);
  readonly updateState = signal<DesktopUpdateState>({ status: 'idle', revision: -1 });
  readonly updateReady = computed(() => this.updateState().status === 'ready');
  readonly checkingUpdate = signal(false);
  readonly updateBusy = computed(
    () => this.checkingUpdate() || ['checking', 'downloading'].includes(this.updateState().status),
  );
  readonly updateMessage = computed(() => {
    const state = this.updateState();
    switch (state.status) {
      case 'checking':
        return 'Проверяем обновления…';
      case 'downloading':
        return `Скачиваем обновление: ${state.percent ?? 0}%`;
      case 'ready':
        return 'Обновление готово к установке';
      case 'current':
        return 'Установлена последняя версия';
      case 'error':
        return 'Не удалось проверить или скачать обновление. Попробуйте ещё раз.';
      case 'unsupported':
        return 'Обновления доступны в установленном приложении';
      default:
        return '';
    }
  });

  ngOnInit(): void {
    const desktop = window.almakDesktop;
    if (!desktop) return;
    const unsubscribe = desktop.onUpdateState((state) => this.applyUpdateState(state));
    this.destroyRef.onDestroy(unsubscribe);
    desktop
      .getUpdateState()
      .then((state) => this.applyUpdateState(state))
      .catch(() => {
        if (!this.destroyRef.destroyed && this.updateState().revision === -1)
          this.updateState.set({ status: 'error', revision: -1 });
      });
  }

  private applyUpdateState(state: DesktopUpdateState): void {
    if (!this.destroyRef.destroyed && state && state.revision >= this.updateState().revision)
      this.updateState.set(state);
  }

  async checkForUpdates(): Promise<void> {
    if (!window.almakDesktop || this.updateBusy()) return;
    this.checkingUpdate.set(true);
    try {
      this.applyUpdateState(await window.almakDesktop.checkForUpdates());
    } catch {
      if (!this.destroyRef.destroyed)
        this.updateState.update((state) => ({ status: 'error', revision: state.revision }));
    } finally {
      this.checkingUpdate.set(false);
    }
  }

  private readonly drafts = inject(ServerDraftsService);
  async installUpdate(): Promise<void> {
    try {
      await this.drafts.flushAll();
      window.almakDesktop?.installUpdate();
    } catch {
      // Saving errors are displayed by the global draft status component.
    }
  }
}
