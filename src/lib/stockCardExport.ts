import { format, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

// ── Types ──
interface ExportItem {
  code: string;
  name: string;
  type: string;
  serial_number?: string | null;
  serial_number_2?: string | null;
  category?: string;
  brand?: string | null;
  department?: string | null;
  quantity_in_stock?: number;
  item_condition: string;
}

interface TimelineEvent {
  date: string;
  type: string;
  detail: string;
  quantity: number;
  stock_before?: number;
  stock_after?: number;
  condition?: string | null;
  document?: string | null;
  duration_days?: number | null;
  billboard_name?: string | null;
}

interface BillboardJourney {
  billboard_name: string;
  installation_date: string | null;
  uninstall_date: string | null;
  duration_days: number | null;
  quantity: number;
  uninstall_reason: string | null;
}

// ── Helpers (duplicated to keep this module standalone) ──
const ITEM_TYPE_LABELS: Record<string, string> = {
  equipment: "อุปกรณ์/อะไหล่",
  media_player: "Media Player",
  tool: "เครื่องมือ",
};

const MOVEMENT_LABELS: Record<string, string> = {
  receive: "รับเข้า",
  issue: "จ่ายออก",
  transfer_in: "โอนเข้า",
  transfer_out: "โอนออก",
  install_to_billboard: "ติดตั้งป้าย",
  return_from_billboard: "ถอดจากป้าย",
  defective_return: "ของเสียเข้า",
  install: "ติดตั้งป้าย",
  uninstall: "ถอดจากป้าย",
};

const CONDITION_LABELS: Record<string, string> = {
  normal: "ปกติ",
  defective: "เสีย/ชำรุด",
  pending_inspection: "รอตรวจสอบ",
};

function getMovementLabel(type: string) {
  const mapped = type === "install" ? "install_to_billboard" : type === "uninstall" ? "return_from_billboard" : type;
  return MOVEMENT_LABELS[mapped] || type;
}

function getConditionLabel(cond: string | null | undefined) {
  return CONDITION_LABELS[cond || "normal"] || "ปกติ";
}

// ── Excel Export ──
export function exportStockCardExcel(
  item: ExportItem,
  timeline: TimelineEvent[],
  journeys: BillboardJourney[],
  currentInstallCount: number,
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Item info
  const infoRows = [
    ["Stock Card — ข้อมูลสินค้า"],
    [],
    ["รหัส", item.code],
    ["ชื่อ", item.name],
    ["ประเภท", ITEM_TYPE_LABELS[item.type] || ""],
    ["S/N", item.serial_number || "-"],
    ...(item.serial_number_2 ? [["S/N 2", item.serial_number_2]] : []),
    ["หมวดหมู่", item.category || "-"],
    ["ยี่ห้อ", item.brand || "-"],
    ["ฝ่าย", item.department || "-"],
    ["สต็อกปัจจุบัน", item.quantity_in_stock ?? 0],
    ["สภาพ", getConditionLabel(item.item_condition)],
    ["ติดตั้งอยู่ (ป้าย)", currentInstallCount],
    ["จำนวนครั้งติดตั้ง", journeys.length],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "ข้อมูลสินค้า");

  // Sheet 2: Timeline
  if (timeline.length > 0) {
    const tlHeaders = ["วันที่", "ประเภท", "รายละเอียด", "ป้ายโฆษณา", "จำนวน", "สต็อกก่อน", "สต็อกหลัง", "สภาพ", "ระยะเวลา (วัน)", "เลขที่เอกสาร"];
    const tlRows = timeline.map(ev => [
      format(parseISO(ev.date), "dd/MM/yyyy HH:mm"),
      getMovementLabel(ev.type),
      ev.detail,
      ev.billboard_name || "-",
      ev.quantity,
      ev.stock_before ?? "-",
      ev.stock_after ?? "-",
      ev.condition ? getConditionLabel(ev.condition) : "-",
      ev.duration_days ?? "-",
      ev.document || "-",
    ]);
    const wsTl = XLSX.utils.aoa_to_sheet([tlHeaders, ...tlRows]);
    wsTl["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsTl, "ความเคลื่อนไหว");
  }

  // Sheet 3: Billboard Journey
  if (journeys.length > 0) {
    const bjHeaders = ["ป้ายโฆษณา", "ติดตั้งเมื่อ", "ถอดเมื่อ", "ระยะเวลา (วัน)", "จำนวน", "เหตุผล"];
    const bjRows = journeys.map(j => [
      j.billboard_name,
      j.installation_date ? format(parseISO(j.installation_date), "dd/MM/yyyy") : "-",
      j.uninstall_date ? format(parseISO(j.uninstall_date), "dd/MM/yyyy") : "-",
      j.duration_days ?? "-",
      j.quantity,
      j.uninstall_reason || "-",
    ]);
    const wsBj = XLSX.utils.aoa_to_sheet([bjHeaders, ...bjRows]);
    wsBj["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsBj, "ประวัติติดตั้งป้าย");
  }

  XLSX.writeFile(wb, `StockCard_${item.code}_${format(new Date(), "yyyyMMdd")}.xlsx`);
}

// ── PDF Export ──
export function exportStockCardPDF(
  item: ExportItem,
  timeline: TimelineEvent[],
  journeys: BillboardJourney[],
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Title
  doc.setFontSize(16);
  doc.text("Stock Card", 14, y);
  doc.setFontSize(9);
  doc.text(`Export: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageW - 14, y, { align: "right" });
  y += 10;

  // Item info
  doc.setFontSize(11);
  doc.text(`${item.code} - ${item.name}`, 14, y);
  y += 6;
  doc.setFontSize(9);
  const infoLine = [
    item.serial_number ? `S/N: ${item.serial_number}` : null,
    item.category ? `Category: ${item.category}` : null,
    item.brand ? `Brand: ${item.brand}` : null,
    `Stock: ${item.quantity_in_stock ?? 0}`,
    `Condition: ${getConditionLabel(item.item_condition)}`,
  ].filter(Boolean).join("  |  ");
  doc.text(infoLine, 14, y);
  y += 8;

  // Timeline table
  if (timeline.length > 0) {
    doc.setFontSize(10);
    doc.text("Timeline", 14, y);
    y += 5;

    const headers = ["Date", "Type", "Detail", "Billboard", "Qty", "Before", "After", "Cond.", "Days", "Doc"];
    const colWidths = [26, 20, 44, 30, 12, 14, 14, 18, 12, 30];
    const startX = 14;

    doc.setFillColor(240, 240, 240);
    doc.rect(startX, y - 3.5, colWidths.reduce((a, b) => a + b, 0), 6, "F");
    doc.setFontSize(7);
    let x = startX;
    headers.forEach((h, i) => { doc.text(h, x + 1, y); x += colWidths[i]; });
    y += 5;

    doc.setFontSize(7);
    timeline.forEach(ev => {
      if (y > 190) { doc.addPage(); y = 15; }
      const row = [
        format(parseISO(ev.date), "dd/MM/yy HH:mm"),
        getMovementLabel(ev.type),
        (ev.detail || "-").substring(0, 30),
        (ev.billboard_name || "-").substring(0, 20),
        String(ev.quantity),
        ev.stock_before !== undefined ? String(ev.stock_before) : "-",
        ev.stock_after !== undefined ? String(ev.stock_after) : "-",
        ev.condition ? getConditionLabel(ev.condition) : "-",
        ev.duration_days !== null && ev.duration_days !== undefined ? String(ev.duration_days) : "-",
        (ev.document || "-").substring(0, 22),
      ];
      x = startX;
      row.forEach((val, i) => { doc.text(val, x + 1, y); x += colWidths[i]; });
      y += 4;
    });
    y += 4;
  }

  // Billboard Journey
  if (journeys.length > 0) {
    if (y > 170) { doc.addPage(); y = 15; }
    doc.setFontSize(10);
    doc.text("Billboard Journey", 14, y);
    y += 5;

    const bjHeaders = ["Billboard", "Installed", "Removed", "Days", "Qty", "Reason"];
    const bjWidths = [40, 24, 24, 16, 14, 60];
    const startX = 14;

    doc.setFillColor(240, 240, 240);
    doc.rect(startX, y - 3.5, bjWidths.reduce((a, b) => a + b, 0), 6, "F");
    doc.setFontSize(7);
    let x = startX;
    bjHeaders.forEach((h, i) => { doc.text(h, x + 1, y); x += bjWidths[i]; });
    y += 5;

    journeys.forEach(j => {
      if (y > 190) { doc.addPage(); y = 15; }
      const row = [
        j.billboard_name.substring(0, 25),
        j.installation_date ? format(parseISO(j.installation_date), "dd/MM/yyyy") : "-",
        j.uninstall_date ? format(parseISO(j.uninstall_date), "dd/MM/yyyy") : "-",
        j.duration_days !== null ? String(j.duration_days) : "-",
        String(j.quantity),
        (j.uninstall_reason || "-").substring(0, 40),
      ];
      x = startX;
      row.forEach((val, i) => { doc.text(val, x + 1, y); x += bjWidths[i]; });
      y += 4;
    });
  }

  doc.save(`StockCard_${item.code}_${format(new Date(), "yyyyMMdd")}.pdf`);
}
