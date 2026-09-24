import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MasterDataFilterBar, ALL, matchText } from "@/components/master-data/MasterDataFilterBar";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { PMActionTypeForm } from "./PMActionTypeForm";

interface PMActionType {
  id: string;
  name: string;
  code: string;
  is_snooze: boolean;
  snooze_days: number | null;
  is_active: boolean;
  sort_order: number;
}

interface PMActionTypeListProps {
  refresh: number;
}

export function PMActionTypeList({ refresh }: PMActionTypeListProps) {
  const [items, setItems] = useState<PMActionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<PMActionType | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pm_action_types")
      .select("*")
      .order("sort_order");
    if (error) {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [refresh]);

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("pm_action_types")
      .update({ is_active: !current })
      .eq("id", id);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ");
    } else {
      toast.success("อัปเดตสถานะแล้ว");
      fetchItems();
    }
  };

  const [q, setQ] = useState("");
  const [fType, setFType] = useState(ALL);
  const [fStatus, setFStatus] = useState(ALL);
  const shown = items.filter((x) => (fType === ALL || (fType === "snooze") === !!x.is_snooze) && (fStatus === ALL || (fStatus === "active") === !!x.is_active) && matchText(q, x.name, x.code));
  const pg = useTablePagination(shown, 20);

  if (loading) return <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>;

  return (
    <>
      <MasterDataFilterBar search={q} onSearchChange={setQ} placeholder="ค้นหาชื่อ Action หรือ Code..."
        preview={shown.map((x) => ({ id: x.id, title: x.name, subtitle: x.code }))}
        resultCount={shown.length} totalCount={items.length}
        filters={[{ key: "type", label: "ประเภท", value: fType, onChange: setFType, width: "w-[150px]", options: [{ value: "snooze", label: "เลื่อน/ซ่อน" }, { value: "action", label: "ดำเนินการ" }] }, { key: "status", label: "สถานะ", value: fStatus, onChange: setFStatus, width: "w-[140px]", options: [{ value: "active", label: "ใช้งาน" }, { value: "inactive", label: "ปิดใช้งาน" }] }]} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ลำดับ</TableHead>
            <TableHead>ชื่อ Action</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>ซ่อน (วัน)</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pg.paginatedData.map(item => (
            <TableRow key={item.id}>
              <TableCell>{item.sort_order}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-2 py-1 rounded">{item.code}</code>
              </TableCell>
              <TableCell>
                <Badge variant={item.is_snooze ? "secondary" : "default"}>
                  {item.is_snooze ? "ซ่อนชั่วคราว" : "สร้างตั๋ว"}
                </Badge>
              </TableCell>
              <TableCell>{item.snooze_days ? `${item.snooze_days} วัน` : "-"}</TableCell>
              <TableCell>
                <Switch
                  checked={item.is_active}
                  onCheckedChange={() => toggleActive(item.id, item.is_active)}
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditItem(item)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination currentPage={pg.currentPage} totalPages={pg.totalPages} totalItems={pg.totalItems} pageSize={pg.pageSize} onPageChange={pg.handlePageChange} onPageSizeChange={pg.handlePageSizeChange} />

      {editItem && (
        <PMActionTypeForm
          editItem={editItem}
          onSuccess={() => { setEditItem(null); fetchItems(); }}
          onClose={() => setEditItem(null)}
        />
      )}
    </>
  );
}
