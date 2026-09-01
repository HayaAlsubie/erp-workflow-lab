from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["requester", "manager", "storekeeper", "admin"]
RequestStatus = Literal["draft", "submitted", "approved", "rejected", "received", "cancelled"]


class ItemCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=160)
    unit: str = Field(default="unit", min_length=1, max_length=30)
    current_quantity: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=0, ge=0)


class ItemRead(ItemCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class PurchaseRequestLineCreate(BaseModel):
    item_id: int
    quantity: int = Field(gt=0)
    unit_price: float = Field(default=0, ge=0)


class PurchaseRequestCreate(BaseModel):
    notes: str | None = Field(default=None, max_length=1000)
    lines: list[PurchaseRequestLineCreate] = Field(min_length=1)


class RequestLineRead(BaseModel):
    id: int
    item_id: int
    item_name: str
    item_sku: str
    quantity: int
    unit_price: float
    line_total: float


class PurchaseRequestRead(BaseModel):
    id: int
    requester_name: str
    status: RequestStatus
    notes: str | None
    decision_note: str | None
    created_at: datetime
    updated_at: datetime
    total_value: float
    lines: list[RequestLineRead]


class DecisionInput(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class StockMovementRead(BaseModel):
    id: int
    item_id: int
    item_name: str
    movement_type: str
    quantity: int
    reference_type: str
    reference_id: int
    created_by: str
    created_at: datetime


class DashboardRead(BaseModel):
    total_items: int
    low_stock_items: int
    open_requests: int
    pending_approvals: int
    received_requests: int
    total_stock_units: int
