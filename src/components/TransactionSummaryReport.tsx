import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, Package, PackageOpen, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TransactionSummaryReport = () => {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const { data: grData, isLoading: grLoading } = useQuery({
    queryKey: ["gr-summary", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_receipt")
        .select("quantity, receipt_date")
        .gte("receipt_date", format(startDate, "yyyy-MM-dd"))
        .lte("receipt_date", format(endDate, "yyyy-MM-dd"));

      if (error) throw error;

      const totalQuantity = data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const totalTransactions = data?.length || 0;

      return { totalQuantity, totalTransactions };
    },
  });

  const { data: giData, isLoading: giLoading } = useQuery({
    queryKey: ["gi-summary", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue")
        .select("quantity, issue_date")
        .gte("issue_date", format(startDate, "yyyy-MM-dd"))
        .lte("issue_date", format(endDate, "yyyy-MM-dd"));

      if (error) throw error;

      const totalQuantity = data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const totalTransactions = data?.length || 0;

      return { totalQuantity, totalTransactions };
    },
  });

  // Get previous period data for comparison
  const { data: prevGrData } = useQuery({
    queryKey: ["gr-summary-prev", startDate, endDate],
    queryFn: async () => {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevStart = new Date(startDate);
      prevStart.setDate(prevStart.getDate() - daysDiff - 1);
      const prevEnd = new Date(startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);

      const { data, error } = await supabase
        .from("goods_receipt")
        .select("quantity")
        .gte("receipt_date", format(prevStart, "yyyy-MM-dd"))
        .lte("receipt_date", format(prevEnd, "yyyy-MM-dd"));

      if (error) throw error;
      return data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    },
  });

  const { data: prevGiData } = useQuery({
    queryKey: ["gi-summary-prev", startDate, endDate],
    queryFn: async () => {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevStart = new Date(startDate);
      prevStart.setDate(prevStart.getDate() - daysDiff - 1);
      const prevEnd = new Date(startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);

      const { data, error } = await supabase
        .from("goods_issue")
        .select("quantity")
        .gte("issue_date", format(prevStart, "yyyy-MM-dd"))
        .lte("issue_date", format(prevEnd, "yyyy-MM-dd"));

      if (error) throw error;
      return data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    },
  });

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const grChange = grData && prevGrData !== undefined 
    ? calculateChange(grData.totalQuantity, prevGrData) 
    : 0;
  const giChange = giData && prevGiData !== undefined 
    ? calculateChange(giData.totalQuantity, prevGiData) 
    : 0;

  const setQuickRange = (months: number) => {
    const end = new Date();
    const start = subMonths(startOfMonth(end), months - 1);
    setStartDate(startOfMonth(start));
    setEndDate(endOfMonth(end));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>สรุปการรับ-เบิกจ่ายสินค้าตามช่วงเวลา</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickRange(1)}>
              เดือนนี้
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(3)}>
              3 เดือน
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(6)}>
              6 เดือน
            </Button>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "d MMM yy", { locale: th }) : "เริ่มต้น"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">-</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "d MMM yy", { locale: th }) : "สิ้นสุด"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Goods Receipt Summary */}
          <div className="p-4 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">รับเข้าสินค้า (GR)</p>
                <p className="text-xs text-muted-foreground">
                  {format(startDate, "d MMM yy", { locale: th })} - {format(endDate, "d MMM yy", { locale: th })}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-foreground">
                  {grLoading ? "..." : grData?.totalQuantity.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">ชิ้น</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {grLoading ? "..." : grData?.totalTransactions} รายการ
                </span>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  grChange >= 0 ? "text-success" : "text-destructive"
                )}>
                  {grChange >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{grChange >= 0 ? "+" : ""}{grChange.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Goods Issue Summary */}
          <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <PackageOpen className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">เบิกจ่ายสินค้า (GI)</p>
                <p className="text-xs text-muted-foreground">
                  {format(startDate, "d MMM yy", { locale: th })} - {format(endDate, "d MMM yy", { locale: th })}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-foreground">
                  {giLoading ? "..." : giData?.totalQuantity.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">ชิ้น</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {giLoading ? "..." : giData?.totalTransactions} รายการ
                </span>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  giChange >= 0 ? "text-warning" : "text-success"
                )}>
                  {giChange >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{giChange >= 0 ? "+" : ""}{giChange.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Net Change */}
        <div className="mt-4 p-3 rounded-lg bg-muted/30 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">ยอดสุทธิ (รับเข้า - เบิกจ่าย)</span>
          <span className={cn(
            "text-lg font-semibold",
            (grData?.totalQuantity || 0) - (giData?.totalQuantity || 0) >= 0 
              ? "text-success" 
              : "text-destructive"
          )}>
            {((grData?.totalQuantity || 0) - (giData?.totalQuantity || 0) >= 0 ? "+" : "")}
            {((grData?.totalQuantity || 0) - (giData?.totalQuantity || 0)).toLocaleString()} ชิ้น
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionSummaryReport;
