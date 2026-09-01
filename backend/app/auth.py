from dataclasses import dataclass

from fastapi import Header, HTTPException, status

VALID_ROLES = {"requester", "manager", "storekeeper", "admin"}


@dataclass(frozen=True)
class Identity:
    name: str
    role: str


def get_identity(
    x_user_role: str = Header(default="requester"),
    x_user_name: str = Header(default="Demo User"),
) -> Identity:
    role = x_user_role.strip().lower()
    name = x_user_name.strip() or "Demo User"
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown role. Choose one of: {', '.join(sorted(VALID_ROLES))}",
        )
    return Identity(name=name, role=role)


def ensure_role(identity: Identity, *allowed: str) -> None:
    if identity.role != "admin" and identity.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{identity.role}' cannot perform this action",
        )
