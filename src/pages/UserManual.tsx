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
  CheckCircle, XCircle, BarChart3, Upload, QrCode, Eye, Zap, Filter, Send
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
      description: "แนะนำระบบ โครงสร้าง แนวคิดหลัก และ Flow การทำงาน",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            ระบบบริหารจัดการคลังสินค้าและอุปกรณ์ (Equipment Tracking System) เป็นระบบเว็บแอปพลิเคชัน
            สำหรับจัดการคลังสินค้า อุปกรณ์ เครื่องมือ ป้ายโฆษณา และภาพโฆษณา แบบครบวงจร
            ตั้งแต่การนำเข้า การจัดเก็บ การเบิกจ่าย ไปจนถึงการบำรุงรักษา รองรับทั้งการส่งสินค้าผ่านคลัง
            และการส่งตรง (Direct Shipping) จาก Supplier ไปยังหน่วยงานปลายทาง
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "คลังสินค้า", desc: "นำเข้า-รับเข้าคลัง-เบิกจ่าย-โอนย้าย-ยืมข้ามบริษัท-ส่งตรง" },
              { label: "ป้ายโฆษณา", desc: "จัดการป้าย ติดตั้ง/ถอดอุปกรณ์ PM ป้ายโฆษณา" },
              { label: "ภาพโฆษณา", desc: "นำเข้า-รับเข้าคลัง-เบิก-จ่ายภาพโฆษณา (ใหม่/เก่า/ฝากชั่วคราว)" },
              { label: "เครื่องมือ", desc: "ข้อมูลเครื่องมือ PM เครื่องมือ ตาราง PM ประวัติ PM รายงาน PM" },
              { label: "รายงาน", desc: "สรุปสต็อก Dead Stock เอกสาร Stock Card ใบขอซื้อ Stock Movement" },
              { label: "ระบบสิทธิ์", desc: "บทบาท (Role) + ฝ่าย (Department) + ฟังก์ชัน (Function) 3 ชั้น" },
            ].map((item, i) => (
              <div key={i} className="p-3 border rounded-lg bg-muted/30">
                <h4 className="font-semibold text-sm">{item.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          <Separator />
          <h4 className="font-semibold">Flow หลักของระบบ (สินค้าผ่านคลัง)</h4>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {["นำสินค้าเข้า", "→", "รับเข้าคลัง", "→", "จัดเก็บ", "→", "ขอเบิก", "→", "อนุมัติ (ถ้าเป็นทรัพย์สิน)", "→", "จ่ายสินค้า", "→", "ยืนยันรับสินค้า"].map((step, i) => (
              step === "→"
                ? <ChevronRight key={i} className="h-4 w-4 text-muted-foreground" />
                : <Badge key={i} variant="secondary" className="text-xs">{step}</Badge>
            ))}
          </div>

          <h4 className="font-semibold mt-3">Flow ส่งตรง (Direct Shipping)</h4>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {["ขอส่งตรง", "→", "อนุมัติ (Manager)", "→", "จัดซื้อ-ดำเนินการ", "→", "ยืนยันรับสินค้า"].map((step, i) => (
              step === "→"
                ? <ChevronRight key={i} className="h-4 w-4 text-muted-foreground" />
                : <Badge key={i} variant="secondary" className="text-xs">{step}</Badge>
            ))}
          </div>

          <Separator />
          <h4 className="font-semibold">รหัสเอกสารในระบบ</h4>
          <p className="text-xs text-muted-foreground mb-2">
            ทุกเอกสารในระบบจะได้รับรหัสอัตโนมัติเมื่อสร้าง ในรูปแบบ <strong>[PREFIX]-[YYYYMMDD]-[XXXX]</strong> โดย YYYYMMDD = วันที่สร้าง และ XXXX = ลำดับเลข 4 หลัก (รันต่อเนื่องอัตโนมัติ)
          </p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="overflow-x-auto">
              <table className="w-full border">
                <thead className="bg-muted">
                  <tr>
                    <th className="border p-2 text-left w-48">รูปแบบรหัส</th>
                    <th className="border p-2 text-left w-40">ย่อมาจาก</th>
                    <th className="border p-2 text-left">คำอธิบาย</th>
                    <th className="border p-2 text-left w-56">สร้างเมื่อ / Trigger</th>
                    <th className="border p-2 text-left w-36">ดูได้ที่</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2 font-mono font-bold">PD-YYYYMMDD-XXXX</td>
                    <td className="border p-2"><strong>P</strong>roduct <strong>D</strong>elivery</td>
                    <td className="border p-2">ใบนำสินค้าเข้า</td>
                    <td className="border p-2">สร้างอัตโนมัติเมื่อกด "ส่งข้อมูลทั้งหมด" ในหน้า นำสินค้าเข้า</td>
                    <td className="border p-2">ค้นหาเอกสาร, รับเข้าคลัง</td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-mono font-bold">GI-YYYYMMDD-XXXX</td>
                    <td className="border p-2"><strong>G</strong>oods <strong>I</strong>ssue</td>
                    <td className="border p-2">ใบเบิกสินค้า</td>
                    <td className="border p-2">สร้างอัตโนมัติเมื่อผู้เบิกกด "ส่งคำขอเบิก" ในหน้า ขอเบิกสินค้า</td>
                    <td className="border p-2">ค้นหาเอกสาร, จ่ายสินค้า, Dashboard ผู้เบิก</td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-mono font-bold">DS-YYYYMMDD-XXXX</td>
                    <td className="border p-2"><strong>D</strong>irect <strong>S</strong>hipping</td>
                    <td className="border p-2">ใบส่งตรง</td>
                    <td className="border p-2">สร้างอัตโนมัติเมื่อกด "ส่งคำขอส่งตรง" ในหน้า ขอส่งตรง</td>
                    <td className="border p-2">ค้นหาเอกสาร, อนุมัติส่งตรง, จัดซื้อ</td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-mono font-bold">DC-YYYYMMDD-XXXX</td>
                    <td className="border p-2"><strong>D</strong>elivery <strong>C</strong>onfirmation</td>
                    <td className="border p-2">ใบยืนยันรับสินค้า</td>
                    <td className="border p-2">สร้างอัตโนมัติเมื่อเจ้าหน้าที่คลังจ่ายสินค้าสำเร็จ (GI) หรือเจ้าหน้าที่จัดซื้อบันทึกการส่งตรง (DS)</td>
                    <td className="border p-2">ยืนยันรับสินค้า</td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-mono font-bold">AD-YYYYMMDD-XXXX</td>
                    <td className="border p-2"><strong>Ad</strong>vertisement</td>
                    <td className="border p-2">ใบนำเข้าภาพโฆษณา</td>
                    <td className="border p-2">สร้างอัตโนมัติเมื่อกดบันทึกในหน้า นำเข้าภาพโฆษณา</td>
                    <td className="border p-2">รับเข้าคลังภาพ, เบิกภาพ, จ่ายภาพ</td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-mono font-bold">DR-YYYYMMDD-XXXX</td>
                    <td className="border p-2"><strong>D</strong>efective <strong>R</strong>eturn</td>
                    <td className="border p-2">ใบนำของเสียเข้า</td>
                    <td className="border p-2">สร้างอัตโนมัติเมื่อกดบันทึกในหน้า นำของเสียเข้าระบบ</td>
                    <td className="border p-2">ค้นหาเอกสาร</td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-mono font-bold">TEMP-YYYYMMDD-XXX</td>
                    <td className="border p-2"><strong>Temp</strong>orary</td>
                    <td className="border p-2">รหัสสินค้าชั่วคราว (รอรหัสถาวร)</td>
                    <td className="border p-2">สร้างอัตโนมัติเมื่อเพิ่มสินค้าใหม่ใน Delivery Entry ที่ยังไม่มีในระบบ → เจ้าหน้าที่คลังกำหนดรหัสจริงตอนรับเข้าคลัง</td>
                    <td className="border p-2">รายการรอรหัส, รับเข้าคลัง</td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-mono font-bold">PMT-YYYYMMDD-XXXX</td>
                    <td className="border p-2"><strong>PM</strong> <strong>T</strong>ask</td>
                    <td className="border p-2">รหัสงาน PM Task</td>
                    <td className="border p-2">สร้างอัตโนมัติเมื่อระบบสร้าง Task PM ตามกำหนดรอบ หรือเมื่อ Complete Task แล้วสร้าง Task ถัดไป</td>
                    <td className="border p-2">งาน PM อุปกรณ์, งาน PM เครื่องมือ</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>ตัวอย่าง:</strong> PD-20260308-0001 = ใบนำสินค้าเข้า วันที่ 8 มี.ค. 2569 ลำดับที่ 1 ของวัน
            </p>
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
              <li>เมื่อ Login สำเร็จ เมนูด้านซ้ายจะแสดงเฉพาะเมนูที่ผู้ใช้มีสิทธิ์เข้าถึง</li>
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
                  <tr><td className="border p-2 font-medium text-foreground">Super Admin</td><td className="border p-2">สิทธิ์สูงสุด — ทุกอย่างเหมือน Admin + จัดการ Tab ที่จำกัดในหน้าข้อมูลหลัก (อุปกรณ์, เครื่องมือ, คลังสินค้า, ตำแหน่งจัดเก็บ, Media Player)</td><td className="border p-2">ผู้ดูแลระบบระดับสูง</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Admin</td><td className="border p-2">เข้าถึงทุกฟังก์ชัน, จัดการผู้ใช้/สิทธิ์, แก้ไข Master Data (ยกเว้นอุปกรณ์/คลัง/ตำแหน่ง/Media Player), ดูรายงานทุกแผนก, ลบข้อมูลได้</td><td className="border p-2">ผู้ดูแลระบบ, IT Admin</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Manager</td><td className="border p-2">อนุมัติ/ปฏิเสธคำขอเบิกทรัพย์สิน (เฉพาะฝ่ายที่ดูแล), อนุมัติ/ปฏิเสธคำขอส่งตรง, ดูรายงานและสต็อกตามฝ่ายที่ดูแล</td><td className="border p-2">ผู้จัดการฝ่าย, หัวหน้างาน</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Warehouse Staff</td><td className="border p-2">รับเข้าคลัง, จ่ายสินค้า, โอนย้าย, จัดเตรียมสินค้า, จัดการสถานที่จัดเก็บ, PM, จัดการยืมข้ามบริษัท</td><td className="border p-2">เจ้าหน้าที่คลังสินค้า</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Receiver</td><td className="border p-2">บันทึกการนำสินค้าเข้า (Delivery Entry), นำของเสียเข้าระบบ, สร้างรายการสินค้าใหม่</td><td className="border p-2">ผู้รับสินค้าหน้าคลัง</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Requester</td><td className="border p-2">สร้างคำขอเบิก, ดูสถานะคำขอ, ยกเลิกคำขอที่รอดำเนินการ, ยืนยันรับสินค้า, สร้างคำขอส่งตรง</td><td className="border p-2">พนักงานทั่วไปที่ต้องการเบิกสินค้า</td></tr>
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
                <p className="text-xs text-muted-foreground mt-1">กำหนดระดับสิทธิ์พื้นฐาน เช่น Super Admin มีสิทธิ์สูงสุด (จัดการข้อมูลหลักทั้งหมด), Admin จัดการระบบทั่วไป (ยกเว้น Tab อุปกรณ์/คลัง/ตำแหน่ง/Media Player ในหน้าข้อมูลหลัก), Requester มีสิทธิ์แค่เบิกสินค้า — บทบาทแสดงเป็น Badge สีต่างกัน (Super Admin=ทอง, Admin=แดง, Manager=ม่วง, Warehouse=น้ำเงิน, Receiver=เขียว, Requester=ส้ม)</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm">ชั้นที่ 2: สิทธิ์ตามฝ่าย (Department Permissions)</h5>
                <p className="text-xs text-muted-foreground mt-1">กำหนดว่าผู้ใช้สามารถ ดู/สร้าง/แก้ไข/ลบ ข้อมูลของฝ่ายใดบ้าง — สิทธิ์ "ลบ" สงวนไว้เฉพาะ Admin และ Super Admin เท่านั้น (ระบบล็อคอัตโนมัติ) ฝ่ายถูกดึงจากฐานข้อมูลแบบไดนามิก</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm">ชั้นที่ 3: สิทธิ์ตามฟังก์ชัน (Function Permissions)</h5>
                <p className="text-xs text-muted-foreground mt-1">กำหนดว่าผู้ใช้เข้าถึงเมนูหรือฟังก์ชันใดได้บ้าง เมนูที่ไม่มีสิทธิ์จะถูกซ่อนจากแถบเมนูด้านซ้ายอัตโนมัติ</p>
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground mt-3">
              <strong>ตัวอย่าง:</strong> ผู้ใช้คนหนึ่งมี Role = Requester, ดูข้อมูลได้เฉพาะ "ฝ่ายวิศวกรรม", เปิดสิทธิ์ฟังก์ชัน "ขอเบิกสินค้า" และ "ยืนยันรับสินค้า" เท่านั้น → ผู้ใช้จะเห็นเฉพาะเมนูขอเบิกและยืนยันรับ และเห็นข้อมูลเฉพาะฝ่ายวิศวกรรม
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
      description: "หน้าสรุปภาพรวม สถิติ กราฟ การแจ้งเตือน และตัวกรองข้อมูล",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Dashboard เป็นหน้าแรกหลัง Login แสดงสรุปข้อมูลสำคัญทั้งหมดในที่เดียว สามารถกรองตามบริษัทและฝ่ายได้
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> สถิติสรุป (Summary Cards)</h5>
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
                <li>กราฟสถิติอุปกรณ์ป้ายโฆษณา</li>
                <li>สามารถ Export กราฟเป็นรูปภาพ (PNG) ได้ทุกกราฟ</li>
              </ul>
            </div>
            <div className="p-3 border rounded-lg md:col-span-2">
              <h5 className="font-medium text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> การแจ้งเตือน (Alerts)</h5>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li><strong>สต็อกต่ำ:</strong> สินค้าที่จำนวนคงเหลือ ≤ ระดับขั้นต่ำที่กำหนด → ระบบสร้าง PR อัตโนมัติ</li>
                <li><strong>ใกล้หมดอายุ:</strong> สินค้าที่เหลือเวลาน้อยกว่าจำนวนวันที่ตั้งค่าไว้</li>
                <li><strong>ใกล้หมดประกัน:</strong> สินค้าที่ประกันจะหมดภายในจำนวนวันที่กำหนด</li>
                <li><strong>PM ครบกำหนด:</strong> งาน PM ป้ายโฆษณา/อุปกรณ์/เครื่องมือ ที่ถึงกำหนด</li>
              </ul>
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <h5 className="font-medium text-sm flex items-center gap-2"><Filter className="h-4 w-4" /> ตัวกรองข้อมูล</h5>
            <p className="text-xs text-muted-foreground mt-1">
              กรองข้อมูล Dashboard ตามบริษัทและฝ่ายที่ต้องการดู — ตัวกรองฝ่ายจะแสดงเฉพาะฝ่ายที่ผู้ใช้มีสิทธิ์ดูข้อมูล (ยกเว้น Admin ที่เห็นทุกฝ่าย)
            </p>
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
            เมนู Master Data แบ่งเป็น Tab ย่อยหลายส่วน:
          </p>
          <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <h5 className="font-medium text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Lock className="h-4 w-4" /> Tab ที่จำกัดเฉพาะ Super Admin
            </h5>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Tab ต่อไปนี้จะมองเห็นและจัดการได้เฉพาะผู้ที่มีบทบาท <strong>Super Admin</strong> เท่านั้น: 
              <strong> อุปกรณ์, เครื่องมือ, คลังสินค้า, ตำแหน่งจัดเก็บ, Media Player</strong> — 
              ผู้ใช้ที่มีบทบาท Admin ปกติจะไม่เห็น Tab เหล่านี้ แต่ยังสามารถจัดการ Tab อื่นๆ ได้ตามปกติ
            </p>
          </div>
          <div className="space-y-3">
            {[
              { num: "4.1", title: "หมวดหมู่ (Categories)", desc: "เพิ่ม/แก้ไข/ลบ หมวดหมู่หลักของสินค้า เช่น อุปกรณ์ไฟฟ้า, วัสดุสิ้นเปลือง, อะไหล่ป้าย ฯลฯ ใช้ในการจัดกลุ่มสินค้าและควบคุมวัตถุประสงค์การเบิก" },
              { num: "4.2", title: "หมวดหมู่ย่อย (Subcategories)", desc: "ต้องเลือกหมวดหมู่หลักก่อน แล้วจึงเพิ่มหมวดหมู่ย่อยภายใต้หมวดหมู่นั้น เช่น หมวดหมู่ 'อุปกรณ์ไฟฟ้า' → หมวดหมู่ย่อย 'หลอดไฟ LED', 'สายไฟ'" },
              { num: "4.3", title: "ยี่ห้อ (Brands)", desc: "เพิ่ม/แก้ไข/ลบ ยี่ห้อสินค้า ใช้ในการระบุผู้ผลิตของอุปกรณ์ แบ่งตามประเภท (เครื่องมือ/อุปกรณ์ทั่วไป)" },
              { num: "4.4", title: "ฝ่าย (Departments)", desc: "เพิ่ม/แก้ไข/ลบ ฝ่าย (เช่น ฝ่ายวิศวกรรม, ฝ่ายขาย) ใช้ในการกำหนดความเป็นเจ้าของข้อมูลและสิทธิ์ ชื่อฝ่ายจะถูกดึงแบบไดนามิกจากตารางนี้ไปใช้ทั่วทั้งระบบ" },
              { num: "4.5", title: "แผนก (Sections)", desc: "แผนกอยู่ภายใต้ฝ่าย (1 ฝ่าย มีหลายแผนก) เช่น ฝ่ายวิศวกรรม → แผนก PM, แผนกติดตั้ง ใช้ในการระบุต้นสังกัดผู้ขอเบิก Dropdown แผนกจะกรองตามฝ่ายที่เลือกไว้อัตโนมัติ (ล็อคจนกว่าจะเลือกฝ่ายก่อน)" },
              { num: "4.6", title: "บริษัท (Companies)", desc: "เพิ่ม/แก้ไข/ลบ บริษัท พร้อมรหัส (Code) และฝ่ายที่สังกัด ใช้ระบุบริษัทเจ้าของสินค้าและการยืมข้ามบริษัท" },
              { num: "4.7", title: "คลังสินค้า (Warehouses)", desc: "เพิ่มคลังสินค้า: รหัส, ชื่อ, พื้นที่จัดเก็บ, ฝ่ายที่ดูแล เป็นระดับบนสุดของโครงสร้างสถานที่จัดเก็บ (Warehouse → Location → Storage Slot → Sub Storage Slot)" },
              { num: "4.8", title: "ตำแหน่งจัดเก็บ (Locations)", desc: "สถานที่จัดเก็บภายในคลังสินค้า มีระบบ Storage Slot → Sub Storage Slot (ชั้น → ช่อง) รองรับขนาดพื้นที่ (กว้าง x สูง x ลึก เป็นเมตร) เพื่อคำนวณปริมาตร สามารถ Import จาก Excel ได้" },
              { num: "4.9", title: "ผู้จัดจำหน่าย (Suppliers)", desc: "เพิ่ม Supplier: รหัส, Vendor Code, ชื่อ, ที่อยู่, เบอร์โทร, Email, ผู้ติดต่อ สามารถ Import จาก Excel ได้" },
              { num: "4.10", title: "ผู้รับเหมา (Contractors)", desc: "จัดการรายชื่อผู้รับเหมา/ทีมงาน สำหรับใช้อ้างอิงในการติดตั้ง/ถอดป้ายโฆษณา และรับ-ส่งภาพโฆษณา รองรับประเภท: ทีมติดตั้ง, ผู้รับเหมา, อื่นๆ" },
              { num: "4.11", title: "รหัสนำหน้า (Equipment Code Prefixes)", desc: "กำหนดรหัสนำหน้าสำหรับการสร้างรหัสสินค้าอัตโนมัติ เช่น 'EQ' → EQ-0001, EQ-0002 ระบบจะเพิ่มตัวเลขลำดับต่อท้ายอัตโนมัติ" },
              { num: "4.12", title: "วัตถุประสงค์การนำเข้า (Receipt Purposes)", desc: "กำหนดเหตุผลการนำสินค้าเข้าคลัง เช่น 'นำเข้าจากการซื้อ' (มีช่อง PO/PR เพิ่มเติม), 'รับคืนจากการติดตั้ง' แต่ละวัตถุประสงค์กำหนดได้ว่าต้องระบุสถานที่จัดเก็บหรือไม่" },
              { num: "4.13", title: "วัตถุประสงค์การเบิก (Issue Purposes)", desc: "กำหนดเหตุผลการเบิกสินค้า เช่น 'ติดตั้งป้าย', 'ซ่อมบำรุง' แต่ละวัตถุประสงค์สามารถ: จำกัดหมวดหมู่ที่เบิกได้, บังคับระบุป้ายโฆษณา, กำหนดว่าต้องคืนหรือไม่" },
              { num: "4.14", title: "Media Player", desc: "จัดการข้อมูล Media Player แยกจากอุปกรณ์ทั่วไป: รหัส, ชื่อ, CMS Type, Model, Specification, สถานะ, Serial Number 2 ตัว (S/N 1 และ S/N 2), เอกสารแนบ สามารถ Import จาก Excel ได้" },
              { num: "4.15", title: "ประเภทงาน PM (PM Action Types)", desc: "กำหนดประเภทงาน PM สำหรับป้ายโฆษณา เช่น 'ตรวจสอบโครงสร้าง', 'ล้างป้าย', 'เปลี่ยนหลอดไฟ' ใช้ในการบันทึกงาน PM ป้าย" },
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
      description: "เพิ่ม แก้ไข โอนย้าย Import/Export อุปกรณ์ Media Player และทรัพย์สิน",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">5.1 การเพิ่มสินค้าใหม่</h4>
            <p className="text-xs text-muted-foreground mb-2">กรอกข้อมูลต่อไปนี้ (* = บังคับ):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>ฝ่าย *:</strong> ฝ่ายที่เป็นเจ้าของสินค้า (อยู่บนสุดของฟอร์ม, ล็อคตามสิทธิ์)</li>
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
                <li><strong>สถานที่จัดเก็บ:</strong> เลือกคลัง → ตำแหน่ง → Storage Slot → Sub Slot</li>
                <li><strong>ข้อมูลทรัพย์สิน:</strong> ทำเครื่องหมาย "เป็นทรัพย์สิน", รหัสทรัพย์สิน (Asset Code), รหัสประจำอุปกรณ์ (Equipment ID Code), ระยะเวลาค่าเสื่อมราคา (เดือน)</li>
                <li><strong>รูปภาพ:</strong> อัปโหลดได้หลายรูป ลำดับการแสดงผลปรับได้</li>
              </ul>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">5.2 การแก้ไขสินค้า</h4>
            <p className="text-xs text-muted-foreground">คลิกปุ่มแก้ไขที่รายการสินค้า แก้ไขข้อมูลที่ต้องการ แล้วกดบันทึก ข้อมูลจะอัปเดตทันที สินค้าที่เป็นทรัพย์สิน (is_asset) จะมีผลต่อกระบวนการอนุมัติเบิกโดย Manager</p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">5.3 การโอนย้ายสินค้า (Transfer)</h4>
            <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
              <li>เลือกสินค้าที่ต้องการโอนย้าย</li>
              <li>ระบุจำนวนที่ต้องการโอน (ต้องไม่เกินจำนวนคงเหลือ)</li>
              <li>เลือกสถานที่ปลายทาง (คลัง → ตำแหน่ง)</li>
              <li>กดบันทึก → ระบบจะอัปเดตสถานที่จัดเก็บ + บันทึก Stock Movement อัตโนมัติ</li>
              <li>ดูประวัติการโอนย้ายได้ที่เมนู "ประวัติการย้าย" (มีข้อมูลต้นทาง-ปลายทาง, วันที่, ผู้ดำเนินการ)</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">5.4 ยืมอะไหล่ข้ามบริษัท (Equipment Loans)</h4>
            <p className="text-xs text-muted-foreground mb-2">
              รองรับการยืมอะไหล่ระหว่างบริษัทภายในองค์กร ทั้งในฝ่ายเดียวกันและข้ามฝ่าย
            </p>
            <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
              <li>กดปุ่ม "ขอยืมอะไหล่" → เลือกบริษัทผู้ให้ยืม (ต้นทาง) และบริษัทผู้ยืม (ปลายทาง)</li>
              <li>เลือกอะไหล่ที่ต้องการ (กรองตามหมวดหมู่ได้) → ระบุจำนวน (ต้องไม่เกินสต็อก)</li>
              <li>กำหนดวันครบกำหนดคืน, กรอกชื่อ-เบอร์ผู้ขอ → กดส่งคำขอ</li>
              <li>ระบบตรวจสอบฝ่ายอัตโนมัติ:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                  <li><strong>ยืมในฝ่ายเดียวกัน:</strong> Warehouse Staff / Admin อนุมัติได้ปกติ</li>
                  <li><strong>ยืมข้ามฝ่าย:</strong> ต้อง Manager หรือ Admin อนุมัติเท่านั้น (แสดง Badge "ข้ามฝ่าย" สีส้ม)</li>
                </ul>
              </li>
              <li>เมื่ออนุมัติแล้ว สถานะเปลี่ยนเป็น "กำลังยืม" → ติดตามจำนวนที่คืนแล้ว/คงค้าง</li>
              <li>กดปุ่ม "บันทึกคืน" → ระบุจำนวนที่คืน + หมายเหตุ → คืนได้ทั้งบางส่วนและทั้งหมด</li>
              <li>หากเกินกำหนดคืน ระบบจะแสดงสถานะ "เกินกำหนด" เป็นสีแดงอัตโนมัติ</li>
            </ol>
            <div className="mt-2 p-2 rounded bg-muted text-xs">
              <strong>สถานะการยืม:</strong> รออนุมัติ → กำลังยืม → คืนบางส่วน → คืนครบแล้ว | ปฏิเสธ | เกินกำหนด
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">5.5 Import/Export Excel</h4>
            <p className="text-xs text-muted-foreground">
              <strong>Import:</strong> ดาวน์โหลด Template Excel → กรอกข้อมูล → อัปโหลด ระบบจะตรวจสอบข้อมูลและนำเข้าอัตโนมัติ
              <br /><strong>Export:</strong> กดปุ่ม Export เพื่อดาวน์โหลดรายการสินค้าทั้งหมดเป็นไฟล์ Excel
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">5.6 Media Player</h4>
            <p className="text-xs text-muted-foreground">
              Media Player จัดการในหน้า Master Data → Tab Media Player — มีข้อมูลเพิ่มเติม: CMS Type, Model, Specification, สถานะ (ใช้งาน/ซ่อม/ว่าง),
              Serial Number 2 ตัว (S/N 1 และ S/N 2), เอกสารแนบ สามารถนำเข้า/รับเข้าคลัง/เบิกจ่ายได้เช่นเดียวกับสินค้าทั่วไป
              โดยในขั้นตอนเบิกจ่าย ระบบจะแสดงทั้ง S/N 1 และ S/N 2 เพื่อให้เจ้าหน้าที่หยิบสินค้าถูกตัว
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">5.7 สินค้าประเภททรัพย์สิน (Asset)</h4>
            <p className="text-xs text-muted-foreground">
              สินค้าที่ทำเครื่องหมาย "เป็นทรัพย์สิน" (is_asset = true) จะต้องผ่านการอนุมัติจาก Manager ก่อนจ่าย
              สามารถระบุ Asset Code และ Equipment ID Code ได้ภายหลังผ่านหน้า "รายการรอรหัส"
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
      description: "ขั้นตอนการนำเข้า → รับเข้าคลัง → รายการรอรหัส → นำของเสียเข้า",
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
                <li>วัตถุประสงค์การนำเข้า * — เช่น "นำเข้าจากการซื้อ" (จะเปิดช่องกรอก PO, PR, Invoice No., Delivery Note พร้อมอัปโหลดเอกสาร)</li>
                <li>ฝ่าย *, บริษัท * (ล็อคตามสิทธิ์), ชื่อผู้ดำเนินการนำเข้าข้อมูล *</li>
                <li>Order For Project (ระบุโครงการที่สั่งซื้อ)</li>
                <li>เอกสารแนบ (PDF/รูปภาพ) — ระบบตั้งชื่อไฟล์อัตโนมัติตามเลขที่เอกสาร, หมายเหตุ</li>
              </ul>
              <p className="mt-2"><strong>ข้อมูลรายการ (ระบบตะกร้า — เพิ่มทีละรายการ):</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>สินค้าที่มีในระบบ:</strong> เลือกจาก Dropdown → ระบบ Auto-fill หน่วย, หมวดหมู่, หมวดหมู่ย่อย, ขนาดพื้นที่</li>
                <li><strong>สินค้าใหม่:</strong> พิมพ์ชื่อ บังคับเลือกหมวดหมู่/หมวดหมู่ย่อย อัปโหลดรูปอย่างน้อย 1 รูป ระบุจำนวนขั้นต่ำ ระบบจะสร้างรหัส TEMP-YYYYMMDD-XXX</li>
                <li>จำนวน, หน่วย, ราคาต่อชิ้น, Supplier, Lot Number, Serial Number</li>
                <li>ขนาดพื้นที่ (กว้าง x สูง x ลึก) — ปริมาตรรวม = ปริมาตรต่อชิ้น × จำนวน</li>
                <li>วันหมดอายุ, วันหมดประกัน, ข้อมูลทรัพย์สิน (รหัสทรัพย์สิน, รหัสประจำอุปกรณ์, ค่าเสื่อมราคา)</li>
                <li><strong>Media Player:</strong> สลับสวิตช์เป็น "Media Player" → เลือก Media Player จาก Dropdown → เพิ่มข้อมูล CMS Type, S/N 1, S/N 2</li>
              </ul>
              <p className="mt-2"><strong>สรุป:</strong> กด "เพิ่มลงตะกร้า" ทีละรายการ → ตรวจสอบรายการทั้งหมดในตะกร้า (แก้ไข/ลบได้) → กด "ส่งข้อมูลทั้งหมด" → ระบบสร้างเอกสาร PD-YYYYMMDD-XXXX</p>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">ขั้นตอน 2</Badge> รับเข้าคลัง (Receive Goods)
            </h4>
            <p className="text-xs text-muted-foreground mb-2">เจ้าหน้าที่คลังตรวจสอบและรับสินค้าเข้าระบบ:</p>
            <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
              <li>ดูรายการ "รอรับเข้าคลัง" ที่ส่งมาจาก Delivery Entry (จัดกลุ่มตามเอกสาร)</li>
              <li>ตรวจสอบข้อมูลสินค้า จำนวน เอกสาร</li>
              <li>สำหรับสินค้าที่มีในระบบ: เลือกสินค้าจาก Dropdown ระบบดึงข้อมูลอัตโนมัติ</li>
              <li>สำหรับสินค้าใหม่ (TEMP): สร้างรายการสินค้าใหม่ในระบบ (Quick Create) กำหนดรหัสถาวร</li>
              <li>เลือกสถานที่จัดเก็บ: คลัง → ตำแหน่ง → Storage Slot → Sub Storage Slot</li>
              <li>กดรับสินค้า → ระบบเพิ่มสต็อกอัตโนมัติ + บันทึก Stock Movement (ประเภท 'receive')</li>
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

          <Separator />
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">เพิ่มเติม</Badge> นำของเสียเข้าระบบ (Defective Return)
            </h4>
            <p className="text-xs text-muted-foreground mb-2">สำหรับนำอุปกรณ์/Media Player ชำรุดกลับเข้าระบบ:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>เลือกแหล่งที่มา: จากป้ายโฆษณา หรือ จากหน่วยงาน</li>
              <li>เลือกอุปกรณ์ หรือ Media Player ที่ชำรุด</li>
              <li>ระบุจำนวน, สภาพสินค้า (ชำรุด/ใช้งานไม่ได้/ต้องซ่อม), เหตุผล</li>
              <li>เลือกสถานที่จัดเก็บสินค้าชำรุด</li>
              <li>ระบบสร้างเอกสาร DR-YYYYMMDD-XXXX เพื่อติดตาม</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "goods-issue",
      number: "7",
      title: "เบิก-จ่ายสินค้า (Goods Issue)",
      icon: <ShoppingCart className="h-5 w-5" />,
      description: "ขอเบิก → อนุมัติ → จ่ายสินค้า → ยืนยันรับ → FIFO → S/N Tracking",
      content: (
        <div className="space-y-5">
          <div>
            <h4 className="font-semibold mb-2">7.1 ขอเบิกสินค้า (Issue Request)</h4>
            <p className="text-xs text-muted-foreground mb-2">ผู้เบิกสร้างคำขอ (รองรับหลายรายการใน 1 เอกสาร):</p>
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-2">
              <p><strong>ข้อมูลผู้ขอเบิก:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>ชื่อ *, เบอร์โทร</li>
                <li>ฝ่าย (ล็อคตามสิทธิ์), แผนก (กรองตามฝ่ายที่เลือก — ล็อคจนกว่าจะเลือกฝ่ายก่อน)</li>
                <li>บริษัท * (ล็อคตามสิทธิ์ฝ่าย)</li>
                <li>วัตถุประสงค์ * (บางวัตถุประสงค์บังคับระบุป้ายโฆษณา, จำกัดหมวดหมู่สินค้า)</li>
                <li>ส่งไปที่ (ระบุปลายทาง)</li>
              </ul>
              <p><strong>รูปแบบการรับสินค้า (Pickup Type) — 3 รูปแบบ:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>🔴 รอรับที่คลัง (Wait on-site):</strong> สำหรับผู้เบิกที่รอรับของทันที ระบบจะแสดงคำแนะนำการเตรียมของเร่งด่วนให้เจ้าหน้าที่</li>
                <li><strong>🟡 นัดรับล่วงหน้า (Scheduled):</strong> บังคับระบุวันและเวลา เพื่อให้เจ้าหน้าที่คลังมีเวลาเตรียมของ</li>
                <li><strong>🔵 จัดส่ง (Delivery):</strong> ระบุจุดหมายปลายทาง สินค้าจะถูกจัดส่งไปให้</li>
              </ul>
              <p><strong>เลือกสินค้า 2 วิธี:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>เลือกจาก FIFO:</strong> ระบบเรียงลำดับตามวันเข้าคลัง สินค้าใกล้หมดอายุ/ประกันจะแสดง Badge เตือน พร้อมคำแนะนำให้เบิกก่อน</li>
                <li><strong>ค้นหาจาก Serial Number:</strong> พิมพ์ S/N เพื่อเลือกสินค้าเฉพาะตัว ถ้าเลือกสินค้าจาก FIFO ก่อนแล้ว ช่อง S/N จะกรองแสดงเฉพาะ S/N ของสินค้านั้น (รวม S/N 1 & S/N 2 สำหรับ Media Player)</li>
              </ul>
              <p><strong>ระบบตรวจสอบอัตโนมัติ:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>แสดงจำนวนคงเหลือ/หลังเบิก</li>
                <li>เตือนถ้าจำนวนไม่เพียงพอ</li>
                <li>ล็อคจำนวนเป็น 1 เมื่อเลือกผ่าน S/N</li>
                <li>ตรวจจับสินค้าทรัพย์สิน (is_asset) อัตโนมัติ → ถ้ามีทรัพย์สิน ระบบจะส่งคำขอไป Manager อนุมัติก่อน</li>
              </ul>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">7.2 อนุมัติเบิกทรัพย์สิน (Manager Approval)</h4>
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-2">
              <p>เฉพาะคำขอที่มีสินค้าประเภททรัพย์สิน (is_asset = true) จะต้องผ่านการอนุมัติจาก Manager ก่อน:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Manager เห็นเฉพาะคำขอจากฝ่ายที่ตนดูแล</li>
                <li>ตรวจสอบรายละเอียดคำขอ: รายการสินค้า, จำนวน, ผู้ขอ, วัตถุประสงค์</li>
                <li>กด "อนุมัติ" หรือ "ปฏิเสธ" (พร้อมระบุเหตุผล)</li>
                <li>คำขอที่อนุมัติแล้วจะไปแสดงในหน้า "จ่ายสินค้า" ให้เจ้าหน้าที่คลังดำเนินการ</li>
                <li>รองรับค้นหาตามชื่อผู้เบิก, กรองตามช่วงเวลาและหน่วยงาน</li>
              </ul>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">7.3 จ่ายสินค้า (Issue Goods)</h4>
            <p className="text-xs text-muted-foreground mb-2">
              เจ้าหน้าที่คลังดำเนินการจ่ายสินค้าตามคำขอ:
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>ดูรายการคำขอที่รอดำเนินการ (สถานะ pending หรือ waiting_stock)</li>
              <li>ขยายแถวเพื่อดูรายการสินค้าแต่ละรายการในเอกสาร</li>
              <li>ระบบแสดง Badge "S/N: ..." สีน้ำเงินเพื่อให้เจ้าหน้าที่หยิบสินค้าถูกตัว</li>
              <li>เจ้าหน้าที่สามารถเลือก Serial Number ที่จะจ่ายจริง (กรณีคลังมีหลาย S/N)</li>
              <li>รองรับ "จ่ายบางส่วน" (Partial Issue) — จ่ายได้หลายครั้งจนครบจำนวน</li>
              <li>สินค้าที่จ่ายไม่ครบจะมีสถานะ "waiting_stock" แสดงในหน้า "คำขอรอสินค้า"</li>
              <li>กดจ่าย → ระบบตัดสต็อก + บันทึก Stock Movement (ประเภท 'issue') อัตโนมัติ</li>
              <li>สามารถ "ปฏิเสธ" รายการได้ พร้อมระบุเหตุผล</li>
              <li>ดูรูปภาพสินค้าได้โดยตรงจากหน้าจ่ายสินค้า</li>
              <li>Pagination รองรับข้อมูลจำนวนมาก (20 รายการต่อหน้า)</li>
            </ul>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">7.4 แผนจัดเตรียมสินค้า (Warehouse Pickup Planning)</h4>
            <p className="text-xs text-muted-foreground">
              หน้าสำหรับเจ้าหน้าที่คลังวางแผนจัดเตรียมสินค้าตามคำขอเบิก แสดงรายการที่ต้องจัดเตรียม
              พร้อมข้อมูลรูปแบบการรับสินค้า (รอที่คลัง/นัดรับ/จัดส่ง), วันเวลานัดรับ, ปลายทาง
              เรียงลำดับความเร่งด่วน
            </p>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">7.5 ยืนยันรับสินค้า (Delivery Confirmation)</h4>
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-2">
              <p>ขั้นตอนบังคับสำหรับการเบิกสินค้าทุกกรณี (ทุก Pickup Type) หลังจากเจ้าหน้าที่คลังจ่ายสินค้าเรียบร้อยแล้ว:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>ผู้รับสินค้าดูรายการที่รอยืนยัน (กรองตามฝ่ายที่มีสิทธิ์)</li>
                <li>ข้อมูลที่แสดง: รหัส/ชื่อสินค้า, จำนวน, วัตถุประสงค์, รูปแบบการรับ, ป้ายโฆษณาปลายทาง (รหัสและตำแหน่ง)</li>
                <li>กรณี Media Player: แสดงทั้ง S/N 1 และ S/N 2 เพื่อตรวจสอบความถูกต้อง</li>
                <li>แสดงสภาพสินค้าที่ได้รับ</li>
                <li>กด "ยืนยันรับ" → สถานะเปลี่ยนเป็น completed</li>
                <li>สามารถ "รายงานปัญหา" ได้ เช่น ชำรุด, ไม่ครบ, ผิดรุ่น — พร้อมแนบหลักฐานภาพถ่าย/วิดีโอ</li>
                <li>รองรับทั้งสินค้าจากคลัง (Goods Issue) และสินค้าส่งตรง (Direct Shipping) — รายการ DS จะมี Badge "DS" แยกให้ชัดเจน</li>
              </ul>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">7.6 Dashboard ผู้เบิก (Requester Dashboard)</h4>
            <p className="text-xs text-muted-foreground">
              ผู้เบิกสามารถ: ค้นหาคำขอตามเลขเอกสาร/ชื่อ, ดูสถานะ (รอดำเนินการ/จ่ายแล้ว/ปฏิเสธ/รอสินค้า/รออนุมัติ),
              ยกเลิกคำขอที่ยังไม่ดำเนินการ, ดูประวัติคำขอทั้งหมดพร้อม Pickup Type Badge
            </p>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">7.7 คำขอรอสินค้า (Waiting Stock)</h4>
            <p className="text-xs text-muted-foreground">
              แสดงรายการคำขอเบิกที่จ่ายบางส่วนแล้วแต่ยังจ่ายไม่ครบจำนวน (สถานะ waiting_stock)
              เจ้าหน้าที่คลังสามารถดำเนินการจ่ายส่วนที่เหลือเมื่อสินค้ามาถึง
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">7.8 รอระบุป้าย/รอคืน/รอเข้าคลัง (Incomplete Issues)</h4>
            <p className="text-xs text-muted-foreground">
              แสดงรายการเบิกที่ยังดำเนินการไม่ครบ เช่น ยังไม่ระบุป้ายโฆษณาปลายทาง,
              สินค้าที่ต้องคืนแต่ยังไม่คืน, สินค้าที่คืนแล้วรอเข้าคลัง
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">7.9 ยืมข้ามบริษัท (Equipment Loans)</h4>
            <p className="text-xs text-muted-foreground">
              สร้างรายการยืม-คืนอุปกรณ์ระหว่างบริษัท: เลือกบริษัทต้นทาง/ปลายทาง, อุปกรณ์, จำนวน,
              วันกำหนดคืน, ผู้ขอยืม, หมายเหตุ ระบบติดตามสถานะ (รออนุมัติ/อนุมัติ/ยืมอยู่/คืนแล้ว/เลยกำหนด)
              สามารถบันทึกการคืนบางส่วนหรือทั้งหมดได้
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "direct-shipping",
      number: "8",
      title: "ส่งตรง (Direct Shipping)",
      icon: <Send className="h-5 w-5" />,
      description: "ขอส่งตรงจาก Supplier ไปหน่วยงาน → อนุมัติ → จัดซื้อ → ยืนยันรับ",
      content: (
        <div className="space-y-5">
          <p className="text-muted-foreground text-sm">
            Direct Shipping (Dropshipping) คือกระบวนการส่งสินค้าตรงจาก Supplier ไปยังหน่วยงานปลายทาง
            โดยไม่ผ่านคลังสินค้าจริง ระบบใช้กลไก "Virtual Receipt + Virtual Issue" เพื่อบันทึกความเคลื่อนไหว
            เป็นศูนย์ (Net Zero) แต่ยังคงรักษาประวัติทั้งหมดในระบบ
          </p>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">ขั้นตอน 1</Badge> ขอส่งตรง (Direct Shipping Request)
            </h4>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>ระบุข้อมูลผู้ขอ: ชื่อ, เบอร์โทร, ฝ่าย (ล็อคตามสิทธิ์), แผนก, บริษัท</li>
              <li>ระบุรายละเอียดสินค้าที่ต้องการ (คำอธิบายรายการ)</li>
              <li>ระบุ Supplier (เลือกจากระบบหรือพิมพ์ชื่อ)</li>
              <li>ระบุปลายทาง, วัตถุประสงค์, วันที่คาดว่าจะถึง</li>
              <li>กดส่งคำขอ → ระบบสร้างเอกสาร DS-YYYYMMDD-XXXX → สถานะ "รออนุมัติ"</li>
            </ul>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">ขั้นตอน 2</Badge> อนุมัติส่งตรง (Direct Shipping Approval)
            </h4>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>Manager ดูคำขอส่งตรงที่รออนุมัติ (เฉพาะฝ่ายที่ดูแล)</li>
              <li>ตรวจสอบรายละเอียด กด "อนุมัติ" หรือ "ปฏิเสธ" (พร้อมเหตุผล)</li>
              <li>คำขอที่อนุมัติแล้วจะไปแสดงในหน้า "จัดซื้อ-ดำเนินการ"</li>
            </ul>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">ขั้นตอน 3</Badge> จัดซื้อ-ดำเนินการ (Procurement)
            </h4>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>เจ้าหน้าที่จัดซื้อดูคำขอที่อนุมัติแล้ว</li>
              <li>เพิ่มรายการสินค้าจริง (เลือกจากระบบ หรือสร้างรายการใหม่): รหัส, ชื่อ, จำนวน, หน่วย, ราคา, S/N, Lot</li>
              <li>รองรับ Media Player (Dual S/N)</li>
              <li>ระบุเลข PO, ชื่อผู้จัดส่ง, วันที่ส่ง</li>
              <li>กดบันทึก → ระบบทำ Virtual Receipt + Virtual Issue อัตโนมัติ → บันทึก Stock Movement</li>
              <li>สถานะเปลี่ยนเป็น "pending_confirmation" → รอผู้รับปลายทางยืนยัน</li>
            </ul>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">ขั้นตอน 4</Badge> ยืนยันรับสินค้า
            </h4>
            <p className="text-xs text-muted-foreground">
              ผู้รับปลายทางยืนยันการรับสินค้าผ่านหน้า "ยืนยันรับสินค้า" เช่นเดียวกับการเบิกสินค้าปกติ
              รายการ Direct Shipping จะมี Badge "DS" เพื่อแยกให้ชัดเจน สามารถรายงานปัญหาพร้อมแนบหลักฐานได้
            </p>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <strong>หมายเหตุ:</strong> ข้อมูล Direct Shipping สามารถสืบค้นได้ผ่านหน้า "ค้นหาเอกสาร" และ "Stock Movement Log"
            รองรับการยกเลิกเอกสารในสถานะที่ยังไม่ยืนยัน
          </div>
        </div>
      ),
    },
    {
      id: "billboards",
      number: "9",
      title: "ป้ายโฆษณา (Billboards)",
      icon: <MapPin className="h-5 w-5" />,
      description: "จัดการข้อมูลป้าย ติดตั้ง/ถอดอุปกรณ์ QR Code PM ป้าย",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">9.1 ข้อมูลป้ายโฆษณา</h4>
            <p className="text-xs text-muted-foreground mb-2">แต่ละป้ายมีข้อมูลต่อไปนี้:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>รหัสอุปกรณ์ (Equipment ID) — เชื่อมกับตารางอุปกรณ์</li>
                <li>ตำแหน่งที่ตั้ง (Location Name), จังหวัด/เขต (District)</li>
                <li>ภูมิภาค (Region), เขตพื้นที่ (Territory)</li>
                <li>กรุงเทพ/ต่างจังหวัด (BKK/UPC)</li>
                <li>ขนาดป้าย (Size), ประเภทสื่อ (Media Type)</li>
              </ul>
              <ul className="list-disc list-inside space-y-1">
                <li>กลุ่มสื่อ (Media Class), เซ็กเมนต์ (Media Segment)</li>
                <li>ฝ่ายที่ดูแล (Department)</li>
                <li>เส้นทาง PM, เส้นทางติดตั้ง/รื้อถอน, เส้นทางตรวจสอบ, เส้นทางถ่ายรูป</li>
                <li>เป้าหมายตรวจสอบ (Target Monitoring)</li>
                <li>รหัสเก่า (Old Code), ช่องเพิ่มเติม (Extra 1-3)</li>
                <li>สถานะ: ใช้งาน/ไม่ใช้งาน/ซ่อมบำรุง</li>
              </ul>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">9.2 ติดตั้ง/ถอดอุปกรณ์บนป้าย</h4>
            <p className="text-xs text-muted-foreground">
              ในหน้ารายละเอียดป้ายโฆษณาแต่ละป้าย สามารถ:
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 mt-1">
              <li><strong>ติดตั้งอุปกรณ์:</strong> เลือกอุปกรณ์จากคลัง ระบุจำนวน, S/N, วันติดตั้ง, สภาพ, หมายเหตุ → ตัดสต็อกจากคลังอัตโนมัติ + บันทึก Stock Movement (install_to_billboard)</li>
              <li><strong>ถอดอุปกรณ์:</strong> เลือกอุปกรณ์ที่ติดอยู่ ระบุจำนวน, เหตุผล, เลือกว่าจะคืนสต็อกหรือไม่ → ถ้าคืน ระบบเพิ่มสต็อก + บันทึก Stock Movement (return_from_billboard)</li>
              <li>ดูประวัติการติดตั้ง/ถอดย้อนหลังทั้งหมด</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">9.3 QR Code</h4>
            <p className="text-xs text-muted-foreground">
              ระบบสร้าง QR Code สำหรับป้ายแต่ละป้าย เมื่อสแกนจะเปิดหน้าข้อมูลป้ายสาธารณะ (Public View)
              แสดงรายละเอียดป้าย อุปกรณ์ที่ติดตั้ง โดยไม่ต้อง Login
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">9.4 Import/Export ป้ายโฆษณา</h4>
            <p className="text-xs text-muted-foreground">
              สามารถ Import ข้อมูลป้ายจาก Excel ได้ (ดาวน์โหลด Template → กรอกข้อมูล → อัปโหลด)
              และ Export รายการป้ายทั้งหมดเป็น Excel พร้อมตัวกรอง (ฝ่าย, ภูมิภาค, สถานะ ฯลฯ)
            </p>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">9.5 PM ป้ายโฆษณา (Billboard PM)</h4>
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-2">
              <p><strong>แจ้ง PM ป้ายโฆษณา:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>เลือกป้ายที่ต้องการ PM (กรองตามฝ่าย, เส้นทาง PM, สถานะ)</li>
                <li>ใส่ลงตะกร้า PM (เลือกหลายป้ายพร้อมกันได้)</li>
                <li>เลือกประเภทงาน PM (PM Action Type) เช่น ตรวจสอบโครงสร้าง, ล้างป้าย</li>
                <li>เลือกเหตุผล PM: PM ตามกำหนด, แจ้งซ่อม, เลื่อน PM</li>
                <li>ระบบจับภาพ Snapshot อุปกรณ์ที่ติดอยู่ ณ เวลาที่ทำ PM</li>
                <li>บันทึก → ข้อมูลไปแสดงในประวัติ PM</li>
              </ul>
              <p className="mt-2"><strong>ประวัติ PM ป้าย:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>แสดงประวัติ PM ทั้งหมดตามป้าย/ช่วงเวลา</li>
                <li>ดู Snapshot ข้อมูลป้ายและอุปกรณ์ ณ เวลาที่ทำ PM ได้</li>
                <li>กรองตามประเภทงาน, เหตุผล, ผู้ดำเนินการ</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "ad-management",
      number: "10",
      title: "จัดการภาพโฆษณา",
      icon: <ImageIcon className="h-5 w-5" />,
      description: "นำเข้า รับเข้าคลัง เบิก จ่ายภาพโฆษณา (ใหม่/เก่า/ฝากชั่วคราว)",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            ระบบจัดการภาพโฆษณาแยกจากสินค้าทั่วไป รองรับ 3 ประเภทการนำเข้า และมีกระบวนการ
            นำเข้า → รับเข้าคลัง → เบิก → จ่าย ครบวงจร
          </p>

          <div>
            <h4 className="font-semibold mb-2">10.1 นำเข้าภาพโฆษณา (Ad Entry)</h4>
            <p className="text-xs text-muted-foreground mb-2">รองรับ 3 ประเภทการนำเข้า:</p>
            <div className="space-y-2">
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm text-primary">ภาพโฆษณาใหม่</h5>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                  <li>ชื่อ *, เวอร์ชัน (ชื่อเวอร์ชัน + จำนวนต่อเวอร์ชัน) — ระบบคำนวณจำนวนรวมอัตโนมัติ</li>
                  <li>ฝ่าย *, บริษัท *, ขนาด *, ประเภทสื่อ *</li>
                  <li>อัปโหลดรูปภาพจริง (1-5 รูป) *</li>
                  <li>ป้ายเป้าหมาย (เลือกหลายป้ายได้) *, วันที่ติดตั้งเป้าหมาย, ทีมติดตั้ง</li>
                  <li>ข้อมูลผู้ติดต่อ: ชื่อ, เบอร์โทร, Email</li>
                  <li>เมื่อรับเข้าคลัง → ระบบสร้างเอกสารเบิกอัตโนมัติให้ป้ายเป้าหมายทันที</li>
                </ul>
              </div>
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm text-primary">ขอใช้พื้นที่ชั่วคราว</h5>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                  <li>ระบุพื้นที่จัดเก็บ (Storage Location)</li>
                  <li>วัน-เวลาเข้า / วัน-เวลาออก</li>
                  <li>ข้อมูลผู้ติดต่อ, หมายเหตุ</li>
                </ul>
              </div>
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm text-primary">ภาพโฆษณาเก่า (ปลดจากป้าย)</h5>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                  <li>ระบุระยะเวลาจัดเก็บ (30/60/90 วัน)</li>
                  <li>ผู้รับเหมาที่รับภาพ (Pickup Contractor)</li>
                  <li>ข้อมูลผู้ติดต่อ, หมายเหตุ</li>
                  <li>ระบบแจ้งเตือนเมื่อครบกำหนดจัดเก็บ</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">10.2 รับเข้าคลังภาพ (Ad Receive)</h4>
            <p className="text-xs text-muted-foreground">
              เจ้าหน้าที่คลังตรวจสอบรายการภาพโฆษณาที่รอรับเข้าคลัง ระบุสถานที่จัดเก็บ กดรับเข้า
              สำหรับภาพโฆษณาใหม่: ระบบจะสร้างเอกสารเบิกอัตโนมัติสำหรับป้ายเป้าหมายที่ระบุไว้
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">10.3 เบิกภาพโฆษณา (Ad Request)</h4>
            <p className="text-xs text-muted-foreground">
              สร้างคำขอเบิกภาพโฆษณา: เลือกภาพ, ป้ายเป้าหมาย, วัตถุประสงค์ (ติดตั้ง/เปลี่ยน/อื่นๆ),
              จำนวน ระบุการจัดการภาพเก่า (ถ้ามี) 3 ตัวเลือก:
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 mt-1">
              <li>"ปลดภาพโฆษณาเก่ากลับเข้าคลัง"</li>
              <li>"ไม่ต้องนำภาพโฆษณากลับ"</li>
              <li>"ปลดภาพโฆษณาเก่ากลับเพื่อตรวจสอบ"</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">10.4 จ่ายภาพโฆษณา (Ad Issue)</h4>
            <p className="text-xs text-muted-foreground">
              เจ้าหน้าที่คลังตรวจสอบและจ่ายภาพโฆษณาตามคำขอ ดูรายการทั้งเอกสารที่สร้างอัตโนมัติ (จากภาพใหม่)
              และเอกสารที่ผู้ใช้สร้างเอง — อัปเดตสถานะอัตโนมัติ ยืนยันการจ่ายออกและการติดตั้ง
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "tools",
      number: "11",
      title: "จัดการเครื่องมือ (Tools)",
      icon: <Wrench className="h-5 w-5" />,
      description: "ข้อมูลเครื่องมือ PM เครื่องมือ ตาราง PM ประวัติ PM รายงาน PM",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">11.1 ข้อมูลเครื่องมือ</h4>
            <p className="text-xs text-muted-foreground">
              เพิ่ม/แก้ไข/ลบเครื่องมือ: รหัส (เลือกจาก Prefix), ชื่อ, หมวดหมู่เครื่องมือ, ฝ่าย, ยี่ห้อ, หน่วยนับ,
              จำนวนเริ่มต้น, ราคา, สถานที่จัดเก็บ, Serial Number, บริษัท, วันเข้าคลัง,
              วันหมดอายุ/ประกัน, รอบ PM (กี่วัน) สามารถ Import จาก Excel ได้
              เครื่องมือมี Tab แยกสำหรับจัดการช่างเทคนิค (Technician) ที่รับผิดชอบเครื่องมือแต่ละชิ้น
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">11.2 PM เครื่องมือ</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>งาน PM (Tasks):</strong> ระบบสร้าง Task อัตโนมัติตามรอบที่กำหนด (รายวัน/สัปดาห์/เดือน/ปี) ผู้รับผิดชอบบันทึกผล: วันที่ตรวจ, ผู้ตรวจ, จำนวนที่ตรวจ, ผลการตรวจ (ผ่าน/ไม่ผ่าน/ต้องซ่อม), รายละเอียดข้อสังเกต, อัปโหลดรูปภาพ เมื่อ Complete → ระบบสร้าง Task ถัดไปอัตโนมัติ</li>
              <li><strong>ตาราง PM:</strong> ดูภาพรวมแผน PM ทั้งหมดของเครื่องมือ พร้อมวันครบกำหนดถัดไป สามารถ Import จาก Excel ได้</li>
              <li><strong>ประวัติ PM:</strong> ดูประวัติการ PM ที่ผ่านมาทั้งหมด พร้อมรายละเอียดและรูปภาพ</li>
              <li><strong>รายงาน PM:</strong> สรุปผลการ PM เครื่องมือแยกตามช่วงเวลา/สถานะ/ฝ่าย ดูสถิติภาพรวม (ผ่าน/ไม่ผ่าน/ค้าง)</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "equipment-pm",
      number: "12",
      title: "PM อุปกรณ์ (Equipment PM)",
      icon: <Calendar className="h-5 w-5" />,
      description: "แผน PM สำหรับอุปกรณ์ที่ติดตั้งบนป้ายหรืออุปกรณ์ทั่วไป",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">12.1 สร้างแผน PM อุปกรณ์</h4>
            <p className="text-xs text-muted-foreground">
              เลือกอุปกรณ์, ชื่องาน PM, ประเภทอุปกรณ์, ฝ่าย, ประเภทรอบ (รายวัน/สัปดาห์/เดือน/ปี),
              วันครบกำหนดถัดไป, จำนวนวันแจ้งเตือนล่วงหน้า สามารถ Import แผน PM จาก Excel ได้
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">12.2 งาน PM Tasks</h4>
            <p className="text-xs text-muted-foreground">
              ระบบสร้าง Task อัตโนมัติเมื่อถึงกำหนด แต่ละ Task มีเลข PMT-YYYYMMDD-XXXX
              บันทึกผล: วันตรวจ, ผู้ตรวจ, จำนวนที่ตรวจ, ผลตรวจ (ผ่าน/ไม่ผ่าน/ต้องซ่อม),
              รายละเอียดข้อสังเกต, แนบรูปภาพ สามารถสร้าง Sub-Task ได้
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">12.3 ประวัติ PM</h4>
            <p className="text-xs text-muted-foreground">
              บันทึกประวัติทุกครั้งที่ PM สำเร็จ แสดงวันที่ ผู้ดำเนินการ หมายเหตุ กรองตามอุปกรณ์/ช่วงเวลา
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "reports",
      number: "13",
      title: "รายงาน (Reports)",
      icon: <FileSearch className="h-5 w-5" />,
      description: "สรุปสต็อก เอกสาร Stock Movement Stock Card Dead Stock ใบขอซื้อ",
      content: (
        <div className="space-y-4">
          {[
            { title: "13.1 รายงานสินค้าคงคลัง (Inventory Report)", desc: "แสดงรายการสินค้าทั้งหมด กรองตามฝ่าย/หมวดหมู่/สถานะ/สถานที่จัดเก็บ ดูจำนวนคงเหลือ มูลค่า สถานที่จัดเก็บ สภาพสินค้า Export เป็น Excel ได้" },
            { title: "13.2 ค้นหาเอกสาร (Document Search)", desc: "ค้นหาเอกสารทุกประเภท (รับเข้า PD / เบิกจ่าย GI / ส่งตรง DS) ตามเลขเอกสาร, ชื่อสินค้า, ช่วงวันที่ ดูรายละเอียดเอกสารและรายการสินค้าในเอกสาร" },
            { title: "13.3 Stock Movement Log", desc: "ประวัติความเคลื่อนไหวของสต็อกทั้งหมด: รับเข้า (receive), จ่ายออก (issue), โอนย้าย (transfer_in/transfer_out), ติดตั้ง (install_to_billboard), ถอด (return_from_billboard) กรองตามสินค้า/ช่วงเวลา/ประเภท" },
            { title: "13.4 Stock Card", desc: "แสดงข้อมูลสต็อกของสินค้าแต่ละรายการแบบละเอียด (คล้ายบัตรสต็อก) ดูยอดคงเหลือ ประวัติเข้า-ออก ข้อมูล S/N, Lot Number, สถานที่จัดเก็บ" },
            { title: "13.5 รายงาน Dead Stock", desc: "สินค้าที่ไม่มีการเคลื่อนไหว (ไม่มีเบิก/จ่าย) เกินจำนวนวันที่กำหนด (ตั้งค่าได้) กรองตามฝ่าย/หมวดหมู่ ช่วยตัดสินใจเรื่องการจัดการสต็อกเก่า Pagination รองรับข้อมูลจำนวนมาก" },
            { title: "13.6 รายงานเบิกตามป้าย (Billboard Issue Report)", desc: "สรุปรายการอุปกรณ์ที่เบิกไปติดตั้งบนป้ายโฆษณาแต่ละป้าย กรองตามป้าย/ช่วงเวลา/ฝ่าย Pagination รองรับข้อมูลจำนวนมาก" },
            { title: "13.7 ใบขอซื้อ (Purchase Requests - PR)", desc: "ระบบสร้าง PR อัตโนมัติเมื่อสต็อกต่ำกว่า Min Stock แสดงสถานะ PR (รอดำเนินการ/อนุมัติ/ยกเลิก) จำนวนแนะนำ ประวัติการสร้าง Pagination รองรับข้อมูลจำนวนมาก" },
            { title: "13.8 ค้นหาอุปกรณ์ป้าย (Equipment Tracking)", desc: "ค้นหาอุปกรณ์ที่ติดตั้งบนป้ายโฆษณา ดูว่าอุปกรณ์ชิ้นใดอยู่ที่ป้ายไหน พร้อม S/N, สภาพ, วันติดตั้ง" },
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
      number: "14",
      title: "ระบบแจ้งเตือน (Notifications)",
      icon: <Bell className="h-5 w-5" />,
      description: "ตั้งค่า ประเภท และการจัดการแจ้งเตือน",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">ประเภทการแจ้งเตือน</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, title: "สต็อกต่ำ", desc: "เมื่อจำนวนคงเหลือ ≤ ระดับขั้นต่ำ (Min Stock) → ระบบสร้าง PR อัตโนมัติ" },
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
          <div>
            <h4 className="font-semibold mb-2">ศูนย์แจ้งเตือน (Notification Center)</h4>
            <p className="text-xs text-muted-foreground">
              ไอคอนกระดิ่ง 🔔 ที่แถบด้านบนแสดงจำนวนแจ้งเตือนที่ยังไม่ได้อ่าน คลิกเพื่อดูรายการแจ้งเตือนทั้งหมด
              แต่ละรายการสามารถคลิกเพื่อนำทางไปยังหน้าที่เกี่ยวข้อง
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "admin",
      number: "15",
      title: "จัดการผู้ใช้ (Admin)",
      icon: <Shield className="h-5 w-5" />,
      description: "จัดการบัญชี บทบาท สิทธิ์ตามฝ่าย สิทธิ์ตามฟังก์ชัน รีเซ็ตรหัสผ่าน",
      content: (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground mb-2">
            <strong>หมายเหตุ:</strong> เฉพาะ Admin เท่านั้นที่เข้าถึงหน้านี้ได้
          </p>
          <div>
            <h4 className="font-semibold mb-2">15.1 จัดการบัญชีผู้ใช้</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>ดูรายชื่อผู้ใช้ทั้งหมดพร้อมสถานะ (Active/Inactive) และ Badge บทบาท</li>
              <li>กำหนดบทบาท (Admin=แดง / Manager=ม่วง / Warehouse Staff=เขียว / Receiver=น้ำเงิน / Requester=เทา)</li>
              <li>รีเซ็ตรหัสผ่านผู้ใช้ (ส่ง Email ให้ผู้ใช้ตั้งรหัสใหม่)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">15.2 กำหนดสิทธิ์ตามฝ่าย</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>เลือกผู้ใช้ → เปิด/ปิดสิทธิ์แต่ละฝ่าย (ดึงรายชื่อฝ่ายจากฐานข้อมูลอัตโนมัติ)</li>
              <li>แต่ละฝ่ายกำหนด 4 สิทธิ์: ดูข้อมูล / สร้างรายการ / แก้ไขข้อมูล / ลบรายการ</li>
              <li>สิทธิ์ "ลบรายการ" ถูกล็อคสำหรับ Non-Admin (ระบบบังคับ + ตรวจสอบ Logic ก่อนบันทึก)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">15.3 กำหนดสิทธิ์ตามฟังก์ชัน</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>เปิด/ปิดการเข้าถึงแต่ละเมนู/ฟังก์ชัน (เมนูที่ปิดจะไม่แสดงในแถบเมนูข้าง)</li>
              <li>ฟังก์ชันทั้งหมดในระบบ: นำสินค้าเข้า, รับเข้าคลัง, ขอเบิก, จ่ายสินค้า, ข้อมูลหลัก, รายงาน, ป้ายโฆษณา, PM ป้าย, PM เครื่องมือ, โอนย้าย, นำเข้าภาพโฆษณา, เบิกภาพโฆษณา, คลังภาพโฆษณา, จัดการระบบ, ยืนยันรับสินค้า, อนุมัติเบิกทรัพย์สิน, ขอส่งตรง, อนุมัติส่งตรง, จัดซื้อ-ส่งตรง</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">15.4 คู่มือและแนวทางสิทธิ์</h4>
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
            <p className="text-muted-foreground text-sm">Equipment Tracking System — เอกสารอธิบายการทำงานทั้งหมดอย่างละเอียด ({sections.length} หมวด)</p>
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
                        <CardTitle className="text-base">
                          <Badge variant="outline" className="mr-2 text-xs">{section.number}</Badge>
                          {section.title}
                        </CardTitle>
                        <CardDescription className="mt-1">{section.description}</CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.has(section.id) ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
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
