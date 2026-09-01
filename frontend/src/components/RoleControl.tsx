import { Shield } from "lucide-react";
import { useI18n } from "../i18n/context";
import type { Identity, Role } from "../types";

const roles: Role[] = ["requester", "manager", "storekeeper", "admin"];

type RoleControlProps = {
  identity: Identity;
  onIdentityChange: (identity: Identity) => void;
};

export function RoleControl({ identity, onIdentityChange }: RoleControlProps) {
  const { t, tf } = useI18n();

  return (
    <section className="panel role-control" aria-labelledby="demo-role-title">
      <div className="role-control-top">
        <div className="section-heading compact">
          <div>
            <h2 id="demo-role-title">{t.demo.title}</h2>
            <p className="section-subtitle">{t.demo.subtitle}</p>
          </div>
          <span className="role-chip">
            <Shield size={14} aria-hidden="true" />
            {tf(t.demo.actingAs, { role: t.roles[identity.role] })}
          </span>
        </div>
        <div className="field">
          <label htmlFor="display-name">{t.demo.displayName}</label>
          <input
            id="display-name"
            value={identity.name}
            autoComplete="nickname"
            onChange={(event) =>
              onIdentityChange({ ...identity, name: event.target.value })
            }
          />
        </div>
      </div>

      <div className="role-grid" role="radiogroup" aria-label={t.header.role}>
        {roles.map((role) => {
          const selected = identity.role === role;
          return (
            <button
              key={role}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`role-card ${selected ? "is-selected" : ""}`}
              onClick={() => onIdentityChange({ ...identity, role })}
            >
              <strong>{t.roles[role]}</strong>
              <span>
                {
                  {
                    requester: t.roles.requesterHint,
                    manager: t.roles.managerHint,
                    storekeeper: t.roles.storekeeperHint,
                    admin: t.roles.adminHint,
                  }[role]
                }
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
