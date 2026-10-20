import * as z from "zod";

/**
 * PM interval is optional. 0 (or an empty field) means "this tool needs no
 * preventive maintenance" — the PM matrix is the real source of truth and this
 * legacy number only mirrors the smallest interval in it.
 */
export const toolPmInterval = z.coerce
  .number({ invalid_type_error: "ระยะเวลา PM ต้องเป็นตัวเลข" })
  .min(0, "ระยะเวลา PM ต้องไม่น้อยกว่า 0")
  .max(3650, "ระยะเวลา PM ต้องไม่เกิน 3650 วัน")
  .optional();

export const toolFormBaseShape = {
  name: z.string().min(1, "กรุณากรอกชื่อเครื่องมือ"),
  description: z.string().optional(),
  tool_category_id: z.string().optional(),
  tool_subcategory_id: z.string().optional(),
  department: z.string().optional(),
  company_id: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().min(1, "กรุณากรอกหน่วยนับ"),
  serial_number: z.string().optional(),
  unit_price: z.coerce.number().min(0).optional(),
  location_id: z.string().optional(),
  supplier_id: z.string().optional(),
  expiry_date: z.string().optional(),
  warranty_expiry_date: z.string().optional(),
  has_warranty: z.boolean().default(true),
  pm_interval_days: toolPmInterval,
  notes: z.string().optional(),
  is_asset: z.boolean().default(false),
  asset_code: z.string().optional(),
  responsible_person: z.string().optional(),
  is_personal_tool: z.boolean().default(false),
};

export const toolEditFormSchema = z.object({ ...toolFormBaseShape });

export const toolCreateFormSchema = z.object({
  prefix: z.string().min(1, "กรุณาเลือก Prefix รหัสเครื่องมือ"),
  ...toolFormBaseShape,
  initial_quantity: z.coerce.number().min(1, "จำนวนต้องมากกว่า 0"),
  warehouse_entry_date: z.string().min(1, "กรุณาเลือกวันที่นำเข้าคลัง"),
});

export type ToolEditFormValues = z.infer<typeof toolEditFormSchema>;
export type ToolCreateFormValues = z.infer<typeof toolCreateFormSchema>;

const toolFieldLabels: Record<string, string> = {
  prefix: "Prefix รหัส",
  name: "ชื่อเครื่องมือ",
  description: "รายละเอียด",
  tool_category_id: "หมวดหมู่",
  tool_subcategory_id: "หมวดหมู่ย่อย",
  department: "ฝ่าย",
  company_id: "บริษัท",
  brand: "ยี่ห้อ",
  unit: "หน่วยนับ",
  initial_quantity: "จำนวนเรมิ่ต้น",
  serial_number: "Serial Number",
  unit_price: "ราคาต่อชิ้น",
  warehouse_entry_date: "วันที่นำเข้าคลัง",
  location_id: "คลัง/ช่องจัดเก็บ",
  supplier_id: "ผู้จัดจำหน่าย",
  expiry_date: "วันหมดอายุ",
  warranty_expiry_date: "วันหมดประกัน",
  has_warranty: "การรบัประกัน",
  pm_interval_days: "ระยะเวลา PM",
  notes: "หมายเหตุ",
  is_asset: "ทรัพย์สิน",
  asset_code: "เลขที่ทรัพย์สิน",
  responsible_person: "ผู้รบัผิดชอบ",
  is_personal_tool: "เครื่องมือประจำตัว",
};

/**
 * Turns validation failures into readable Thai messages so a rejected save can
 * never look like a silent "nothing happens". Accepts both shapes that reach us:
 * react-hook-form field errors ({ field: { message } }) and a zod issue list.
 */
export const describeToolFormErrors = (errors: any): string[] => {
  if (!errors) return [];

  if (Array.isArray(errors)) {
    return errors.map((issue: any) => {
      const field = Array.isArray(issue?.path) ? String(issue.path[0] ?? "") : "";
      const label = toolFieldLabels[field] ?? field;
      const message = issue?.message ?? "กรุณาตรวจข้อมูล";
      return label ? `${label}: ${message}` : message;
    });
  }

  const messages: string[] = [];
  for (const [field, value] of Object.entries<any>(errors)) {
    if (value && typeof value === "object" && !("message" in value) && !("type" in value)) {
      messages.push(...describeToolFormErrors(value));
      continue;
    }
    const label = toolFieldLabels[field] ?? field;
    const message =
      value?.message ??
      (value?.type === "custom" ? "ข้อมูลไม่ถูกต้อง" : "กรุณาตรวจข้อมูล");
    messages.push(`${label}: ${message}`);
  }
  return messages;
};

/** pm_interval_days mirror of the PM matrix: 0 when the matrix is empty. */
export const pmIntervalFromMatrix = (intervals: number[]): number => {
  const valid = intervals.filter((n) => Number.isFinite(n) && n > 0);
  if (valid.length === 0) return 0;
  return Math.min(...valid);
};
