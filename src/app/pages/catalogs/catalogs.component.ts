import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CatalogsService } from '../../services/catalogs.service';
import { Catalog } from '../../types/catalog.types';
import {
  CatalogDialogComponent,
  CatalogDialogResult,
} from '../../common/dialogs/catalog-dialog/catalog-dialog.component';
import { ConfirmDialogComponent } from '../../common/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-catalogs',
  imports: [MatButtonModule, MatIconModule, MatTableModule],
  templateUrl: './catalogs.component.html',
  styleUrl: './catalogs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogsComponent implements OnInit {
  private readonly catalogsService = inject(CatalogsService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly catalogs = signal<Catalog[]>([]);
  protected readonly displayedColumns = ['name', 'key', 'itemsCount', 'actions'];

  ngOnInit(): void {
    this.loadCatalogs();
  }

  protected onRowClick(catalog: Catalog): void {
    this.router.navigate(['/catalogs', catalog.id]);
  }

  protected onAdd(event: Event): void {
    event.stopPropagation();
    this.dialog
      .open(CatalogDialogComponent, { width: '400px', data: {} })
      .afterClosed()
      .subscribe((result: CatalogDialogResult | undefined) => {
        if (!result) return;
        this.catalogsService.createCatalog(result.name, result.key ?? undefined).subscribe((catalog) => {
          this.catalogs.update((list) => [...list, catalog]);
        });
      });
  }

  protected onRename(event: Event, catalog: Catalog): void {
    event.stopPropagation();
    this.dialog
      .open(CatalogDialogComponent, { width: '400px', data: { catalog } })
      .afterClosed()
      .subscribe((result: CatalogDialogResult | undefined) => {
        if (!result) return;
        this.catalogsService.updateCatalog(catalog.id, result.name, result.key).subscribe((updated) => {
          this.catalogs.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
        });
      });
  }

  protected onDelete(event: Event, catalog: Catalog): void {
    event.stopPropagation();
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Удалить справочник',
          message: `Удалить «${catalog.name}» и все его элементы?`,
          confirmText: 'Удалить',
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean | undefined) => {
        if (!confirmed) return;
        this.catalogsService.deleteCatalog(catalog.id).subscribe(() => {
          this.catalogs.update((list) => list.filter((c) => c.id !== catalog.id));
        });
      });
  }

  private loadCatalogs(): void {
    this.catalogsService.getCatalogs().subscribe((catalogs) => this.catalogs.set(catalogs));
  }
}
