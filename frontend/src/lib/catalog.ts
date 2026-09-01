import type { Messages } from "../i18n";

type DemoSku = keyof Messages["demoItems"];

function isDemoSku(sku: string): sku is DemoSku {
  return sku === "MON-024" || sku === "LAP-001" || sku === "CAB-CAT6";
}

export function displayItemName(sku: string, fallbackName: string, t: Messages): string {
  return isDemoSku(sku) ? t.demoItems[sku] : fallbackName;
}
