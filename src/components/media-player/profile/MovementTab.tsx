import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { StockMovement } from "./types";
import { getMovementMeta, getConditionDisplay } from "./constants";

interface MovementTabProps {
  movements: StockMovement[];
  playerCode: string;
  serialNumber1?: string | null;
  serialNumber2?: string | null;
  billboardByDoc?: Record<string, string>;
}

export function MovementTab({ movements, playerCode, serialNumber1, serialNumber2, billboardByDoc = {} }: MovementTabProps) {
  // stock_movements ระดับนี้ผูกกับ equipment_id (= media_player.id ของ unit เฉพาะ S/N นั้น)
  // จึงแสดงทุก movement ที่ parent ส่งเข้ามาได้ตรงๆ — ไม่ต้องกรองด้วย S/N ใน notes (ทำให้ข้อมูลหาย)
  const sns = [serialNumber1, serialNumber2].filter(Boolean) as string[];
  const filtered = movements;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stock Card Timeline</CardTitle>
        <CardDescription>
          ความเคลื่อนไหวของสินค้ารหัส {playerCode}
          {sns.length > 0 && <> • S/N: <span className="font-mono">{sns.join(" / ")}</span></>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">ยังไม่มีข้อมูลความเคลื่อนไหว</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">สต็อกก่อน</TableHead>
                  <TableHead className="text-right">สต็อกหลัง</TableHead>
                  <TableHead>สภาพ</TableHead>
                  <TableHead>เอกสาร</TableHead>
                  <TableHead>ป้ายโฆษณา</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const meta = getMovementMeta(m.movement_type);
                  const Icon = meta.icon;
                  const cond = m.item_condition ? getConditionDisplay(m.item_condition) : null;
                  const refDoc = (m.reference_document || "").trim();
                  const bbLabel = refDoc ? billboardByDoc[refDoc] : undefined;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(parseISO(m.created_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${meta.color} border-0 gap-1`}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{m.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{m.stock_before ?? "-"}</TableCell>
                      <TableCell className="text-right font-mono">{m.stock_after ?? "-"}</TableCell>
                      <TableCell>
                        {cond ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cond.className}`}>{cond.label}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{m.reference_document || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap max-w-[200px] truncate" title={bbLabel || ""}>
                        {bbLabel || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.notes || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
