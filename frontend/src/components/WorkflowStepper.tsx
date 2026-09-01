import { CheckCircle2, CircleDashed, Inbox, Send, XCircle } from "lucide-react";
import { useI18n } from "../i18n/context";

const happyPath = [
  { key: "draft" as const, Icon: CircleDashed },
  { key: "submitted" as const, Icon: Send },
  { key: "approved" as const, Icon: CheckCircle2 },
  { key: "received" as const, Icon: Inbox },
];

export function WorkflowStepper() {
  const { t } = useI18n();

  return (
    <section className="panel workflow-panel" aria-labelledby="workflow-title">
      <div className="section-heading compact">
        <div>
          <h2 id="workflow-title">{t.workflow.title}</h2>
          <p className="section-subtitle">{t.workflow.subtitle}</p>
        </div>
      </div>

      <ol className="workflow-track">
        {happyPath.map((step, index) => (
          <li key={step.key} className={`workflow-step step-${step.key}`}>
            <div className="step-node">
              <step.Icon size={18} aria-hidden="true" />
            </div>
            <div className="step-copy">
              <strong>{t.workflow[step.key]}</strong>
              <span>
                {
                  {
                    draft: t.workflow.draftHint,
                    submitted: t.workflow.submittedHint,
                    approved: t.workflow.approvedHint,
                    received: t.workflow.receivedHint,
                  }[step.key]
                }
              </span>
            </div>
            {index < happyPath.length - 1 && <span className="step-connector" aria-hidden="true" />}
            {step.key === "submitted" && (
              <div className="reject-branch">
                <span className="reject-connector" aria-hidden="true" />
                <div className="workflow-step step-rejected">
                  <div className="step-node">
                    <XCircle size={18} aria-hidden="true" />
                  </div>
                  <div className="step-copy">
                    <strong>{t.workflow.rejected}</strong>
                    <span>{t.workflow.rejectedHint}</span>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
