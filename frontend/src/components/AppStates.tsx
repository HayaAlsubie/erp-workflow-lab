import { AlertTriangle, Inbox, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useI18n } from "../i18n/context";

export function LoadingState() {
  const { t } = useI18n();
  return (
    <div className="state-card" role="status" aria-live="polite">
      <LoaderCircle className="spin" size={28} aria-hidden="true" />
      <div>
        <strong>{t.states.loading}</strong>
        <p>{t.states.loadingHint}</p>
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="state-card empty-state">
      <Inbox size={28} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {body ? <p>{body}</p> : null}
      </div>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="banner banner-error" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <div>
        <strong>{t.states.errorTitle}</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="ghost-button" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" />
          {t.states.retry}
        </button>
      )}
    </div>
  );
}

export function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const { t } = useI18n();
  return (
    <div className="banner banner-success" role="status" aria-live="polite">
      <div>{message}</div>
      <button
        type="button"
        className="icon-button"
        onClick={onDismiss}
        aria-label={t.states.successDismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ApiUnavailableState({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <section className="state-card api-unavailable" aria-labelledby="api-down-title">
      <AlertTriangle size={32} aria-hidden="true" />
      <div>
        <h2 id="api-down-title">{t.states.apiUnavailableTitle}</h2>
        <p>{t.states.apiUnavailableBody}</p>
        <button type="button" className="primary-button" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" />
          {t.states.retry}
        </button>
      </div>
    </section>
  );
}
