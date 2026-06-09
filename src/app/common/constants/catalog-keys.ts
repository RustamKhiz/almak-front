// Catalog keys — stable identifiers used in code to reference specific catalogs.
// Each key corresponds to a catalog created in the "Справочники" section.
// The catalog's display name can be changed freely; the key must not change.
export const CATALOG_KEYS = {
  // Tier 1 — pure string lists, fully dynamic
  suppliers: 'suppliers',
  entranceDoorPainting: 'entrance_door_painting',
  entranceDoorPanelColor: 'entrance_door_panel_color',

  // Tier 2 — covering options (require type refactoring to make fully dynamic)
  interiorDoorCoverings: 'interior_door_coverings',
  moldingCoverings: 'molding_coverings',
  extensionCoverings: 'extension_coverings',
  capitalCoverings: 'capital_coverings',
  panelingCoverings: 'paneling_coverings',

  // Tier 2 — size options
  interiorDoorWidths: 'interior_door_widths',
  interiorDoorHeights: 'interior_door_heights',
  entranceDoorWidths: 'entrance_door_widths',
  entranceDoorHeights: 'entrance_door_heights',
} as const;

export type CatalogKey = (typeof CATALOG_KEYS)[keyof typeof CATALOG_KEYS];
