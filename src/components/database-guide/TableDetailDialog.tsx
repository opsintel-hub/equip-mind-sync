import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Database, AlertTriangle, Hash, KeyRound } from "lucide-react";
import { TABLE_GUIDE } from "@/lib/databaseGuide";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

interface TableInfo {
  name: string;
  row_count: number;
  columns: ColumnInfo[];
}

interface Props {
  table: TableInfo | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const isPrimaryKey = (col: ColumnInfo) =>
  col.name === "id" || col.default?.includes("gen_random_uuid()");

const isForeignKey = (col: ColumnInfo) =>
  col.name.endsWith("_id") && col.name !== "id";

export default function TableDetailDialog({ table, open, onOpenChange }: Props) {
  if (!table) return null;
  const meta = TABLE_GUIDE[table.name];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-mono text-lg break-all">
                {table.name}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
                {meta?.category && (
                  <Badge variant="secondary">{meta.category}</Badge>
                )}
                <Badge variant="outline">
                  {table.row_count.toLocaleString()} rows
                </Badge>
                <Badge variant="outline">{table.columns.length} columns</Badge>
                {!meta && (
                  <Badge variant="destructive">ยังไม่มีคำอธิบาย</Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Description */}
            {meta?.description ? (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    คำอธิบาย
                  </p>
                  <p className="text-sm leading-relaxed">{meta.description}</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">ยังไม่มีคำอธิบายสำหรับตารางนี้</p>
                    <p className="text-muted-foreground">
                      เพิ่มคำอธิบายได้ในไฟล์{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                        src/lib/databaseGuide.ts
                      </code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related routes */}
            {meta?.relatedRoutes && meta.relatedRoutes.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    เมนูที่เกี่ยวข้อง
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {meta.relatedRoutes.map((r) => (
                      <Link
                        key={r.path}
                        to={r.path}
                        onClick={() => onOpenChange(false)}
                      >
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground gap-1 py-1.5 px-3"
                        >
                          {r.label}
                          <ExternalLink className="w-3 h-3" />
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Columns full list */}
            <Card>
              <CardContent className="p-0">
                <div className="p-4 pb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    คอลัมน์ทั้งหมด ({table.columns.length})
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-amber-600" /> PK
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-blue-500" /> FK
                    </span>
                  </div>
                </div>
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 w-10"></TableHead>
                        <TableHead className="h-9">ชื่อ</TableHead>
                        <TableHead className="h-9">ประเภท</TableHead>
                        <TableHead className="h-9 w-20">Null</TableHead>
                        <TableHead className="h-9">Default</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table.columns.map((c) => {
                        const pk = isPrimaryKey(c);
                        const fk = isForeignKey(c);
                        return (
                          <TableRow key={c.name}>
                            <TableCell className="py-1.5">
                              {pk && (
                                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                              )}
                              {!pk && fk && (
                                <Hash className="w-3.5 h-3.5 text-blue-500" />
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 font-mono text-xs font-medium">
                              {c.name}
                            </TableCell>
                            <TableCell className="py-1.5 text-xs text-muted-foreground">
                              {c.type}
                            </TableCell>
                            <TableCell className="py-1.5 text-xs">
                              {c.nullable ? (
                                <Badge variant="outline" className="text-xs">
                                  YES
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  NO
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                              {c.default || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
