
CREATE TABLE public.admin_guide_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('role','function')),
  entry_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  bullets TEXT[] NOT NULL DEFAULT '{}',
  related TEXT[] NOT NULL DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kind, entry_key)
);

GRANT SELECT ON public.admin_guide_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admin_guide_entries TO authenticated;
GRANT ALL ON public.admin_guide_entries TO service_role;

ALTER TABLE public.admin_guide_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read guide entries"
  ON public.admin_guide_entries FOR SELECT
  USING (true);

CREATE POLICY "Super admins can insert guide entries"
  ON public.admin_guide_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update guide entries"
  ON public.admin_guide_entries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete guide entries"
  ON public.admin_guide_entries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_admin_guide_entries_updated_at
  BEFORE UPDATE ON public.admin_guide_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed roles
INSERT INTO public.admin_guide_entries (kind, entry_key, label, description, icon, color, bullets, related, display_order) VALUES
('role','super_admin','Super Admin (ผู้ดูแลระบบสูงสุด)','สิทธิ์สูงสุดในระบบ จัดการข้อมูลหลักทั้งหมดรวมถึงอุปกรณ์ คลังสินค้า ตำแหน่งจัดเก็บ','Shield','bg-amber-500/10 text-amber-700 border-amber-200',
ARRAY['ทุกสิทธิ์ของ Admin','จัดการ Tab อุปกรณ์/อะไหล่ ในหน้าข้อมูลหลัก','จัดการ Tab เครื่องมือ ในหน้าข้อมูลหลัก','จัดการ Tab คลังสินค้า ในหน้าข้อมูลหลัก','จัดการ Tab ตำแหน่งจัดเก็บ ในหน้าข้อมูลหลัก','จัดการ Tab Media Player ในหน้าข้อมูลหลัก'],
ARRAY[]::text[], 10),
('role','admin','Admin (ผู้ดูแลระบบ)','จัดการระบบทั่วไป ยกเว้นข้อมูลหลักบางส่วนที่สงวนให้ Super Admin','Shield','bg-red-500/10 text-red-600 border-red-200',
ARRAY['จัดการผู้ใช้งานและกำหนดสิทธิ์ทั้งหมด','เข้าถึงข้อมูลทุกฝ่ายโดยไม่มีข้อจำกัด','ใช้งานทุกฟังก์ชันในระบบ','รีเซ็ตรหัสผ่านผู้ใช้อื่น','จัดการข้อมูลหลัก (ยกเว้น อุปกรณ์/คลัง/ตำแหน่ง/Media Player)','ลบข้อมูลสินค้าและรายการต่างๆ'],
ARRAY[]::text[], 20),
('role','manager','Manager (ผู้จัดการ)','ดูแลภาพรวม อนุมัติรายการ และดูรายงาน','ClipboardCheck','bg-purple-500/10 text-purple-600 border-purple-200',
ARRAY['อนุมัติเบิกทรัพย์สิน (เฉพาะฝ่ายที่รับผิดชอบ)','ดูรายงานและสถิติการเคลื่อนไหวสต็อก','ติดตามคำขอเบิกสินค้าของทีม','ดูข้อมูลคลังสินค้าตามฝ่ายที่ได้รับสิทธิ์','ตรวจสอบประวัติการทำรายการ','ดูเฉพาะข้อมูลของฝ่ายที่รับผิดชอบ'],
ARRAY[]::text[], 30),
('role','warehouse_staff','เจ้าหน้าที่คลัง','ดูแลคลังสินค้า รับเข้า-จ่ายออก จัดการสต็อก','Warehouse','bg-blue-500/10 text-blue-600 border-blue-200',
ARRAY['รับสินค้าเข้าคลัง (Goods Receipt)','จ่ายสินค้าตามคำขอ (Goods Issue)','โอนย้ายสินค้าระหว่างสถานที่','แก้ไขข้อมูลสินค้าและจำนวนสต็อก','จัดการตำแหน่งจัดเก็บ','บันทึกงาน PM (บำรุงรักษา)'],
ARRAY[]::text[], 40),
('role','receiver','ผู้รับเข้าสินค้า','รับสินค้าจากผู้จำหน่าย บันทึกการส่งมอบ','PackageOpen','bg-green-500/10 text-green-600 border-green-200',
ARRAY['บันทึกการรับสินค้าเข้าคลัง','ตรวจสอบและยืนยันรายการที่รอรับ','อัพโหลดเอกสารการรับสินค้า','เพิ่มสินค้าใหม่เข้าระบบ (ถ้าได้รับสิทธิ์)'],
ARRAY[]::text[], 50),
('role','requester','ผู้เบิกสินค้า','สร้างคำขอเบิกสินค้า ติดตามสถานะ','Send','bg-orange-500/10 text-orange-600 border-orange-200',
ARRAY['สร้างคำขอเบิกสินค้า','ดูสถานะคำขอที่ส่งไป','ดูรายการสินค้าที่มีในคลัง (ตามฝ่ายที่ได้รับสิทธิ์)','ยกเลิกคำขอที่ยังไม่ได้จ่าย'],
ARRAY[]::text[], 60);

-- Seed functions
INSERT INTO public.admin_guide_entries (kind, entry_key, label, description, icon, color, bullets, related, display_order) VALUES
('function','delivery_entry','นำสินค้าเข้า','สร้างรายการนำสินค้าเข้า (สำหรับผู้นำเข้า)','PackageOpen','bg-lime-500/10 text-lime-600 border-lime-200',
ARRAY['สร้างรายการรับสินค้าใหม่ (Delivery Entry)','กรอกข้อมูลสินค้าและอัพโหลดเอกสารประกอบ','ระบุผู้ดำเนินการนำเข้าข้อมูล','ส่งต่อรายการให้เจ้าหน้าที่คลังรับเข้า'],
ARRAY['นำสินค้าเข้า'], 10),
('function','goods_receipt','รับเข้าคลัง','รับเข้าคลัง, จัดการ Media Player, รายการรอรหัส (สำหรับเจ้าหน้าที่คลัง)','PackageOpen','bg-green-500/10 text-green-600 border-green-200',
ARRAY['ตรวจสอบและยืนยันรายการที่รอรับเข้าคลัง','เพิ่มสินค้าใหม่เข้าระบบขณะรับเข้า','จัดการ Media Player','จัดการรายการรอรหัสสินค้า'],
ARRAY['รับเข้าคลัง','จัดการ Media Player','รายการรอรหัส'], 20),
('function','issue_request','ขอเบิกสินค้า','สร้างคำขอเบิกสินค้าเพื่อส่งให้คลังดำเนินการ','Send','bg-orange-500/10 text-orange-600 border-orange-200',
ARRAY['สร้างคำขอเบิกสินค้า','เลือกสินค้าและระบุจำนวนที่ต้องการ','ระบุจุดประสงค์การเบิก (ติดตั้ง, ซ่อม, PM)','ติดตามสถานะคำขอ'],
ARRAY['ขอเบิกสินค้า','หน้าหลักผู้เบิก'], 30),
('function','goods_issue','จ่ายสินค้า','จ่ายสินค้าตามคำขอที่ได้รับอนุมัติ','Package','bg-blue-500/10 text-blue-600 border-blue-200',
ARRAY['ดูรายการคำขอที่รอจ่าย','เลือกตำแหน่งจัดเก็บที่จะหยิบสินค้า','จ่ายสินค้าบางส่วนหรือทั้งหมด','พิมพ์ใบจ่ายสินค้า'],
ARRAY['จ่ายสินค้า','รายการรอจ่าย','รายการจ่ายไม่ครบ'], 40),
('function','master_data','ข้อมูลหลัก','จัดการข้อมูลพื้นฐานของระบบ','FileText','bg-purple-500/10 text-purple-600 border-purple-200',
ARRAY['จัดการหมวดหมู่สินค้า (Category, Subcategory)','จัดการผู้จำหน่าย (Suppliers)','จัดการสถานที่และคลังสินค้า','จัดการฝ่าย, แผนก, บริษัท','จัดการหน่วยนับ, ยี่ห้อ'],
ARRAY['ข้อมูลหลัก'], 50),
('function','reports','รายงาน','ดูรายงานและสถิติต่างๆ','BarChart3','bg-cyan-500/10 text-cyan-600 border-cyan-200',
ARRAY['รายงานสินค้าคงคลัง','รายงานการเคลื่อนไหวสต็อก','รายงานสินค้าใกล้หมดอายุ','รายงานสินค้าค้างสต็อก (Dead Stock)','ค้นหาเอกสาร'],
ARRAY['Dashboard','รายงานสินค้าคงคลัง','ประวัติเคลื่อนไหว','ค้นหาเอกสาร'], 60),
('function','billboards','ป้ายโฆษณา','จัดการข้อมูลป้ายโฆษณา','MapPin','bg-yellow-500/10 text-yellow-600 border-yellow-200',
ARRAY['ดูรายการป้ายโฆษณาทั้งหมด','เพิ่ม/แก้ไขข้อมูลป้าย','ดูอุปกรณ์ที่ติดตั้งในป้าย','สร้าง QR Code สำหรับป้าย'],
ARRAY['ป้ายโฆษณา','รายละเอียดป้าย','แจ้งปัญหาป้าย'], 70),
('function','pm_schedule','PM ป้ายโฆษณา','จัดการตารางบำรุงรักษาป้ายโฆษณา','Calendar','bg-indigo-500/10 text-indigo-600 border-indigo-200',
ARRAY['สร้างตาราง PM ป้ายโฆษณา','ดูงาน PM ที่ต้องทำ','บันทึกผล PM ที่ดำเนินการเสร็จ','ดูประวัติ PM'],
ARRAY['ตาราง PM ป้าย','งาน PM ป้าย','ประวัติ PM ป้าย'], 80),
('function','equipment_pm','PM เครื่องมือ','จัดการตารางบำรุงรักษาเครื่องมือและอุปกรณ์','Wrench','bg-pink-500/10 text-pink-600 border-pink-200',
ARRAY['สร้างตาราง PM เครื่องมือ','ดูงาน PM ที่ต้องทำ','บันทึกผลการตรวจสอบ','อัพโหลดรูปภาพประกอบ'],
ARRAY['ตาราง PM เครื่องมือ','งาน PM เครื่องมือ','ประวัติ PM เครื่องมือ'], 90),
('function','transfer','โอนย้ายสินค้า','โอนย้ายสินค้าระหว่างสถานที่จัดเก็บ','ArrowRightLeft','bg-teal-500/10 text-teal-600 border-teal-200',
ARRAY['โอนย้ายสินค้าระหว่างคลัง','โอนย้ายระหว่างตำแหน่งจัดเก็บ','ดูประวัติการโอนย้าย'],
ARRAY['โอนย้ายสินค้า','ประวัติโอนย้าย'], 100),
('function','ad_entry','นำเข้าภาพโฆษณา','กรอกข้อมูลภาพโฆษณาเข้าระบบ','PackageOpen','bg-amber-500/10 text-amber-600 border-amber-200',
ARRAY['นำเข้าภาพโฆษณาใหม่ (New Ads)','ขอใช้พื้นที่รับฝากชั่วคราว (Temporary Storage)','นำเข้าภาพโฆษณาเก่าที่ปลดจากป้าย (Old Ads)','ดูรายการภาพโฆษณาทั้งหมดและ Dashboard','จัดการ Master Data (ประเภทสื่อ, ขนาด)'],
ARRAY['นำเข้าภาพโฆษณา'], 110),
('function','ad_issue_request','เบิกภาพโฆษณา','สร้างคำขอเบิกภาพโฆษณา (สำหรับผู้เบิก)','Send','bg-orange-500/10 text-orange-600 border-orange-200',
ARRAY['สร้างคำขอเบิกภาพโฆษณา','เลือกภาพโฆษณาที่ต้องการเบิก','ระบุวัตถุประสงค์ (ติดตั้ง, ตรวจสภาพ, CSR)','ติดตามสถานะคำขอของตัวเอง'],
ARRAY['เบิกภาพโฆษณา'], 120),
('function','ad_warehouse','คลังภาพโฆษณา','รับเข้าคลังและจ่ายภาพโฆษณาออก (สำหรับเจ้าหน้าที่คลัง)','Package','bg-emerald-500/10 text-emerald-600 border-emerald-200',
ARRAY['ยืนยันรับภาพโฆษณาเข้าคลัง','ตรวจสอบสภาพสื่อก่อนรับเข้า','ดูคำขอเบิกทั้งหมดจากทุกคน','ยืนยันจ่ายภาพโฆษณาออก','ยืนยันการติดตั้งเสร็จสิ้น'],
ARRAY['รับเข้าคลังภาพ','จ่ายภาพโฆษณา'], 130),
('function','admin','จัดการระบบ','จัดการผู้ใช้งานและสิทธิ์การเข้าถึง','Shield','bg-red-500/10 text-red-600 border-red-200',
ARRAY['จัดการผู้ใช้งานในระบบ','กำหนดบทบาทผู้ใช้','กำหนดสิทธิ์ตามฟังก์ชัน','กำหนดสิทธิ์ตามฝ่าย','รีเซ็ตรหัสผ่าน'],
ARRAY['จัดการผู้ใช้งาน'], 140),
('function','delivery_confirm','ยืนยันรับสินค้า','ยืนยันการรับสินค้าที่จัดส่งพร้อมแจ้งปัญหา','Package','bg-sky-500/10 text-sky-600 border-sky-200',
ARRAY['ยืนยันรับสินค้าที่จัดส่ง','แจ้งปัญหาสินค้า (ชำรุด, ไม่ครบ, ผิดรุ่น ฯลฯ)','อัพโหลดรูปภาพ/วิดีโอเป็นหลักฐาน','ดูประวัติการยืนยันรับ'],
ARRAY['ยืนยันรับสินค้า'], 150),
('function','manager_approval','อนุมัติเบิกทรัพย์สิน','อนุมัติคำขอเบิกสินค้าที่เป็นทรัพย์สิน (เฉพาะ Manager ฝ่ายนั้น)','Shield','bg-violet-500/10 text-violet-600 border-violet-200',
ARRAY['ดูคำขอเบิกทรัพย์สินที่รออนุมัติ (เฉพาะฝ่ายที่รับผิดชอบ)','อนุมัติ/ปฏิเสธคำขอเบิก','ดูประวัติการอนุมัติ','กรองตามฝ่าย บริษัท สถานะ ช่วงวันที่'],
ARRAY['อนุมัติเบิกทรัพย์สิน'], 160);
