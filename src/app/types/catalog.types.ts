export interface Catalog {
  id: number;
  key: string | null;
  name: string;
  itemsCount: number;
}

export interface CatalogItem {
  id: number;
  catalogId: number;
  value: string;
}
