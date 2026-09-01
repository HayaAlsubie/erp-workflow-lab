import { FormEvent, useMemo, useState } from "react";
import { useI18n } from "../i18n/context";
import { displayItemName } from "../lib/catalog";
import { formatMoney } from "../lib/format";
import { canCreateRequest } from "../lib/permissions";
import type { Identity, Item } from "../types";

type CreateRequestFormProps = {
  identity: Identity;
  items: Item[];
  busy: boolean;
  onCreate: (payload: {
    notes: string;
    lines: { item_id: number; quantity: number; unit_price: number }[];
  }) => Promise<void>;
};

export function CreateRequestForm({ identity, items, busy, onCreate }: CreateRequestFormProps) {
  const { t, locale } = useI18n();
  const allowed = canCreateRequest(identity.role);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    item?: boolean;
    quantity?: boolean;
    price?: boolean;
  }>({});

  const lineTotal = useMemo(() => {
    const qty = Number(quantity);
    const price = Number(unitPrice);
    if (!Number.isFinite(qty) || !Number.isFinite(price) || qty < 0 || price < 0) {
      return 0;
    }
    return qty * price;
  }, [quantity, unitPrice]);

  function validate(): boolean {
    const next = {
      item: !itemId,
      quantity: !Number.isInteger(Number(quantity)) || Number(quantity) < 1,
      price: !Number.isFinite(Number(unitPrice)) || Number(unitPrice) < 0,
    };
    setFieldErrors(next);
    return !next.item && !next.quantity && !next.price;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || !validate()) {
      return;
    }
    await onCreate({
      notes,
      lines: [{ item_id: Number(itemId), quantity: Number(quantity), unit_price: Number(unitPrice) }],
    });
    setNotes("");
    setQuantity("1");
    setUnitPrice("0");
    setFieldErrors({});
  }

  return (
    <section className="panel create-panel" aria-labelledby="create-title">
      <div className="section-heading compact">
        <div>
          <h2 id="create-title">{t.form.title}</h2>
          <p className="section-subtitle">{t.form.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="item">{t.form.item}</label>
          <select
            id="item"
            value={itemId}
            aria-invalid={Boolean(fieldErrors.item)}
            aria-describedby={fieldErrors.item ? "item-error" : undefined}
            onChange={(event) => setItemId(event.target.value)}
            disabled={!allowed}
          >
            <option value="">{t.form.itemPlaceholder}</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {displayItemName(item.sku, item.name, t)} · {item.sku}
              </option>
            ))}
          </select>
          {fieldErrors.item && (
            <p id="item-error" className="field-error">
              {t.form.itemRequired}
            </p>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="quantity">{t.form.quantity}</label>
            <input
              id="quantity"
              type="number"
              min={1}
              step={1}
              value={quantity}
              aria-invalid={Boolean(fieldErrors.quantity)}
              aria-describedby={fieldErrors.quantity ? "quantity-error" : undefined}
              onChange={(event) => setQuantity(event.target.value)}
              disabled={!allowed}
            />
            {fieldErrors.quantity && (
              <p id="quantity-error" className="field-error">
                {t.form.quantityInvalid}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="unit-price">{t.form.unitPrice}</label>
            <input
              id="unit-price"
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              aria-invalid={Boolean(fieldErrors.price)}
              aria-describedby={fieldErrors.price ? "price-error" : undefined}
              onChange={(event) => setUnitPrice(event.target.value)}
              disabled={!allowed}
            />
            {fieldErrors.price && (
              <p id="price-error" className="field-error">
                {t.form.priceInvalid}
              </p>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="notes">{t.form.notes}</label>
          <textarea
            id="notes"
            value={notes}
            maxLength={1000}
            placeholder={t.form.notesPlaceholder}
            onChange={(event) => setNotes(event.target.value)}
            disabled={!allowed}
          />
        </div>

        <div className="line-total" aria-live="polite">
          <span>{t.form.lineTotal}</span>
          <strong>{formatMoney(lineTotal, locale)}</strong>
        </div>

        <button type="submit" className="primary-button" disabled={busy || !allowed}>
          {busy ? t.form.submitting : t.form.submit}
        </button>
        {!allowed && <p className="form-hint">{t.form.noPermission}</p>}
      </form>
    </section>
  );
}
