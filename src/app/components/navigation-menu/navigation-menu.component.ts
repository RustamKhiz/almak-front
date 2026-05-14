import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-navigation-menu',
  imports: [MatListModule, RouterLink, RouterLinkActive],
  templateUrl: './navigation-menu.component.html',
  styleUrl: './navigation-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationMenuComponent {
  readonly showDesktopDownload = environment.showDesktopDownload;
  readonly desktopDownloadUrl = environment.desktopDownloadUrl;
}
