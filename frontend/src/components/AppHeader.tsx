import { Activity, BookOpen } from "lucide-react";
import { useI18n } from "../i18n/context";
import type { Identity, Role } from "../types";

type ApiState = "checking" | "online" | "offline";

const roles: Role[] = ["requester", "manager", "storekeeper", "admin"];

type AppHeaderProps = {
  identity: Identity;
  apiState: ApiState;
  onRoleChange: (role: Role) => void;
};

export function AppHeader({ identity, apiState, onRoleChange }: AppHeaderProps) {
  const { t, locale, setLocale } = useI18n();
  const apiLabel =
    apiState === "online"
      ? t.header.apiOnline
      : apiState === "offline"
        ? t.header.apiOffline
        : t.header.apiChecking;

  return (
    <header className="app-header">
      <div className="header-inner">
        <a className="brand" href="#main" aria-label={t.app.name}>
          <span className="brand-mark" aria-hidden="true">
            EW
          </span>
          <span className="brand-copy">
            <strong>{t.app.name}</strong>
            <small>{t.app.tagline}</small>
          </span>
        </a>

        <div className="header-tools">
          <div className={`api-indicator api-${apiState}`} title={apiLabel}>
            <Activity size={16} aria-hidden="true" />
            <span>
              <span className="sr-only">{t.header.apiStatus}: </span>
              {apiLabel}
            </span>
          </div>

          <div className="language-switch" role="group" aria-label={t.header.language}>
            <button
              type="button"
              className={locale === "ar" ? "is-active" : ""}
              onClick={() => setLocale("ar")}
              aria-pressed={locale === "ar"}
              aria-label={t.header.switchToArabic}
            >
              {t.header.languageAr}
            </button>
            <button
              type="button"
              className={locale === "en" ? "is-active" : ""}
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              aria-label={t.header.switchToEnglish}
            >
              {t.header.languageEn}
            </button>
          </div>

          <div className="header-identity">
            <span className="header-user">
              <span className="sr-only">{t.header.currentUser}: </span>
              {identity.name}
            </span>
            <label className="sr-only" htmlFor="header-role">
              {t.header.role}
            </label>
            <select
              id="header-role"
              value={identity.role}
              onChange={(event) => onRoleChange(event.target.value as Role)}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {t.roles[role]}
                </option>
              ))}
            </select>
          </div>

          <a
            className="docs-link"
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={16} aria-hidden="true" />
            <span>{t.header.openApiDocs}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
