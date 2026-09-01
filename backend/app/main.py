import os
from collections.abc import Generator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .auth import Identity, ensure_role, get_identity
from .database import Database
from .models import Item, PurchaseRequest, PurchaseRequestLine, StockMovement
from .schemas import (
    DashboardRead,
    DecisionInput,
    ItemCreate,
    ItemRead,
    PurchaseRequestCreate,
    PurchaseRequestRead,
    RequestLineRead,
    StockMovementRead,
)

DEFAULT_DATABASE_URL = "sqlite:///./erp_workflow.db"


def serialize_request(purchase_request: PurchaseRequest) -> PurchaseRequestRead:
    lines = [
        RequestLineRead(
            id=line.id,
            item_id=line.item_id,
            item_name=line.item.name,
            item_sku=line.item.sku,
            quantity=line.quantity,
            unit_price=line.unit_price,
            line_total=round(line.quantity * line.unit_price, 2),
        )
        for line in purchase_request.lines
    ]
    return PurchaseRequestRead(
        id=purchase_request.id,
        requester_name=purchase_request.requester_name,
        status=purchase_request.status,
        notes=purchase_request.notes,
        decision_note=purchase_request.decision_note,
        created_at=purchase_request.created_at,
        updated_at=purchase_request.updated_at,
        total_value=round(sum(line.line_total for line in lines), 2),
        lines=lines,
    )


def get_request_or_404(session: Session, request_id: int) -> PurchaseRequest:
    statement = (
        select(PurchaseRequest)
        .options(selectinload(PurchaseRequest.lines).selectinload(PurchaseRequestLine.item))
        .where(PurchaseRequest.id == request_id)
    )
    purchase_request = session.scalar(statement)
    if purchase_request is None:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    return purchase_request


def require_status(purchase_request: PurchaseRequest, expected: str) -> None:
    if purchase_request.status != expected:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Expected status '{expected}', found '{purchase_request.status}'",
        )


def seed_items(session: Session) -> None:
    if session.scalar(select(func.count(Item.id))) > 0:
        return
    session.add_all(
        [
            Item(
                sku="LAP-001",
                name="Business Laptop",
                unit="unit",
                current_quantity=6,
                reorder_level=3,
            ),
            Item(
                sku="MON-024",
                name="24-inch Monitor",
                unit="unit",
                current_quantity=2,
                reorder_level=4,
            ),
            Item(
                sku="CAB-CAT6",
                name="CAT6 Network Cable",
                unit="box",
                current_quantity=8,
                reorder_level=2,
            ),
        ]
    )
    session.commit()


def create_app(database_url: str | None = None) -> FastAPI:
    database = Database(database_url or os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        database.create_schema()
        with database.session_factory() as session:
            seed_items(session)
        yield

    app = FastAPI(
        title="ERP Workflow Lab API",
        version="0.1.0",
        description=(
            "A demonstrable procurement-to-inventory workflow with role-based business rules."
        ),
        lifespan=lifespan,
    )
    app.state.database = database
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:8080"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def get_session(request: Request) -> Generator[Session, None, None]:
        yield from request.app.state.database.session()

    SessionDep = Annotated[Session, Depends(get_session)]
    IdentityDep = Annotated[Identity, Depends(get_identity)]

    @app.get("/api/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/items", response_model=list[ItemRead], tags=["inventory"])
    def list_items(session: SessionDep) -> list[Item]:
        return list(session.scalars(select(Item).order_by(Item.name)))

    @app.post(
        "/api/items",
        response_model=ItemRead,
        status_code=status.HTTP_201_CREATED,
        tags=["inventory"],
    )
    def create_item(
        payload: ItemCreate,
        identity: IdentityDep,
        session: SessionDep,
    ) -> Item:
        ensure_role(identity, "storekeeper")
        item = Item(**payload.model_dump())
        session.add(item)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise HTTPException(status_code=409, detail="SKU already exists") from exc
        session.refresh(item)
        return item

    @app.get(
        "/api/purchase-requests",
        response_model=list[PurchaseRequestRead],
        tags=["procurement"],
    )
    def list_purchase_requests(
        session: SessionDep,
    ) -> list[PurchaseRequestRead]:
        statement = (
            select(PurchaseRequest)
            .options(selectinload(PurchaseRequest.lines).selectinload(PurchaseRequestLine.item))
            .order_by(PurchaseRequest.created_at.desc())
        )
        return [serialize_request(row) for row in session.scalars(statement)]

    @app.post(
        "/api/purchase-requests",
        response_model=PurchaseRequestRead,
        status_code=status.HTTP_201_CREATED,
        tags=["procurement"],
    )
    def create_purchase_request(
        payload: PurchaseRequestCreate,
        identity: IdentityDep,
        session: SessionDep,
    ) -> PurchaseRequestRead:
        ensure_role(identity, "requester")
        item_ids = [line.item_id for line in payload.lines]
        if len(item_ids) != len(set(item_ids)):
            raise HTTPException(status_code=422, detail="An item can appear only once per request")

        items = set(session.scalars(select(Item.id).where(Item.id.in_(item_ids))))
        missing = sorted(set(item_ids) - items)
        if missing:
            raise HTTPException(status_code=422, detail=f"Unknown item IDs: {missing}")

        purchase_request = PurchaseRequest(
            requester_name=identity.name,
            notes=payload.notes,
            status="draft",
            lines=[PurchaseRequestLine(**line.model_dump()) for line in payload.lines],
        )
        session.add(purchase_request)
        session.commit()
        return serialize_request(get_request_or_404(session, purchase_request.id))

    @app.post(
        "/api/purchase-requests/{request_id}/submit",
        response_model=PurchaseRequestRead,
        tags=["procurement"],
    )
    def submit_purchase_request(
        request_id: int,
        identity: IdentityDep,
        session: SessionDep,
    ) -> PurchaseRequestRead:
        ensure_role(identity, "requester")
        purchase_request = get_request_or_404(session, request_id)
        require_status(purchase_request, "draft")
        if identity.role != "admin" and purchase_request.requester_name != identity.name:
            raise HTTPException(status_code=403, detail="Only the request owner can submit it")
        purchase_request.status = "submitted"
        session.commit()
        return serialize_request(get_request_or_404(session, request_id))

    @app.post(
        "/api/purchase-requests/{request_id}/approve",
        response_model=PurchaseRequestRead,
        tags=["procurement"],
    )
    def approve_purchase_request(
        request_id: int,
        payload: DecisionInput,
        identity: IdentityDep,
        session: SessionDep,
    ) -> PurchaseRequestRead:
        ensure_role(identity, "manager")
        purchase_request = get_request_or_404(session, request_id)
        require_status(purchase_request, "submitted")
        purchase_request.status = "approved"
        purchase_request.decision_note = payload.note
        session.commit()
        return serialize_request(get_request_or_404(session, request_id))

    @app.post(
        "/api/purchase-requests/{request_id}/reject",
        response_model=PurchaseRequestRead,
        tags=["procurement"],
    )
    def reject_purchase_request(
        request_id: int,
        payload: DecisionInput,
        identity: IdentityDep,
        session: SessionDep,
    ) -> PurchaseRequestRead:
        ensure_role(identity, "manager")
        purchase_request = get_request_or_404(session, request_id)
        require_status(purchase_request, "submitted")
        purchase_request.status = "rejected"
        purchase_request.decision_note = payload.note
        session.commit()
        return serialize_request(get_request_or_404(session, request_id))

    @app.post(
        "/api/purchase-requests/{request_id}/cancel",
        response_model=PurchaseRequestRead,
        tags=["procurement"],
    )
    def cancel_purchase_request(
        request_id: int,
        identity: IdentityDep,
        session: SessionDep,
    ) -> PurchaseRequestRead:
        ensure_role(identity, "requester")
        purchase_request = get_request_or_404(session, request_id)
        require_status(purchase_request, "draft")
        if identity.role != "admin" and purchase_request.requester_name != identity.name:
            raise HTTPException(status_code=403, detail="Only the request owner can cancel it")
        purchase_request.status = "cancelled"
        session.commit()
        return serialize_request(get_request_or_404(session, request_id))

    @app.post(
        "/api/purchase-requests/{request_id}/receive",
        response_model=PurchaseRequestRead,
        tags=["procurement", "inventory"],
    )
    def receive_purchase_request(
        request_id: int,
        identity: IdentityDep,
        session: SessionDep,
    ) -> PurchaseRequestRead:
        ensure_role(identity, "storekeeper")
        purchase_request = get_request_or_404(session, request_id)
        require_status(purchase_request, "approved")

        for line in purchase_request.lines:
            line.item.current_quantity += line.quantity
            session.add(
                StockMovement(
                    item_id=line.item_id,
                    movement_type="receipt",
                    quantity=line.quantity,
                    reference_type="purchase_request",
                    reference_id=purchase_request.id,
                    created_by=identity.name,
                )
            )
        purchase_request.status = "received"
        session.commit()
        return serialize_request(get_request_or_404(session, request_id))

    @app.get(
        "/api/stock-movements",
        response_model=list[StockMovementRead],
        tags=["inventory"],
    )
    def list_movements(session: SessionDep) -> list[StockMovementRead]:
        movements = session.scalars(
            select(StockMovement).order_by(StockMovement.created_at.desc())
        )
        return [
            StockMovementRead(
                id=row.id,
                item_id=row.item_id,
                item_name=row.item.name,
                movement_type=row.movement_type,
                quantity=row.quantity,
                reference_type=row.reference_type,
                reference_id=row.reference_id,
                created_by=row.created_by,
                created_at=row.created_at,
            )
            for row in movements
        ]

    @app.get("/api/dashboard", response_model=DashboardRead, tags=["reporting"])
    def dashboard(session: SessionDep) -> DashboardRead:
        def count(statement):
            return int(session.scalar(statement) or 0)
        return DashboardRead(
            total_items=count(select(func.count(Item.id))),
            low_stock_items=count(
                select(func.count(Item.id)).where(Item.current_quantity <= Item.reorder_level)
            ),
            open_requests=count(
                select(func.count(PurchaseRequest.id)).where(
                    PurchaseRequest.status.in_(["draft", "submitted", "approved"])
                )
            ),
            pending_approvals=count(
                select(func.count(PurchaseRequest.id)).where(
                    PurchaseRequest.status == "submitted"
                )
            ),
            received_requests=count(
                select(func.count(PurchaseRequest.id)).where(
                    PurchaseRequest.status == "received"
                )
            ),
            total_stock_units=count(select(func.sum(Item.current_quantity))),
        )

    return app


app = create_app()
