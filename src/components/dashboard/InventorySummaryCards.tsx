import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { Building2, Layers, ChevronDown, ChevronUp, Package, Wallet } from "lucide-react";

interface Props {
  companyId: string;
  /** Selected department names; empty = all viewable departments */
  departments?: string[];
}


interface Row {
  department: string | null;
  company_id: string | null;
  qty: number;
  price: number;
}

const PAGE = 1000;

async function fetchAll(
  table: "equipment" | "media_players",
  qtyCol: "quantity_in_stock" | "quantity",
  companyId: string
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from(table)
      .select(`department, company_id, ${qtyCol}, unit_price`)
      .eq("is_active", true)
      .range(from, from + PAGE - 1);
    if (companyId !== "all") q = q.eq("company_id", companyId);
    const { data, error } = await q;
    if (error) throw error;
    const batch = (data || []) as any[];
    batch.forEach((r) =>
      rows.push({
        department: r.department,
        company_id: r.company_id,
        qty: Number(r[qtyCol]) || 0,
        price: Number(r.unit_price) || 0,
      })
    );
    if (batch.length < PAGE) break;
  }
  return rows;
}

const baht = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

function useToggle(key: string, initial = true) {
  const [open, setOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem(key);
    return saved === null ? initial : saved === "1";
  });
  const toggle = () => {
    setOpen((prev) => {
      localStorage.setItem(key, prev ? "0" : "1");
      return !prev;
    });
  };
  return [open, toggle] as const;
}

export function InventorySummaryCards({ companyId, departments = [] }: Props) {
  const { getViewableDepartments, isAdmin, loading: permLoading } = useDepartmentPermissions();
  const [deptOpen, toggleDept] = useToggle("dash-summary-dept");
  const [companyOpen, toggleCompany] = useToggle("dash-summary-company");

  const { data, isLoading } = useQuery({
    queryKey: ["dash-inventory-summary", companyId],
    queryFn: async () => {
      const [eq, mp, companies] = await Promise.all([
        fetchAll("equipment", "quantity_in_stock", companyId),
        fetchAll("media_players", "quantity", companyId),
        supabase.from("companies").select("id, code, name"),
      ]);
      return {
        rows: [...eq, ...mp],
        companies: (companies.data || []) as { id: string; code: string; name: string }[],
      };
    },
  });

  const viewable = permLoading ? [] : getViewableDepartments();

  const { byDept, byCompany, totalQty, totalValue } = useMemo(() => {
    const rows = (data?.rows || [])
      .filter((r) => isAdmin || viewable.length === 0 || (r.department && viewable.includes(r.department)))
      .filter((r) => departments.length === 0 || (r.department && departments.includes(r.department)));

    const deptMap = new Map<string, { qty: number; value: number; items: number }>();
    const compMap = new Map<string, { qty: number; value: number; items: number }>();
    let tq = 0;
    let tv = 0;
    rows.forEach((r) => {
      const value = r.qty * r.price;
      tq += r.qty;
      tv += value;
      const d = r.department || "ไม่ระบุฝ่าย";
      const dv = deptMap.get(d) || { qty: 0, value: 0, items: 0 };
      deptMap.set(d, { qty: dv.qty + r.qty, value: dv.value + value, items: dv.items + 1 });
      if (r.company_id) {
        const cv = compMap.get(r.company_id) || { qty: 0, value: 0, items: 0 };
        compMap.set(r.company_id, { qty: cv.qty + r.qty, value: cv.value + value, items: cv.items + 1 });
      }
    });
    const nameOf = (id: string) => {
      const c = (data?.companies || []).find((x) => x.id === id);
      return c ? `${c.code} - ${c.name}` : "ไม่ระบุบริษัท";
    };
    return {
      byDept: [...deptMap.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .filter((d) => d.qty > 0 || d.value > 0)
        .sort((a, b) => b.value - a.value),
      byCompany: [...compMap.entries()]
        .map(([id, v]) => ({ name: nameOf(id), ...v }))
        .filter((c) => c.qty > 0 || c.value > 0)
        .sort((a, b) => b.value - a.value),
      totalQty: tq,
      totalValue: tv,
    };
  }, [data, isAdmin, viewable]);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const renderGrid = (
    list: { name: string; qty: number; value: number; items: number }[],
    accent: string
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {list.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
      {list.map((row) => (
        <Card key={row.name} className="border-border/60 hover-lift">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold truncate" title={row.name}>
              {row.name}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Wallet className={`w-4 h-4 ${accent}`} />
              <span className="font-bold">{baht(row.value)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {row.qty.toLocaleString()} ชิ้น
              </span>
              <span>{row.items.toLocaleString()} รายการ</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex flex-wrap items-center gap-3">
            <Layers className="w-5 h-5 text-primary" />
            สรุปมูลค่าและจำนวนสินค้าคงคลัง
            <Badge variant="secondary">{baht(totalValue)}</Badge>
            <Badge variant="outline">{totalQty.toLocaleString()} ชิ้น</Badge>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleDept}>
                {deptOpen ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                ตามฝ่าย
              </Button>
              <Button variant="outline" size="sm" onClick={toggleCompany}>
                {companyOpen ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                ตามบริษัท
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {deptOpen && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Layers className="w-4 h-4" /> แยกตามฝ่าย ({byDept.length})
              </p>
              {renderGrid(byDept, "text-primary")}
            </div>
          )}
          {companyOpen && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" /> แยกตามบริษัท ({byCompany.length}) — แสดงเฉพาะบริษัทที่มีสินค้า
              </p>
              {renderGrid(byCompany, "text-chart-4")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
