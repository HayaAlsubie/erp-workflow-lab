import {
  Boxes,
  ClipboardList,
  Layers3,
  Package,
  PackageCheck,
  TriangleAlert,
} from "lucide-react";
import { useI18n } from "../i18n/context";
import { formatNumber } from "../lib/format";
import type { Dashboard } from "../types";

type MetricTone = "neutral" | "accent" | "warning" | "success";
type DashboardCopy = "openRequests" | "pendingApproval" | "lowStockItems" | "totalStockUnits" | "receivedRequests" | "totalItems";
type DashboardHint = "openRequestsHint" | "pendingApprovalHint" | "lowStockHint" | "totalStockHint" | "receivedHint" | "totalItemsHint";

const metrics: {
  key: keyof Dashboard;
  icon: typeof Package;
  title: DashboardCopy;
  hint: DashboardHint;
  tone: MetricTone;
}[] = [
  { key: "open_requests", icon: ClipboardList, title: "openRequests", hint: "openRequestsHint", tone: "neutral" },
  { key: "pending_approvals", icon: Layers3, title: "pendingApproval", hint: "pendingApprovalHint", tone: "accent" },
  { key: "low_stock_items", icon: TriangleAlert, title: "lowStockItems", hint: "lowStockHint", tone: "warning" },
  { key: "total_stock_units", icon: Boxes, title: "totalStockUnits", hint: "totalStockHint", tone: "neutral" },
  { key: "received_requests", icon: PackageCheck, title: "receivedRequests", hint: "receivedHint", tone: "success" },
  { key: "total_items", icon: Package, title: "totalItems", hint: "totalItemsHint", tone: "neutral" },
];

type DashboardMetricsProps = {
  dashboard: Dashboard | null;
  refreshing: boolean;
  onRefresh: () => void;
};

export function DashboardMetrics({ dashboard, refreshing, onRefresh }: DashboardMetricsProps) {
  const { t, locale } = useI18n();

  return (
    <section className="dashboard-section" aria-labelledby="dashboard-title">
      <div className="section-heading">
        <div>
          <h2 id="dashboard-title">{t.dashboard.title}</h2>
          <p className="section-subtitle">{t.dashboard.subtitle}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? t.dashboard.refreshing : t.dashboard.refresh}
        </button>
      </div>

      <div className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const value = dashboard?.[metric.key];
          return (
            <article key={metric.key} className={`metric-card tone-${metric.tone}`}>
              <div className="metric-icon" aria-hidden="true">
                <Icon size={20} />
              </div>
              <p className="metric-label">{t.dashboard[metric.title]}</p>
              <p className="metric-value">
                {value === undefined ? "—" : formatNumber(value, locale)}
              </p>
              <p className="metric-hint">{t.dashboard[metric.hint]}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
