import type { Messages } from "../i18n";
import type { Item } from "../types";

export type StockLevel = "inStock" | "lowStock" | "outOfStock";

export function getStockLevel(item: Item): StockLevel {
  if (item.current_quantity <= 0) {
    return "outOfStock";
  }
  if (item.current_quantity <= item.reorder_level) {
    return "lowStock";
  }
  return "inStock";
}

export function translateUnit(unit: string, t: Messages): string {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "unit") {
    return t.inventory.unitUnit;
  }
  if (normalized === "box") {
    return t.inventory.unitBox;
  }
  return unit;
}
