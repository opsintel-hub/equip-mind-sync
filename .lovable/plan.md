

## แผนพัฒนา: หน้าตั้งค่า PO OCR สำหรับ Super Admin

### ภาพรวม
ย้าย 3 จุดปรับแต่ง (System Prompt, Extraction Schema, Field Mapping) จาก hardcode ในโค้ดไปเก็บในฐานข้อมูล พร้อมสร้าง UI ให้ Super Admin แก้ไขได้จากหน้าเว็บโดยไม่ต้องแก้โค้ด

### สถาปัตยกรรม

```text
┌─ Admin Page (/admin) ─────────────────────────┐
│  แท็บ: จัดการผู้ใช้ │ คู่มือ │ [ตั้งค่า OCR]   │ ← แท็บใหม่ (Super Admin only)
│                                                │
│  ┌─ จุดปรับ #1: System Prompt ───────────┐     │
│  │  Textarea แก้ไข AI Prompt             │     │
│  └───────────────────────────────────────┘     │
│  ┌─ จุดปรับ #2: Extraction Schema ───────┐     │
│  │  JSON Editor แก้ไข field schema       │     │
│  └───────────────────────────────────────┘     │
│  ┌─ จุดปรับ #3: Field Mapping ───────────┐     │
│  │  Key-Value Editor mapping OCR→ระบบ    │     │
│  └───────────────────────────────────────┘     │
│  ┌─ AI Model ────────────────────────────┐     │
│  │  Dropdown เลือก Model                 │     │
│  └───────────────────────────────────────┘     │
│                           [บันทึก] [รีเซ็ต]    │
└────────────────────────────────────────────────┘
        │ save to DB
        ▼
┌─ system_settings table ───────────────────────┐
│  key: "ocr_po_config"                         │
│  value: { prompt, schema, mapping, model }    │
└───────────────────────────────────────────────┘
        │ read at runtime
        ▼
┌─ Edge Function: ocr-purchase-order ───────────┐
│  1. Read config from system_settings          │
│  2. Fallback to hardcoded defaults if empty   │
│  3. Use dynamic prompt + schema               │
└───────────────────────────────────────────────┘
```

### ไฟล์ที่ต้องสร้าง/แก้ไข

#### 1. สร้างตาราง `system_settings` (Migration)

```sql
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Super Admin/Admin can read
CREATE POLICY "Admins can read settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only Super Admin can update
CREATE POLICY "Super admins can manage settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Seed default OCR config
INSERT INTO public.system_settings (key, value) VALUES ('ocr_po_config', '{
  "system_prompt": "...default prompt...",
  "extraction_schema": { ...default schema... },
  "field_mapping": { ...default mapping... },
  "model": "google/gemini-3-flash-preview"
}');
```

#### 2. สร้าง Component: `src/components/admin/OCRConfigManager.tsx`

UI ประกอบด้วย 4 ส่วน:

| ส่วน | Input Type | คำอธิบาย |
|------|-----------|----------|
| System Prompt | Textarea (10 บรรทัด) | คำสั่งที่ส่งให้ AI อ่าน PO |
| Extraction Schema | Code Editor (Textarea + JSON validation) | JSON Schema กำหนด field ที่ดึง |
| Field Mapping | Key-Value pairs (เพิ่ม/ลบได้) | OCR field → ระบบ field |
| AI Model | Dropdown | เลือก model จาก Lovable AI |

**ฟีเจอร์เสริม**:
- ปุ่ม "รีเซ็ตค่าเริ่มต้น" — กลับไปใช้ค่า default ที่ hardcode ไว้
- JSON validation — ตรวจสอบ schema ก่อนบันทึก แจ้ง error ถ้า JSON ไม่ถูกต้อง
- แสดง "แก้ไขล่าสุดเมื่อ..." พร้อมชื่อผู้แก้ไข
- เฉพาะ Super Admin เท่านั้นที่เห็นแท็บนี้

#### 3. แก้ไข: `src/pages/Admin.tsx`

- เพิ่มแท็บ "ตั้งค่า OCR" (แสดงเฉพาะ `isSuperAdmin`)
- Import `OCRConfigManager` component
- เพิ่ม TabsTrigger + TabsContent

#### 4. แก้ไข: `supabase/functions/ocr-purchase-order/index.ts`

- เพิ่ม Supabase client ใน Edge Function เพื่ออ่าน `system_settings`
- อ่าน config จาก DB ก่อน → ถ้าไม่พบให้ fallback ใช้ค่า default ที่ hardcode ไว้
- ใช้ dynamic prompt, schema, และ model จาก config

```typescript
// Pseudocode
const config = await supabase
  .from("system_settings")
  .select("value")
  .eq("key", "ocr_po_config")
  .single();

const prompt = config?.value?.system_prompt || DEFAULT_SYSTEM_PROMPT;
const schema = config?.value?.extraction_schema || DEFAULT_EXTRACTION_SCHEMA;
const model = config?.value?.model || "google/gemini-3-flash-preview";
```

#### 5. แก้ไข: `src/components/delivery/POUploadOCR.tsx`

- อ่าน `field_mapping` จาก `system_settings` table แทน hardcode
- Fallback ใช้ค่า default ถ้าไม่พบใน DB

### สรุปขั้นตอน

| # | งาน | ไฟล์ |
|---|------|------|
| 1 | สร้างตาราง system_settings + RLS + seed | Migration SQL |
| 2 | สร้าง OCR Config UI component | `src/components/admin/OCRConfigManager.tsx` |
| 3 | เพิ่มแท็บ OCR ในหน้า Admin | `src/pages/Admin.tsx` |
| 4 | Edge Function อ่าน config จาก DB | `supabase/functions/ocr-purchase-order/index.ts` |
| 5 | POUploadOCR อ่าน field_mapping จาก DB | `src/components/delivery/POUploadOCR.tsx` |
| 6 | Deploy Edge Function | auto-deploy |

