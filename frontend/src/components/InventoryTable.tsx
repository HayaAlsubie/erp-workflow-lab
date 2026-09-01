import { useI18n } from "../i18n/context";
import { formatNumber } from "../lib/format";
import { displayItemName } from "../lib/catalog";
import { getStockLevel, translateUnit } from "../lib/stock";
import type { Item } from "../types";
import { EmptyState } from "./AppStates";
import { StockBadge } from "./StatusBadge";

export function InventoryTable({ items }: { items: Item[] }) {
  const { t, locale } = useI18n();

  return (
    <section className="panel inventory-panel" aria-labelledby="inventory-title">
      <div className="section-heading compact">
        <div>
          <h2 id="inventory-title">{t.inventory.title}</h2>
          <p className="section-subtitle">{t.inventory.subtitle}</p>
        </div>
        <span className="count-chip">{formatNumber(items.length, locale)}</span>
      </div>

      {items.length === 0 ? (
        <EmptyState title={t.inventory.empty} body="" />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{t.inventory.sku}</th>
                  <th scope="col">{t.inventory.name}</th>
                  <th scope="col">{t.inventory.unit}</th>
                  <th scope="col">{t.inventory.available}</th>
                  <th scope="col">{t.inventory.reorderLevel}</th>
                  <th scope="col">{t.inventory.stockStatus}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const level = getStockLevel(item);
                  return (
                    <tr key={item.id}>
                      <td>
                        <code>{item.sku}</code>
                      </td>
                      <td>{displayItemName(item.sku, item.name, t)}</td>
                      <td>{translateUnit(item.unit, t)}</td>
                      <td>{formatNumber(item.current_quantity, locale)}</td>
                      <td>{formatNumber(item.reorder_level, locale)}</td>
                      <td>
                        <StockBadge level={level} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="item-cards">
            {items.map((item) => {
              const level = getStockLevel(item);
              return (
                <li key={item.id} className="item-card">
                  <div className="item-card-top">
                    <strong>{displayItemName(item.sku, item.name, t)}</strong>
                    <StockBadge level={level} />
                  </div>
                  <dl>
                    <div>
                      <dt>{t.inventory.sku}</dt>
                      <dd>
                        <code>{item.sku}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>{t.inventory.unit}</dt>
                      <dd>{translateUnit(item.unit, t)}</dd>
                    </div>
                    <div>
                      <dt>{t.inventory.available}</dt>
                      <dd>{formatNumber(item.current_quantity, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t.inventory.reorderLevel}</dt>
                      <dd>{formatNumber(item.reorder_level, locale)}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
