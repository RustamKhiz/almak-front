import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Catalog, CatalogItem } from '../types/catalog.types';
import { CatalogKey } from '../common/constants/catalog-keys';
import { CoreService } from './core.service';

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private readonly http = inject(HttpClient);
  private readonly coreService = inject(CoreService);
  private readonly base = `${this.coreService.apiBaseUrl}/catalogs`;

  private readonly itemsCache = new Map<string, Observable<readonly string[]>>();

  getCatalogs(): Observable<Catalog[]> {
    return this.http.get<Catalog[]>(this.base);
  }

  createCatalog(name: string, key?: string): Observable<Catalog> {
    return this.http.post<Catalog>(this.base, { name, key: key ?? null });
  }

  updateCatalog(id: number, name: string, key?: string | null): Observable<Catalog> {
    return this.http.put<Catalog>(`${this.base}/${id}`, { name, key });
  }

  deleteCatalog(id: number): Observable<void> {
    this.itemsCache.clear();
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getItems(catalogId: number): Observable<CatalogItem[]> {
    return this.http.get<CatalogItem[]>(`${this.base}/${catalogId}/items`);
  }

  createItem(catalogId: number, value: string): Observable<CatalogItem> {
    this.itemsCache.clear();
    return this.http.post<CatalogItem>(`${this.base}/${catalogId}/items`, { value });
  }

  updateItem(catalogId: number, itemId: number, value: string): Observable<CatalogItem> {
    this.itemsCache.clear();
    return this.http.put<CatalogItem>(`${this.base}/${catalogId}/items/${itemId}`, { value });
  }

  deleteItem(catalogId: number, itemId: number): Observable<void> {
    this.itemsCache.clear();
    return this.http.delete<void>(`${this.base}/${catalogId}/items/${itemId}`);
  }

  // Returns catalog items by well-known key.
  // Falls back to provided default if the catalog doesn't exist or request fails.
  // Results are cached for the lifetime of the service.
  getItemsByKey(key: CatalogKey, fallback: readonly string[]): Observable<readonly string[]> {
    if (!this.itemsCache.has(key)) {
      const request$ = this.http.get<CatalogItem[]>(`${this.base}/key/${key}/items`).pipe(
        map((items) => (items.length > 0 ? items.map((i) => i.value) : fallback)),
        catchError(() => of(fallback)),
        shareReplay(1),
      );
      this.itemsCache.set(key, request$);
    }
    return this.itemsCache.get(key)!;
  }
}
