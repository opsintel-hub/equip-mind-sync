import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Download, ChevronRight, ChevronDown,
  LayoutDashboard, Package, Truck, PackageCheck, Monitor, FileKey,
  ShoppingCart, User, ArrowLeftRight, Clock, MapPin, Calendar, History,
  ImageIcon, FileOutput, Wrench, ClipboardList, FileSearch, Archive, Search,
  Database, Bell, Shield, BookOpen, Lock, Layers, AlertTriangle, Settings,
  CheckCircle, XCircle, BarChart3, Upload, QrCode, Eye, Zap, Filter, Send,
  Hash, Fingerprint, RotateCcw, Clipboard, PlusCircle, ScanLine, Box
} from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WorkflowDiagram } from "@/components/manual/WorkflowDiagram";

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
    // ──────────────── 1. ภาพรวมระบบ ────────────────
    {
      id: "overview",
      number: "1",
      title: "ภาพรวมระบบ",
      icon: <LayoutDashboard className="h-5 w-5" />,
      description: "แนะนำระบบ โครงสร้าง แนวคิดหลัก และ Flow การทำงาน",
      content: (
        <div className="space-y-5">
          <p className="text-muted-foreground">
            ระบบบริหารจัดการคลังสินค้าและอุปกรณ์ (Equipment Tracking System) เป็นระบบเว็บแอปพลิเคชัน
            สำหรับจัดการคลังสินค้า อุปกรณ์ เครื่องมือ ป้ายโฆษณา และภาพโฆษณา แบบครบวงจร
            พร้อมระบบ Serial Number Tracking ระดับรายชิ้น
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "คลังสินค้า", desc: "นำเข้า-รับเข้าคลัง-เบิกจ่าย-โอนย้าย-ยืมข้ามบริษัท-ส่งตรง" },
              { label: "Serial Number", desc: "ติดตาม S/N รายชิ้น: pending → in_stock → issued → installed → defective" },
              { label: "ป้ายโฆษณา", desc: "จัดการป้าย ติดตั้ง/ถอดอุปกรณ์ PM ป้ายโฆษณา" },
              { label: "ภาพโฆษณา", desc: "นำเข้า-รับเข้าคลัง-เบิก-จ่ายภาพโฆษณา (ใหม่/เก่า/ฝากชั่วคราว)" },
              { label: "เครื่องมือ", desc: "ข้อมูลเครื่องมือ PM เครื่องมือ ตาราง PM ประวัติ PM รายงาน PM" },
              { label: "รายงาน", desc: "สรุปสต็อก Dead Stock เอกสาร Stock Card ใบขอซื้อ Stock Movement" },
            ].map((item, i) => (
              <div key={i} className="p-3 border rounded-lg bg-muted/30">
                <h4 className="font-semibold text-sm">{item.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* ── Main Warehouse Flow ── */}
          <WorkflowDiagram
            title="Flow หลักของระบบ (สินค้าผ่านคลัง)"
            rows={[
              {
                steps: [
                  { icon: <Truck className="h-4 w-4 text-blue-600" />, label: "นำสินค้าเข้า", sublabel: "Delivery Entry", variant: "info" },
                  { icon: <PackageCheck className="h-4 w-4 text-emerald-600" />, label: "รับเข้าคลัง", sublabel: "Receive Goods", variant: "success" },
                  { icon: <Box className="h-4 w-4" />, label: "จัดเก็บ", sublabel: "Storage" },
                  { icon: <ClipboardList className="h-4 w-4 text-amber-600" />, label: "ขอเบิก", sublabel: "Issue Request", variant: "warning" },
                  { icon: <CheckCircle className="h-4 w-4 text-purple-600" />, label: "อนุมัติ", sublabel: "ถ้าเป็นทรัพย์สิน" },
                  { icon: <ShoppingCart className="h-4 w-4 text-red-600" />, label: "จ่ายสินค้า", sublabel: "Issue Goods", variant: "danger" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "ยืนยันรับ", sublabel: "Confirmation", variant: "success" },
                ],
              },
            ]}
          />

          {/* ── Direct Shipping Flow ── */}
          <WorkflowDiagram
            title="Flow ส่งตรง (Direct Shipping)"
            rows={[
              {
                steps: [
                  { icon: <Send className="h-4 w-4 text-blue-600" />, label: "ขอส่งตรง", sublabel: "DS Request", variant: "info" },
                  { icon: <CheckCircle className="h-4 w-4 text-purple-600" />, label: "อนุมัติ", sublabel: "Manager" },
                  { icon: <ShoppingCart className="h-4 w-4 text-amber-600" />, label: "จัดซื้อ", sublabel: "Procurement", variant: "warning" },
                  { icon: <Truck className="h-4 w-4" />, label: "จัดส่ง", sublabel: "Supplier → ปลายทาง" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "ยืนยันรับ", sublabel: "Confirmation", variant: "success" },
                ],
              },
            ]}
          />

          {/* ── Serial Number Lifecycle ── */}
          <WorkflowDiagram
            title="วงจรชีวิต Serial Number (S/N Lifecycle)"
            rows={[
              {
                steps: [
                  { icon: <PlusCircle className="h-4 w-4 text-blue-600" />, label: "Pending", sublabel: "นำสินค้าเข้า", variant: "info" },
                  { icon: <PackageCheck className="h-4 w-4 text-emerald-600" />, label: "In Stock", sublabel: "รับเข้าคลัง", variant: "success", highlight: true },
                  { icon: <ShoppingCart className="h-4 w-4 text-amber-600" />, label: "Issued", sublabel: "เบิกจ่าย", variant: "warning" },
                  { icon: <MapPin className="h-4 w-4 text-purple-600" />, label: "Installed", sublabel: "ติดตั้งป้าย" },
                ],
              },
              {
                steps: [
                  { icon: <BarChart3 className="h-4 w-4" />, label: "Status", sublabel: "ตรวจสอบ" },
                  { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, label: "Defective", sublabel: "ของเสีย", variant: "danger" },
                  { icon: <RotateCcw className="h-4 w-4 text-emerald-600" />, label: "Returned", sublabel: "คืนสต็อก", variant: "success" },
                ],
              },
            ]}
            connectorBetweenRows
          />

          {/* ── Ad Flow ── */}
          <WorkflowDiagram
            title="Flow ภาพโฆษณา"
            rows={[
              {
                steps: [
                  { icon: <ImageIcon className="h-4 w-4 text-blue-600" />, label: "นำเข้าภาพ", sublabel: "Ad Entry", variant: "info" },
                  { icon: <PackageCheck className="h-4 w-4 text-emerald-600" />, label: "รับเข้าคลัง", sublabel: "Ad Receive", variant: "success" },
                  { icon: <ClipboardList className="h-4 w-4 text-amber-600" />, label: "ขอเบิก", sublabel: "Ad Request", variant: "warning" },
                  { icon: <ShoppingCart className="h-4 w-4 text-red-600" />, label: "จ่ายภาพ", sublabel: "Ad Issue", variant: "danger" },
                ],
              },
            ]}
          />

          {/* ── Defective Flow ── */}
          <WorkflowDiagram
            title="Flow ของเสีย/ชำรุด"
            rows={[
              {
                steps: [
                  { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, label: "บันทึกของเสีย", sublabel: "Defective Entry", variant: "danger" },
                  { icon: <ScanLine className="h-4 w-4" />, label: "Auto-detect", sublabel: "ถอดจากป้าย" },
                  { icon: <Clock className="h-4 w-4 text-amber-600" />, label: "รอเข้าคลัง", sublabel: "Incomplete", variant: "warning" },
                  { icon: <PackageCheck className="h-4 w-4 text-emerald-600" />, label: "รับเข้าสต็อก", sublabel: "Receive", variant: "success" },
                ],
              },
            ]}
          />

          {/* ── Billboard PM Flow ── */}
          <WorkflowDiagram
            title="Flow PM ป้ายโฆษณา"
            rows={[
              {
                steps: [
                  { icon: <MapPin className="h-4 w-4 text-blue-600" />, label: "เลือกป้าย", sublabel: "Filter/Search", variant: "info" },
                  { icon: <ShoppingCart className="h-4 w-4 text-amber-600" />, label: "ตะกร้า PM", sublabel: "PM Cart", variant: "warning" },
                  { icon: <Wrench className="h-4 w-4" />, label: "เลือกประเภท", sublabel: "PM Action" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "บันทึก PM", sublabel: "Snapshot", variant: "success" },
                  { icon: <History className="h-4 w-4" />, label: "ประวัติ PM", sublabel: "History" },
                ],
              },
            ]}
          />

          {/* ── Tool PM Flow ── */}
          <WorkflowDiagram
            title="Flow PM เครื่องมือ"
            rows={[
              {
                steps: [
                  { icon: <Calendar className="h-4 w-4 text-blue-600" />, label: "สร้างแผน", sublabel: "Schedule", variant: "info" },
                  { icon: <ClipboardList className="h-4 w-4 text-amber-600" />, label: "Task สร้างอัตโนมัติ", sublabel: "Auto-gen", variant: "warning" },
                  { icon: <Eye className="h-4 w-4" />, label: "ตรวจสอบ", sublabel: "Inspect" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "Complete", sublabel: "บันทึกผล", variant: "success" },
                  { icon: <RotateCcw className="h-4 w-4 text-blue-600" />, label: "Task ถัดไป", sublabel: "Auto-create", variant: "info" },
                ],
              },
            ]}
          />

          {/* ── Equipment Loan Flow ── */}
          <WorkflowDiagram
            title="Flow ยืมอะไหล่ข้ามบริษัท"
            rows={[
              {
                steps: [
                  { icon: <PlusCircle className="h-4 w-4 text-blue-600" />, label: "ขอยืม", sublabel: "Loan Request", variant: "info" },
                  { icon: <CheckCircle className="h-4 w-4 text-purple-600" />, label: "อนุมัติ", sublabel: "Approve" },
                  { icon: <ArrowLeftRight className="h-4 w-4 text-amber-600" />, label: "กำลังยืม", sublabel: "Active Loan", variant: "warning" },
                  { icon: <RotateCcw className="h-4 w-4" />, label: "คืนบางส่วน", sublabel: "Partial Return" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "คืนครบ", sublabel: "Completed", variant: "success" },
                ],
              },
            ]}
          />

          <Separator />
          <h4 className="font-semibold">รหัสเอกสารในระบบ</h4>
          <p className="text-xs text-muted-foreground mb-2">
            ทุกเอกสารในระบบจะได้รับรหัสอัตโนมัติเมื่อสร้าง ในรูปแบบ <strong>[PREFIX]-[YYYYMMDD]-[XXXX]</strong> โดย YYYYMMDD = วันที่สร้าง และ XXXX = ลำดับเลข 4 หลัก
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
                  {[
                    ["PD-YYYYMMDD-XXXX", "Product Delivery", "ใบนำสินค้าเข้า", "กด \"ส่งข้อมูลทั้งหมด\" ในหน้า นำสินค้าเข้า", "ค้นหาเอกสาร, รับเข้าคลัง"],
                    ["GI-YYYYMMDD-XXXX", "Goods Issue", "ใบเบิกสินค้า", "ผู้เบิกกด \"ส่งคำขอเบิก\"", "ค้นหาเอกสาร, จ่ายสินค้า"],
                    ["DS-YYYYMMDD-XXXX", "Direct Shipping", "ใบส่งตรง", "กด \"ส่งคำขอส่งตรง\"", "ค้นหาเอกสาร, อนุมัติส่งตรง"],
                    ["DC-YYYYMMDD-XXXX", "Delivery Confirmation", "ใบยืนยันรับสินค้า", "จ่ายสินค้าสำเร็จ (GI/DS)", "ยืนยันรับสินค้า"],
                    ["AD-YYYYMMDD-XXXX", "Advertisement", "ใบนำเข้าภาพโฆษณา", "กดบันทึกในหน้านำเข้าภาพ", "รับเข้าคลังภาพ, เบิกภาพ"],
                    ["DR-YYYYMMDD-XXXX", "Defective Return", "ใบนำของเสียเข้า", "กดบันทึกในหน้าของเสีย", "ค้นหาเอกสาร"],
                    ["TEMP-YYYYMMDD-XXX", "Temporary", "รหัสสินค้าชั่วคราว", "เพิ่มสินค้าใหม่ใน Delivery Entry", "รายการรอรหัส"],
                    ["PMT-YYYYMMDD-XXXX", "PM Task", "รหัสงาน PM Task", "สร้าง Task PM ตามกำหนดรอบ", "งาน PM อุปกรณ์/เครื่องมือ"],
                  ].map(([code, abbr, desc, trigger, view], i) => (
                    <tr key={i}>
                      <td className="border p-2 font-mono font-bold">{code}</td>
                      <td className="border p-2">{abbr}</td>
                      <td className="border p-2">{desc}</td>
                      <td className="border p-2">{trigger}</td>
                      <td className="border p-2">{view}</td>
                    </tr>
                  ))}
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

    // ──────────────── 2. ระบบยืนยันตัวตน ────────────────
    {
      id: "auth",
      number: "2",
      title: "ระบบยืนยันตัวตนและสิทธิ์ผู้ใช้",
      icon: <Shield className="h-5 w-5" />,
      description: "การ Login, สมัครสมาชิก, บทบาท, และระบบสิทธิ์ 3 ชั้น",
      content: (
        <div className="space-y-5">
          <WorkflowDiagram
            title="Flow การเข้าสู่ระบบ"
            rows={[
              {
                steps: [
                  { icon: <User className="h-4 w-4 text-blue-600" />, label: "Login", sublabel: "กรอก Email/Password", variant: "info" },
                  { icon: <Shield className="h-4 w-4" />, label: "ตรวจสอบสิทธิ์", sublabel: "Role + Dept + Func" },
                  { icon: <LayoutDashboard className="h-4 w-4 text-emerald-600" />, label: "Dashboard", sublabel: "เมนูตามสิทธิ์", variant: "success" },
                ],
              },
            ]}
          />
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
                  <tr><td className="border p-2 font-medium text-foreground">Super Admin</td><td className="border p-2">สิทธิ์สูงสุด — ทุกอย่างเหมือน Admin + จัดการ Tab ที่จำกัดในหน้าข้อมูลหลัก</td><td className="border p-2">ผู้ดูแลระบบระดับสูง</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Admin</td><td className="border p-2">เข้าถึงทุกฟังก์ชัน, จัดการผู้ใช้/สิทธิ์, แก้ไข Master Data, ดูรายงานทุกแผนก</td><td className="border p-2">ผู้ดูแลระบบ, IT Admin</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Manager</td><td className="border p-2">อนุมัติ/ปฏิเสธคำขอเบิกทรัพย์สิน + คำขอส่งตรง (เฉพาะฝ่ายที่ดูแล)</td><td className="border p-2">ผู้จัดการฝ่าย</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Warehouse Staff</td><td className="border p-2">รับเข้าคลัง, จ่ายสินค้า, โอนย้าย, จัดเตรียมสินค้า, PM, ยืมข้ามบริษัท</td><td className="border p-2">เจ้าหน้าที่คลัง</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Receiver</td><td className="border p-2">บันทึกการนำสินค้าเข้า (Delivery Entry), นำของเสียเข้าระบบ</td><td className="border p-2">ผู้รับสินค้าหน้าคลัง</td></tr>
                  <tr><td className="border p-2 font-medium text-foreground">Requester</td><td className="border p-2">สร้างคำขอเบิก, ดูสถานะ, ยกเลิก, ยืนยันรับสินค้า, สร้างคำขอส่งตรง</td><td className="border p-2">พนักงานทั่วไป</td></tr>
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
                <p className="text-xs text-muted-foreground mt-1">กำหนดระดับสิทธิ์พื้นฐาน — Badge สีต่างกัน (Super Admin=ทอง, Admin=แดง, Manager=ม่วง, Warehouse=น้ำเงิน, Receiver=เขียว, Requester=ส้ม)</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm">ชั้นที่ 2: สิทธิ์ตามฝ่าย (Department Permissions)</h5>
                <p className="text-xs text-muted-foreground mt-1">กำหนดว่าผู้ใช้สามารถ ดู/สร้าง/แก้ไข/ลบ ข้อมูลของฝ่ายใดบ้าง — สิทธิ์ "ลบ" สงวนไว้เฉพาะ Admin/Super Admin</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm">ชั้นที่ 3: สิทธิ์ตามฟังก์ชัน (Function Permissions)</h5>
                <p className="text-xs text-muted-foreground mt-1">กำหนดว่าผู้ใช้เข้าถึงเมนูหรือฟังก์ชันใดได้บ้าง เมนูที่ไม่มีสิทธิ์จะถูกซ่อนอัตโนมัติ</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // ──────────────── 3. Dashboard ────────────────
    {
      id: "dashboard",
      number: "3",
      title: "Dashboard หลัก",
      icon: <LayoutDashboard className="h-5 w-5" />,
      description: "หน้าสรุปภาพรวม สถิติ กราฟ การแจ้งเตือน และตัวกรองข้อมูล",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">Dashboard เป็นหน้าแรกหลัง Login แสดงสรุปข้อมูลสำคัญทั้งหมดในที่เดียว</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> สถิติสรุป</h5>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>จำนวนรายการสินค้าทั้งหมด / สต็อกต่ำกว่า Min Stock</li>
                <li>จำนวนรายการใกล้หมดอายุ / หมดประกัน</li>
                <li>จำนวนงาน PM ค้าง / ครบกำหนด</li>
              </ul>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> กราฟและแผนภูมิ</h5>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>กราฟวงกลม: สัดส่วนสินค้าตามหมวดหมู่</li>
                <li>กราฟแท่ง: สินค้าตามสถานที่จัดเก็บ (Drill-down ได้)</li>
                <li>กราฟเส้น: ความเคลื่อนไหวสต็อก</li>
                <li>Export กราฟเป็น PNG ได้ทุกกราฟ</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },

    // ──────────────── 4. Master Data ────────────────
    {
      id: "master-data",
      number: "4",
      title: "ข้อมูลหลัก (Master Data)",
      icon: <Database className="h-5 w-5" />,
      description: "จัดการข้อมูลพื้นฐานที่ใช้ร่วมกันทั้งระบบ",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">Master Data คือข้อมูลพื้นฐานที่ใช้ร่วมกันทุกส่วน</p>
          <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <h5 className="font-medium text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Lock className="h-4 w-4" /> Tab ที่จำกัดเฉพาะ Super Admin
            </h5>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Tab: <strong>อุปกรณ์, เครื่องมือ, คลังสินค้า, ตำแหน่งจัดเก็บ, Media Player</strong> — เฉพาะ Super Admin เท่านั้น
            </p>
          </div>
          <div className="space-y-3">
            {[
              { num: "4.1", title: "หมวดหมู่ / หมวดหมู่ย่อย", desc: "จัดกลุ่มสินค้า ต้องเลือกหมวดหมู่หลักก่อนจึงเพิ่มหมวดหมู่ย่อยได้" },
              { num: "4.2", title: "ยี่ห้อ (Brands)", desc: "ยี่ห้อสินค้า แบ่งตามประเภท (เครื่องมือ/อุปกรณ์)" },
              { num: "4.3", title: "ฝ่าย / แผนก", desc: "ฝ่าย (Departments) → แผนก (Sections) ภายใต้ฝ่าย ใช้ทั่วทั้งระบบ" },
              { num: "4.4", title: "บริษัท (Companies)", desc: "รหัส ชื่อ ฝ่ายที่สังกัด ใช้ระบุเจ้าของสินค้าและยืมข้ามบริษัท" },
              { num: "4.5", title: "คลังสินค้า / ตำแหน่งจัดเก็บ", desc: "Warehouse → Location → Storage Slot → Sub Slot รองรับขนาดพื้นที่ Import Excel ได้" },
              { num: "4.6", title: "ผู้จัดจำหน่าย / ผู้รับเหมา", desc: "Suppliers + Contractors พร้อมข้อมูลติดต่อ Import Excel ได้" },
              { num: "4.7", title: "รหัสนำหน้า (Code Prefixes)", desc: "กำหนด Prefix สร้างรหัสสินค้าอัตโนมัติ เช่น 'EQ' → EQ-0001" },
              { num: "4.8", title: "วัตถุประสงค์นำเข้า/เบิก", desc: "Receipt Purposes + Issue Purposes พร้อมเงื่อนไข (บังคับสถานที่, จำกัดหมวดหมู่, บังคับป้าย)" },
              { num: "4.9", title: "Media Player", desc: "CMS Type, Model, Spec, สถานะ, S/N 1 & S/N 2, เอกสารแนบ Import Excel ได้" },
              { num: "4.10", title: "ประเภทงาน PM", desc: "กำหนดประเภทงาน PM สำหรับป้ายโฆษณา เช่น ตรวจสอบโครงสร้าง, ล้างป้าย" },
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

    // ──────────────── 5. อุปกรณ์ ────────────────
    {
      id: "equipment",
      number: "5",
      title: "จัดการอุปกรณ์/สินค้า",
      icon: <Package className="h-5 w-5" />,
      description: "เพิ่ม แก้ไข โอนย้าย Import/Export Serial Number Tracking",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">5.1 การเพิ่มสินค้าใหม่</h4>
            <p className="text-xs text-muted-foreground mb-2">ข้อมูลที่ต้องกรอก (* = บังคับ):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>ฝ่าย *</strong>, <strong>รหัสสินค้า *</strong> (เลือก Prefix → สร้างอัตโนมัติ)</li>
                <li><strong>ชื่อ *, หมวดหมู่/ย่อย *, หน่วยนับ *</strong></li>
                <li><strong>จำนวนเริ่มต้น *, ราคาต่อชิ้น *, จุดสั่งซื้อขั้นต่ำ *</strong></li>
                <li>Serial Number, ขนาด (กว้างxสูงxลึก), ข้อมูลทางเทคนิค</li>
              </ul>
              <ul className="list-disc list-inside space-y-1">
                <li>วันหมดอายุ / วันหมดประกัน</li>
                <li>สถานที่จัดเก็บ (คลัง → ตำแหน่ง → Slot → Sub Slot)</li>
                <li>ข้อมูลทรัพย์สิน: Asset Code, Equipment ID Code, ค่าเสื่อมราคา</li>
                <li>รูปภาพ (อัปโหลดหลายรูป ลำดับปรับได้)</li>
              </ul>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><Hash className="h-4 w-4" /> 5.2 ระบบ Serial Number Tracking (ใหม่)</h4>
            <p className="text-xs text-muted-foreground mb-2">ระบบเก็บ Serial Number แยกเป็นตารางเฉพาะ (equipment_serial_numbers) เพื่อติดตามรายชิ้น:</p>
            <WorkflowDiagram
              rows={[
                {
                  steps: [
                    { icon: <Truck className="h-4 w-4 text-blue-600" />, label: "Pending", sublabel: "Delivery Entry", variant: "info" },
                    { icon: <PackageCheck className="h-4 w-4 text-emerald-600" />, label: "In Stock", sublabel: "Receive Goods", variant: "success" },
                    { icon: <ShoppingCart className="h-4 w-4 text-amber-600" />, label: "Issued", sublabel: "Issue Goods", variant: "warning" },
                    { icon: <MapPin className="h-4 w-4 text-purple-600" />, label: "Installed", sublabel: "ติดตั้งป้าย" },
                    { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, label: "Defective", sublabel: "ของเสีย", variant: "danger" },
                  ],
                },
              ]}
            />
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 mt-3">
              <li><strong>Delivery Entry:</strong> บันทึก S/N ตอนนำสินค้าเข้า → สถานะ <Badge variant="outline" className="text-[10px] px-1">pending</Badge></li>
              <li><strong>Receive Goods:</strong> รับเข้าคลังจริง → อัปเดตเป็น <Badge variant="outline" className="text-[10px] px-1">in_stock</Badge> + กำหนด location</li>
              <li><strong>Issue Goods:</strong> เบิกจ่าย → อัปเดตเป็น <Badge variant="outline" className="text-[10px] px-1">issued</Badge> หรือ <Badge variant="outline" className="text-[10px] px-1">installed</Badge> (ถ้าติดตั้งป้าย)</li>
              <li><strong>Defective Return:</strong> ของเสีย → อัปเดตเป็น <Badge variant="outline" className="text-[10px] px-1">defective</Badge></li>
              <li><strong>Billboard Uninstall:</strong> ถอดจากป้าย → กลับเป็น <Badge variant="outline" className="text-[10px] px-1">in_stock</Badge> หรือ <Badge variant="outline" className="text-[10px] px-1">returned</Badge></li>
              <li><strong>Transfer:</strong> ย้ายอุปกรณ์ → อัปเดต location_id ของ S/N ที่ in_stock ทั้งหมด</li>
              <li><strong>S/N Viewer:</strong> กดปุ่ม "S/N" ในหน้า Equipment List เพื่อดู/ค้นหา S/N ทั้งหมดของอุปกรณ์</li>
            </ul>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">5.3 โอนย้าย / ยืมข้ามบริษัท / Import-Export</h4>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li><strong>โอนย้าย:</strong> เลือกสินค้า → ระบุจำนวน/ปลายทาง → อัปเดตสถานที่ + S/N location + Stock Movement</li>
              <li><strong>ยืมข้ามบริษัท:</strong> ขอยืม → อนุมัติ (ข้ามฝ่ายต้อง Manager) → กำลังยืม → คืนบางส่วน/ทั้งหมด</li>
              <li><strong>Import/Export:</strong> ดาวน์โหลด Template Excel → กรอก → อัปโหลด / Export ทั้งหมดเป็น Excel</li>
            </ul>
          </div>
        </div>
      ),
    },

    // ──────────────── 6. นำสินค้าเข้า / รับเข้าคลัง ────────────────
    {
      id: "goods-receipt",
      number: "6",
      title: "นำสินค้าเข้า / รับเข้าคลัง (Goods Receipt)",
      icon: <Truck className="h-5 w-5" />,
      description: "Delivery Entry → Receive Goods → Per-unit S/N → รายการรอรหัส → ของเสีย",
      content: (
        <div className="space-y-5">
          <WorkflowDiagram
            title="Flow การรับสินค้า"
            rows={[
              {
                steps: [
                  { icon: <Truck className="h-4 w-4 text-blue-600" />, label: "นำสินค้าเข้า", sublabel: "Delivery Entry", variant: "info" },
                  { icon: <Hash className="h-4 w-4" />, label: "บันทึก S/N", sublabel: "Per-unit Mode" },
                  { icon: <Clock className="h-4 w-4 text-amber-600" />, label: "รอรับเข้าคลัง", sublabel: "Pending", variant: "warning" },
                  { icon: <PackageCheck className="h-4 w-4 text-emerald-600" />, label: "รับเข้าคลัง", sublabel: "Receive", variant: "success" },
                  { icon: <Box className="h-4 w-4" />, label: "จัดเก็บ", sublabel: "Storage + S/N update" },
                ],
              },
            ]}
          />

          <div>
            <h4 className="font-semibold mb-2">6.1 นำสินค้าเข้า (Delivery Entry)</h4>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>เลือกสินค้าจากระบบ หรือ สร้างรายการใหม่ (ระบบสร้างรหัส TEMP ชั่วคราว)</li>
              <li>ระบุ S/N, Lot, ราคา, Supplier, จำนวน, วัตถุประสงค์การนำเข้า</li>
              <li><strong>Per-unit Mode:</strong> เพิ่มข้อมูลรายชิ้น (S/N, ชื่อเครื่อง, รูปภาพ) สำหรับ Media Player</li>
              <li>สินค้าเข้าหลายรายการใน 1 เอกสาร (ตะกร้า Delivery Cart)</li>
              <li>S/N ที่บันทึกจะถูกเพิ่มในตาราง equipment_serial_numbers สถานะ <Badge variant="outline" className="text-[10px] px-1">pending</Badge></li>
            </ul>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">6.2 รับเข้าคลัง (Receive Goods)</h4>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>เลือกเอกสาร PD ที่รอรับ → ระบุสถานที่จัดเก็บ (คลัง → ตำแหน่ง → Slot)</li>
              <li>ตรวจสอบ/แก้ไข S/N ได้อีกครั้ง (ข้อมูลจากการรับเข้าจริงเป็น Authoritative Source)</li>
              <li>กดรับเข้า → เพิ่มสต็อก + อัปเดต S/N เป็น <Badge variant="outline" className="text-[10px] px-1">in_stock</Badge> + บันทึก Stock Movement</li>
              <li>สินค้ารหัส TEMP → เจ้าหน้าที่กำหนดรหัสจริงตอนรับเข้าคลัง</li>
              <li>รองรับรับเข้าแบบ Batch (เลือกหลายรายการพร้อมกัน)</li>
            </ul>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">6.3 นำของเสียเข้าระบบ (Defective Return)</h4>
            <WorkflowDiagram
              rows={[
                {
                  steps: [
                    { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, label: "เลือกสินค้า", sublabel: "อุปกรณ์/Media Player", variant: "danger" },
                    { icon: <ScanLine className="h-4 w-4" />, label: "Auto-detect", sublabel: "ถ้าอยู่บนป้าย" },
                    { icon: <Hash className="h-4 w-4" />, label: "ระบุ S/N", sublabel: "Per-unit Mode" },
                    { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "บันทึก", sublabel: "S/N → defective", variant: "success" },
                  ],
                },
              ]}
            />
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 mt-2">
              <li>เลือกแหล่งที่มา: จากป้ายโฆษณา หรือ จากหน่วยงาน</li>
              <li>ระบบตรวจจับอัตโนมัติ (Auto-detect) ถ้าอุปกรณ์ติดตั้งอยู่ที่ป้าย → ถอดอัตโนมัติ</li>
              <li>Per-unit Mode: ระบุ S/N, เหตุผล, สภาพ แต่ละชิ้น</li>
              <li>S/N จะถูกอัปเดตเป็น <Badge variant="outline" className="text-[10px] px-1">defective</Badge> อัตโนมัติ</li>
              <li>รายการของเสียจะแสดงในแท็บ "รอเข้าคลัง" (Incomplete Issues)</li>
            </ul>
          </div>
        </div>
      ),
    },

    // ──────────────── 7. เบิก-จ่ายสินค้า ────────────────
    {
      id: "goods-issue",
      number: "7",
      title: "เบิก-จ่ายสินค้า (Goods Issue)",
      icon: <ShoppingCart className="h-5 w-5" />,
      description: "ขอเบิก → อนุมัติ → จ่ายสินค้า → ยืนยันรับ → FIFO → S/N Tracking",
      content: (
        <div className="space-y-5">
          <WorkflowDiagram
            title="Flow การเบิก-จ่ายสินค้า"
            rows={[
              {
                steps: [
                  { icon: <ClipboardList className="h-4 w-4 text-blue-600" />, label: "ขอเบิก", sublabel: "Issue Request", variant: "info" },
                  { icon: <CheckCircle className="h-4 w-4 text-purple-600" />, label: "อนุมัติ", sublabel: "ถ้า is_asset" },
                  { icon: <ShoppingCart className="h-4 w-4 text-amber-600" />, label: "จ่ายสินค้า", sublabel: "เลือก S/N จริง", variant: "warning" },
                  { icon: <Hash className="h-4 w-4" />, label: "S/N → Issued", sublabel: "ตัดสต็อก" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "ยืนยันรับ", sublabel: "Confirmation", variant: "success" },
                ],
              },
            ]}
          />

          <div>
            <h4 className="font-semibold mb-2">7.1 ขอเบิกสินค้า (Issue Request)</h4>
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-2">
              <p><strong>ข้อมูลผู้ขอเบิก:</strong> ชื่อ *, เบอร์โทร, ฝ่าย (ล็อค), แผนก, บริษัท *, วัตถุประสงค์ *</p>
              <p><strong>รูปแบบการรับ 3 แบบ:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>🔴 รอรับที่คลัง (Wait on-site) — เร่งด่วน</li>
                <li>🟡 นัดรับล่วงหน้า (Scheduled) — บังคับระบุวัน/เวลา</li>
                <li>🔵 จัดส่ง (Delivery) — ระบุปลายทาง</li>
              </ul>
              <p><strong>เลือกสินค้า 2 วิธี:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>FIFO: เรียงตามวันเข้าคลัง + Badge หมดอายุ/ประกัน</li>
                <li>ค้นหาจาก S/N: เลือกจาก <Badge variant="outline" className="text-[10px] px-1">in_stock</Badge> เท่านั้น</li>
              </ul>
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">7.2 อนุมัติ (Manager Approval)</h4>
            <p className="text-xs text-muted-foreground">เฉพาะคำขอที่มีทรัพย์สิน (is_asset) → Manager ดูเฉพาะฝ่ายที่ดูแล → อนุมัติ/ปฏิเสธ</p>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">7.3 จ่ายสินค้า (Issue Goods)</h4>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>เจ้าหน้าที่คลังสามารถเลือก/แก้ไข S/N ที่จะจ่ายจริง (Override Authority)</li>
              <li>ระบบดึง S/N ที่ <Badge variant="outline" className="text-[10px] px-1">in_stock</Badge> มาให้เลือก — ป้องกันเลือก S/N ที่จ่ายออกแล้ว</li>
              <li>รองรับ "จ่ายบางส่วน" (Partial Issue) — จ่ายหลายครั้งจนครบ</li>
              <li>กดจ่าย → ตัดสต็อก + อัปเดต S/N เป็น <Badge variant="outline" className="text-[10px] px-1">issued</Badge> / <Badge variant="outline" className="text-[10px] px-1">installed</Badge></li>
            </ul>
          </div>

          <Separator />
          <div>
            <h4 className="font-semibold mb-2">7.4 ยืนยันรับสินค้า (Delivery Confirmation)</h4>
            <p className="text-xs text-muted-foreground">ผู้รับยืนยันรับ / รายงานปัญหา (ชำรุด, ไม่ครบ, ผิดรุ่น) + แนบหลักฐาน — รองรับทั้ง GI และ DS</p>
          </div>

          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">7.5 Dashboard ผู้เบิก</h5>
              <p className="text-xs text-muted-foreground mt-1">ดูสถานะคำขอ, ยกเลิกคำขอรอดำเนินการ, ประวัติคำขอทั้งหมด</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">7.6 แผนจัดเตรียมสินค้า</h5>
              <p className="text-xs text-muted-foreground mt-1">Warehouse Pickup Planning: รายการต้องจัดเตรียม เรียงความเร่งด่วน</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">7.7 คำขอรอสินค้า</h5>
              <p className="text-xs text-muted-foreground mt-1">Waiting Stock: คำขอจ่ายบางส่วนแล้ว รอสินค้าเพิ่ม</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">7.8 รอระบุป้าย/รอคืน/รอเข้าคลัง</h5>
              <p className="text-xs text-muted-foreground mt-1">Incomplete Issues: รายการเบิกที่ดำเนินการไม่ครบ + ของเสียรอเข้าคลัง</p>
            </div>
          </div>
        </div>
      ),
    },

    // ──────────────── 8. Direct Shipping ────────────────
    {
      id: "direct-shipping",
      number: "8",
      title: "ส่งตรง (Direct Shipping)",
      icon: <Send className="h-5 w-5" />,
      description: "ขอส่งตรงจาก Supplier → อนุมัติ → จัดซื้อ → แชร์ข้อมูล → ยืนยันรับ",
      content: (
        <div className="space-y-5">
          <WorkflowDiagram
            title="Flow Direct Shipping แบบละเอียด"
            rows={[
              {
                steps: [
                  { icon: <Send className="h-4 w-4 text-blue-600" />, label: "ขอส่งตรง", sublabel: "ระบุรายละเอียด", variant: "info" },
                  { icon: <CheckCircle className="h-4 w-4 text-purple-600" />, label: "อนุมัติ", sublabel: "Manager" },
                  { icon: <ShoppingCart className="h-4 w-4 text-amber-600" />, label: "จัดซื้อ", sublabel: "เพิ่มรายการจริง", variant: "warning" },
                ],
              },
              {
                steps: [
                  { icon: <Clipboard className="h-4 w-4" />, label: "แชร์ Supplier", sublabel: "LINE / ลิงก์สาธารณะ" },
                  { icon: <Truck className="h-4 w-4" />, label: "จัดส่ง", sublabel: "Virtual Receipt+Issue" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "ยืนยันรับ", sublabel: "ผู้รับปลายทาง", variant: "success" },
                ],
              },
            ]}
            connectorBetweenRows
          />

          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">ขั้นตอน 1: ขอส่งตรง</h5>
              <p className="text-xs text-muted-foreground mt-1">ระบุผู้ขอ, Supplier, ปลายทาง (พิกัด Lat/Lng), วัตถุประสงค์, วันที่คาดว่าถึง → สร้างเอกสาร DS</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">ขั้นตอน 2: อนุมัติ</h5>
              <p className="text-xs text-muted-foreground mt-1">Manager เฉพาะฝ่ายที่ดูแล → อนุมัติ/ปฏิเสธ (พร้อมเหตุผล)</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">ขั้นตอน 3: จัดซื้อ + แชร์ข้อมูล</h5>
              <p className="text-xs text-muted-foreground mt-1">เพิ่มรายการสินค้าจริง, ระบุ PO/PR + แนบไฟล์, ระบุผู้จัดส่ง</p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 mt-2 ml-2">
                <li>📋 คัดลอกข้อมูลส่ง LINE (สรุป + ลิงก์ Google Maps)</li>
                <li>🔗 คัดลอกลิงก์สาธารณะ (/ds-view/:id) → Supplier ดูได้โดยไม่ต้อง Login</li>
              </ul>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">ขั้นตอน 4: ยืนยันรับสินค้า</h5>
              <p className="text-xs text-muted-foreground mt-1">ผู้รับปลายทางยืนยัน พร้อม Badge "DS" แยกให้ชัดเจน + รายงานปัญหาได้</p>
            </div>
          </div>
        </div>
      ),
    },

    // ──────────────── 9. ป้ายโฆษณา ────────────────
    {
      id: "billboards",
      number: "9",
      title: "ป้ายโฆษณา (Billboards)",
      icon: <MapPin className="h-5 w-5" />,
      description: "จัดการข้อมูลป้าย ติดตั้ง/ถอดอุปกรณ์ QR Code PM ป้าย",
      content: (
        <div className="space-y-4">
          <WorkflowDiagram
            title="Flow ติดตั้ง/ถอดอุปกรณ์ป้าย"
            rows={[
              {
                steps: [
                  { icon: <Package className="h-4 w-4 text-emerald-600" />, label: "เลือกอุปกรณ์", sublabel: "จากคลัง (in_stock)", variant: "success" },
                  { icon: <MapPin className="h-4 w-4 text-blue-600" />, label: "ติดตั้ง", sublabel: "ระบุ S/N + จำนวน", variant: "info" },
                  { icon: <Hash className="h-4 w-4" />, label: "S/N → Installed", sublabel: "ตัดสต็อก" },
                ],
              },
              {
                steps: [
                  { icon: <Wrench className="h-4 w-4 text-amber-600" />, label: "ถอดอุปกรณ์", sublabel: "ระบุเหตุผล", variant: "warning" },
                  { icon: <RotateCcw className="h-4 w-4" />, label: "คืนสต็อก?", sublabel: "เลือกได้" },
                  { icon: <PackageCheck className="h-4 w-4 text-emerald-600" />, label: "S/N → In Stock", sublabel: "คืนสถานะ", variant: "success" },
                ],
              },
            ]}
            connectorBetweenRows
          />

          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">9.1 ข้อมูลป้ายโฆษณา</h5>
              <p className="text-xs text-muted-foreground mt-1">รหัส Old Code (อ้างอิงหลัก), ตำแหน่ง, ขนาด, ประเภทสื่อ, ฝ่าย, เส้นทาง PM/ติดตั้ง/ตรวจสอบ, สถานะ Import/Export Excel ได้</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">9.2 QR Code</h5>
              <p className="text-xs text-muted-foreground mt-1">สร้าง QR Code แต่ละป้าย → สแกนเปิดหน้า Public View โดยไม่ต้อง Login</p>
            </div>
          </div>

          <Separator />
          <WorkflowDiagram
            title="Flow PM ป้ายโฆษณา"
            rows={[
              {
                steps: [
                  { icon: <Filter className="h-4 w-4 text-blue-600" />, label: "กรองป้าย", sublabel: "ฝ่าย/เส้นทาง/สถานะ", variant: "info" },
                  { icon: <ShoppingCart className="h-4 w-4 text-amber-600" />, label: "ตะกร้า PM", sublabel: "เลือกหลายป้าย", variant: "warning" },
                  { icon: <Wrench className="h-4 w-4" />, label: "เลือกประเภท PM", sublabel: "Action Type" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "บันทึก PM", sublabel: "Snapshot อุปกรณ์", variant: "success" },
                  { icon: <History className="h-4 w-4" />, label: "ประวัติ PM", sublabel: "ดูย้อนหลัง" },
                ],
              },
            ]}
          />
        </div>
      ),
    },

    // ──────────────── 10. ภาพโฆษณา ────────────────
    {
      id: "ad-management",
      number: "10",
      title: "จัดการภาพโฆษณา",
      icon: <ImageIcon className="h-5 w-5" />,
      description: "นำเข้า รับเข้าคลัง เบิก จ่ายภาพโฆษณา (ใหม่/เก่า/ฝากชั่วคราว)",
      content: (
        <div className="space-y-4">
          <WorkflowDiagram
            title="Flow ภาพโฆษณา (ครบวงจร)"
            rows={[
              {
                steps: [
                  { icon: <ImageIcon className="h-4 w-4 text-blue-600" />, label: "นำเข้าภาพ", sublabel: "ใหม่/เก่า/ชั่วคราว", variant: "info" },
                  { icon: <PackageCheck className="h-4 w-4 text-emerald-600" />, label: "รับเข้าคลัง", sublabel: "สร้างเบิกอัตโนมัติ", variant: "success" },
                  { icon: <ClipboardList className="h-4 w-4 text-amber-600" />, label: "ขอเบิก", sublabel: "เลือกป้ายเป้าหมาย", variant: "warning" },
                  { icon: <ShoppingCart className="h-4 w-4 text-red-600" />, label: "จ่ายภาพ", sublabel: "อัปเดตสถานะ", variant: "danger" },
                ],
              },
            ]}
          />
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm text-primary">ภาพโฆษณาใหม่</h5>
              <p className="text-xs text-muted-foreground mt-1">ชื่อ, เวอร์ชัน (ชื่อ+จำนวน), ขนาด, ประเภทสื่อ, อัปโหลดรูป, ป้ายเป้าหมาย, ทีมติดตั้ง → รับเข้าคลังแล้วสร้างเบิกอัตโนมัติ</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm text-primary">ขอใช้พื้นที่ชั่วคราว</h5>
              <p className="text-xs text-muted-foreground mt-1">ระบุพื้นที่จัดเก็บ, วัน-เวลาเข้า/ออก, ข้อมูลผู้ติดต่อ</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm text-primary">ภาพโฆษณาเก่า (ปลดจากป้าย)</h5>
              <p className="text-xs text-muted-foreground mt-1">ระยะเวลาจัดเก็บ (30/60/90 วัน), ผู้รับเหมาที่รับภาพ → แจ้งเตือนเมื่อครบกำหนด</p>
            </div>
          </div>
        </div>
      ),
    },

    // ──────────────── 11. เครื่องมือ ────────────────
    {
      id: "tools",
      number: "11",
      title: "จัดการเครื่องมือ (Tools)",
      icon: <Wrench className="h-5 w-5" />,
      description: "ข้อมูลเครื่องมือ PM เครื่องมือ ตาราง PM ประวัติ PM รายงาน PM",
      content: (
        <div className="space-y-4">
          <WorkflowDiagram
            title="Flow PM เครื่องมือ"
            rows={[
              {
                steps: [
                  { icon: <Calendar className="h-4 w-4 text-blue-600" />, label: "สร้างแผน PM", sublabel: "กำหนดรอบ", variant: "info" },
                  { icon: <ClipboardList className="h-4 w-4 text-amber-600" />, label: "Task อัตโนมัติ", sublabel: "PMT-XXXXXXXX", variant: "warning" },
                  { icon: <Eye className="h-4 w-4" />, label: "ตรวจสอบ", sublabel: "บันทึกผล+รูป" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "Complete", sublabel: "ผ่าน/ไม่ผ่าน", variant: "success" },
                  { icon: <RotateCcw className="h-4 w-4 text-blue-600" />, label: "สร้าง Task ถัดไป", sublabel: "อัตโนมัติ", variant: "info" },
                ],
              },
            ]}
          />
          <div>
            <h4 className="font-semibold mb-2">11.1 ข้อมูลเครื่องมือ</h4>
            <p className="text-xs text-muted-foreground">
              รหัส (Prefix), ชื่อ, หมวดหมู่เครื่องมือ, ฝ่าย, ยี่ห้อ, S/N, รอบ PM (กี่วัน), Technician ที่รับผิดชอบ Import Excel ได้
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">11.2 PM เครื่องมือ</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>งาน PM:</strong> Task อัตโนมัติตามรอบ → บันทึกผล: วันตรวจ, ผู้ตรวจ, จำนวนตรวจ, ผล (ผ่าน/ไม่ผ่าน/ต้องซ่อม), รูปภาพ</li>
              <li><strong>ตาราง PM:</strong> ภาพรวมแผน PM ทั้งหมด Import Excel ได้</li>
              <li><strong>ประวัติ PM:</strong> ดูประวัติ PM ที่ผ่านมา + รูปภาพ</li>
              <li><strong>รายงาน PM:</strong> สรุปผล PM แยกตามช่วงเวลา/สถานะ/ฝ่าย</li>
            </ul>
          </div>
        </div>
      ),
    },

    // ──────────────── 12. PM อุปกรณ์ ────────────────
    {
      id: "equipment-pm",
      number: "12",
      title: "PM อุปกรณ์ (Equipment PM)",
      icon: <Calendar className="h-5 w-5" />,
      description: "แผน PM สำหรับอุปกรณ์ที่ติดตั้งบนป้ายหรืออุปกรณ์ทั่วไป",
      content: (
        <div className="space-y-4">
          <WorkflowDiagram
            title="Flow PM อุปกรณ์"
            rows={[
              {
                steps: [
                  { icon: <PlusCircle className="h-4 w-4 text-blue-600" />, label: "สร้างแผน", sublabel: "เลือกอุปกรณ์+รอบ", variant: "info" },
                  { icon: <ClipboardList className="h-4 w-4 text-amber-600" />, label: "Task สร้างอัตโนมัติ", sublabel: "PMT-XXXXXXXX", variant: "warning" },
                  { icon: <Eye className="h-4 w-4" />, label: "ตรวจสอบ", sublabel: "จำนวน+ผล+รูป" },
                  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: "Complete", sublabel: "+Sub-Task ได้", variant: "success" },
                ],
              },
            ]}
          />
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>เลือกอุปกรณ์, ชื่องาน PM, ประเภทรอบ (รายวัน/สัปดาห์/เดือน/ปี), จำนวนวันแจ้งเตือน</li>
            <li>แต่ละ Task มีเลข PMT-YYYYMMDD-XXXX + รองรับ Sub-Task</li>
            <li>บันทึกผล: วันตรวจ, ผู้ตรวจ, จำนวนที่ตรวจ, ผลตรวจ (ผ่าน/ไม่ผ่าน/ต้องซ่อม), รายละเอียด, รูปภาพ</li>
            <li>Import แผน PM จาก Excel ได้</li>
          </ul>
        </div>
      ),
    },

    // ──────────────── 13. รายงาน ────────────────
    {
      id: "reports",
      number: "13",
      title: "รายงาน (Reports)",
      icon: <FileSearch className="h-5 w-5" />,
      description: "สรุปสต็อก เอกสาร Stock Movement Stock Card Dead Stock QR Code ประวัติโอนย้าย",
      content: (
        <div className="space-y-4">
          {[
            { title: "13.1 รายงานสินค้าคงคลัง", desc: "แสดงรายการทั้งหมด กรองตามฝ่าย/หมวด/สถานะ/สถานที่ ค้นหาจาก S/N ได้ Export Excel" },
            { title: "13.2 ค้นหาเอกสาร + ติดตามความคืบหน้า", desc: "ค้นหาเอกสารทุกประเภท (PD/GI/DS/DC/DR) ตามเลขเอกสาร, ชื่อ, S/N, ช่วงวันที่ — แสดง Process Tracker แบบ Visual สำหรับเอกสารเบิก (4 ขั้นตอน: ส่งคำขอ→อนุมัติ→จ่ายสินค้า→ยืนยันรับ), Direct Shipping (4 ขั้นตอน: สร้างคำขอ→อนุมัติ→จัดซื้อส่งของ→ผู้รับยืนยัน) และรับเข้าคลัง (3 ขั้นตอน: สร้างเอกสาร→ตรวจรับ→เข้าคลัง) พร้อมแสดงวันที่จริงและสถานะปัจจุบัน (กำลังดำเนินการ, ปฏิเสธ, รอสินค้า)" },
            { title: "13.3 Stock Movement Log", desc: "ประวัติความเคลื่อนไหวสต็อก 7 ประเภท Master-Detail จัดกลุ่มตามเอกสาร กรองขั้นสูง Export PDF/Excel" },
            { title: "13.4 Stock Card (บัตรสต็อก) + Lifecycle Tracker", desc: "ติดตามประวัติชีวิตรายชิ้น — แสดง Process Tracker สรุปวงจรชีวิตสินค้า: สินค้ามี S/N แสดง 4 ขั้นตอน (รับเข้าคลัง→จัดเก็บ→ติดตั้งป้าย→ถอด/คืนคลัง) สินค้าไม่มี S/N แสดง 3 ขั้นตอน (รับเข้าคลัง→จัดเก็บ→เบิกจ่าย) พร้อมวันที่จริงจากข้อมูลระบบ + Billboard Journey + Export Excel/PDF" },
            { title: "13.5 Dead Stock", desc: "สินค้าไม่มีเคลื่อนไหวเกินกำหนด กรองตามฝ่าย/หมวดหมู่" },
            { title: "13.6 รายงานเบิกตามป้าย", desc: "สรุปอุปกรณ์ที่เบิกไปติดตั้งแต่ละป้าย กรองตามป้าย/ช่วงเวลา/ฝ่าย" },
            { title: "13.7 ใบขอซื้อ (PR)", desc: "สร้าง PR อัตโนมัติเมื่อสต็อกต่ำกว่า Min Stock แสดงสถานะและจำนวนแนะนำ" },
            { title: "13.8 ค้นหาอุปกรณ์ป้าย", desc: "อุปกรณ์ชิ้นใดอยู่ที่ป้ายไหน + S/N + สภาพ + วันติดตั้ง Export Excel" },
            { title: "13.9 QR Code อุปกรณ์", desc: "สร้างและพิมพ์ QR Code สำหรับอุปกรณ์/ป้าย เลือกหลายรายการพร้อมพิมพ์เป็นชุด" },
            { title: "13.10 ประวัติการโอนย้าย", desc: "ประวัติโอนย้ายสินค้าระหว่างสถานที่ ต้นทาง-ปลายทาง, จำนวน, วันที่, ผู้ดำเนินการ" },
          ].map((item, i) => (
            <div key={i} className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">{item.title}</h5>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}

          <Separator />
          <h4 className="font-semibold text-sm">Process Tracker — ระบบติดตามความคืบหน้าแบบ Visual</h4>
          <p className="text-xs text-muted-foreground">
            ระบบแสดงสถานะแต่ละขั้นตอนด้วยไอคอนวงกลมและเส้นเชื่อม โดยมีสีตามสถานะ:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { color: "bg-primary", label: "เสร็จสิ้น", desc: "✓ เครื่องหมายถูก + วันที่" },
              { color: "bg-blue-500", label: "กำลังดำเนินการ", desc: "🕐 กระพริบ" },
              { color: "bg-muted", label: "รอดำเนินการ", desc: "○ วงกลมเปล่า" },
              { color: "bg-destructive", label: "ปฏิเสธ/ยกเลิก", desc: "✗ กากบาทแดง" },
              { color: "bg-orange-500", label: "มีปัญหา/เตือน", desc: "⚠ สามเหลี่ยมส้ม" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 border rounded text-xs">
                <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Process Tracker ใช้งานใน 4 จุดหลัก: <strong>ค้นหาเอกสาร</strong> (ทุกเอกสาร GI/DS/PD), <strong>Stock Card</strong> (วงจรชีวิตสินค้า), 
            <strong>ประวัติเบิกจ่าย</strong> (GoodsIssue) และ <strong>การยืมอุปกรณ์</strong> (EquipmentLoans) — ข้อมูลทั้งหมดดึงจากฐานข้อมูลจริงแบบเรียลไทม์
          </p>
        </div>
      ),
    },

    // ──────────────── 14. แจ้งเตือน ────────────────
    {
      id: "notifications",
      number: "14",
      title: "ระบบแจ้งเตือน (Notifications)",
      icon: <Bell className="h-5 w-5" />,
      description: "ตั้งค่า ประเภท และการจัดการแจ้งเตือน",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, title: "สต็อกต่ำ", desc: "จำนวนคงเหลือ ≤ Min Stock → สร้าง PR อัตโนมัติ" },
              { icon: <Clock className="h-4 w-4 text-red-500" />, title: "ใกล้หมดอายุ", desc: "สินค้าเหลือเวลาน้อยกว่าจำนวนวันที่ตั้งไว้" },
              { icon: <Shield className="h-4 w-4 text-yellow-500" />, title: "ใกล้หมดประกัน", desc: "ประกันจะหมดภายในจำนวนวันที่กำหนด" },
              { icon: <Calendar className="h-4 w-4 text-blue-500" />, title: "PM ครบกำหนด", desc: "งาน PM ป้าย/อุปกรณ์/เครื่องมือ ที่ถึงกำหนด" },
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
          <p className="text-xs text-muted-foreground">
            ตั้งค่า: เปิด/ปิดแต่ละประเภท, จำนวนวันแจ้งเตือนล่วงหน้า, Email — ไอคอน 🔔 แสดงจำนวนที่ยังไม่อ่าน
          </p>
        </div>
      ),
    },

    // ──────────────── 15. Admin ────────────────
    {
      id: "admin",
      number: "15",
      title: "จัดการผู้ใช้ (Admin)",
      icon: <Shield className="h-5 w-5" />,
      description: "จัดการบัญชี บทบาท สิทธิ์ตามฝ่าย สิทธิ์ตามฟังก์ชัน รีเซ็ตรหัสผ่าน",
      content: (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground mb-2"><strong>หมายเหตุ:</strong> เฉพาะ Admin เท่านั้นที่เข้าถึงหน้านี้ได้</p>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">15.1 จัดการบัญชีผู้ใช้</h5>
              <p className="text-xs text-muted-foreground mt-1">ดูรายชื่อ, กำหนดบทบาท (Badge สี), รีเซ็ตรหัสผ่าน (ส่ง Email)</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">15.2 สิทธิ์ตามฝ่าย</h5>
              <p className="text-xs text-muted-foreground mt-1">เลือกผู้ใช้ → เปิด/ปิดสิทธิ์ ดู/สร้าง/แก้ไข/ลบ แต่ละฝ่าย — "ลบ" ล็อคสำหรับ Non-Admin</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">15.3 สิทธิ์ตามฟังก์ชัน</h5>
              <p className="text-xs text-muted-foreground mt-1">เปิด/ปิดแต่ละเมนู/ฟังก์ชัน — เมนูที่ปิดจะไม่แสดงในแถบเมนูข้าง</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // ──────────────── Word Export ────────────────
  const generateWordDocument = async () => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "คู่มือการใช้งานระบบ Equipment Tracking System",
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: "Equipment Tracking System — User Manual", italics: true })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
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
            <p className="text-muted-foreground text-sm">Equipment Tracking System — พร้อม Workflow Diagrams ทุก Flow ({sections.length} หมวด)</p>
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
