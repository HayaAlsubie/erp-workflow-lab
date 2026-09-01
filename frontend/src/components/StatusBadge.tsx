import { Ban, CheckCircle2, CircleDashed, Inbox, Send, XCircle } from "lucide-react";
import type { RequestStatus } from "../types";
import { useI18n } from "../i18n/context";

const icons = {
  draft: CircleDashed,
  submitted: Send,
  approved: CheckCircle2,
  rejected: XCircle,
  received: Inbox,
  cancelled: Ban,
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useI18n();
  const Icon = icons[status];

  return (
    <span className={`status-badge status-${status}`}>
      <Icon size={14} aria-hidden="true" />
      {t.status[status]}
    </span>
  );
}

export function StockBadge({ level }: { level: "inStock" | "lowStock" | "outOfStock" }) {
  const { t } = useI18n();
  return (
    <span className={`stock-badge stock-${level}`}>
      <span className="status-dot" aria-hidden="true" />
      {t.inventory[level]}
    </span>
  );
}
