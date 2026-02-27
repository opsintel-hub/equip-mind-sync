import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Download, ChevronRight, ChevronDown,
  LayoutDashboard, Package, Truck, PackageCheck, Monitor, FileKey,
  ShoppingCart, User, ArrowLeftRight, Clock, MapPin, Calendar, History,
  ImageIcon, FileOutput, Wrench, ClipboardList, FileSearch, Archive, Search,
  Database, Bell, Shield, BookOpen, Lock, Layers, AlertTriangle, Settings,
  CheckCircle, XCircle, BarChart3, Upload, QrCode, Eye, Zap, Filter
} from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ManualSection {
  id: string;
  number: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: React.ReactNode;
}

const UserManual = () => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["overview"]));

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(sections.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const sections: ManualSection[] = [
    {
      id: "overview",
      number: "1",
      title: "ภาพรวมระบบ",
      icon: <LayoutDashboard className="h-5 w-5" />,
      description: "แนะนำระบบ โครงสร้าง และแนวคิดหลัก",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            ระบบบริหารจัดการคลังสินค้าและอุปกรณ์ (Equipment Tracking System) เป็นระบบเว็บแอปพลิเคชัน
            สำหรับจัดการคลังสินค้า อุปกรณ์ เครื่องมือ ป้ายโฆษณา และภาพโฆษณา แบบครบวงจร
            ตั้งแต่การนำเข้า การจัดเก็บ การเบิกจ่าย ไปจนถึงการบำรุงรักษา
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "คลังสินค้า", desc: "นำเข้า-เบิกจ่าย-โอนย้าย-ยืมข้ามบริษัท" },
              { label: "ป้ายโฆษณา", desc: "จัดการป้าย ติดตั้ง/ถอดอุปกรณ์ PM ป้าย" },
              { label: "ภาพโฆษณา", desc: "นำเข้า-รับเข้าคลัง-เบิก-จ่ายภาพโฆษณา" },
              { label: "เครื่องมือ", desc: "ข้อมูลเครื่องมือ PM เครื่องมือ รายงาน PM" },
              { label: "รายงาน", desc: "สรุปสต็อก Dead Stock เอกสาร ใบขอซื้อ" },
              { label: "ระบบสิทธิ์", desc: "บทบาท ฝ่าย ฟังก์ชัน 3 ชั้นความปลอดภัย" },
            ].map((item, i) => (
              <div key={i} className="p-3 border rounded-lg bg-muted/30">
                <h4 className="font-semibold text-sm">{item.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          <Separator />
          <h4 className="font-semibold">Flow หลักของระบบ</h4>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {["นำสินค้าเข้า", "→", "รับเข้าคลัง", "→", "จัดเก็บ", "→", "ขอเบิก", "→", "อนุมัติ", "→", "จ่ายสินค้า"].map((step, i) => (
              step === "→"
                ? <ChevronRight key={i} className="h-4 w-4 text-muted-foreground" />
                : <Badge key={i} variant="secondary" className="text-xs">{step}</Badge>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "auth",
      number: "2",
      title: "ระบบยืนยันตัวตนและสิทธิ์ผู้ใช้",
      icon: <Shield className="h-5 w-5" />,
      description: "การ Login, สมัครสมาชิก, บทบาท, และระบบสิทธิ์ 3 ชั้น",
      content: (
        <div className="space-y-5">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Lock className="h-4 w-4" /> การเข้าสู่ระบบ</h4>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1 ml-2">
              <li>เปิดหน้า Login กรอก Email และ Password</li>
              <li>ระบบตรวจสอบข้อมูลกับฐานข้อมูล ถ้าถูกต้องจะเข้าสู่ Dashboard</li>
              <li>หากยังไม่มีบัญชี คลิก "สมัครสมาชิก" กรอก ชื่อ-นามสกุล, Email, Password, เบอร์โทร</li>
              <li>ระบบจะส่ง Email ยืนยัน ต้องคลิกลิงก์ยืนยันก่อนจึงจะ Login ได้</li>
            </ol>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-3">บทบาทผู้ใช้ (Roles)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-muted">
                  <tr>
                    <th className="border p-2 text-left w-36">บทบาท</th>
                    <th className="border p-2 text-left">ความสามารถหลัก</th>
                    <th className="border p-2 text-left w-48">ตัวอย่างการใช้งาน</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr><td className="border p-2 font-medium text-foreground">Admin</td><td className="border p-2">เข้าถึงทุกฟังก์ชัน, จัดการผู้ใช้/สิทธิ์, แก้ไข Master Data, ดูรายงานทุกแผนก</td><td className="border p-2">ผู้ดูแลระบบ, IT Admin</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Manager</td><td className="border p-2">อนุมัติ/ปฏิเสธคำขอเบิก, ดูรายงาน, ดูสต็อกตามแผนกที่ดูแล</td><td className="border p-2">ผู้จัดการฝ่าย, หัวหน้างาน</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Warehouse Staff</td><td className="border p-2">รับเข้าคลัง, จ่ายสินค้า, โอนย้าย, จัดการสถานที่จัดเก็บ, PM</td><td className="border p-2">เจ้าหน้าที่คลังสินค้า</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Receiver</td><td className="border p-2">บันทึกการนำสินค้าเข้า (Delivery Entry), รับเข้าคลัง, สร้างอุปกรณ์ใหม่</td><td className="border p-2">ผู้รับสินค้าหน้าคลัง</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Requester</td><td className="border p-2">สร้างคำขอเบิก, ดูสถานะคำขอ, ยกเลิกคำขอที่รอดำเนินการ</td><td className="border p-2">พนักงานทั่วไปที่ต้องการเบิกสินค้า</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Layers className="h-4 w-4" /> ระบบสิทธิ์ 3 ชั้น</h4>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm">ชั้นที่ 1: บทบาท (Role)</h5>
                <p className="text-xs text-muted-foreground mt-1">กำหนดระดับสิทธิ์พื้นฐาน เช่น Admin มีสิทธิ์สูงสุด, Requester มีสิทธิ์แค่เบิกสินค้า</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm">ชั้นที่ 2: สิทธิ์ตามฝ่าย (Department Permissions)</h5>
                <p className="text-xs text-muted-foreground mt-1">กำหนดว่าผู้ใช้สามารถ ดู/สร้าง/แก้ไข/ลบ ข้อมูลของฝ่ายใดบ้าง เช่น ดูได้เฉพาะฝ่ายตนเอง</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm">ชั้นที่ 3: สิทธิ์ตามฟังก์ชัน (Function Permissions)</h5>
                <p className="text-xs text-muted-foreground mt-1">กำหนดว่าผู้ใช้เข้าถึงเมนูหรือฟังก์ชันใดได้บ้าง เช่น เปิดให้ใช้เฉพาะ "ขอเบิกสินค้า" และ "รายงาน"</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "dashboard",
      number: "3",
      title: "Dashboard หลัก",
      icon: <LayoutDashboard className="h-5 w-5" />,
      description: "หน้าสรุปภาพรวม สถิติ กราฟ และการแจ้งเตือน",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Dashboard เป็นหน้าแรกหลัง Login แสดงสรุปข้อมูลสำคัญทั้งหมดในที่เดียว สามารถกรองตามบริษัทและฝ่ายได้
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> สถิติสรุป</h5>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>จำนวนรายการสินค้าทั้งหมดในระบบ</li>
                <li>จำนวนสินค้าที่คงเหลือต่ำกว่าจุดสั่งซื้อ (Min Stock)</li>
                <li>จำนวนรายการที่ใกล้หมดอายุ / หมดประกัน</li>
                <li>จำนวนงาน PM ที่ค้าง / ครบกำหนด</li>
              </ul>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> กราฟและแผนภูมิ</h5>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>กราฟวงกลม: สัดส่วนสินค้าตามหมวดหมู่</li>
                <li>กราฟแท่ง: สินค้าตามสถานที่จัดเก็บ</li>
                <li>กราฟเส้น: ความเคลื่อนไหวของสต็อก (Stock Movement)</li>
                <li>สามารถ Export กราฟเป็นรูปภาพได้</li>
              </ul>
            </div>
            <div className="p-3 border rounded-lg md:col-span-2">
              <h5 className="font-medium text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> การแจ้งเตือน</h5>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li><strong>สต็อกต่ำ:</strong> สินค้าที่จำนวนคงเหลือ ≤ ระดับขั้นต่ำที่กำหนด → ระบบสร้าง PR อัตโนมัติ</li>
                <li><strong>ใกล้หมดอายุ:</strong> สินค้าที่เหลือเวลาน้อยกว่าจำนวนวันที่ตั้งค่าไว้ (ค่าเริ่มต้น 30 วัน)</li>
                <li><strong>ใกล้หมดประกัน:</strong> สินค้าที่ประกันจะหมดภายในจำนวนวันที่กำหนด</li>
                <li><strong>PM ครบกำหนด:</strong> งาน PM ป้ายโฆษณา/อุปกรณ์/เครื่องมือ ที่ถึงกำหนด</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "master-data",
      number: "4",
      title: "ข้อมูลหลัก (Master Data)",
      icon: <Database className="h-5 w-5" />,
      description: "จัดการข้อมูลพื้นฐานที่ใช้ร่วมกันทั้งระบบ",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Master Data คือข้อมูลพื้นฐานที่ใช้ร่วมกันทุกส่วนของระบบ การตั้งค่าที่ถูกต้องจะทำให้ข้อมูลทั้งระบบมีความสม่ำเสมอ
          </p>
          <div className="space-y-3">
            {[
              { num: "4.1", title: "หมวดหมู่ (Categories)", desc: "เพิ่ม/แก้ไข/ลบ หมวดหมู่หลักของสินค้า เช่น อุปกรณ์ไฟฟ้า, วัสดุสิ้นเปลือง, อะไหล่ป้าย ฯลฯ ใช้ในการจัดกลุ่มสินค้าและควบคุมวัตถุประสงค์การเบิก" },
              { num: "4.2", title: "หมวดหมู่ย่อย (Subcategories)", desc: "ต้องเลือกหมวดหมู่หลักก่อน แล้วจึงเพิ่มหมวดหมู่ย่อยภายใต้หมวดหมู่นั้น เช่น หมวดหมู่ 'อุปกรณ์ไฟฟ้า' → หมวดหมู่ย่อย 'หลอดไฟ LED', 'สายไฟ'" },
              { num: "4.3", title: "ยี่ห้อ (Brands)", desc: "เพิ่ม/แก้ไข/ลบ ยี่ห้อสินค้า ใช้ในการระบุผู้ผลิตของอุปกรณ์" },
              { num: "4.4", title: "ฝ่าย (Departments)", desc: "เพิ่ม/แก้ไข/ลบ ฝ่าย (เช่น ฝ่ายวิศวกรรม, ฝ่ายขาย) ใช้ในการกำหนดความเป็นเจ้าของข้อมูลและสิทธิ์" },
              { num: "4.5", title: "แผนก (Sections)", desc: "แผนกอยู่ภายใต้ฝ่าย (1 ฝ่าย มีหลายแผนก) เช่น ฝ่ายวิศวกรรม → แผนก PM, แผนกติดตั้ง ใช้ในการระบุต้นสังกัดผู้ขอเบิก" },
              { num: "4.6", title: "บริษัท (Companies)", desc: "เพิ่ม/แก้ไข/ลบ บริษัท ใช้ระบุบริษัทเจ้าของสินค้าและการยืมข้ามบริษัท" },
              { num: "4.7", title: "คลังสินค้า (Warehouses)", desc: "เพิ่มคลังสินค้า: รหัส, ชื่อ, พื้นที่จัดเก็บ, ฝ่ายที่ดูแล เป็นระดับบนสุดของโครงสร้างสถานที่จัดเก็บ" },
              { num: "4.8", title: "ตำแหน่งจัดเก็บ (Locations)", desc: "สถานที่จัดเก็บภายในคลังสินค้า มีระบบ Storage Slot → Sub Storage Slot (ชั้น → ช่อง) รองรับขนาดพื้นที่ (กว้าง x สูง x ลึก เป็นเมตร) เพื่อคำนวณปริมาตรที่ใช้ สามารถ Import จาก Excel ได้" },
              { num: "4.9", title: "ผู้จัดจำหน่าย (Suppliers)", desc: "เพิ่ม Supplier: รหัส, Vendor Code, ชื่อ, ที่อยู่, เบอร์โทร, Email, ผู้ติดต่อ สามารถ Import จาก Excel ได้" },
              { num: "4.10", title: "ผู้รับเหมา (Contractors)", desc: "จัดการรายชื่อผู้รับเหมา/ทีมงาน สำหรับใช้อ้างอิงในการติดตั้ง/ถอดป้ายโฆษณา" },
              { num: "4.11", title: "รหัสนำหน้า (Equipment Code Prefixes)", desc: "กำหนดรหัสนำหน้าสำหรับการสร้างรหัสสินค้าอัตโนมัติ เช่น 'EQ' → EQ 0001, EQ 0002 ระบบจะเพิ่มตัวเลขต่อท้ายอัตโนมัติ" },
              { num: "4.12", title: "วัตถุประสงค์การนำเข้า (Receipt Purposes)", desc: "กำหนดเหตุผลการนำสินค้าเข้าคลัง เช่น 'นำเข้าจากการซื้อ', 'รับคืนจากการติดตั้ง' แต่ละวัตถุประสงค์กำหนดได้ว่าต้องระบุสถานที่จัดเก็บหรือไม่" },
              { num: "4.13", title: "วัตถุประสงค์การเบิก (Issue Purposes)", desc: "กำหนดเหตุผลการเบิกสินค้า เช่น 'ติดตั้งป้าย', 'ซ่อมบำรุง' แต่ละวัตถุประสงค์สามารถ: จำกัดหมวดหมู่ที่เบิกได้, บังคับระบุป้ายโฆษณา, กำหนดว่าต้องคืนหรือไม่" },
            ].map((item, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm">{item.num} {item.title}</h5>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "equipment",
      number: "5",
      title: "จัดการอุปกรณ์/สินค้า",
      icon: <Package className="h-5 w-5" />,
      description: "เพิ่ม แก้ไข โอนย้าย Import/Export อุปกรณ์และ Media Player",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">5.1 การเพิ่มสินค้าใหม่</h4>
            <p className="text-xs text-muted-foreground mb-2">กรอกข้อมูลต่อไปนี้ (* = บังคับ):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>ฝ่าย *:</strong> ฝ่ายที่เป็นเจ้าของสินค้า (อยู่บนสุดของฟอร์ม)</li>
                <li><strong>รหัสสินค้า *:</strong> เลือกจากรหัสนำหน้า → ระบบสร้างรหัสอัตโนมัติ</li>
                <li><strong>ชื่อสินค้า *:</strong> ชื่อเรียกสินค้า</li>
                <li><strong>หมวดหมู่/หมวดหมู่ย่อย *:</strong> จัดกลุ่มสินค้า</li>
                <li><strong>หน่วยนับ *:</strong> เลือกจาก Dropdown (ชิ้น, ม้วน, กล่อง ฯลฯ)</li>
                <li><strong>ยี่ห้อ:</strong> ผู้ผลิต (ถ้ามี)</li>
                <li><strong>จำนวนเริ่มต้น *:</strong> จำนวนที่มีอยู่</li>
                <li><strong>จุดสั่งซื้อขั้นต่ำ *:</strong> ถ้าสต็อกต่ำกว่านี้ระบบจะแจ้งเตือน+สร้าง PR อัตโนมัติ</li>
              </ul>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>ราคาต่อชิ้น *:</strong> ใช้คำนวณมูลค่าสต็อก</li>
                <li><strong>Serial Number:</strong> สำหรับสินค้าที่ต้องติดตามรายตัว</li>
                <li><strong>ขนาด (กว้าง x สูง x ลึก):</strong> หน่วยเป็นเมตร คำนวณปริมาตรอัตโนมัติ</li>
                <li><strong>ข้อมูลทางเทคนิค:</strong> Volt, Amp, Watt, Lumen, Lux</li>
                <li><strong>วันหมดอายุ / วันหมดประกัน:</strong> สำหรับการแจ้งเตือน</li>
                <li><strong>สถานที่จัดเก็บ:</strong> เลือกคลัง → ตำแหน่ง</li>
                <li><strong>ข้อมูลทรัพย์สิน:</strong> รหัสทรัพย์สิน, รหัสประจำอุปกรณ์, ค่าเสื่อมราคา</li>
                <li><strong>รูปภาพ:</strong> อัปโหลดได้หลายรูป ลำดับการแสดงผลปรับได้</li>
              </ul>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">5.2 การแก้ไขสินค้า</h4>
            <p className="text-xs text-muted-foreground">คลิกปุ่มแก้ไขที่รายการสินค้า แก้ไขข้อมูลที่ต้องการ แล้วกดบันทึก ข้อมูลจะอัปเดตทันที</p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">5.3 การโอนย้ายสินค้า (Transfer)</h4>
            <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
              <li>เลือกสินค้าที่ต้องการโอนย้าย</li>
              <li>ระบุจำนวนที่ต้องการโอน (ต้องไม่เกินจำนวนคงเหลือ)</li>
              <li>เลือกสถานที่ปลายทาง (คลัง → ตำแหน่ง)</li>
              <li>กดบันทึก → ระบบจะอัปเดตสถานที่จัดเก็บอัตโนมัติ</li>
              <li>ดูประวัติการโอนย้ายได้ที่เมนู "ประวัติการย้าย"</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">5.4 Import/Export Excel</h4>
            <p className="text-xs text-muted-foreground">
              <strong>Import:</strong> ดาวน์โหลด Template Excel → กรอกข้อมูล → อัปโหลด ระบบจะตรวจสอบข้อมูลและนำเข้าอัตโนมัติ
              <br /><strong>Export:</strong> กดปุ่ม Export เพื่อดาวน์โหลดรายการสินค้าทั้งหมดเป็นไฟล์ Excel
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">5.5 Media Player</h4>
            <p className="text-xs text-muted-foreground">
               Media Player จัดการแยกจากอุปกรณ์ทั่วไป มีข้อมูลเพิ่มเติม: CMS Type,
               Serial Number 2 ตัว (S/N 1 และ S/N 2) สามารถนำเข้า/รับเข้าคลัง/เบิกจ่ายได้เช่นเดียวกับสินค้าทั่วไป
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "goods-receipt",
      number: "6",
      title: "รับสินค้าเข้าคลัง (Goods Receipt)",
      icon: <Truck className="h-5 w-5" />,
      description: "ขั้นตอนการนำเข้า → รับเข้าคลัง → รายการรอรหัส",
      content: (
        <div className="space-y-5">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">ขั้นตอน 1</Badge> นำสินค้าเข้า (Delivery Entry)
            </h4>
            <p className="text-xs text-muted-foreground mb-2">ผู้นำสินค้าเข้ากรอกข้อมูลทุกรายการก่อนส่งให้คลัง:</p>
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-2">
              <p><strong>ข้อมูลส่วนหัว (ใช้ร่วมทุกรายการ):</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>วัตถุประสงค์การนำเข้า * — เช่น "นำเข้าจากการซื้อ" ถ้าเลือกตัวนี้จะมีช่อง PO/PR เพิ่มเติม</li>
                <li>ฝ่าย *, บริษัท *, ชื่อผู้ดำเนินการนำเข้าข้อมูล *</li>
                <li>เอกสารแนบ (PDF/รูปภาพ), หมายเหตุ</li>
              </ul>
              <p className="mt-2"><strong>ข้อมูลรายการ (ระบบตะกร้า — เพิ่มทีละรายการ):</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>สินค้าที่มีในระบบ:</strong> เลือกจาก Dropdown → ระบบ Auto-fill หน่วย, หมวดหมู่, หมวดหมู่ย่อย, ขนาดพื้นที่</li>
                <li><strong>สินค้าใหม่:</strong> พิมพ์ชื่อ บังคับเลือกหมวดหมู่/หมวดหมู่ย่อย อัปโหลดรูปอย่างน้อย 1 รูป ระบุจำนวนขั้นต่ำ ระบบจะสร้างรหัส TEMP-YYYYMMDD-XXX</li>
                <li>จำนวน, หน่วย, ราคาต่อชิ้น, Supplier, Lot Number, Serial Number</li>
                <li>ขนาดพื้นที่ (กว้าง x สูง x ลึก) — ปริมาตรรวม = ปริมาตรต่อชิ้น × จำนวน</li>
                <li>วันหมดอายุ, วันหมดประกัน, ข้อมูลทรัพย์สิน</li>
                <li><strong>Media Player:</strong> สลับสวิตช์เป็น "Media Player" เพิ่มข้อมูล CMS Type, S/N 1, S/N 2</li>
              </ul>
              <p className="mt-2"><strong>สรุป:</strong> กด "เพิ่มลงตะกร้า" ทีละรายการ → ตรวจสอบรายการทั้งหมด → กด "ส่งข้อมูลทั้งหมด" → ระบบสร้างเอกสาร PD-YYYYMMDD-XXX</p>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">ขั้นตอน 2</Badge> รับเข้าคลัง (Receive Goods)
            </h4>
            <p className="text-xs text-muted-foreground mb-2">เจ้าหน้าที่คลังตรวจสอบและรับสินค้าเข้าระบบ:</p>
            <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
              <li>ดูรายการ "รอรับเข้าคลัง" ที่ส่งมาจาก Delivery Entry</li>
              <li>ตรวจสอบข้อมูลสินค้า จำนวน เอกสาร</li>
              <li>สำหรับสินค้าที่มีในระบบ: เลือกสินค้าจาก Dropdown ระบบดึงข้อมูลอัตโนมัติ</li>
              <li>สำหรับสินค้าใหม่ (TEMP): สร้างรายการสินค้าใหม่ในระบบ (Quick Create) กำหนดรหัสถาวร</li>
              <li>เลือกสถานที่จัดเก็บ: คลัง → ตำแหน่ง → Storage Slot → Sub Storage Slot</li>
              <li>กดรับสินค้า → ระบบเพิ่มสต็อกอัตโนมัติ + บันทึก Stock Movement</li>
            </ol>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">เพิ่มเติม</Badge> รายการรอรหัสทรัพย์สิน
            </h4>
            <p className="text-xs text-muted-foreground">
              สินค้าที่รับเข้าคลังแล้วแต่ยังรอรหัสทรัพย์สิน (Asset Code) หรือรหัสประจำอุปกรณ์ (Equipment ID Code)
              จะแสดงในหน้า "รายการรอรหัส" เพื่อให้เจ้าหน้าที่ติดตามและเพิ่มรหัสภายหลังได้
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "goods-issue",
      number: "7",
      title: "เบิก-จ่ายสินค้า (Goods Issue)",
      icon: <ShoppingCart className="h-5 w-5" />,
      description: "ขอเบิก → อนุมัติ → จ่ายสินค้า → FIFO → S/N Tracking",
      content: (
        <div className="space-y-5">
          <div>
            <h4 className="font-semibold mb-2">7.1 ขอเบิกสินค้า (Issue Request)</h4>
            <p className="text-xs text-muted-foreground mb-2">ผู้เบิกสร้างคำขอ (รองรับหลายรายการใน 1 เอกสาร):</p>
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-2">
              <p><strong>ข้อมูลผู้ขอเบิก:</strong> ชื่อ *, เบอร์โทร, ฝ่าย (ล็อคตามสิทธิ์), แผนก (กรองตามฝ่ายที่เลือก), วัตถุประสงค์ *, ส่งไปที่</p>
              <p><strong>เลือกสินค้า 2 วิธี:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>เลือกจาก FIFO:</strong> ระบบเรียงลำดับตามวันเข้าคลัง สินค้าใกล้หมดอายุ/ประกันจะแสดง Badge เตือน พร้อมคำแนะนำให้เบิกก่อน</li>
                <li><strong>ค้นหาจาก Serial Number:</strong> พิมพ์ S/N เพื่อเลือกสินค้าเฉพาะตัว ถ้าเลือกสินค้าจาก FIFO ก่อนแล้ว ช่อง S/N จะกรองแสดงเฉพาะ S/N ของสินค้านั้น (รวม S/N 1 & S/N 2 สำหรับ Media Player)</li>
              </ul>
              <p><strong>ระบบตรวจสอบ:</strong> แสดงจำนวนคงเหลือ/หลังเบิก, เตือนถ้าจำนวนไม่เพียงพอ, ล็อคจำนวนเป็น 1 เมื่อเลือกผ่าน S/N</p>
              <p><strong>วัตถุประสงค์พิเศษ:</strong> บางวัตถุประสงค์บังคับระบุป้ายโฆษณา, จำกัดหมวดหมู่สินค้าที่เบิกได้</p>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">7.2 จ่ายสินค้า (Issue Goods)</h4>
            <p className="text-xs text-muted-foreground">
              เจ้าหน้าที่คลังดูรายการที่รออนุมัติ/ที่อนุมัติแล้ว ตรวจสอบรายการ เลือกสถานที่จ่าย กดจ่าย
              รองรับ "จ่ายบางส่วน" (Partial Issue) — จ่ายได้หลายครั้งจนครบจำนวน ระบบแสดง Badge "S/N: ..." สีน้ำเงิน
              เพื่อให้เจ้าหน้าที่หยิบสินค้าถูกตัว สินค้าที่มี S/N จะถูกติดตามรายตัว
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">7.3 Dashboard ผู้เบิก (Requester Dashboard)</h4>
            <p className="text-xs text-muted-foreground">
              ผู้เบิกสามารถ: ค้นหาคำขอตามเลขเอกสาร/ชื่อ, ดูสถานะ (รอดำเนินการ/จ่ายแล้ว/ปฏิเสธ/รอสินค้า),
              ยกเลิกคำขอที่ยังรอดำเนินการ, ดูรายละเอียดสินค้าแต่ละรายการ
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">7.4 ยืมข้ามบริษัท (Equipment Loans)</h4>
            <p className="text-xs text-muted-foreground">
              สร้างรายการยืมอุปกรณ์ข้ามบริษัท: เลือกสินค้า, บริษัทต้นทาง/ปลายทาง, จำนวน, วันครบกำหนดคืน
              ระบบติดตามสถานะ: รอดำเนินการ → อนุมัติ → คืนแล้ว พร้อมบันทึกจำนวนที่คืน
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">7.5 รอระบุป้าย / รอคืน (Incomplete Issues)</h4>
            <p className="text-xs text-muted-foreground">
              รายการเบิกที่ยังไม่ระบุป้ายโฆษณา (สำหรับวัตถุประสงค์ที่บังคับระบุ) หรือรายการที่ต้องคืนแต่ยังไม่ได้คืน
              เจ้าหน้าที่สามารถอัปเดตข้อมูลเพิ่มเติมได้ภายหลัง
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">7.6 คำขอรอสินค้า (Waiting Stock)</h4>
            <p className="text-xs text-muted-foreground">
              คำขอเบิกที่สต็อกไม่เพียงพอจะถูกตั้งสถานะ "รอสินค้า" เมื่อมีสินค้าเข้าคลังใหม่
              ระบบจะส่งการแจ้งเตือนให้เจ้าหน้าที่คลังทราบเพื่อดำเนินการจ่ายได้ทันที
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "billboards",
      number: "8",
      title: "จัดการป้ายโฆษณา (Billboards)",
      icon: <MapPin className="h-5 w-5" />,
      description: "จัดการป้าย ติดตั้ง/ถอดอุปกรณ์ QR Code PM ป้าย",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">8.1 เพิ่ม/แก้ไขป้ายโฆษณา</h4>
            <p className="text-xs text-muted-foreground">
              กรอกข้อมูล: รหัสอุปกรณ์, ชื่อตำแหน่ง, คำอธิบาย, ฝ่าย, ภาค/จังหวัด/อำเภอ/ตำบล,
              ประเภทสื่อ (Media Class/Segment/Type), เส้นทางต่างๆ (PM/ติดตั้ง/รายงาน/ตรวจสอบ),
              เป้าหมายตรวจสอบ, สถานะ (Active/Inactive/Maintenance) สามารถ Import จาก Excel ได้
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">8.2 ติดตั้งอุปกรณ์บนป้าย</h4>
            <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
              <li>เปิดรายละเอียดป้าย</li>
              <li>กด "เพิ่มอุปกรณ์" → เลือกอุปกรณ์จากคลัง</li>
              <li>ระบุจำนวน และวันที่ติดตั้ง</li>
              <li>ระบบหักสต็อกจากคลังอัตโนมัติ + บันทึก Stock Movement</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">8.3 ถอดอุปกรณ์</h4>
            <p className="text-xs text-muted-foreground">
              เลือกอุปกรณ์ที่ติดตั้งอยู่ → ระบุเหตุผลการถอด → เลือก "คืนเข้าสต็อก" (เลือกสถานที่จัดเก็บ) หรือ "ไม่คืน"
              ระบบบันทึกประวัติการถอดอัตโนมัติ
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">8.4 QR Code</h4>
            <p className="text-xs text-muted-foreground">
              แต่ละป้ายมี QR Code เฉพาะ สแกนเพื่อดูข้อมูลป้ายผ่านมือถือ (หน้า Public View)
              แสดงรายละเอียดป้าย อุปกรณ์ที่ติดตั้ง สถานะ โดยไม่ต้อง Login
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">8.5 PM ป้ายโฆษณา</h4>
            <p className="text-xs text-muted-foreground">
              สร้างแผน PM: เลือกป้าย, ชื่องาน, ประเภทรอบ (รายวัน/สัปดาห์/เดือน/ปี), วันครบกำหนด, แจ้งเตือนล่วงหน้า
              บันทึกผล PM: วันที่ดำเนินการ, ผู้ดำเนินการ, หมายเหตุ → ระบบคำนวณวันถัดไปอัตโนมัติ
              สามารถ Import แผน PM จาก Excel ได้
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "advertisements",
      number: "9",
      title: "จัดการภาพโฆษณา (Advertisements)",
      icon: <ImageIcon className="h-5 w-5" />,
      description: "นำเข้า รับเข้าคลัง เบิก จ่ายภาพโฆษณา",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">9.1 นำเข้าภาพโฆษณา (Ad Entry)</h4>
            <p className="text-xs text-muted-foreground">
              บันทึกข้อมูลภาพโฆษณา: ชื่อ, บริษัท, ประเภท (ใหม่/เก่า/ชั่วคราว), ขนาด, ประเภทสื่อ, จำนวน, version,
              ป้ายเป้าหมาย, วันกำหนดติดตั้ง, ทีมติดตั้ง, ผู้รับเหมา, ข้อมูลติดต่อ, เอกสารประกอบ, รูปภาพ
              ระบบสร้างรหัสอัตโนมัติ AD-YYYYMMDD-XXX
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">9.2 รับเข้าคลังภาพ (Ad Receive)</h4>
            <p className="text-xs text-muted-foreground">
              ตรวจสอบรายการภาพโฆษณาที่รอรับเข้าคลัง ระบุสถานที่จัดเก็บ กดรับเข้า
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">9.3 เบิกภาพโฆษณา (Ad Request)</h4>
            <p className="text-xs text-muted-foreground">
              สร้างคำขอเบิกภาพโฆษณา: เลือกภาพ, ป้ายเป้าหมาย, วัตถุประสงค์ (ติดตั้ง/เปลี่ยน/อื่นๆ),
              จำนวน, ระบุการจัดการภาพเก่า (ถ้ามี)
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">9.4 จ่ายภาพโฆษณา (Ad Issue)</h4>
            <p className="text-xs text-muted-foreground">
              เจ้าหน้าที่คลังตรวจสอบและจ่ายภาพโฆษณาตามคำขอ อัปเดตสถานะอัตโนมัติ
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "tools",
      number: "10",
      title: "จัดการเครื่องมือ (Tools)",
      icon: <Wrench className="h-5 w-5" />,
      description: "ข้อมูลเครื่องมือ PM เครื่องมือ รายงาน PM",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">10.1 ข้อมูลเครื่องมือ</h4>
            <p className="text-xs text-muted-foreground">
              เพิ่ม/แก้ไข/ลบเครื่องมือ: รหัส, ชื่อ, หมวดหมู่เครื่องมือ, ฝ่าย, ยี่ห้อ, หน่วยนับ,
              จำนวนเริ่มต้น, ราคา, สถานที่จัดเก็บ, Serial Number, บริษัท, วันเข้าคลัง,
              วันหมดอายุ/ประกัน, รอบ PM (กี่วัน) สามารถ Import จาก Excel ได้
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">10.2 PM เครื่องมือ</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>งาน PM (Tasks):</strong> ระบบสร้าง Task อัตโนมัติตามรอบที่กำหนด ผู้รับผิดชอบบันทึกผล: วันที่ตรวจ, ผู้ตรวจ, จำนวนที่ตรวจ, ผลการตรวจ, รายละเอียดข้อสังเกต, รูปภาพ เมื่อ Complete → ระบบสร้าง Task ถัดไปอัตโนมัติ</li>
              <li><strong>ตาราง PM:</strong> ดูภาพรวมแผน PM ทั้งหมดของเครื่องมือ</li>
              <li><strong>ประวัติ PM:</strong> ดูประวัติการ PM ที่ผ่านมาทั้งหมด</li>
              <li><strong>รายงาน PM:</strong> สรุปผลการ PM เครื่องมือแยกตามช่วงเวลา/สถานะ</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "equipment-pm",
      number: "11",
      title: "PM อุปกรณ์ (Equipment PM)",
      icon: <Calendar className="h-5 w-5" />,
      description: "แผน PM สำหรับอุปกรณ์ที่ติดตั้งบนป้าย",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">11.1 สร้างแผน PM อุปกรณ์</h4>
            <p className="text-xs text-muted-foreground">
              เลือกอุปกรณ์, ชื่องาน PM, ประเภทอุปกรณ์, ฝ่าย, ประเภทรอบ (รายวัน/สัปดาห์/เดือน/ปี),
              วันครบกำหนด, จำนวนวันแจ้งเตือนล่วงหน้า สามารถ Import แผน PM จาก Excel ได้
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">11.2 งาน PM Tasks</h4>
            <p className="text-xs text-muted-foreground">
              ระบบสร้าง Task อัตโนมัติเมื่อถึงกำหนด แต่ละ Task มีเลข PMT-YYYYMMDD-XXXX
              บันทึกผล: วันตรวจ, ผู้ตรวจ, จำนวนที่ตรวจ, ผลตรวจ (ผ่าน/ไม่ผ่าน/ต้องซ่อม),
              รายละเอียดข้อสังเกต, แนบรูปภาพ สามารถสร้าง Sub-Task ได้
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">11.3 ประวัติ PM</h4>
            <p className="text-xs text-muted-foreground">
              บันทึกประวัติทุกครั้งที่ PM สำเร็จ แสดงวันที่ ผู้ดำเนินการ หมายเหตุ
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "reports",
      number: "12",
      title: "รายงาน (Reports)",
      icon: <FileSearch className="h-5 w-5" />,
      description: "สรุปสต็อก เอกสาร Stock Movement Dead Stock ใบขอซื้อ",
      content: (
        <div className="space-y-4">
          {[
            { title: "12.1 รายงานสินค้าคงคลัง (Inventory Report)", desc: "แสดงรายการสินค้าทั้งหมด กรองตามฝ่าย/หมวดหมู่/สถานะ ดูจำนวนคงเหลือ มูลค่า สถานที่จัดเก็บ Export เป็น Excel ได้" },
            { title: "12.2 ค้นหาเอกสาร (Document Search)", desc: "ค้นหาเอกสารทุกประเภท (รับเข้า/เบิกจ่าย) ตามเลขเอกสาร ชื่อสินค้า ช่วงวันที่ ดูรายละเอียดเอกสาร" },
            { title: "12.3 Stock Movement Log", desc: "แสดงประวัติความเคลื่อนไหวของสต็อกทั้งหมด: รับเข้า, จ่ายออก, โอนย้าย, ติดตั้ง, ถอด กรองตามสินค้า/ช่วงเวลา/ประเภท" },
            { title: "12.4 รายงาน Dead Stock", desc: "สินค้าที่ไม่มีการเคลื่อนไหว (ไม่มีเบิก/จ่าย) เกินจำนวนวันที่กำหนด ช่วยตัดสินใจเรื่องการจัดการสต็อกเก่า" },
            { title: "12.5 รายงานเบิกตามป้าย (Billboard Issue Report)", desc: "สรุปรายการอุปกรณ์ที่เบิกไปติดตั้งบนป้ายโฆษณาแต่ละป้าย กรองตามป้าย/ช่วงเวลา" },
            { title: "12.6 ใบขอซื้อ (Purchase Requests - PR)", desc: "ระบบสร้าง PR อัตโนมัติเมื่อสต็อกต่ำกว่า Min Stock แสดงสถานะ PR (รอดำเนินการ/อนุมัติ/ยกเลิก) พร้อมจำนวนแนะนำ" },
            { title: "12.7 ค้นหาอุปกรณ์ป้าย (Equipment Tracking)", desc: "ค้นหาอุปกรณ์ที่ติดตั้งบนป้ายโฆษณา ดูว่าอุปกรณ์ชิ้นใดอยู่ที่ป้ายไหน" },
          ].map((item, i) => (
            <div key={i} className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">{item.title}</h5>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "notifications",
      number: "13",
      title: "ระบบแจ้งเตือน (Notifications)",
      icon: <Bell className="h-5 w-5" />,
      description: "ตั้งค่า ประเภท และการจัดการแจ้งเตือน",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">ประเภทการแจ้งเตือน</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, title: "สต็อกต่ำ", desc: "เมื่อจำนวนคงเหลือ ≤ ระดับขั้นต่ำ (Min Stock)" },
                { icon: <Clock className="h-4 w-4 text-destructive" />, title: "ใกล้หมดอายุ", desc: "สินค้าที่เหลือเวลาน้อยกว่าจำนวนวันที่ตั้งไว้" },
                { icon: <Shield className="h-4 w-4 text-yellow-500" />, title: "ใกล้หมดประกัน", desc: "ประกันสินค้าจะหมดภายในจำนวนวันที่กำหนด" },
                { icon: <Calendar className="h-4 w-4 text-primary" />, title: "PM ครบกำหนด", desc: "งาน PM ป้าย/อุปกรณ์/เครื่องมือ ที่ถึงกำหนด" },
              ].map((item, i) => (
                <div key={i} className="p-3 border rounded-lg flex items-start gap-3">
                  {item.icon}
                  <div>
                    <h5 className="font-medium text-sm">{item.title}</h5>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">ตั้งค่าแจ้งเตือน</h4>
            <p className="text-xs text-muted-foreground">
              เข้าที่เมนู "ตั้งค่าแจ้งเตือน" เพื่อ: เปิด/ปิดแต่ละประเภท, กำหนดจำนวนวันแจ้งเตือนล่วงหน้า (ค่าเริ่มต้น 7 วัน),
              ระบุ Email ที่ต้องการรับแจ้งเตือน
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "admin",
      number: "14",
      title: "จัดการผู้ใช้ (Admin)",
      icon: <Shield className="h-5 w-5" />,
      description: "จัดการบัญชี บทบาท สิทธิ์ตามฝ่าย สิทธิ์ตามฟังก์ชัน",
      content: (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground mb-2">
            <strong>หมายเหตุ:</strong> เฉพาะ Admin เท่านั้นที่เข้าถึงหน้านี้ได้
          </p>
          <div>
            <h4 className="font-semibold mb-2">14.1 จัดการบัญชีผู้ใช้</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>ดูรายชื่อผู้ใช้ทั้งหมดพร้อมสถานะ</li>
              <li>กำหนดบทบาท (Admin/Manager/Warehouse Staff/Receiver/Requester)</li>
              <li>รีเซ็ตรหัสผ่านผู้ใช้</li>
              <li>กำหนดสิทธิ์ตามฝ่าย (ดู/สร้าง/แก้ไข/ลบ สำหรับแต่ละฝ่าย)</li>
              <li>กำหนดสิทธิ์ตามฟังก์ชัน (เปิด/ปิดการเข้าถึงแต่ละเมนู)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">14.2 คู่มือและแนวทางสิทธิ์</h4>
            <p className="text-xs text-muted-foreground">
              Tab "คู่มือและแนวทางสิทธิ์" แสดงคำอธิบายรายละเอียดของแต่ละบทบาทและฟังก์ชัน
              พร้อม Dropdown แบบ Interactive ที่ดึงข้อมูลจากระบบจริง ช่วยให้ผู้ดูแลระบบ
              เข้าใจว่าควรกำหนดสิทธิ์อย่างไรให้เหมาะสมกับแต่ละตำแหน่งงาน
            </p>
          </div>
        </div>
      ),
    },
  ];

  const generateWordDocument = async () => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "คู่มือการใช้งานระบบบริหารจัดการคลังสินค้าและอุปกรณ์",
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: "Equipment Tracking System — User Manual", italics: true })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            // Generate sections from the manual content
            ...sections.flatMap(section => [
              new Paragraph({
                text: `${section.number}. ${section.title}`,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                children: [new TextRun({ text: section.description, italics: true })],
                spacing: { after: 200 },
              }),
            ]),
            new Paragraph({
              text: "สำหรับรายละเอียดเพิ่มเติม กรุณาดูในระบบ หรือติดต่อผู้ดูแลระบบ",
              spacing: { before: 400 },
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "คู่มือการใช้งานระบบ.docx");
      toast.success("ดาวน์โหลดคู่มือสำเร็จ");
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างเอกสาร");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">คู่มือการใช้งานระบบ</h1>
            <p className="text-muted-foreground text-sm">Equipment Tracking System — เอกสารอธิบายการทำงานทั้งหมดอย่างละเอียด</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>เปิดทั้งหมด</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>ปิดทั้งหมด</Button>
          <Button onClick={generateWordDocument} size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            ดาวน์โหลด Word
          </Button>
        </div>
      </div>

      {/* Table of Contents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            สารบัญ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => {
                  setExpandedSections(prev => new Set([...prev, section.id]));
                  document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="text-primary">{section.icon}</span>
                <span><strong className="text-xs text-muted-foreground mr-1">{section.number}.</strong>{section.title}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map(section => (
          <Card key={section.id} id={`section-${section.id}`}>
            <Collapsible
              open={expandedSections.has(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {section.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{section.number}. {section.title}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{section.description}</CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.has(section.id) ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {section.content}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserManual;
