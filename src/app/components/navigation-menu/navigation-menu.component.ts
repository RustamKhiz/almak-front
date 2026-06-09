import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    almakDesktop?: {
      platform: string;
      onUpdateDownloaded: (callback: () => void) => void;
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
  readonly showDesktopDownload = environment.showDesktopDownload;
  readonly desktopDownloadUrl = environment.desktopDownloadUrl;
  readonly isElectron = !!window.almakDesktop;
  readonly updateReady = signal(false);

  ngOnInit(): void {
    if (window.almakDesktop) {
      window.almakDesktop.onUpdateDownloaded(() => this.updateReady.set(true));
    }
  }

  installUpdate(): void {
    window.almakDesktop?.installUpdate();
  }
}
