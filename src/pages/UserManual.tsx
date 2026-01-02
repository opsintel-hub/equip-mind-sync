import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { toast } from "sonner";

const UserManual = () => {
  const generateWordDocument = async () => {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Title
              new Paragraph({
                text: "คู่มือการใช้งานระบบบริหารจัดการคลังสินค้าและอุปกรณ์",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),

              // Section 1: Authentication
              new Paragraph({
                text: "1. ระบบยืนยันตัวตน (Authentication)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: "การเข้าสู่ระบบ",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• ผู้ใช้เข้าหน้า Login และกรอก Email + Password")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• ระบบตรวจสอบข้อมูลกับฐานข้อมูล")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• เมื่อสำเร็จจะนำไปยัง Dashboard ตามบทบาท")],
                spacing: { after: 200 },
              }),

              new Paragraph({
                text: "การสมัครสมาชิก",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• กรอก ชื่อ-นามสกุล, Email, Password, เบอร์โทร")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• ระบบสร้างบัญชีและ Profile อัตโนมัติ")],
                spacing: { after: 200 },
              }),

              new Paragraph({
                text: "บทบาทผู้ใช้ (Roles)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              createRolesTable(),

              // Section 2: Dashboard
              new Paragraph({
                text: "2. Dashboard หลัก",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                children: [new TextRun("• สถิติสินค้า: จำนวนสินค้าทั้งหมด, สินค้าคงเหลือต่ำ")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• การแจ้งเตือน: สินค้าหมดอายุ, ครบกำหนด PM")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• กราฟ: สินค้าตามหมวดหมู่, สถานที่จัดเก็บ")],
                spacing: { after: 200 },
              }),

              // Section 3: Master Data
              new Paragraph({
                text: "3. ข้อมูลหลัก (Master Data)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: "3.1 จัดการหมวดหมู่ (Categories)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เพิ่ม/แก้ไข/ลบ หมวดหมู่พร้อมชื่อและคำอธิบาย")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "3.2 จัดการหมวดหมู่ย่อย (Subcategories)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เลือกหมวดหมู่หลัก แล้วเพิ่มหมวดหมู่ย่อย")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "3.3 จัดการยี่ห้อ (Brands)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เพิ่ม/แก้ไข/ลบ ยี่ห้อพร้อมชื่อและคำอธิบาย")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "3.4 จัดการแผนก (Departments)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เพิ่ม/แก้ไข/ลบ แผนกพร้อมชื่อและคำอธิบาย")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "3.5 จัดการคลังสินค้า (Warehouses)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เพิ่มคลังสินค้า: รหัส, ชื่อ, พื้นที่จัดเก็บ, แผนก")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "3.6 จัดการสถานที่จัดเก็บ (Locations)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เพิ่มสถานที่: รหัส, ชื่อ, คลังสินค้า, แผนก พร้อม Storage Slots และ Sub Storage Slots")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "3.7 จัดการ Supplier",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เพิ่ม Supplier: รหัส, ชื่อ, ที่อยู่, เบอร์โทร, Email, ผู้ติดต่อ")],
                spacing: { after: 200 },
              }),

              // Section 4: Equipment
              new Paragraph({
                text: "4. จัดการอุปกรณ์/สินค้า (Equipment)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: "การเพิ่มสินค้าใหม่",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("กรอกข้อมูล: รหัสสินค้า, ชื่อ, หมวดหมู่, ยี่ห้อ, แผนก, หน่วยนับ, ราคา, จำนวน, ระดับสต็อกขั้นต่ำ, สถานที่, วันที่เข้าคลัง, วันหมดอายุ, วันหมดประกัน และข้อมูลทางเทคนิค")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "การโอนย้ายสินค้า (Transfer)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เลือกสินค้า กำหนดจำนวน เลือกสถานที่ปลายทาง แล้วบันทึก")],
                spacing: { after: 200 },
              }),

              // Section 5: Goods Receipt
              new Paragraph({
                text: "5. รับสินค้าเข้าคลัง (Goods Receipt)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: "ขั้นตอนที่ 1: บันทึกการส่งมอบ (Delivery Entry)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("ผู้ส่งมอบกรอก: เลขที่เอกสาร, ชื่อ-เบอร์โทรผู้ส่ง, Supplier, สินค้า, จำนวน, หน่วย, ราคา, Lot/Serial Number, วันหมดอายุ/ประกัน")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "ขั้นตอนที่ 2: รับสินค้าเข้าคลัง (Receive Goods)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เจ้าหน้าที่คลัง: ดูรายการรอรับ, ตรวจสอบสินค้า, เลือก/สร้างรายการในระบบ, กำหนดสถานที่จัดเก็บ, กดรับสินค้า")],
                spacing: { after: 200 },
              }),

              // Section 6: Goods Issue
              new Paragraph({
                text: "6. เบิก-จ่ายสินค้า (Goods Issue)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: "6.1 สร้างคำขอเบิก (Issue Request)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("ผู้เบิกกรอก: ชื่อ, แผนก, เบอร์โทร, เลือกสินค้า, จำนวน, วัตถุประสงค์, สถานที่ใช้งาน")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "6.2 อนุมัติคำขอ (Approval)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("ผู้จัดการ/Admin: ดูรายการรออนุมัติ, ตรวจสอบ, อนุมัติหรือปฏิเสธ (ระบุเหตุผล)")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "6.3 จ่ายสินค้า (Issue Goods)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เจ้าหน้าที่คลัง: ดูรายการที่อนุมัติ, ตรวจสอบสต็อก, เลือกสถานที่จ่าย, กดจ่ายสินค้า (จ่ายบางส่วนได้)")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "6.4 คำขอรอสินค้า (Waiting Stock)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("แสดงรายการที่รอสินค้าเข้าคลัง เมื่อสินค้ามาสามารถจ่ายได้ทันที")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "6.5 Dashboard ผู้เบิก",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("ผู้เบิกสามารถ: ค้นหาคำขอ, ดูสถานะ, ดูสรุป, ดูการแจ้งเตือน, ยกเลิกคำขอที่ยังไม่อนุมัติ")],
                spacing: { after: 200 },
              }),

              // Section 7: Billboards
              new Paragraph({
                text: "7. จัดการป้ายโฆษณา (Billboards)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: "การเพิ่มป้าย",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("กรอกข้อมูล: รหัสอุปกรณ์, ตำแหน่ง, ภาค/จังหวัด/อำเภอ/ตำบล, ประเภทสื่อ, เส้นทาง, สถานะ")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "การติดตั้งอุปกรณ์บนป้าย",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เลือกป้าย เพิ่มอุปกรณ์จากคลัง กำหนดจำนวน วันที่ติดตั้ง (หักสต็อกจากคลังอัตโนมัติ)")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "การถอดอุปกรณ์",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("เลือกอุปกรณ์ที่ติดตั้ง ถอดพร้อมระบุเหตุผล เลือกคืนเข้าสต็อกหรือไม่")],
                spacing: { after: 200 },
              }),

              // Section 8: PM
              new Paragraph({
                text: "8. การบำรุงรักษาตามแผน (PM)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: "PM สำหรับป้ายโฆษณา",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("สร้างแผน PM: เลือกป้าย, ชื่องาน, ประเภทรอบ, วันครบกำหนด, แจ้งเตือนล่วงหน้า")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("บันทึกผล PM: เลือกแผน, วันที่ดำเนินการ, ผู้ดำเนินการ, หมายเหตุ (อัปเดตวันถัดไปอัตโนมัติ)")],
                spacing: { after: 100 },
              }),

              new Paragraph({
                text: "PM สำหรับอุปกรณ์",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("สร้างแผน PM อุปกรณ์: เลือกอุปกรณ์, ชื่องาน, ประเภท, แผนก, รอบ PM, วันครบกำหนด")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("งาน PM Tasks: ระบบสร้าง Task อัตโนมัติ พร้อมติดตามสถานะ ผู้รับผิดชอบ ผลตรวจสอบ รูปภาพ")],
                spacing: { after: 200 },
              }),

              // Section 9: Notifications
              new Paragraph({
                text: "9. ระบบแจ้งเตือน (Notifications)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: "ประเภทการแจ้งเตือน",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• สต็อกต่ำ: เมื่อจำนวนคงเหลือต่ำกว่าระดับขั้นต่ำ")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• สินค้าหมดอายุ: ใกล้ถึงวันหมดอายุ")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• หมดประกัน: ใกล้ถึงวันหมดประกัน")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• PM ครบกำหนด: ใกล้ถึงวันครบกำหนด PM")],
                spacing: { after: 200 },
              }),

              // Section 10: Reports
              new Paragraph({
                text: "10. รายงาน (Reports)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                children: [new TextRun("• รายงานสรุปธุรกรรม: กรองตามช่วงเวลา ประเภท แผนก")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• รายงาน Dead Stock: สินค้าที่ไม่มีการเคลื่อนไหว")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• ประวัติการโอนย้าย: รายการโอนย้ายทั้งหมด")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• Export Excel: ดาวน์โหลดรายงานเป็นไฟล์ Excel")],
                spacing: { after: 200 },
              }),

              // Section 11: Admin
              new Paragraph({
                text: "11. การจัดการผู้ใช้ (Admin)",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                children: [new TextRun("• จัดการผู้ใช้: ดูรายชื่อ กำหนดบทบาท รีเซ็ตรหัสผ่าน เปิด/ปิดการใช้งาน")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• สิทธิ์ตามแผนก: กำหนดแผนกที่เข้าถึงได้และสิทธิ์ (ดู/สร้าง/แก้ไข/ลบ)")],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun("• สิทธิ์ตามฟังก์ชัน: กำหนดการเข้าถึงแต่ละฟังก์ชันของระบบ")],
                spacing: { after: 200 },
              }),

              // Features Summary
              new Paragraph({
                text: "สรุป Features ทั้งหมด",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              createFeaturesTable(),
            ],
          },
        ],
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">คู่มือการใช้งานระบบ</h1>
            <p className="text-muted-foreground">เอกสารอธิบายการทำงานทั้งหมดของระบบ</p>
          </div>
        </div>
        <Button onClick={generateWordDocument} className="gap-2">
          <Download className="h-4 w-4" />
          ดาวน์โหลด Word
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Section 1 */}
        <Card>
          <CardHeader>
            <CardTitle>1. ระบบยืนยันตัวตน (Authentication)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">การเข้าสู่ระบบ</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>ผู้ใช้เข้าหน้า Login และกรอก Email + Password</li>
                <li>ระบบตรวจสอบข้อมูลกับฐานข้อมูล</li>
                <li>เมื่อสำเร็จจะนำไปยัง Dashboard ตามบทบาท</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">บทบาทผู้ใช้</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="border p-2 text-left">บทบาท</th>
                      <th className="border p-2 text-left">สิทธิ์การใช้งาน</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="border p-2 font-medium">Admin</td><td className="border p-2">เข้าถึงทุกฟังก์ชัน, จัดการผู้ใช้และสิทธิ์</td></tr>
                    <tr><td className="border p-2 font-medium">Manager</td><td className="border p-2">อนุมัติ/ปฏิเสธคำขอ, ดูรายงาน</td></tr>
                    <tr><td className="border p-2 font-medium">Warehouse Staff</td><td className="border p-2">รับ-จ่ายสินค้า, จัดการสต็อก</td></tr>
                    <tr><td className="border p-2 font-medium">Receiver</td><td className="border p-2">บันทึกการส่งมอบสินค้า</td></tr>
                    <tr><td className="border p-2 font-medium">Requester</td><td className="border p-2">เบิกสินค้า, ดูสถานะคำขอ</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card>
          <CardHeader>
            <CardTitle>2. Dashboard หลัก</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>สถิติสินค้า: จำนวนสินค้าทั้งหมด, สินค้าคงเหลือต่ำ</li>
              <li>การแจ้งเตือน: สินค้าหมดอายุ, ครบกำหนด PM</li>
              <li>กราฟ: สินค้าตามหมวดหมู่, สถานที่จัดเก็บ</li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 3 */}
        <Card>
          <CardHeader>
            <CardTitle>3. ข้อมูลหลัก (Master Data)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>3.1 หมวดหมู่:</strong> เพิ่ม/แก้ไข/ลบ หมวดหมู่พร้อมคำอธิบาย</p>
            <p><strong>3.2 หมวดหมู่ย่อย:</strong> เลือกหมวดหมู่หลักแล้วเพิ่มหมวดหมู่ย่อย</p>
            <p><strong>3.3 ยี่ห้อ:</strong> เพิ่ม/แก้ไข/ลบ ยี่ห้อ</p>
            <p><strong>3.4 แผนก:</strong> เพิ่ม/แก้ไข/ลบ แผนก</p>
            <p><strong>3.5 คลังสินค้า:</strong> รหัส, ชื่อ, พื้นที่จัดเก็บ, แผนก</p>
            <p><strong>3.6 สถานที่จัดเก็บ:</strong> รหัส, ชื่อ, คลังสินค้า พร้อม Storage Slots</p>
            <p><strong>3.7 Supplier:</strong> รหัส, ชื่อ, ที่อยู่, เบอร์โทร, Email, ผู้ติดต่อ</p>
          </CardContent>
        </Card>

        {/* Section 4 */}
        <Card>
          <CardHeader>
            <CardTitle>4. จัดการอุปกรณ์/สินค้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>เพิ่มสินค้า:</strong> กรอกข้อมูลครบถ้วนรวมถึงข้อมูลทางเทคนิค</p>
            <p><strong>แก้ไขสินค้า:</strong> คลิกปุ่มแก้ไข แก้ไขข้อมูล บันทึก</p>
            <p><strong>โอนย้าย:</strong> เลือกสินค้า กำหนดจำนวน เลือกสถานที่ปลายทาง</p>
            <p><strong>Import/Export:</strong> อัปโหลด Excel หรือดาวน์โหลดรายการ</p>
          </CardContent>
        </Card>

        {/* Section 5 */}
        <Card>
          <CardHeader>
            <CardTitle>5. รับสินค้าเข้าคลัง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>ขั้นตอน 1 - บันทึกการส่งมอบ:</strong> ผู้ส่งมอบกรอกข้อมูลเอกสาร สินค้า จำนวน</p>
            <p><strong>ขั้นตอน 2 - รับเข้าคลัง:</strong> เจ้าหน้าที่ตรวจสอบ เลือกสถานที่จัดเก็บ กดรับสินค้า</p>
          </CardContent>
        </Card>

        {/* Section 6 */}
        <Card>
          <CardHeader>
            <CardTitle>6. เบิก-จ่ายสินค้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>6.1 สร้างคำขอเบิก:</strong> ผู้เบิกกรอกข้อมูลและสินค้าที่ต้องการ</p>
            <p><strong>6.2 อนุมัติคำขอ:</strong> ผู้จัดการตรวจสอบและอนุมัติ/ปฏิเสธ</p>
            <p><strong>6.3 จ่ายสินค้า:</strong> เจ้าหน้าที่คลังจ่ายสินค้า (รองรับจ่ายบางส่วน)</p>
            <p><strong>6.4 คำขอรอสินค้า:</strong> รายการที่รอสินค้าเข้าคลัง</p>
            <p><strong>6.5 Dashboard ผู้เบิก:</strong> ดูสถานะ ยกเลิกคำขอได้</p>
          </CardContent>
        </Card>

        {/* Section 7 */}
        <Card>
          <CardHeader>
            <CardTitle>7. จัดการป้ายโฆษณา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>เพิ่มป้าย:</strong> กรอกข้อมูลตำแหน่ง ประเภทสื่อ เส้นทาง</p>
            <p><strong>ติดตั้งอุปกรณ์:</strong> เลือกอุปกรณ์จากคลัง กำหนดจำนวน (หักสต็อกอัตโนมัติ)</p>
            <p><strong>ถอดอุปกรณ์:</strong> ระบุเหตุผล เลือกคืนสต็อกหรือไม่</p>
            <p><strong>QR Code:</strong> สร้างและสแกนเพื่อดูข้อมูลป้าย</p>
          </CardContent>
        </Card>

        {/* Section 8 */}
        <Card>
          <CardHeader>
            <CardTitle>8. การบำรุงรักษาตามแผน (PM)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>PM ป้ายโฆษณา:</strong> สร้างแผน PM บันทึกผลการทำงาน</p>
            <p><strong>PM อุปกรณ์:</strong> สร้างแผน PM สำหรับอุปกรณ์แต่ละรายการ</p>
            <p><strong>Tasks:</strong> ระบบสร้าง Task อัตโนมัติ ติดตามสถานะ แนบรูปภาพ</p>
          </CardContent>
        </Card>

        {/* Section 9-11 */}
        <Card>
          <CardHeader>
            <CardTitle>9-11. แจ้งเตือน รายงาน และ Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>แจ้งเตือน:</strong> สต็อกต่ำ, หมดอายุ, หมดประกัน, PM ครบกำหนด</p>
            <p><strong>รายงาน:</strong> สรุปธุรกรรม, Dead Stock, ประวัติโอนย้าย, Export Excel</p>
            <p><strong>Admin:</strong> จัดการผู้ใช้, บทบาท, สิทธิ์ตามแผนก, สิทธิ์ตามฟังก์ชัน</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper function to create roles table
function createRolesTable(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "บทบาท", bold: true })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "สิทธิ์การใช้งาน", bold: true })] })],
            width: { size: 75, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Admin")] }),
          new TableCell({ children: [new Paragraph("เข้าถึงทุกฟังก์ชัน, จัดการผู้ใช้และสิทธิ์")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Manager")] }),
          new TableCell({ children: [new Paragraph("อนุมัติ/ปฏิเสธคำขอ, ดูรายงาน")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Warehouse Staff")] }),
          new TableCell({ children: [new Paragraph("รับ-จ่ายสินค้า, จัดการสต็อก")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Receiver")] }),
          new TableCell({ children: [new Paragraph("บันทึกการส่งมอบสินค้า")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Requester")] }),
          new TableCell({ children: [new Paragraph("เบิกสินค้า, ดูสถานะคำขอ")] }),
        ],
      }),
    ],
  });
}

// Helper function to create features summary table
function createFeaturesTable(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "หมวด", bold: true })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Features", bold: true })] })],
            width: { size: 75, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("ยืนยันตัวตน")] }),
          new TableCell({ children: [new Paragraph("Login, Signup, Roles, Permissions")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("ข้อมูลหลัก")] }),
          new TableCell({ children: [new Paragraph("Categories, Brands, Departments, Warehouses, Locations, Suppliers")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("สินค้า")] }),
          new TableCell({ children: [new Paragraph("CRUD, Transfer, Import/Export, QR Code")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("รับสินค้า")] }),
          new TableCell({ children: [new Paragraph("Delivery Entry, Receive Goods, Tracking")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("เบิก-จ่าย")] }),
          new TableCell({ children: [new Paragraph("Request, Approve, Issue, Partial Issue, Waiting Stock")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("ป้ายโฆษณา")] }),
          new TableCell({ children: [new Paragraph("CRUD, Equipment Install/Uninstall, History")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("PM")] }),
          new TableCell({ children: [new Paragraph("Schedule, Tasks, History, Images")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("แจ้งเตือน")] }),
          new TableCell({ children: [new Paragraph("Low Stock, Expiry, PM Due, Settings")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("รายงาน")] }),
          new TableCell({ children: [new Paragraph("Transactions, Dead Stock, Transfer History")] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Admin")] }),
          new TableCell({ children: [new Paragraph("Users, Roles, Permissions")] }),
        ],
      }),
    ],
  });
}

export default UserManual;
