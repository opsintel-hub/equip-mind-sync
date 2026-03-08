import { CheckCircle2, Clock, X, ShieldCheck, ShoppingCart, Truck, Package } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DSTimelineProps {
  shipment: any;
}

const steps = [
  { key: "created", label: "สร้างคำขอ", icon: Package },
  { key: "approved", label: "อนุมัติ", icon: ShieldCheck },
  { key: "shipped", label: "จัดซื้อ-ส่งของ", icon: ShoppingCart },
  { key: "confirmed", label: "ผู้รับยืนยัน", icon: Truck },
];

function getStepStatus(stepKey: string, status: string) {
  const order = ["pending_approval", "approved", "pending_confirmation", "confirmed"];
  const stepMap: Record<string, number> = { created: 0, approved: 1, shipped: 2, confirmed: 3 };
  const statusMap: Record<string, number> = { pending_approval: 0, approved: 1, rejected: -1, pending_confirmation: 2, confirmed: 3, issue_reported: 3, cancelled: -1 };

  const stepIdx = stepMap[stepKey] ?? 0;
  const statusIdx = statusMap[status] ?? 0;

  if (status === "rejected" || status === "cancelled") {
    if (stepKey === "created") return "done";
    if (status === "rejected" && stepKey === "approved") return "rejected";
    return "pending";
  }
  if (status === "issue_reported" && stepKey === "confirmed") return "issue";

  if (statusIdx > stepIdx) return "done";
  if (statusIdx === stepIdx) return "current";
  return "pending";
}

export function DSTimeline({ shipment }: DSTimelineProps) {
  const status = shipment.status;

  const getDate = (stepKey: string) => {
    switch (stepKey) {
      case "created": return shipment.created_at;
      case "approved": return shipment.approved_at;
      case "shipped": return shipment.processed_at || shipment.shipping_date;
      case "confirmed": return shipment.confirmed_at;
      default: return null;
    }
  };

  return (
    <div className="flex items-start justify-between gap-1 px-2 py-4">
      {steps.map((step, idx) => {
        const stepStatus = getStepStatus(step.key, status);
        const date = getDate(step.key);
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex flex-col items-center flex-1 relative">
            {/* Connector line */}
            {idx > 0 && (
              <div className={cn(
                "absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 z-0",
                stepStatus === "done" || stepStatus === "current" ? "bg-primary" : 
                stepStatus === "rejected" ? "bg-destructive" : "bg-muted-foreground/20"
              )} style={{ left: "-50%" }} />
            )}
            {/* Circle */}
            <div className={cn(
              "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
              stepStatus === "done" ? "bg-primary border-primary text-primary-foreground" :
              stepStatus === "current" ? "bg-primary/10 border-primary text-primary animate-pulse" :
              stepStatus === "rejected" ? "bg-destructive/10 border-destructive text-destructive" :
              stepStatus === "issue" ? "bg-orange-100 border-orange-500 text-orange-600 dark:bg-orange-950 dark:text-orange-400" :
              "bg-muted border-muted-foreground/30 text-muted-foreground/50"
            )}>
              {stepStatus === "done" ? <CheckCircle2 className="w-4 h-4" /> :
               stepStatus === "rejected" ? <X className="w-4 h-4" /> :
               stepStatus === "current" ? <Clock className="w-4 h-4" /> :
               <Icon className="w-4 h-4" />}
            </div>
            {/* Label */}
            <span className={cn(
              "text-xs mt-2 text-center font-medium",
              stepStatus === "done" || stepStatus === "current" ? "text-foreground" :
              stepStatus === "rejected" ? "text-destructive" : "text-muted-foreground/60"
            )}>
              {stepStatus === "rejected" && step.key === "approved" ? "ไม่อนุมัติ" :
               stepStatus === "issue" ? "มีปัญหา" : step.label}
            </span>
            {/* Date */}
            {date && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {format(new Date(date), "dd/MM/yy", { locale: th })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
