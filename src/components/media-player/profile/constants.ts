import {
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Hammer, RotateCcw, AlertTriangle,
} from "lucide-react";

export const MOVEMENT_TYPES = [
  { value: "receive", label: "รับเข้า", icon: ArrowDownToLine, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "issue", label: "จ่ายออก", icon: ArrowUpFromLine, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "transfer_in", label: "โอนเข้า", icon: ArrowLeftRight, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "transfer_out", label: "โอนออก", icon: ArrowLeftRight, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "install_to_billboard", label: "ติดตั้งป้าย", icon: Hammer, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "return_from_billboard", label: "ถอดจากป้าย", icon: RotateCcw, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  { value: "defective_return", label: "ของเสียเข้า", icon: AlertTriangle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "refurb_to_stock", label: "กลับเข้าคลัง (Refurb)", icon: RotateCcw, color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  { value: "return_to_stock", label: "กลับเข้าคลัง", icon: RotateCcw, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
];

export function getMovementMeta(type: string) {
  return MOVEMENT_TYPES.find(m => m.value === type) || MOVEMENT_TYPES[0];
}

export const CONDITION_OPTIONS = [
  { value: "normal", label: "ปกติ" },
  { value: "defective", label: "เสีย/ชำรุด" },
  { value: "pending_inspection", label: "รอตรวจสอบ" },
] as const;

export function getConditionDisplay(condition: string | null | undefined) {
  switch (condition) {
    case "normal":
      return { label: "ปกติ", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300" };
    case "defective":
      return { label: "เสีย/ชำรุด", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300" };
    case "pending_inspection":
      return { label: "รอตรวจสอบ", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300" };
    default:
      return { label: "ปกติ", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300" };
  }
}
