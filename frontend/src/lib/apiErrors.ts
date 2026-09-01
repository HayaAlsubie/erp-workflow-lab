import type { Messages } from "../i18n";
import { formatMessage } from "../i18n";
import type { RequestStatus, Role } from "../types";

const STATUS_VALUES: RequestStatus[] = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "received",
  "cancelled",
];

const ROLE_VALUES: Role[] = ["requester", "manager", "storekeeper", "admin"];

function localizeStatus(value: string, t: Messages): string {
  return STATUS_VALUES.includes(value as RequestStatus)
    ? t.status[value as RequestStatus]
    : value;
}

function localizeRole(value: string, t: Messages): string {
  return ROLE_VALUES.includes(value as Role) ? t.roles[value as Role] : value;
}

export function translateApiError(message: string, t: Messages): string {
  const exact: Record<string, string> = {
    "Purchase request not found": t.errors.notFound,
    "SKU already exists": t.errors.skuExists,
    "An item can appear only once per request": t.errors.duplicateItem,
    "Only the request owner can submit it": t.errors.ownerSubmit,
    "Only the request owner can cancel it": t.errors.ownerCancel,
    "Could not load the workspace.": t.errors.loadFailed,
    "Could not create the request.": t.errors.createFailed,
    "The action could not be completed.": t.errors.actionFailed,
  };

  if (exact[message]) {
    return exact[message];
  }

  const statusMatch = message.match(/^Expected status '([^']+)', found '([^']+)'$/);
  if (statusMatch) {
    return formatMessage(t.errors.statusConflict, {
      expected: localizeStatus(statusMatch[1], t),
      actual: localizeStatus(statusMatch[2], t),
    });
  }

  const roleMatch = message.match(/^Role '([^']+)' cannot perform this action$/);
  if (roleMatch) {
    return formatMessage(t.errors.roleDenied, { role: localizeRole(roleMatch[1], t) });
  }

  const unknownItems = message.match(/^Unknown item IDs: (.+)$/);
  if (unknownItems) {
    return formatMessage(t.errors.unknownItems, { ids: unknownItems[1] });
  }

  const unknownRole = message.match(/^Unknown role\. Choose one of: (.+)$/);
  if (unknownRole) {
    return formatMessage(t.errors.unknownRole, { roles: unknownRole[1] });
  }

  const failedStatus = message.match(/^Request failed \((\d+)\)$/);
  if (failedStatus) {
    return formatMessage(t.errors.requestFailed, { status: failedStatus[1] });
  }

  return message;
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }
        if (entry && typeof entry === "object" && "msg" in entry) {
          return String((entry as { msg: unknown }).msg);
        }
        return "";
      })
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.join(" ");
    }
  }
  return fallback;
}
