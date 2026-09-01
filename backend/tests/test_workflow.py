from fastapi.testclient import TestClient

from app.main import create_app


def headers(role: str, name: str = "Haya") -> dict[str, str]:
    return {"X-User-Role": role, "X-User-Name": name}


def test_complete_procurement_to_inventory_workflow() -> None:
    with TestClient(create_app("sqlite://")) as client:
        items = client.get("/api/items").json()
        monitor = next(item for item in items if item["sku"] == "MON-024")
        initial_quantity = monitor["current_quantity"]

        created = client.post(
            "/api/purchase-requests",
            headers=headers("requester"),
            json={
                "notes": "Monitors for the operations team",
                "lines": [{"item_id": monitor["id"], "quantity": 5, "unit_price": 720}],
            },
        )
        assert created.status_code == 201
        purchase_request = created.json()
        assert purchase_request["status"] == "draft"
        assert purchase_request["total_value"] == 3600

        invalid_approval = client.post(
            f"/api/purchase-requests/{purchase_request['id']}/approve",
            headers=headers("manager", "Manager"),
            json={"note": "Too early"},
        )
        assert invalid_approval.status_code == 409

        submitted = client.post(
            f"/api/purchase-requests/{purchase_request['id']}/submit",
            headers=headers("requester"),
        )
        assert submitted.status_code == 200
        assert submitted.json()["status"] == "submitted"

        forbidden = client.post(
            f"/api/purchase-requests/{purchase_request['id']}/approve",
            headers=headers("requester"),
            json={"note": None},
        )
        assert forbidden.status_code == 403

        approved = client.post(
            f"/api/purchase-requests/{purchase_request['id']}/approve",
            headers=headers("manager", "Operations Manager"),
            json={"note": "Budget confirmed"},
        )
        assert approved.status_code == 200
        assert approved.json()["status"] == "approved"

        received = client.post(
            f"/api/purchase-requests/{purchase_request['id']}/receive",
            headers=headers("storekeeper", "Warehouse Team"),
        )
        assert received.status_code == 200
        assert received.json()["status"] == "received"

        items_after = client.get("/api/items").json()
        monitor_after = next(item for item in items_after if item["id"] == monitor["id"])
        assert monitor_after["current_quantity"] == initial_quantity + 5

        movements = client.get("/api/stock-movements").json()
        assert len(movements) == 1
        assert movements[0]["quantity"] == 5
        assert movements[0]["reference_id"] == purchase_request["id"]

        duplicate_receipt = client.post(
            f"/api/purchase-requests/{purchase_request['id']}/receive",
            headers=headers("storekeeper"),
        )
        assert duplicate_receipt.status_code == 409


def test_validation_and_item_permissions() -> None:
    with TestClient(create_app("sqlite://")) as client:
        first_item = client.get("/api/items").json()[0]

        invalid_request = client.post(
            "/api/purchase-requests",
            headers=headers("requester"),
            json={"lines": [{"item_id": first_item["id"], "quantity": 0}]},
        )
        assert invalid_request.status_code == 422

        forbidden_item = client.post(
            "/api/items",
            headers=headers("requester"),
            json={"sku": "KEY-001", "name": "Keyboard"},
        )
        assert forbidden_item.status_code == 403

        created_item = client.post(
            "/api/items",
            headers=headers("storekeeper"),
            json={"sku": "KEY-001", "name": "Keyboard", "reorder_level": 2},
        )
        assert created_item.status_code == 201
