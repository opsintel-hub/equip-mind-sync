import { describe, expect, test } from "bun:test";
import {
  toolEditFormSchema,
  toolCreateFormSchema,
  describeToolFormErrors,
  pmIntervalFromMatrix,
} from "./toolForm";

const editBase = { name: "คีมตัดลวด", unit: "ชิ้น" };

describe("tool form validation", () => {
  test("a tool with PM interval 0 saves", () => {
    expect(toolEditFormSchema.safeParse({ ...editBase, pm_interval_days: 0 }).success).toBe(true);
  });
  test("an empty PM interval saves as 0", () => {
    const parsed = toolEditFormSchema.safeParse({ ...editBase, pm_interval_days: "" });
    expect(parsed.success).toBe(true);
    expect(parsed.data.pm_interval_days).toBe(0);
  });
  test("a missing PM interval saves", () => {
    expect(toolEditFormSchema.safeParse(editBase).success).toBe(true);
  });
  test("a null PM interval from the database saves", () => {
    expect(toolEditFormSchema.safeParse({ ...editBase, pm_interval_days: null }).success).toBe(true);
  });
  test("a negative PM interval is rejected", () => {
    expect(toolEditFormSchema.safeParse({ ...editBase, pm_interval_days: -5 }).success).toBe(false);
  });
  test("a missing tool name is rejected and explained in Thai", () => {
    const parsed = toolEditFormSchema.safeParse({ ...editBase, name: "" });
    expect(parsed.success).toBe(false);
    expect(describeToolFormErrors(parsed.error?.errors ?? {})).toContain("ชื่อเครื่องมือ: กรุณากรอกชื่อเครื่องมือ");
  });
  test("a missing unit is rejected and explained in Thai", () => {
    const parsed = toolEditFormSchema.safeParse({ name: "คีม", unit: "" });
    expect(parsed.success).toBe(false);
    expect(describeToolFormErrors(parsed.error?.errors ?? {})).toContain("หน่วยนับ: กรุณากรอกหน่วยนับ");
  });
  test("a new tool still needs quantity and receiving date", () => {
    const parsed = toolCreateFormSchema.safeParse({ ...editBase, prefix: "TL", initial_quantity: 0, warehouse_entry_date: "" });
    expect(parsed.success).toBe(false);
    const messages = describeToolFormErrors(parsed.error?.errors ?? {});
    expect(messages).toContain("จำนวนเรมิ่ต้น: จำนวนต้องมากกว่า 0");
    expect(messages).toContain("วันที่นำเข้าคลัง: กรุณาเลือกวันที่นำเข้าคลัง");
  });
  test("PM matrix mirror is 0 without PM rows", () => {
    expect(pmIntervalFromMatrix([])).toBe(0);
    expect(pmIntervalFromMatrix([90, 30])).toBe(30);
  });
  test("form field errors are explained in Thai", () => {
    const messages = describeToolFormErrors({
      name: { type: "required", message: "กรุณากรอกชื่อเครื่องมือ" },
      unit: { type: "invalid", message: "กรุณากรอกหน่วยนับ" },
    });
    expect(messages).toEqual([
      "ชื่อเครื่องมือ: กรุณากรอกชื่อเครื่องมือ",
      "หน่วยนับ: กรุณากรอกหน่วยนับ",
    ]);
  });
});
