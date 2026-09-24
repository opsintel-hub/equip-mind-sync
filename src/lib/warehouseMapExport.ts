import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface MapExportRow {
  warehouse: string;
  zone: string;
  locationCode: string;
  locationName: string;
  usedPct: string;
  slotStatus: string;
  itemType: string;
  category: string;
  code: string;
  name: string;
  serial: string;
  qty: number | "";
  unit: string;
  condition: string;
}

const HEADERS: [keyof MapExportRow, string][] = [
  ["warehouse", "คลัง"],
  ["zone", "โซน/ตู้"],
  ["locationCode", "รหัสช่อง"],
  ["locationName", "ชื่อช่อง"],
  ["usedPct", "ใช้พื้นที่ (%)"],
  ["slotStatus", "สถานะช่อง"],
  ["itemType", "ประเภท"],
  ["category", "หมวดอุปกรณ์"],
  ["code", "รหัสสินค้า"],
  ["name", "ชื่อสินค้า"],
  ["serial", "S/N"],
  ["qty", "จำนวน"],
  ["unit", "หน่วย"],
  ["condition", "สภาพ"],
];

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

export function exportMapExcel(rows: MapExportRow[], title: string) {
  const data = [HEADERS.map((h) => h[1]), ...rows.map((r) => HEADERS.map(([k]) => r[k]))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [14, 14, 12, 18, 10, 14, 12, 16, 14, 30, 22, 8, 8, 12].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ผังตำแหน่งจัดเก็บ");
  XLSX.writeFile(wb, `ผังตำแหน่งจัดเก็บ_${title}_${stamp()}.xlsx`);
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

export async function exportMapPdf(rows: MapExportRow[], title: string, subtitle: string) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const perPage = 28;
  const chunks: MapExportRow[][] = [];
  for (let i = 0; i < Math.max(rows.length, 1); i += perPage) chunks.push(rows.slice(i, i + perPage));

  for (let p = 0; p < chunks.length; p++) {
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:-10000px;top:0;width:1400px;background:#fff;color:#111;font-family:Sarabun,Tahoma,sans-serif;padding:16px;font-size:12px";
    host.innerHTML = `
      <div style="font-size:18px;font-weight:700">ผังตำแหน่งจัดเก็บ — ${esc(title)}</div>
      <div style="color:#555;margin:4px 0 10px">${esc(subtitle)} • หน้า ${p + 1}/${chunks.length} • ส่งออก ${new Date().toLocaleString("th-TH")}</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>${HEADERS.map((h) => `<th style="border:1px solid #999;background:#eee;padding:4px;text-align:left">${h[1]}</th>`).join("")}</tr></thead>
        <tbody>${
          chunks[p].length === 0
            ? `<tr><td colspan="${HEADERS.length}" style="padding:12px;text-align:center">ไม่มีข้อมูล</td></tr>`
            : chunks[p]
                .map(
                  (r) =>
                    `<tr>${HEADERS.map(([k]) => `<td style="border:1px solid #bbb;padding:3px 4px;white-space:pre-line;vertical-align:top">${esc(r[k])}</td>`).join("")}</tr>`,
                )
                .join("")
        }</tbody>
      </table>`;
    document.body.appendChild(host);
    try {
      const canvas = await html2canvas(host, { scale: 1.5, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/jpeg", 0.9);
      const w = pageW - margin * 2;
      const h = Math.min((canvas.height * w) / canvas.width, pageH - margin * 2);
      if (p > 0) pdf.addPage();
      pdf.addImage(img, "JPEG", margin, margin, w, h);
    } finally {
      host.remove();
    }
  }
  pdf.save(`ผังตำแหน่งจัดเก็บ_${title}_${stamp()}.pdf`);
}
