UPDATE public.system_settings
SET value = jsonb_set(
  jsonb_set(
    value,
    '{system_prompt}',
    to_jsonb(
      COALESCE(value->>'system_prompt', '') ||
      E'\n\nเพิ่มเติม: buyer_company_name คือชื่อบริษัทผู้ซื้อ/ผู้ออก PO ที่ปรากฏบนหัวกระดาษ (Letterhead) ด้านบนสุดของเอกสาร เช่น "Plan B Media Public Company Limited" หรือ "บริษัท แพลน บี มีเดีย จำกัด (มหาชน)" ห้ามสับสนกับ Vendor (ผู้ขาย/ผู้รับเงิน) ให้ดึงชื่อเต็มตามที่ปรากฏบนหัวกระดาษ'
    )
  ),
  '{extraction_schema,parameters,properties,buyer_company_name}',
  '{"type":"string","description":"ชื่อบริษัทผู้ซื้อ/ผู้ออก PO ตามที่ปรากฏบนหัวกระดาษ (Letterhead) เช่น Plan B Media Public Company Limited - ห้ามสับสนกับ Vendor"}'::jsonb
)
WHERE key = 'ocr_po_config';