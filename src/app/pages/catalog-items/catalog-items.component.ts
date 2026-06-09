import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogsService } from '../../services/catalogs.service';
import { Catalog, CatalogItem } from '../../types/catalog.types';
import { CatalogItemDialogComponent } from '../../common/dialogs/catalog-item-dialog/catalog-item-dialog.component';
import { ConfirmDialogComponent } from '../../common/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-catalog-items',
  imports: [MatButtonModule, MatIconModule, MatTableModule],
  templateUrl: './catalog-items.component.html',
  styleUrl: './catalog-items.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogItemsComponent implements OnInit {
  private readonly catalogsService = inject(CatalogsService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly catalog = signal<Catalog | null>(null);
  protected readonly items = signal<CatalogItem[]>([]);
  protected readonly displayedColumns = ['value', 'actions'];

  private catalogId = 0;

  ngOnInit(): void {
    this.catalogId = Number(this.route.snapshot.paramMap.get('id'));
    this.catalogsService.getCatalogs().subscribe((catalogs) => {
      const found = catalogs.find((c) => c.id === this.catalogId) ?? null;
      this.catalog.set(found);
    });
    this.loadItems();
  }

  protected onBack(): void {
    this.router.navigate(['/catalogs']);
  }

  protected onAdd(): void {
    this.dialog
      .open(CatalogItemDialogComponent, { width: '400px', data: {} })
      .afterClosed()
      .subscribe((value: string | undefined) => {
        if (!value) return;
        this.catalogsService.createItem(this.catalogId, value).subscribe((item) => {
          this.items.update((list) => [...list, item]);
          this.catalog.update((c) => (c ? { ...c, itemsCount: c.itemsCount + 1 } : c));
        });
      });
  }

  protected onEdit(item: CatalogItem): void {
    this.dialog
      .open(CatalogItemDialogComponent, { width: '400px', data: { item } })
      .afterClosed()
      .subscribe((value: string | undefined) => {
        if (!value) return;
        this.catalogsService.updateItem(this.catalogId, item.id, value).subscribe((updated) => {
          this.items.update((list) => list.map((i) => (i.id === updated.id ? updated : i)));
        });
      });
  }

  protected onDelete(item: CatalogItem): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { title: 'Удалить элемент', message: `Удалить «${item.value}»?`, confirmText: 'Удалить' },
      })
      .afterClosed()
      .subscribe((confirmed: boolean | undefined) => {
        if (!confirmed) return;
        this.catalogsService.deleteItem(this.catalogId, item.id).subscribe(() => {
          this.items.update((list) => list.filter((i) => i.id !== item.id));
          this.catalog.update((c) => (c ? { ...c, itemsCount: c.itemsCount - 1 } : c));
        });
      });
  }

  private loadItems(): void {
    this.catalogsService.getItems(this.catalogId).subscribe((items) => this.items.set(items));
  }
}
