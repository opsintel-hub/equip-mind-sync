import { ReactNode } from "react";
import { Check, X, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export type StepStatus = "done" | "current" | "pending" | "rejected" | "warning";

export interface ProcessStep {
  label: string;
  icon?: ReactNode;
  status: StepStatus;
  date?: string | null;
  sublabel?: string;
}

interface ProcessTrackerProps {
  steps: ProcessStep[];
  size?: "sm" | "md";
  className?: string;
}

export function ProcessTracker({ steps, size = "md", className }: ProcessTrackerProps) {
  const circleSize = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const fontSize = size === "sm" ? "text-[10px]" : "text-xs";
  const dateFontSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <div className={cn("flex items-start w-full", className)}>
      {steps.map((step, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center relative">
          {/* Connector line (before this step) */}
          {idx > 0 && (
            <div
              className="absolute top-[18px] h-[3px] z-0"
              style={{
                right: "50%",
                width: "100%",
              }}
            >
              <div className={cn(
                "h-full w-full transition-all",
                step.status === "done" || step.status === "current"
                  ? "bg-primary"
                  : step.status === "rejected"
                    ? "bg-destructive"
                    : "bg-muted-foreground/20",
                step.status === "current" && "bg-gradient-to-r from-primary to-primary/40",
                step.status === "pending" && (steps[idx - 1]?.status === "current"
                  ? "bg-gradient-to-r from-primary/40 to-muted-foreground/20"
                  : ""),
              )} style={{
                // dashed for pending
                ...(step.status === "pending" && steps[idx - 1]?.status !== "done" && steps[idx - 1]?.status !== "current"
                  ? { backgroundImage: "repeating-linear-gradient(90deg, hsl(var(--muted-foreground)/0.2) 0, hsl(var(--muted-foreground)/0.2) 6px, transparent 6px, transparent 12px)", backgroundColor: "transparent", backgroundSize: "12px 100%" }
                  : {})
              }} />
            </div>
          )}

          {/* Circle */}
          <div className={cn(
            "relative z-10 rounded-full flex items-center justify-center border-[3px] transition-all shadow-sm",
            circleSize,
            step.status === "done"
              ? "bg-primary border-primary text-primary-foreground"
              : step.status === "current"
                ? "bg-background border-primary text-primary ring-4 ring-primary/20"
                : step.status === "rejected"
                  ? "bg-destructive border-destructive text-destructive-foreground"
                  : step.status === "warning"
                    ? "bg-background border-orange-500 text-orange-500 ring-4 ring-orange-500/20"
                    : "bg-background border-muted-foreground/30 text-muted-foreground/40"
          )}>
            {step.status === "done" ? (
              <Check className={iconSize} strokeWidth={3} />
            ) : step.status === "rejected" ? (
              <X className={iconSize} strokeWidth={3} />
            ) : step.status === "current" ? (
              <Clock className={cn(iconSize, "animate-pulse")} />
            ) : step.status === "warning" ? (
              <AlertTriangle className={iconSize} />
            ) : step.icon ? (
              step.icon
            ) : (
              <div className={cn("rounded-full bg-muted-foreground/20", size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5")} />
            )}
          </div>

          {/* Label */}
          <span className={cn(
            "mt-1.5 text-center font-medium leading-tight max-w-[80px]",
            fontSize,
            step.status === "done" || step.status === "current"
              ? "text-foreground"
              : step.status === "rejected"
                ? "text-destructive"
                : "text-muted-foreground/50"
          )}>
            {step.label}
          </span>

          {/* Sublabel */}
          {step.sublabel && (
            <span className={cn("text-center leading-tight text-muted-foreground", dateFontSize)}>
              {step.sublabel}
            </span>
          )}

          {/* Date */}
          {step.date && (
            <span className={cn("text-muted-foreground mt-0.5", dateFontSize)}>
              {format(new Date(step.date), "dd/MM/yy", { locale: th })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// === Helper functions for specific flows ===

export function getGoodsIssueSteps(request: any): ProcessStep[] {
  const status = request.status;
  const hasApproval = status === "pending_approval" || request.approval_status === "pending" || request.approved_at;

  const steps: ProcessStep[] = [
    {
      label: "ส่งคำขอ",
      status: "done",
      date: request.created_at,
    },
  ];

  // Approval step (only if applicable)
  if (hasApproval || status === "pending_approval") {
    if (status === "rejected") {
      steps.push({ label: "อนุมัติ", status: "rejected", sublabel: "ไม่อนุมัติ" });
    } else if (request.approved_at || status === "issued" || status === "approved") {
      steps.push({ label: "อนุมัติ", status: "done", date: request.approved_at });
    } else {
      steps.push({ label: "รออนุมัติ", status: "current" });
    }
  }

  // Issue step
  if (status === "rejected") {
    steps.push({ label: "จ่ายสินค้า", status: "pending" });
  } else if (status === "issued") {
    steps.push({ label: "จ่ายสินค้า", status: "done", date: request.issued_at });
  } else if (status === "waiting_stock") {
    steps.push({ label: "รอสินค้า", status: "warning" });
  } else if (status === "approved" || (status === "pending" && !hasApproval)) {
    steps.push({ label: "จ่ายสินค้า", status: "current" });
  } else {
    steps.push({ label: "จ่ายสินค้า", status: "pending" });
  }

  // Confirmation step
  if (status === "issued") {
    // Check if delivery confirmation exists
    steps.push({ label: "ยืนยันรับ", status: request.confirmed_at ? "done" : "current", date: request.confirmed_at });
  } else {
    steps.push({ label: "ยืนยันรับ", status: "pending" });
  }

  return steps;
}

export function getEquipmentLoanSteps(loan: any): ProcessStep[] {
  const status = loan.status;
  const isOverdue = new Date(loan.due_date) < new Date() && status === "approved" && loan.returned_quantity < loan.quantity;

  const steps: ProcessStep[] = [
    {
      label: "ขอยืม",
      status: "done",
      date: loan.created_at,
    },
  ];

  // Approval
  if (status === "rejected") {
    steps.push({ label: "อนุมัติ", status: "rejected", sublabel: "ปฏิเสธ" });
  } else if (status === "approved" || status === "returned") {
    steps.push({ label: "อนุมัติ", status: "done", date: loan.approved_at });
  } else {
    steps.push({ label: "รออนุมัติ", status: "current" });
  }

  // Active/Borrowing
  if (status === "rejected") {
    steps.push({ label: "กำลังยืม", status: "pending" });
  } else if (status === "approved") {
    if (isOverdue) {
      steps.push({ label: "เกินกำหนด", status: "warning" });
    } else if (loan.returned_quantity > 0 && loan.returned_quantity < loan.quantity) {
      steps.push({ label: "คืนบางส่วน", status: "current", sublabel: `${loan.returned_quantity}/${loan.quantity}` });
    } else {
      steps.push({ label: "กำลังยืม", status: "current" });
    }
  } else if (status === "returned") {
    steps.push({ label: "กำลังยืม", status: "done" });
  } else {
    steps.push({ label: "กำลังยืม", status: "pending" });
  }

  // Returned
  if (status === "returned" || loan.returned_quantity >= loan.quantity) {
    steps.push({ label: "คืนแล้ว", status: "done", date: loan.return_date });
  } else {
    steps.push({ label: "คืนแล้ว", status: "pending" });
  }

  return steps;
}
