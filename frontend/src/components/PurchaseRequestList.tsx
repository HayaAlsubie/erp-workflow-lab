import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../i18n/context";
import { displayItemName } from "../lib/catalog";
import { countByFilter, matchesRequestFilter, REQUEST_FILTERS, type RequestFilter } from "../lib/filters";
import { formatDateTime, formatMoney, formatNumber, formatRequestId } from "../lib/format";
import { getAvailableActions, type WorkflowAction } from "../lib/permissions";
import type { Identity, PurchaseRequest } from "../types";
import { EmptyState } from "./AppStates";
import { StatusBadge } from "./StatusBadge";

type PurchaseRequestListProps = {
  identity: Identity;
  requests: PurchaseRequest[];
  busy: boolean;
  onAction: (requestId: number, action: WorkflowAction) => void;
};

export function PurchaseRequestList({
  identity,
  requests,
  busy,
  onAction,
}: PurchaseRequestListProps) {
  const { t, tf, locale } = useI18n();
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [openIds, setOpenIds] = useState<number[]>([]);
  const counts = useMemo(() => countByFilter(requests), [requests]);
  const visible = useMemo(
    () => requests.filter((request) => matchesRequestFilter(request.status, filter)),
    [requests, filter],
  );

  function toggleDetails(requestId: number) {
    setOpenIds((current) =>
      current.includes(requestId)
        ? current.filter((id) => id !== requestId)
        : [...current, requestId],
    );
  }

  return (
    <section className="requests-section" aria-labelledby="requests-title">
      <div className="section-heading">
        <div>
          <h2 id="requests-title">{t.requests.title}</h2>
          <p className="section-subtitle">{t.requests.subtitle}</p>
        </div>
      </div>

      <div className="request-filters" role="radiogroup" aria-label={t.requests.title}>
        {REQUEST_FILTERS.map((key) => {
          const selected = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`filter-chip ${selected ? "is-active" : ""}`}
              onClick={() => setFilter(key)}
            >
              <span>{t.filters[key]}</span>
              <span className="filter-count">{formatNumber(counts[key], locale)}</span>
            </button>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <EmptyState title={t.requests.emptyTitle} body={t.requests.emptyBody} />
      ) : visible.length === 0 ? (
        <EmptyState title={t.requests.emptyFilterTitle} body={t.requests.emptyFilterBody} />
      ) : (
        <div className="request-list">
          {visible.map((request) => {
            const actions = getAvailableActions(
              identity.role,
              request.status,
              request.requester_name,
              identity.name,
            );
            const open = openIds.includes(request.id);
            const detailsId = `request-details-${request.id}`;
            const firstItem = request.lines[0];
            const firstName = firstItem
              ? displayItemName(firstItem.item_sku, firstItem.item_name, t)
              : t.requests.untitled;
            const itemSummary =
              request.lines.length > 1
                ? `${firstName} · ${tf(t.requests.itemCount, { count: formatNumber(request.lines.length, locale) })}`
                : firstName;

            return (
              <article className={`request-card ${open ? "is-open" : ""}`} key={request.id}>
                <div className="request-summary">
                  <div className="request-id-status">
                    <p className="request-id">{formatRequestId(request.id)}</p>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="request-summary-main">
                    <h3>{request.notes || t.requests.untitled}</h3>
                    <p className="request-summary-meta">
                      <span>{request.requester_name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{itemSummary}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={request.created_at}>
                        {formatDateTime(request.created_at, locale)}
                      </time>
                    </p>
                  </div>
                  <p className="request-summary-value">{formatMoney(request.total_value, locale)}</p>
                  <div className="request-summary-tools">
                    {actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        className={
                          action === "reject" || action === "cancel"
                            ? "danger-button"
                            : "primary-button"
                        }
                        disabled={busy}
                        onClick={() => onAction(request.id, action)}
                      >
                        {t.actions[action]}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="ghost-button details-toggle"
                      aria-expanded={open}
                      aria-controls={detailsId}
                      onClick={() => toggleDetails(request.id)}
                    >
                      <ChevronDown size={16} aria-hidden="true" />
                      {open ? t.requests.hideDetails : t.requests.viewDetails}
                    </button>
                  </div>
                </div>

                <div id={detailsId} hidden={!open} className="request-details">
                  {request.notes && (
                    <p className="decision-note">
                      <strong>{t.requests.requestNotes}: </strong>
                      {request.notes}
                    </p>
                  )}
                  <div className="line-table-wrap">
                  <table className="line-table">
                    <thead>
                      <tr>
                        <th scope="col">{t.inventory.name}</th>
                        <th scope="col">{t.inventory.sku}</th>
                        <th scope="col">{t.requests.lineQuantity}</th>
                        <th scope="col">{t.requests.lineUnitPrice}</th>
                        <th scope="col">{t.requests.lineTotal}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {request.lines.map((line) => (
                        <tr key={line.id}>
                          <td>{displayItemName(line.item_sku, line.item_name, t)}</td>
                          <td>
                            <code>{line.item_sku}</code>
                          </td>
                          <td>{formatNumber(line.quantity, locale)}</td>
                          <td>{formatMoney(line.unit_price, locale)}</td>
                          <td>{formatMoney(line.line_total, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  {request.decision_note && (
                    <p className="decision-note">
                      <strong>{t.requests.decisionNote}: </strong>
                      {request.decision_note}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
