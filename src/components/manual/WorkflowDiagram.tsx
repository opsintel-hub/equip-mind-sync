import { ReactNode } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface WorkflowStep {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  highlight?: boolean;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

interface WorkflowRow {
  steps: WorkflowStep[];
}

interface WorkflowDiagramProps {
  title?: string;
  rows: WorkflowRow[];
  /** Show a vertical arrow between rows */
  connectorBetweenRows?: boolean;
}

const variantClasses: Record<string, string> = {
  default: "bg-muted/50 border-border text-foreground",
  success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300",
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
  danger: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300",
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300",
};

export function WorkflowDiagram({ title, rows, connectorBetweenRows = false }: WorkflowDiagramProps) {
  return (
    <div className="space-y-3">
      {title && (
        <h4 className="font-semibold text-sm flex items-center gap-2">
          🔄 {title}
        </h4>
      )}
      <div className="space-y-2">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx}>
            {rowIdx > 0 && connectorBetweenRows && (
              <div className="flex justify-center py-1">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {row.steps.map((step, stepIdx) => (
                <div key={stepIdx} className="flex items-center gap-1.5">
                  {stepIdx > 0 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 min-w-[80px] max-w-[120px] transition-all ${
                      step.highlight ? "ring-2 ring-primary/30 shadow-sm" : ""
                    } ${variantClasses[step.variant || "default"]}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center shadow-sm">
                      {step.icon}
                    </div>
                    <span className="text-[11px] font-semibold text-center leading-tight">{step.label}</span>
                    {step.sublabel && (
                      <span className="text-[9px] text-center leading-tight opacity-70">{step.sublabel}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Simplified single-row workflow */
export function SimpleWorkflow({ steps }: { steps: WorkflowStep[] }) {
  return <WorkflowDiagram rows={[{ steps }]} />;
}
