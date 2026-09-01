import type { RequestStatus, Role } from "../types";

export type WorkflowAction = "submit" | "approve" | "reject" | "receive" | "cancel";

export function canCreateRequest(role: Role): boolean {
  return role === "requester" || role === "admin";
}

export function getAvailableActions(
  role: Role,
  status: RequestStatus,
  requesterName: string,
  currentName: string,
): WorkflowAction[] {
  const isAdmin = role === "admin";
  const isOwner = isAdmin || requesterName === currentName;
  const actions: WorkflowAction[] = [];

  if ((role === "requester" || isAdmin) && status === "draft" && isOwner) {
    actions.push("submit", "cancel");
  }
  if ((role === "manager" || isAdmin) && status === "submitted") {
    actions.push("approve", "reject");
  }
  if ((role === "storekeeper" || isAdmin) && status === "approved") {
    actions.push("receive");
  }

  return actions;
}
