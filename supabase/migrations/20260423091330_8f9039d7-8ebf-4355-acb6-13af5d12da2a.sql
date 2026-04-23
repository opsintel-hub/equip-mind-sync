
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins can insert settings"
  ON public.system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins can update settings"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins can delete settings"
  ON public.system_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_settings (key, value) VALUES ('ocr_po_config', '{
  "system_prompt": "คุณเป็นผู้เชี่ยวชาญอ่านเอกสาร Purchase Order (PO) ภาษาไทยและภาษาอังกฤษ\nอ่านเอกสาร PO ที่แนบมา และดึงข้อมูลให้ครบตาม function schema ที่กำหนด\n\nกฎสำคัญ:\n- วันที่ให้แปลงเป็น YYYY-MM-DD เสมอ (เช่น 15/10/20 → 2020-10-15)\n- ราคาให้เป็นตัวเลขล้วน ไม่มี comma (เช่น 350,000 → 350000)\n- ถ้าอ่านไม่ได้หรือไม่มีข้อมูลให้ใส่ null\n- รองรับ PO หลาย format (Plan B Media, ทั่วไป, บริษัทอื่น)\n- Item No คือรหัสสินค้า/รหัสอะไหล่ที่ระบุในตาราง\n- Description คือรายละเอียดสินค้า/บริการ\n- ดึง Vendor Code (รหัสผู้ขาย) จากหัวเอกสาร\n- ดึง PR Number (เลขที่ใบขอซื้อ) จากช่อง Refer PR หรือ PR No.",
  "extraction_schema": {
    "name": "extract_po_data",
    "description": "Extract structured data from Purchase Order PDF document",
    "parameters": {
      "type": "object",
      "properties": {
        "po_number": {"type": "string", "description": "เลขที่ PO เช่น PO20100177"},
        "po_date": {"type": "string", "description": "วันที่ PO ในรูปแบบ YYYY-MM-DD"},
        "vendor_code": {"type": "string", "description": "รหัสผู้ขาย/Vendor No เช่น 002402"},
        "vendor_name": {"type": "string", "description": "ชื่อผู้ขาย/บริษัท Vendor"},
        "vendor_address": {"type": "string", "description": "ที่อยู่ Vendor"},
        "vendor_phone": {"type": "string", "description": "เบอร์โทร Vendor"},
        "pr_number": {"type": "string", "description": "เลขที่ PR / Refer PR เช่น PR2010135"},
        "department": {"type": "string", "description": "ชื่อฝ่าย/Department เช่น Online Media"},
        "payment_terms": {"type": "string", "description": "เงื่อนไขชำระเงิน เช่น CASH, 15D"},
        "receipt_date": {"type": "string", "description": "วันรับสินค้า ในรูปแบบ YYYY-MM-DD"},
        "contract_ref": {"type": "string", "description": "อ้างอิงสัญญา/Contract"},
        "quote_no": {"type": "string", "description": "เลขที่ใบเสนอราคา"},
        "comment": {"type": "string", "description": "หมายเหตุ/Comment ในเอกสาร"},
        "items": {
          "type": "array",
          "description": "รายการสินค้า/บริการทั้งหมดในตาราง",
          "items": {
            "type": "object",
            "properties": {
              "item_no": {"type": "string", "description": "รหัสสินค้า/Item No"},
              "description": {"type": "string", "description": "รายละเอียดสินค้า/บริการ"},
              "asset_no": {"type": "string", "description": "เลขทรัพย์สิน/Asset No"},
              "quantity": {"type": "number", "description": "จำนวน"},
              "unit": {"type": "string", "description": "หน่วยนับ เช่น UNIT, PCS, EA"},
              "unit_price": {"type": "number", "description": "ราคาต่อหน่วย (ไม่รวม VAT)"},
              "amount": {"type": "number", "description": "จำนวนเงินรวม (ไม่รวม VAT)"}
            },
            "required": ["description", "quantity", "unit"]
          }
        },
        "total_excl_vat": {"type": "number", "description": "ยอดรวมก่อน VAT"},
        "vat": {"type": "number", "description": "VAT 7%"},
        "total_incl_vat": {"type": "number", "description": "ยอดรวมสุทธิ"}
      },
      "required": ["po_number", "items"]
    }
  },
  "field_mapping": {
    "po_number": "poNumber",
    "pr_number": "prNumber",
    "vendor_code": "supplierId",
    "vendor_name": "supplierName",
    "department": "departmentId",
    "comment": "notes",
    "receipt_date": "expectedDate"
  },
  "model": "google/gemini-3-flash-preview"
}'::jsonb);
