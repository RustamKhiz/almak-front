import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavigationMenuComponent } from './components/navigation-menu/navigation-menu.component';
import { AuthService } from './services/auth.service';
import { AiOrderChatComponent } from './ai-orders/ai-order-chat.component';
import { ServerDraftStatusComponent } from './components/server-draft-status/server-draft-status.component';
import { AiOrdersService } from './ai-orders/ai-orders.service';
import { TextInputCapitalizationService } from './common/utils/text-input-capitalization.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NavigationMenuComponent,
    MatButtonModule,
    MatIconModule,
    AiOrderChatComponent,
    ServerDraftStatusComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly capitalization = inject(TextInputCapitalizationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly aiOrders = inject(AiOrdersService);

  protected readonly isAuthPage = signal<boolean>(false);

  ngOnInit(): void {
    this.isAuthPage.set(this.router.url.startsWith('/auth'));
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        this.isAuthPage.set(url.startsWith('/auth'));
      });
  }

  protected async onLogoutClick(): Promise<void> {
    try {
      await this.aiOrders.server.flushAll();
    } catch {
      return;
    }
    this.aiOrders.hideForLogout();
    this.authService
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth']);
        },
      });
  }
}
