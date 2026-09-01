import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createPurchaseRequest, loadWorkspace, runAction } from "./api";
import type { Dashboard, Identity, Item, PurchaseRequest, Role } from "./types";

const roles: { value: Role; label: string; description: string }[] = [
  { value: "requester", label: "Requester", description: "Creates and submits requests" },
  { value: "manager", label: "Manager", description: "Approves or rejects requests" },
  { value: "storekeeper", label: "Storekeeper", description: "Receives items into stock" },
  { value: "admin", label: "Admin", description: "Can demonstrate all actions" },
];

const statusLabels: Record<PurchaseRequest["status"], string> = {
  draft: "Draft",
  submitted: "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  received: "Received",
  cancelled: "Cancelled",
};

const money = new Intl.NumberFormat("en-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 2,
});

function App() {
  const [identity, setIdentity] = useState<Identity>({ name: "Haya", role: "requester" });
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [notes, setNotes] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, itemData, requestData] = await loadWorkspace(identity);
      setDashboard(dashboardData);
      setItems(itemData);
      setRequests(requestData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the workspace");
    } finally {
      setLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.value === identity.role) ?? roles[0],
    [identity.role],
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!itemId) {
      setError("Choose an item first");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await createPurchaseRequest(identity, {
        notes,
        lines: [{ item_id: Number(itemId), quantity, unit_price: unitPrice }],
      });
      setNotes("");
      setQuantity(1);
      setUnitPrice(0);
      setNotice("Draft purchase request created");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the request");
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(
    requestId: number,
    action: "submit" | "approve" | "reject" | "receive" | "cancel",
  ) {
    const note =
      action === "approve" || action === "reject"
        ? window.prompt(`${action === "approve" ? "Approval" : "Rejection"} note (optional)`) ?? undefined
        : undefined;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await runAction(identity, requestId, action, note);
      setNotice(`Request #${requestId} moved to ${action}`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The action could not be completed");
    } finally {
      setBusy(false);
    }
  }

  function updateRole(role: Role) {
    setNotice(null);
    setIdentity((current) => ({ ...current, role }));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ERP Workflow Lab home">
          <span className="brand-mark">EW</span>
          <span>
            <strong>ERP Workflow Lab</strong>
            <small>Procurement → Inventory</small>
          </span>
        </a>
        <a className="api-link" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
          OpenAPI ↗
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <div>
            <p className="eyebrow">Business rules made visible</p>
            <h1>A complete purchase request workflow in one focused demo.</h1>
            <p className="hero-copy">
              Switch roles to see how permissions, approval states, receiving, and the stock
              ledger work together. The API—not the interface—owns every transition.
            </p>
          </div>
          <div className="role-panel">
            <label htmlFor="role">Demo as</label>
            <select id="role" value={identity.role} onChange={(event) => updateRole(event.target.value as Role)}>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <label htmlFor="name">Display name</label>
            <input
              id="name"
              value={identity.name}
              onChange={(event) => setIdentity((current) => ({ ...current, name: event.target.value }))}
            />
            <p>{selectedRole.description}</p>
          </div>
        </section>

        {error && <div className="message error-message" role="alert">{error}</div>}
        {notice && <div className="message success-message">{notice}</div>}

        <section className="dashboard" aria-labelledby="dashboard-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Operational snapshot</p>
              <h2 id="dashboard-title">Dashboard</h2>
            </div>
            <button className="text-button" onClick={() => void refresh()} disabled={loading}>
              Refresh data
            </button>
          </div>
          <div className="metric-grid">
            <Metric label="Open requests" value={dashboard?.open_requests} />
            <Metric label="Pending approval" value={dashboard?.pending_approvals} accent />
            <Metric label="Low-stock items" value={dashboard?.low_stock_items} warning />
            <Metric label="Stock units" value={dashboard?.total_stock_units} />
          </div>
        </section>

        <section className="workspace-grid">
          <div className="panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Inventory master</p>
                <h2>Items</h2>
              </div>
              <span className="count">{items.length}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Item</th><th>Available</th><th>Reorder</th></tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong><small>{item.sku}</small></td>
                      <td>{item.current_quantity} {item.unit}</td>
                      <td><span className={item.current_quantity <= item.reorder_level ? "stock-pill low" : "stock-pill"}>{item.reorder_level}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel create-panel">
            <p className="eyebrow">Requester action</p>
            <h2>Create a draft</h2>
            <form onSubmit={handleCreate}>
              <label htmlFor="item">Item</label>
              <select id="item" value={itemId} onChange={(event) => setItemId(event.target.value)} required>
                <option value="">Select an item</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}
              </select>
              <div className="field-row">
                <div><label htmlFor="quantity">Quantity</label><input id="quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></div>
                <div><label htmlFor="price">Unit price</label><input id="price" type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} /></div>
              </div>
              <label htmlFor="notes">Business reason</label>
              <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Why are these items needed?" />
              <button className="primary-button" disabled={busy || (identity.role !== "requester" && identity.role !== "admin")}>
                Create purchase request
              </button>
              {identity.role !== "requester" && identity.role !== "admin" && <small className="form-hint">Switch to Requester to create a request.</small>}
            </form>
          </div>
        </section>

        <section className="requests-section" aria-labelledby="requests-title">
          <div className="section-heading">
            <div><p className="eyebrow">Controlled state transitions</p><h2 id="requests-title">Purchase requests</h2></div>
            <span className="count">{requests.length}</span>
          </div>
          <div className="request-list">
            {requests.length === 0 && !loading && <div className="empty-state">No requests yet. Create the first draft as a Requester.</div>}
            {requests.map((request) => (
              <article className="request-card" key={request.id}>
                <div className="request-topline">
                  <div><span className="request-id">PR-{String(request.id).padStart(4, "0")}</span><h3>{request.notes || "Purchase request"}</h3></div>
                  <span className={`status status-${request.status}`}>{statusLabels[request.status]}</span>
                </div>
                <div className="request-meta"><span>Requested by {request.requester_name}</span><span>{money.format(request.total_value)}</span></div>
                <ul className="line-list">
                  {request.lines.map((line) => <li key={line.id}><span>{line.item_name} <small>{line.item_sku}</small></span><strong>{line.quantity} × {money.format(line.unit_price)}</strong></li>)}
                </ul>
                {request.decision_note && <p className="decision-note">Decision note: {request.decision_note}</p>}
                <div className="request-actions">
                  {(identity.role === "requester" || identity.role === "admin") && request.status === "draft" && <><button onClick={() => void handleAction(request.id, "submit")} disabled={busy}>Submit</button><button className="secondary-button" onClick={() => void handleAction(request.id, "cancel")} disabled={busy}>Cancel</button></>}
                  {(identity.role === "manager" || identity.role === "admin") && request.status === "submitted" && <><button onClick={() => void handleAction(request.id, "approve")} disabled={busy}>Approve</button><button className="danger-button" onClick={() => void handleAction(request.id, "reject")} disabled={busy}>Reject</button></>}
                  {(identity.role === "storekeeper" || identity.role === "admin") && request.status === "approved" && <button onClick={() => void handleAction(request.id, "receive")} disabled={busy}>Receive into stock</button>}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer><p>Independent portfolio project · No proprietary company code or data</p><p>React · FastAPI · PostgreSQL · Docker</p></footer>
    </div>
  );
}

function Metric({ label, value, accent = false, warning = false }: { label: string; value: number | undefined; accent?: boolean; warning?: boolean }) {
  return <article className={`metric ${accent ? "accent" : ""} ${warning ? "warning" : ""}`}><span>{label}</span><strong>{value ?? "—"}</strong></article>;
}

export default App;
