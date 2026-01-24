import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Trash2, Package } from "lucide-react";

export interface DeliveryCartItem {
  id: string;
  equipment_id: string | null;
  equipment_code: string;
  equipment_name: string;
  quantity: number;
  unit: string;
  lot_number_1: string;
  lot_number_2: string;
  serial_number: string;
  unit_price: number | null;
  supplier_id: string | null;
  supplier_name: string;
  expiry_date: string;
  warranty_expiry_date: string;
  storage_width_cm: string;
  storage_height_cm: string;
  storage_depth_cm: string;
  storage_volume_cm3: string;
  is_asset: boolean;
  asset_code: string;
  equipment_id_code: string;
  waiting_asset_code: boolean;
  waiting_equipment_id: boolean;
  depreciation_months: string;
  notes: string;
}

interface DeliveryCartProps {
  items: DeliveryCartItem[];
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
}

export function DeliveryCart({ items, onRemoveItem, onClearCart }: DeliveryCartProps) {
  if (items.length === 0) {
    return null;
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <ShoppingCart className="h-5 w-5" />
            ตะกร้าสินค้านำเข้า ({items.length} รายการ)
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearCart}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            ล้างตะกร้า
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead>จำนวน</TableHead>
                <TableHead>Lot/Serial</TableHead>
                <TableHead>ราคา/ชิ้น</TableHead>
                <TableHead>มูลค่า</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {item.equipment_code ? `${item.equipment_code} - ` : ""}
                        {item.equipment_name}
                      </span>
                      {item.supplier_name && (
                        <span className="text-xs text-muted-foreground">
                          ผู้จัดจำหน่าย: {item.supplier_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      {item.lot_number_1 && <span>Lot1: {item.lot_number_1}</span>}
                      {item.lot_number_2 && <span>Lot2: {item.lot_number_2}</span>}
                      {item.serial_number && <span>SN: {item.serial_number}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.unit_price ? `฿${item.unit_price.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell>
                    {item.unit_price ? `฿${(item.unit_price * item.quantity).toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.equipment_id ? (
                        <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                          มีในระบบ
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-warning/10 text-warning text-xs">
                          สินค้าใหม่
                        </Badge>
                      )}
                      {item.is_asset && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-xs">
                          ทรัพย์สิน
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Summary */}
        <div className="mt-4 flex justify-between items-center p-3 bg-muted rounded-lg">
          <div className="flex gap-6">
            <div className="text-sm">
              <span className="text-muted-foreground">รวม: </span>
              <span className="font-semibold">{items.length} รายการ</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">จำนวนรวม: </span>
              <span className="font-semibold">{totalQuantity} ชิ้น</span>
            </div>
            {totalValue > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">มูลค่ารวม: </span>
                <span className="font-semibold text-primary">฿{totalValue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
