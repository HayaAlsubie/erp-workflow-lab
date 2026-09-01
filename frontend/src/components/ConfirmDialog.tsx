import { FormEvent, useEffect, useId, useRef } from "react";
import { useI18n } from "../i18n/context";
import { formatRequestId } from "../lib/format";
import type { WorkflowAction } from "../lib/permissions";

export type PendingAction = {
  requestId: number;
  action: WorkflowAction;
};

type ConfirmDialogProps = {
  pending: PendingAction | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (note?: string) => void;
};

export function ConfirmDialog({ pending, busy, onClose, onConfirm }: ConfirmDialogProps) {
  const { t, tf } = useI18n();
  const titleId = useId();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const needsNote = pending?.action === "approve" || pending?.action === "reject";

  useEffect(() => {
    if (!pending) {
      return;
    }
    const node = needsNote ? noteRef.current : closeRef.current;
    node?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pending, needsNote, busy, onClose]);

  if (!pending) {
    return null;
  }

  const id = formatRequestId(pending.requestId);
  const copy = {
    approve: { title: tf(t.confirm.approveTitle, { id }), body: t.confirm.approveBody },
    reject: { title: tf(t.confirm.rejectTitle, { id }), body: t.confirm.rejectBody },
    receive: { title: tf(t.confirm.receiveTitle, { id }), body: t.confirm.receiveBody },
    cancel: { title: tf(t.confirm.cancelTitle, { id }), body: t.confirm.cancelBody },
    submit: { title: t.actions.submit, body: "" },
  }[pending.action];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = needsNote ? noteRef.current?.value.trim() || undefined : undefined;
    onConfirm(note);
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={() => !busy && onClose()}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <h2 id={titleId}>{copy.title}</h2>
          {copy.body && <p>{copy.body}</p>}
          {needsNote && (
            <div className="field">
              <label htmlFor="decision-note">{t.confirm.noteLabel}</label>
              <textarea
                id="decision-note"
                ref={noteRef}
                maxLength={1000}
                placeholder={t.confirm.notePlaceholder}
              />
            </div>
          )}
          <div className="dialog-actions">
            <button
              ref={closeRef}
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={busy}
            >
              {pending.action === "approve" || pending.action === "reject"
                ? t.actions.close
                : t.actions.keep}
            </button>
            <button
              type="submit"
              className={pending.action === "reject" || pending.action === "cancel" ? "danger-button" : "primary-button"}
              disabled={busy}
            >
              {t.actions[pending.action]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
