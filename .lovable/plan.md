

## แผนพัฒนา: PO OCR Auto-fill + ระบบปรับแต่ง

ครอบคลุมทุกเรื่องที่ถาม: (1) Format PO เปลี่ยน (2) เพิ่ม field ที่ดึงจาก PO (3) Matching สินค้ากับระบบ (4) การ Setup และดูแลระบบ OCR ในอนาคต

---

### 1. สถาปัตยกรรมที่รองรับการปรับแต่ง

```text
┌─────────────────────────────────────────────────────────┐
│  Edge Function: ocr-purchase-order                      │
│                                                         │
│  ┌─────────────────────────────────────┐                │
│  │  SYSTEM PROMPT (ปรับได้ในไฟล์เดียว)  │ ← จุดปรับ #1  │
│  │  - คำสั่งอ่าน PO                     │               │
│  │  - JSON Schema ที่ต้องการ            │               │
│  │  - ตัวอย่าง field mapping            │               │
│  └─────────────────────────────────────┘                │
│                                                         │
│  ┌─────────────────────────────────────┐                │
│  │  TOOL CALLING SCHEMA               │ ← จุดปรับ #2   │
│  │  - ระบุ field ทั้งหมดที่ต้องดึง       │               │
│  │  - เพิ่ม/ลด field ได้ทันที            │               │
│  └─────────────────────────────────────┘                │
│                                                         │
│  Model: Gemini 3 Flash Preview (เร็ว+ถูก)              │
│  ใช้ multimodal: ส่ง PDF เป็น base64 ให้ AI อ่าน       │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Component: POUploadOCR.tsx                             │
│                                                         │
│  ┌─────────────────────────────────────┐                │
│  │  FIELD_MAPPING config              │ ← จุดปรับ #3   │
│  │  - OCR field → ระบบ field           │               │
│  │  - Match logic (vendor_code → supplier) │            │
│  │  - Match logic (item_no → equipment)    │            │
│  └─────────────────────────────────────┘                │
│                                                         │
│  Review Table: แก้ไขได้ทุก field ก่อน Import            │
└─────────────────────────────────────────────────────────┘
```

---

### 2. ไฟล์ที่ต้องสร้าง/แก้ไข

#### 2.1 สร้าง Edge Function: `supabase/functions/ocr-purchase-order/index.ts`

- รับ PDF เป็น base64 จาก client
- ส่งให้ Lovable AI Gateway (`google/gemini-3-flash-preview`) พร้อม System Prompt + Tool Calling Schema
- **System Prompt** เขียนแยกเป็น const ชัดเจน ง่ายต่อการแก้ไข:

```typescript
const SYSTEM_PROMPT = `คุณเป็นผู้เชี่ยวชาญอ่านเอกสาร Purchase Order (PO)
อ่านเอกสาร PO ที่แนบมา และดึงข้อมูลตาม schema ที่กำหนด
- วันที่ให้แปลงเป็น YYYY-MM-DD
- ราคาให้เป็นตัวเลขล้วน ไม่มีเครื่องหมาย comma
- ถ้าอ่านไม่ได้ให้ใส่ null
- รองรับ PO หลาย format (Plan B Media, ทั่วไป)`;
```

- **Tool Calling Schema** กำหนด field ทั้งหมดที่ต้องดึง:

```typescript
const EXTRACTION_SCHEMA = {
  name: "extract_po_data",
  description: "Extract structured data from Purchase Order PDF",
  parameters: {
    type: "object",
    properties: {
      po_number: { type: "string" },
      po_date: { type: "string", description: "YYYY-MM-DD" },
      vendor_code: { type: "string" },
      vendor_name: { type: "string" },
      vendor_address: { type: "string" },
      vendor_phone: { type: "string" },
      pr_number: { type: "string" },
      department: { type: "string" },
      payment_terms: { type: "string" },
      receipt_date: { type: "string", description: "YYYY-MM-DD" },
      contract_ref: { type: "string" },
      quote_no: { type: "string" },
      comment: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item_no: { type: "string" },
            description: { type: "string" },
            asset_no: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string" },
            unit_price: { type: "number" },
            amount: { type: "number" }
          },
          required: ["description", "quantity", "unit"]
        }
      },
      total_excl_vat: { type: "number" },
      vat: { type: "number" },
      total_incl_vat: { type: "number" }
    },
    required: ["po_number", "items"]
  }
};
```

**การปรับ Format PO ใหม่**: แก้ไข `SYSTEM_PROMPT` ให้ระบุ format ใหม่ หรือเพิ่มตัวอย่าง → AI จะปรับการอ่านอัตโนมัติ

**การเพิ่ม field ใหม่**: เพิ่ม property ใน `EXTRACTION_SCHEMA.parameters.properties` → AI จะดึงให้อัตโนมัติ

#### 2.2 สร้าง Component: `src/components/delivery/POUploadOCR.tsx`

**โครงสร้าง UI ของ Dialog**:

```text
┌─── Dialog: นำเข้าจาก PO ────────────────────────────┐
│                                                       │
│  [1. เลือกไฟล์ PO]                                    │
│  ┌───────────────────────────────────────────────┐    │
│  │  📄 ลากไฟล์ PDF มาวาง หรือคลิกเลือกไฟล์       │    │
│  │     (จำกัด 10MB, เฉพาะ PDF)                    │    │
│  └───────────────────────────────────────────────┘    │
│  [อ่านข้อมูล PO]  ← กดแล้วเรียก Edge Function        │
│                                                       │
│  [2. ตรวจสอบข้อมูล]  ← แสดงหลัง OCR สำเร็จ          │
│  ┌─ ข้อมูลหัว ──────────────────────────────────┐    │
│  │  PO No: [PO20100177]     PR No: [PR2010135]   │    │
│  │  Vendor: [002402 - เวีย กรุ๊ป] ✅ พบในระบบ     │    │
│  │  ฝ่าย: [Online Media] ✅ พบในระบบ              │    │
│  │  Payment: [CASH]  Receipt: [25/12/20]         │    │
│  └───────────────────────────────────────────────┘    │
│  ┌─ รายการสินค้า ────────────────────────────────┐    │
│  │ # │ Item No         │ รายละเอียด │ จำนวน │ ราคา │    │
│  │ 1 │ BS-A02015-P036  │ Software.. │  1    │ 350k │    │
│  │   │ ⚠️ ไม่พบในระบบ → [เลือกสินค้า ▾] / สินค้าใหม่ │  │
│  │ 2 │ BS-A02015-P036  │ Software.. │  1    │ 350k │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  [3. นำเข้าข้อมูล] → Auto-fill header + ตะกร้า       │
└───────────────────────────────────────────────────────┘
```

**Field Mapping Config** (อยู่ใน Component เป็น const แยก):

```typescript
// จุดปรับ #3: เพิ่ม/ลด mapping ได้ที่นี่
const FIELD_MAPPING = {
  // OCR field → ระบบ field
  po_number: 'poNumber',
  pr_number: 'prNumber',
  vendor_code: 'supplierId',     // match กับ suppliers.vendor_code
  vendor_name: 'supplierName',   // fallback ถ้า vendor_code ไม่ match
  department: 'departmentId',    // match กับ departments.name
  comment: 'notes',
  receipt_date: 'expectedDate',
} as const;
```

**Matching Logic** (3 ระดับ):

| ข้อมูลจาก PO | Match กับ | วิธี Match | ถ้าไม่พบ |
|-------------|----------|-----------|---------|
| `vendor_code` | `suppliers.vendor_code` | Exact match | แสดง ⚠️ + ให้เลือก Supplier จาก Dropdown |
| `department` | `departments.name` | Contains/fuzzy | แสดง ⚠️ + ให้เลือก Department จาก Dropdown |
| `item_no` | `equipment.code` | Exact match | แสดง ⚠️ + ให้เลือกจาก SearchableSelect หรือ "สินค้าใหม่" |

**ทุก field แก้ไขได้** ก่อนกด "นำเข้าข้อมูล" — เพื่อรองรับกรณี AI อ่านผิด

#### 2.3 แก้ไข: `src/pages/DeliveryEntry.tsx`

- เพิ่มปุ่ม "นำเข้าจาก PO" ข้าง `<DeliveryImport>` ที่มีอยู่ (บรรทัด ~1157)
- เพิ่ม callback `handlePOImport(data)` ที่:
  - Auto-fill header fields: บริษัท, ฝ่าย, คลัง, PO No, PR No
  - Auto-fill Supplier ในแต่ละ item
  - เพิ่มรายการสินค้าลงตะกร้า (cart items) พร้อมราคาและจำนวน
  - Upload PDF ต้นฉบับไป Storage bucket `delivery-documents`
  - ตั้ง Receipt Purpose เป็น "ซื้อ" อัตโนมัติ

---

### 3. วิธีปรับแต่งในอนาคต (Setup Guide)

#### 3.1 เมื่อ Format PO เปลี่ยน

**สิ่งที่ต้องทำ**: แก้ไขไฟล์เดียว `supabase/functions/ocr-purchase-order/index.ts`

| สถานการณ์ | วิธีแก้ |
|----------|--------|
| Vendor ย้ายตำแหน่งใน PO | ไม่ต้องทำอะไร — AI อ่านจากบริบท ไม่ใช่ตำแหน่ง |
| PO จากบริษัทอื่น (ไม่ใช่ Plan B) | ไม่ต้องทำอะไร — AI รองรับหลาย format อยู่แล้ว |
| PO มี format แปลกมาก (เช่น ภาษาอื่น) | เพิ่มคำสั่งใน `SYSTEM_PROMPT` เช่น "รองรับ PO ภาษาอังกฤษและภาษาจีน" |
| PO เป็น Scan (ไม่มี Text Layer) | ไม่ต้องทำอะไร — Gemini อ่านจากภาพได้ (multimodal) |

#### 3.2 เมื่อต้องการเพิ่ม Field ที่ดึงจาก PO

**ขั้นตอน 3 จุด**:

1. **Edge Function** — เพิ่ม property ใน `EXTRACTION_SCHEMA`:
```typescript
// เช่น เพิ่ม delivery_address
delivery_address: { type: "string", description: "ที่อยู่จัดส่ง" }
```

2. **Component** — เพิ่มใน `FIELD_MAPPING` + แสดงใน Review Table:
```typescript
delivery_address: 'deliveryAddress',
```

3. **DeliveryEntry** — รับค่าใหม่ใน `handlePOImport` แล้ว set state

#### 3.3 เมื่อ Matching สินค้าไม่ตรง

**ปัจจุบัน**: Match ด้วย `equipment.code` = `item_no` จาก PO

**ถ้าต้องการเพิ่มวิธี Match**:
- แก้ไข `matchEquipment()` function ใน `POUploadOCR.tsx`
- เพิ่ม fallback: ค้นชื่อสินค้า (fuzzy match), ค้นตาม vendor part number, ฯลฯ

**ถ้าสินค้าใน PO ไม่มีในระบบเลย**:
- ระบบจะแสดง ⚠️ "ไม่พบในระบบ" + ให้ผู้ใช้เลือก:
  - เลือกสินค้าจาก SearchableSelect (match ด้วยตัวเอง)
  - ตั้งเป็น "สินค้าใหม่" → สร้างตอนรับเข้าคลัง

#### 3.4 การเปลี่ยน AI Model

แก้ไขบรรทัดเดียวใน Edge Function:
```typescript
// เปลี่ยนจาก Flash เป็น Pro ถ้าต้องการความแม่นยำสูงขึ้น
model: "google/gemini-2.5-pro"  // แม่นกว่า แต่ช้าและแพงกว่า
```

---

### 4. ไม่ต้องสร้าง Table ใหม่

ใช้ข้อมูลที่มีอยู่ทั้งหมด:
- `suppliers.vendor_code` — match vendor จาก PO
- `departments.name` — match department จาก PO
- `equipment.code` — match item จาก PO
- `goods_receipt_pending` — บันทึกรายการตามปกติ (มี `po_number`, `pr_number` อยู่แล้ว)
- Storage bucket `delivery-documents` — เก็บ PDF ต้นฉบับ (มีอยู่แล้ว)

---

### 5. สรุปขั้นตอนการ Implement

| # | งาน | ไฟล์ |
|---|------|------|
| 1 | สร้าง Edge Function OCR + deploy | `supabase/functions/ocr-purchase-order/index.ts` |
| 2 | สร้าง PO Upload Dialog component | `src/components/delivery/POUploadOCR.tsx` |
| 3 | เพิ่มปุ่ม + callback ใน DeliveryEntry | `src/pages/DeliveryEntry.tsx` |
| 4 | ทดสอบด้วย PDF ตัวอย่างทั้ง 2 ไฟล์ | curl Edge Function |

