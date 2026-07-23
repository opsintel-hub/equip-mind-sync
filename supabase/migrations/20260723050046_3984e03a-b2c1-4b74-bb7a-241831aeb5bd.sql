
INSERT INTO public.admin_guide_entries (kind, entry_key, label, description, icon, color, bullets, related, display_order)
VALUES
 ('function','direct_shipping_request','ขอส่งตรง','สร้างคำขอส่งสินค้าตรงจาก Supplier ไปปลายทาง','Truck',NULL,ARRAY['สร้างคำขอส่งตรง','ติดตามสถานะคำขอ','แนบเอกสาร PR/PO'],ARRAY['ขอส่งตรง'],100),
 ('function','direct_shipping_approval','อนุมัติส่งตรง','อนุมัติ/ปฏิเสธคำขอส่งตรง (สำหรับ Manager)','ShieldCheck',NULL,ARRAY['อนุมัติคำขอส่งตรง','ปฏิเสธพร้อมเหตุผล'],ARRAY['อนุมัติส่งตรง'],101),
 ('function','direct_shipping_procurement','จัดซื้อ-ส่งตรง','ดำเนินการจัดซื้อและบันทึกการส่งตรง','ShoppingCart',NULL,ARRAY['บันทึก PO','บันทึกการส่ง','แนบ Lat/Lng ปลายทาง'],ARRAY['จัดซื้อ-ส่งตรง'],102),
 ('function','swap_request_create','แจ้ง Swap (ช่าง)','สร้างคำขอ Swap อุปกรณ์จากหน้างาน','Wrench',NULL,ARRAY['แจ้ง Swap ใหม่','เลือกอุปกรณ์เก่า/ใหม่','ระบุอาการเสีย'],ARRAY['Swap Wizard'],110),
 ('function','swap_request_manage','จัดการ Swap (คลัง)','ดูและดำเนินการคำขอ Swap','Package',NULL,ARRAY['อนุมัติ/ปฏิเสธคำขอ Swap','บันทึกผลการ Swap'],ARRAY['Swap Wizard'],111),
 ('function','assessment_view','ดูรายการประเมิน (ช่าง)','ดูสถานะการประเมินทรัพย์สินที่ถูกถอน','Eye',NULL,ARRAY['ดูรายการประเมิน','ติดตามผล'],ARRAY['บันทึกการประเมิน'],112),
 ('function','assessment_create','บันทึกประเมิน (คลัง)','บันทึกผลการประเมินทรัพย์สินที่ถูกถอน','ClipboardCheck',NULL,ARRAY['บันทึกผลประเมิน','เลือกปลายทาง (เคลม/ซ่อม/ทำลาย)'],ARRAY['บันทึกการประเมิน'],113),
 ('function','claim_view','ดูรายการเคลม (ช่าง)','ติดตามสถานะการเคลมกับ Supplier','Eye',NULL,ARRAY['ดูรายการเคลม','ติดตามสถานะ'],ARRAY['ติดตามการเคลม'],114),
 ('function','claim_create','สร้างเคลม (คลัง)','สร้างคำขอเคลมไปยัง Supplier','FileText',NULL,ARRAY['สร้างคำขอเคลม','แนบเอกสาร','บันทึกผลตอบกลับ'],ARRAY['ติดตามการเคลม'],115),
 ('function','md_equipment','MD: อุปกรณ์/อะไหล่','Tab อุปกรณ์ในหน้าข้อมูลหลัก','Package',NULL,ARRAY['เพิ่ม/แก้ไข/ลบข้อมูลอุปกรณ์','Import Excel'],ARRAY['ข้อมูลหลัก'],200),
 ('function','md_tools','MD: เครื่องมือ','Tab เครื่องมือในหน้าข้อมูลหลัก','Wrench',NULL,ARRAY['เพิ่ม/แก้ไขเครื่องมือ','อัปโหลดรูป/เอกสาร'],ARRAY['ข้อมูลหลัก'],201),
 ('function','md_media_player','MD: จัดการ Media Player','Tab Media Player และ workflow lists','MonitorPlay',NULL,ARRAY['จัดการรายการ MP','จัดการ Swap/Assessment/Claim master data'],ARRAY['ข้อมูลหลัก'],202),
 ('function','md_categories','MD: หมวดหมู่','Tab หมวดหมู่/หมวดหมู่ย่อย','Folder',NULL,ARRAY['จัดการ Category/Subcategory'],ARRAY['ข้อมูลหลัก'],203),
 ('function','md_warehouses','MD: คลังสินค้า','Tab คลังสินค้า','Warehouse',NULL,ARRAY['จัดการคลังสินค้า'],ARRAY['ข้อมูลหลัก'],204),
 ('function','md_locations','MD: ตำแหน่งจัดเก็บ','Tab ตำแหน่งจัดเก็บภายในคลัง','MapPin',NULL,ARRAY['จัดการตำแหน่งจัดเก็บ'],ARRAY['ข้อมูลหลัก'],205),
 ('function','md_suppliers','MD: ผู้จัดจำหน่าย','Tab Suppliers','Building2',NULL,ARRAY['จัดการผู้จัดจำหน่าย'],ARRAY['ข้อมูลหลัก'],206),
 ('function','md_contractors','MD: ผู้รับเหมา','Tab ผู้รับเหมา','HardHat',NULL,ARRAY['จัดการผู้รับเหมา'],ARRAY['ข้อมูลหลัก'],207),
 ('function','md_departments','MD: ฝ่าย','Tab Departments','Users',NULL,ARRAY['จัดการฝ่าย'],ARRAY['ข้อมูลหลัก'],208),
 ('function','md_sections','MD: แผนก','Tab Sections','Users',NULL,ARRAY['จัดการแผนก'],ARRAY['ข้อมูลหลัก'],209),
 ('function','md_companies','MD: บริษัท','Tab บริษัท','Building2',NULL,ARRAY['จัดการบริษัท'],ARRAY['ข้อมูลหลัก'],210),
 ('function','md_issue_purposes','MD: วัตถุประสงค์เบิก','Tab วัตถุประสงค์การเบิก','ClipboardList',NULL,ARRAY['จัดการวัตถุประสงค์เบิก'],ARRAY['ข้อมูลหลัก'],211),
 ('function','md_receipt_purposes','MD: วัตถุประสงค์รับ','Tab วัตถุประสงค์การรับ','ClipboardList',NULL,ARRAY['จัดการวัตถุประสงค์รับ'],ARRAY['ข้อมูลหลัก'],212),
 ('function','md_technicians','MD: ทะเบียนช่าง','Tab ช่างและเครื่องมือประจำตัว','Wrench',NULL,ARRAY['จัดการช่าง/เครื่องมือประจำตัว'],ARRAY['ข้อมูลหลัก'],213),
 ('function','md_pm_action_types','MD: PM Action Types','Tab ประเภท PM Action','Settings',NULL,ARRAY['จัดการประเภท PM Action'],ARRAY['ข้อมูลหลัก'],214)
ON CONFLICT (kind, entry_key) DO NOTHING;
