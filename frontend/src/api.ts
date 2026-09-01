import { extractErrorMessage } from "./lib/apiErrors";
import type { Dashboard, Identity, Item, PurchaseRequest } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function request<T>(
  path: string,
  identity: Identity,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-User-Role": identity.role,
        "X-User-Name": identity.name,
        ...options.headers,
      },
    });
  } catch {
    throw new Error("NETWORK");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(extractErrorMessage(payload, `Request failed (${response.status})`));
  }
  return response.json() as Promise<T>;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as { status?: string };
    return payload.status === "ok";
  } catch {
    return false;
  }
}

export function loadWorkspace(identity: Identity) {
  return Promise.all([
    request<Dashboard>("/api/dashboard", identity),
    request<Item[]>("/api/items", identity),
    request<PurchaseRequest[]>("/api/purchase-requests", identity),
  ]);
}

export function createPurchaseRequest(
  identity: Identity,
  payload: { notes: string; lines: { item_id: number; quantity: number; unit_price: number }[] },
) {
  return request<PurchaseRequest>("/api/purchase-requests", identity, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function runAction(
  identity: Identity,
  requestId: number,
  action: "submit" | "approve" | "reject" | "receive" | "cancel",
  note?: string,
) {
  return request<PurchaseRequest>(`/api/purchase-requests/${requestId}/${action}`, identity, {
    method: "POST",
    body: action === "approve" || action === "reject" ? JSON.stringify({ note }) : undefined,
  });
}
