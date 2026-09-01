import type { PurchaseRequest, RequestStatus } from "../types";

export type RequestFilter = "all" | "open" | "pending" | "approved" | "received" | "closed";

export const REQUEST_FILTERS: RequestFilter[] = [
  "all",
  "open",
  "pending",
  "approved",
  "received",
  "closed",
];

export function matchesRequestFilter(status: RequestStatus, filter: RequestFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "open":
      return status === "draft" || status === "submitted" || status === "approved";
    case "pending":
      return status === "submitted";
    case "approved":
      return status === "approved";
    case "received":
      return status === "received";
    case "closed":
      return status === "rejected" || status === "cancelled";
  }
}

export function countByFilter(requests: PurchaseRequest[]): Record<RequestFilter, number> {
  return {
    all: requests.length,
    open: requests.filter((request) => matchesRequestFilter(request.status, "open")).length,
    pending: requests.filter((request) => matchesRequestFilter(request.status, "pending")).length,
    approved: requests.filter((request) => matchesRequestFilter(request.status, "approved")).length,
    received: requests.filter((request) => matchesRequestFilter(request.status, "received")).length,
    closed: requests.filter((request) => matchesRequestFilter(request.status, "closed")).length,
  };
}
