import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, TrendingUp, TrendingDown, ArrowRightLeft, RotateCcw, Package, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type MovementType = 'receive' | 'issue' | 'transfer_in' | 'transfer_out' | 'return_from_billboard' | 'install_to_billboard' | 'defective_return';

const movementTypeConfig: Record<MovementType, { label: string; icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  receive: { label: "รับเข้า", icon: TrendingUp, variant: "default" },
  issue: { label: "เบิกออก", icon: TrendingDown, variant: "destructive" },
  transfer_in: { label: "รับโอน", icon: ArrowRightLeft, variant: "secondary" },
  transfer_out: { label: "โอนออก", icon: ArrowRightLeft, variant: "outline" },
  return_from_billboard: { label: "คืนจากป้าย", icon: RotateCcw, variant: "default" },
  install_to_billboard: { label: "ติดตั้งป้าย", icon: Package, variant: "outline" },
  defective_return: { label: "นำของเสียเข้า", icon: AlertTriangle, variant: "destructive" },
};

export interface StockMovementItem {
  id: string;
  created_at: string;
  movement_type: string;
  equipment_code: string;
  equipment_name: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference_document: string | null;
  notes: string | null;
  location?: { name: string } | null;
  companies?: { name: string } | null;
}

export interface GroupedMovement {
  reference_document: string;
  created_at: string;
  movement_type: string;
  company_name: string | null;
  items: StockMovementItem[];
  total_items: number;
}

interface StockMovementGroupRowProps {
  group: GroupedMovement;
  onViewDocument: (group: GroupedMovement) => void;
}

export const StockMovementGroupRow = ({ group, onViewDocument }: StockMovementGroupRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getMovementBadge = (type: string, notes?: string | null) => {
    const config = movementTypeConfig[type as MovementType];
    const isMediaPlayer = notes?.toLowerCase().includes("media player");
    
    if (!config) return <Badge variant="outline">{type}</Badge>;
    
    const Icon = config.icon;
    return (
      <div className="flex flex-col gap-1">
        <Badge variant={config.variant} className="gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
        {isMediaPlayer && (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-xs">
            Media Player
          </Badge>
        )}
      </div>
    );
  };

  const getStockChange = (type: string, quantity: number) => {
    const isIncrease = ['receive', 'transfer_in', 'return_from_billboard'].includes(type);
    return (
      <span className={isIncrease ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
        {isIncrease ? "+" : "-"}{quantity}
      </span>
    );
  };

  const getTotalQuantity = () => {
    return group.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <>
      {/* Main Document Row */}
      <TableRow className="bg-muted/30 hover:bg-muted/50 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <TableCell className="w-8">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap font-medium">
          {format(new Date(group.created_at), "dd MMM yy HH:mm", { locale: th })}
        </TableCell>
        <TableCell>{getMovementBadge(group.movement_type)}</TableCell>
        <TableCell>{group.company_name || "-"}</TableCell>
        <TableCell className="font-mono text-sm font-semibold">
          {group.reference_document || "-"}
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {group.total_items} รายการ
          </Badge>
        </TableCell>
        <TableCell className="text-right font-medium">
          {getStockChange(group.movement_type, getTotalQuantity())}
        </TableCell>
        <TableCell colSpan={2}></TableCell>
        <TableCell>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDocument(group);
            }}
          >
            <FileText className="h-3 w-3" />
            ดูเอกสาร
          </Button>
        </TableCell>
      </TableRow>

      {/* Sub-rows for each item */}
      {isExpanded && group.items.map((item, index) => (
        <TableRow key={item.id} className="bg-background hover:bg-muted/20">
          <TableCell className="w-8">
            <div className="flex items-center justify-end pr-2 text-muted-foreground">
              └
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground text-sm pl-6">
            {index + 1}.
          </TableCell>
          <TableCell>{getMovementBadge(item.movement_type, item.notes)}</TableCell>
          <TableCell className="text-muted-foreground">-</TableCell>
          <TableCell className="font-mono text-sm">{item.equipment_code}</TableCell>
          <TableCell>{item.equipment_name}</TableCell>
          <TableCell className="text-right">
            {getStockChange(item.movement_type, item.quantity)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm">{item.stock_before}</TableCell>
          <TableCell className="text-right font-mono text-sm font-medium">{item.stock_after}</TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {item.location?.name || "-"}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};
