import { ProcessTracker, ProcessStep } from "@/components/ProcessTracker";

interface DSTimelineProps {
  shipment: any;
}

function getDSSteps(shipment: any): ProcessStep[] {
  const status = shipment.status;

  const steps: ProcessStep[] = [
    {
      label: "สร้างคำขอ",
      status: "done",
      date: shipment.created_at,
    },
  ];

  // Approval
  if (status === "rejected") {
    steps.push({ label: "อนุมัติ", status: "rejected", sublabel: "ไม่อนุมัติ" });
  } else if (status === "cancelled") {
    steps.push({ label: "ยกเลิก", status: "rejected", date: shipment.cancelled_at });
  } else if (["approved", "pending_confirmation", "confirmed", "issue_reported"].includes(status)) {
    steps.push({ label: "อนุมัติ", status: "done", date: shipment.approved_at });
  } else {
    steps.push({ label: "รออนุมัติ", status: "current" });
  }

  // Processing/Shipping
  if (status === "rejected" || status === "cancelled") {
    steps.push({ label: "จัดซื้อ-ส่งของ", status: "pending" });
  } else if (["pending_confirmation", "confirmed", "issue_reported"].includes(status)) {
    steps.push({ label: "จัดซื้อ-ส่งของ", status: "done", date: shipment.processed_at || shipment.shipping_date });
  } else if (status === "approved") {
    steps.push({ label: "จัดซื้อ-ส่งของ", status: "current" });
  } else {
    steps.push({ label: "จัดซื้อ-ส่งของ", status: "pending" });
  }

  // Confirmation
  if (status === "confirmed") {
    steps.push({ label: "ผู้รับยืนยัน", status: "done", date: shipment.confirmed_at });
  } else if (status === "issue_reported") {
    steps.push({ label: "มีปัญหา", status: "warning" });
  } else if (status === "pending_confirmation") {
    steps.push({ label: "ผู้รับยืนยัน", status: "current" });
  } else {
    steps.push({ label: "ผู้รับยืนยัน", status: "pending" });
  }

  return steps;
}

export function DSTimeline({ shipment }: DSTimelineProps) {
  return <ProcessTracker steps={getDSSteps(shipment)} size="sm" />;
}
