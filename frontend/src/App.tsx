import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkHealth, createPurchaseRequest, loadWorkspace, runAction } from "./api";
import { ApiUnavailableState, ErrorBanner, LoadingState, SuccessBanner } from "./components/AppStates";
import { AppHeader } from "./components/AppHeader";
import { ConfirmDialog, type PendingAction } from "./components/ConfirmDialog";
import { CreateRequestForm } from "./components/CreateRequestForm";
import { DashboardMetrics } from "./components/DashboardMetrics";
import { InventoryTable } from "./components/InventoryTable";
import { PurchaseRequestList } from "./components/PurchaseRequestList";
import { RoleControl } from "./components/RoleControl";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { useI18n } from "./i18n/context";
import { translateApiError } from "./lib/apiErrors";
import { formatRequestId } from "./lib/format";
import type { WorkflowAction } from "./lib/permissions";
import type { Dashboard, Identity, Item, PurchaseRequest, Role } from "./types";

type Notice = { key: keyof typeof import("./i18n/en").en.notices; id?: number };
type ApiState = "checking" | "online" | "offline";

function toRawError(caught: unknown, fallback: string): string {
  if (caught instanceof Error && caught.message) {
    return caught.message;
  }
  return fallback;
}

function App() {
  const { t, tf } = useI18n();
  const [identity, setIdentity] = useState<Identity>({ name: "Haya", role: "requester" });
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorRaw, setErrorRaw] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [apiState, setApiState] = useState<ApiState>("checking");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const loadedRef = useRef(false);

  const errorMessage = useMemo(() => {
    if (!errorRaw) {
      return null;
    }
    if (errorRaw === "NETWORK") {
      return t.states.apiUnavailableTitle;
    }
    if (errorRaw === "LOAD_FAILED") {
      return t.errors.loadFailed;
    }
    if (errorRaw === "CREATE_FAILED") {
      return t.errors.createFailed;
    }
    if (errorRaw === "ACTION_FAILED") {
      return t.errors.actionFailed;
    }
    return translateApiError(errorRaw, t);
  }, [errorRaw, t]);

  const noticeMessage = useMemo(() => {
    if (!notice) {
      return null;
    }
    return notice.id
      ? tf(t.notices[notice.key], { id: formatRequestId(notice.id) })
      : t.notices[notice.key];
  }, [notice, t, tf]);

  const refresh = useCallback(async () => {
    setErrorRaw(null);
    if (!loadedRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [dashboardData, itemData, requestData] = await loadWorkspace(identity);
      setDashboard(dashboardData);
      setItems(itemData);
      setRequests(requestData);
      loadedRef.current = true;
      setHasLoaded(true);
      setApiState("online");
    } catch (caught) {
      const raw = toRawError(caught, "LOAD_FAILED");
      setErrorRaw(raw === "LOAD_FAILED" ? "LOAD_FAILED" : raw);
      if (!loadedRef.current && raw === "NETWORK") {
        setApiState("offline");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [identity]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const online = await checkHealth();
      if (!cancelled) {
        setApiState(online ? "online" : "offline");
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  function updateRole(role: Role) {
    setNotice(null);
    setIdentity((current) => ({ ...current, role }));
  }

  async function handleCreate(payload: {
    notes: string;
    lines: { item_id: number; quantity: number; unit_price: number }[];
  }) {
    setBusy(true);
    setErrorRaw(null);
    setNotice(null);
    try {
      await createPurchaseRequest(identity, payload);
      setNotice({ key: "created" });
      await refresh();
    } catch (caught) {
      setErrorRaw(toRawError(caught, "CREATE_FAILED"));
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function executeAction(requestId: number, action: WorkflowAction, note?: string) {
    setBusy(true);
    setErrorRaw(null);
    setNotice(null);
    try {
      await runAction(identity, requestId, action, note);
      const noticeKey = {
        submit: "submitted",
        approve: "approved",
        reject: "rejected",
        receive: "received",
        cancel: "cancelled",
      }[action] as Notice["key"];
      setNotice({ key: noticeKey, id: requestId });
      setPending(null);
      await refresh();
    } catch (caught) {
      setErrorRaw(toRawError(caught, "ACTION_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  function handleAction(requestId: number, action: WorkflowAction) {
    if (action === "submit") {
      void executeAction(requestId, action);
      return;
    }
    setPending({ requestId, action });
  }

  const showUnavailable = !hasLoaded && !loading && Boolean(errorRaw);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t.app.skipToContent}
      </a>
      <AppHeader identity={identity} apiState={apiState} onRoleChange={updateRole} />

      <main id="main">
        <RoleControl identity={identity} onIdentityChange={setIdentity} />
        <WorkflowStepper />

        {errorMessage && !showUnavailable && (
          <ErrorBanner message={errorMessage} onRetry={() => void refresh()} />
        )}
        {noticeMessage && (
          <SuccessBanner message={noticeMessage} onDismiss={() => setNotice(null)} />
        )}

        {loading ? (
          <LoadingState />
        ) : showUnavailable ? (
          <ApiUnavailableState onRetry={() => void refresh()} />
        ) : (
          <>
            <DashboardMetrics
              dashboard={dashboard}
              refreshing={refreshing}
              onRefresh={() => void refresh()}
            />
            <div className="workspace-grid">
              <InventoryTable items={items} />
              <CreateRequestForm
                identity={identity}
                items={items}
                busy={busy}
                onCreate={handleCreate}
              />
            </div>
            <PurchaseRequestList
              identity={identity}
              requests={requests}
              busy={busy}
              onAction={handleAction}
            />
          </>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-copy">
          <p>{t.app.footerCredit}</p>
          <p>{t.app.footerNote}</p>
        </div>
        <p>{t.app.footerStack}</p>
      </footer>

      <ConfirmDialog
        pending={pending}
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={(note) => {
          if (pending) {
            void executeAction(pending.requestId, pending.action, note);
          }
        }}
      />
    </div>
  );
}

export default App;
