export type Role = "requester" | "manager" | "storekeeper" | "admin";
export type RequestStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "received"
  | "cancelled";

export interface Identity {
  name: string;
  role: Role;
}

export interface Item {
  id: number;
  sku: string;
  name: string;
  unit: string;
  current_quantity: number;
  reorder_level: number;
}

export interface RequestLine {
  id: number;
  item_id: number;
  item_name: string;
  item_sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface PurchaseRequest {
  id: number;
  requester_name: string;
  status: RequestStatus;
  notes: string | null;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
  total_value: number;
  lines: RequestLine[];
}

export interface Dashboard {
  total_items: number;
  low_stock_items: number;
  open_requests: number;
  pending_approvals: number;
  received_requests: number;
  total_stock_units: number;
}
