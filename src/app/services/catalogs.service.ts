import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Catalog, CatalogItem } from '../types/catalog.types';
import { CoreService } from './core.service';

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private readonly http = inject(HttpClient);
  private readonly coreService = inject(CoreService);
  private readonly base = `${this.coreService.apiBaseUrl}/catalogs`;

  getCatalogs(): Observable<Catalog[]> {
    return this.http.get<Catalog[]>(this.base);
  }

  createCatalog(name: string): Observable<Catalog> {
    return this.http.post<Catalog>(this.base, { name });
  }

  updateCatalog(id: number, name: string): Observable<Catalog> {
    return this.http.put<Catalog>(`${this.base}/${id}`, { name });
  }

  deleteCatalog(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getItems(catalogId: number): Observable<CatalogItem[]> {
    return this.http.get<CatalogItem[]>(`${this.base}/${catalogId}/items`);
  }

  createItem(catalogId: number, value: string): Observable<CatalogItem> {
    return this.http.post<CatalogItem>(`${this.base}/${catalogId}/items`, { value });
  }

  updateItem(catalogId: number, itemId: number, value: string): Observable<CatalogItem> {
    return this.http.put<CatalogItem>(`${this.base}/${catalogId}/items/${itemId}`, { value });
  }

  deleteItem(catalogId: number, itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${catalogId}/items/${itemId}`);
  }
}
