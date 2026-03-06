import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Trash2, Package, Eye, Pencil, Send, CheckSquare } from "lucide-react";

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
  temp_category_id?: string | null;
  temp_subcategory_id?: string | null;
  temp_product_images?: string[];
  temp_min_stock_level?: number;
  is_media_player?: boolean;
  media_player_id?: string | null;
  cms_type_id?: string;
  serial_number_2?: string;
  activate_windows?: string;
  media_player_image_url?: string;
  media_player_image_file?: File;
}

interface DeliveryCartProps {
  items: DeliveryCartItem[];
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onEditItem?: (item: DeliveryCartItem) => void;
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
}

export function DeliveryCart({ items, onRemoveItem, onClearCart, onEditItem, selectedIds, onSelectedIdsChange }: DeliveryCartProps) {
  const [viewItem, setViewItem] = useState<DeliveryCartItem | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0);
  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === items.length;

  const handleToggleAll = () => {
    if (allSelected) {
      onSelectedIdsChange(new Set());
    } else {
      onSelectedIdsChange(new Set(items.map(i => i.id)));
    }
  };

  const handleToggleItem = (itemId: string) => {
    const next = new Set(selectedIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    onSelectedIdsChange(next);
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => onRemoveItem(id));
    onSelectedIdsChange(new Set());
  };

  const handleViewItem = (item: DeliveryCartItem) => {
    setViewItem(item);
    setShowViewDialog(true);
  };

  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const selectedTotalQty = selectedItems.reduce((s, i) => s + i.quantity, 0);
  const selectedTotalValue = selectedItems.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <ShoppingCart className="h-5 w-5" />
              ตะกร้าสินค้านำเข้า ({items.length} รายการ)
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  ลบที่เลือก ({selectedCount})
                </Button>
              )}
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleToggleAll}
                      aria-label="เลือกทั้งหมด"
                    />
                  </TableHead>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>สินค้า</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>Lot/Serial</TableHead>
                  <TableHead>ราคา/ชิ้น</TableHead>
                  <TableHead>มูลค่า</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-[100px]">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id} className={selectedIds.has(item.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => handleToggleItem(item.id)}
                      />
                    </TableCell>
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
                        {item.activate_windows && <span>AW: {item.activate_windows}</span>}
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
                        {item.is_media_player && (
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-xs">
                            Media Player
                          </Badge>
                        )}
                        {item.equipment_id || item.media_player_id ? (
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewItem(item)}
                          title="ดูรายละเอียด"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {onEditItem && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={() => onEditItem(item)}
                            title="แก้ไข"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            onRemoveItem(item.id);
                            const next = new Set(selectedIds);
                            next.delete(item.id);
                            onSelectedIdsChange(next);
                          }}
                          title="ลบ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Summary */}
          <div className="mt-4 flex flex-col gap-2 p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex gap-6">
                <div className="text-sm">
                  <span className="text-muted-foreground">ทั้งหมด: </span>
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
            {selectedCount > 0 && (
              <div className="flex items-center gap-4 pt-2 border-t border-border">
                <Badge variant="outline" className="text-primary border-primary">
                  <CheckSquare className="w-3 h-3 mr-1" />
                  เลือก {selectedCount} รายการ
                </Badge>
                <span className="text-sm text-muted-foreground">
                  จำนวน {selectedTotalQty} ชิ้น
                </span>
                {selectedTotalValue > 0 && (
                  <span className="text-sm font-medium text-primary">
                    มูลค่า ฿{selectedTotalValue.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Item Detail Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              รายละเอียดสินค้า
            </DialogTitle>
          </DialogHeader>
          
          {viewItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">รหัสสินค้า</label>
                  <p className="font-medium">{viewItem.equipment_code || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ชื่อสินค้า</label>
                  <p className="font-medium">{viewItem.equipment_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">จำนวน</label>
                  <p className="font-medium">{viewItem.quantity} {viewItem.unit}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ราคา/ชิ้น</label>
                  <p className="font-medium">{viewItem.unit_price ? `฿${viewItem.unit_price.toLocaleString()}` : "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">มูลค่ารวม</label>
                  <p className="font-medium text-primary">
                    {viewItem.unit_price ? `฿${(viewItem.unit_price * viewItem.quantity).toLocaleString()}` : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">สถานะ</label>
                  <div className="mt-1">
                    {viewItem.equipment_id ? (
                      <Badge variant="secondary" className="bg-success/10 text-success">มีในระบบ</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-warning/10 text-warning">สินค้าใหม่</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <label className="text-xs text-muted-foreground">Lot Number 1</label>
                  <p className="font-medium">{viewItem.lot_number_1 || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Lot Number 2</label>
                  <p className="font-medium">{viewItem.lot_number_2 || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Serial Number</label>
                  <p className="font-medium">{viewItem.serial_number || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">ผู้จัดจำหน่าย</label>
                  <p className="font-medium">{viewItem.supplier_name || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">วันหมดอายุ</label>
                  <p className="font-medium">{viewItem.expiry_date || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">วันหมดประกัน</label>
                  <p className="font-medium">{viewItem.warranty_expiry_date || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <label className="text-xs text-muted-foreground">กว้าง (m)</label>
                  <p className="font-medium">{viewItem.storage_width_cm || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">สูง (m)</label>
                  <p className="font-medium">{viewItem.storage_height_cm || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ลึก (m)</label>
                  <p className="font-medium">{viewItem.storage_depth_cm || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ปริมาตร (m³)</label>
                  <p className="font-medium">{viewItem.storage_volume_cm3 || "-"}</p>
                </div>
              </div>

              {viewItem.is_asset && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                    ข้อมูลทรัพย์สิน
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Asset Code</label>
                      <p className="font-medium">
                        {viewItem.waiting_asset_code ? (
                          <Badge variant="outline" className="text-amber-600">รอรหัส</Badge>
                        ) : (
                          viewItem.asset_code || "-"
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Equipment ID Code</label>
                      <p className="font-medium">
                        {viewItem.waiting_equipment_id ? (
                          <Badge variant="outline" className="text-amber-600">รอรหัส</Badge>
                        ) : (
                          viewItem.equipment_id_code || "-"
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">ค่าเสื่อมราคา</label>
                      <p className="font-medium">{viewItem.depreciation_months ? `${viewItem.depreciation_months} เดือน` : "-"}</p>
                    </div>
                  </div>
                </div>
              )}

              {viewItem.notes && (
                <div>
                  <label className="text-xs text-muted-foreground">หมายเหตุ</label>
                  <p className="font-medium">{viewItem.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}