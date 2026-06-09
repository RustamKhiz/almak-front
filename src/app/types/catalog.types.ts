export interface Catalog {
  id: number;
  name: string;
  itemsCount: number;
}

export interface CatalogItem {
  id: number;
  catalogId: number;
  value: string;
}
