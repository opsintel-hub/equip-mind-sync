

# สร้างหน้ารายงาน KPI — 7 ตัวชี้วัด

## KPI ที่จะสร้าง

| # | ชื่อ KPI | แหล่งข้อมูล |
|---|---------|------------|
| 1 | อัตราหมุนเวียนสต็อก | `stock_movements` (receive vs issue รายเดือน) |
| 2 | สินค้าต่ำกว่า Min Stock | `equipment` (quantity_in_stock vs min_stock_level) |
| 4 | สถานะ Media Player | `media_players` (% Active/Spare/ซ่อม/Claim) |
| 5 | มูลค่าสินค้าคงคลัง | `equipment` + `goods_receipt` (unit_price) |
| 6 | อัตราเบิกจ่ายตรงเวลา | `goods_issue_pending` (requested vs issued timing) |
| 7 | Dead Stock | `stock_movements` + `equipment` (ไม่เคลื่อนไหว 90+ วัน) |
| 9 | อุปกรณ์ใกล้หมดอายุ/หมดประกัน | `equipment` (expiry_date, warranty_expiry_date) |

## ไฟล์ที่สร้าง/แก้ไข

| ไฟล์ | รายละเอียด |
|------|-----------|
| `src/pages/KPIReport.tsx` | หน้าหลัก — toggle bar + render KPI cards ที่เลือก |
| `src/components/kpi/KPIToggleBar.tsx` | แถบ checkbox chips เลือกเปิด/ปิด KPI + ปุ่มเลือกทั้งหมด/ล้าง |
| `src/components/kpi/StockTurnoverKPI.tsx` | KPI #1 — กราฟแท่ง รับ/เบิก รายเดือน + Turnover ratio |
| `src/components/kpi/MinStockKPI.tsx` | KPI #2 — จำนวน/% รายการต่ำกว่า min stock + Gauge |
| `src/components/kpi/MediaPlayerStatusKPI.tsx` | KPI #4 — Pie chart สถานะ Media Player |
| `src/components/kpi/InventoryValueKPI.tsx` | KPI #5 — มูลค่ารวมคลัง + เปรียบเทียบรายเดือน |
| `src/components/kpi/IssuePunctualityKPI.tsx` | KPI #6 — % เบิกตรงเวลา vs ค้าง |
| `src/components/kpi/DeadStockKPI.tsx` | KPI #7 — จำนวนรายการไม่เคลื่อนไหว 90+ วัน |
| `src/components/kpi/ExpiryWarrantyKPI.tsx` | KPI #9 — จำนวนหมดอายุ 30/60/90 วัน |
| `src/App.tsx` | เพิ่ม route `/kpi-report` |
| `src/components/AppSidebar.tsx` | เพิ่มเมนู "รายงาน KPI" ในกลุ่ม "รายงาน" |

## แนวทาง UI

```text
┌──────────────────────────────────────────────────────┐
│  📊 รายงาน KPI                                      │
├──────────────────────────────────────────────────────┤
│  เลือก KPI:                                          │
│  [☑ หมุนเวียนสต็อก] [☑ Min Stock] [☑ Media Player]  │
│  [☑ มูลค่าคลัง] [☐ เบิกตรงเวลา] [☑ Dead Stock]     │
│  [☑ หมดอายุ/ประกัน]                                   │
│  [เลือกทั้งหมด] [ล้างทั้งหมด]                        │
├──────────────────────────────────────────────────────┤
│  (แสดง KPI Cards เฉพาะที่เลือก — 2 คอลัมน์)         │
│  แต่ละ Card: ตัวเลขหลัก + กราฟย่อ (Recharts)         │
└──────────────────────────────────────────────────────┘
```

## รายละเอียดทางเทคนิค

- แต่ละ KPI component ใช้ `useQuery` แยก — โหลดอิสระ มี loading skeleton
- Toggle state เก็บใน `localStorage` key `kpi-visible-items`
- ใช้ Recharts (มีอยู่แล้ว) สำหรับกราฟ Bar/Pie/Area
- ไม่สร้าง table ใหม่ ใช้ข้อมูลจาก table ที่มีทั้งหมด
- เมนูอยู่ในกลุ่ม "รายงาน" ใช้ `functionName: "reports"`

