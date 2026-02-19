import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Clock, CheckCircle2, Edit, Package, Monitor, XCircle } from "lucide-react";
import { format } from "date-fns";

export interface PendingReceipt {
  id: string;
  document_no: string;
  equipment_code: string | null;
  equipment_name: string | null;
  equipment_id: string | null;
  quantity: number;
  unit: string;
  supplier_id: string | null;
  supplier_name: string | null;
  lot_number: string | null;
  lot_number_2: string | null;
  serial_number: string | null;
  expiry_date: string | null;
  delivery_person_name: string;
  delivery_person_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  storage_volume_cm3?: number | null;
  storage_width_cm?: number | null;
  storage_height_cm?: number | null;
  storage_depth_cm?: number | null;
  warranty_expiry_date: string | null;
  unit_price: number | null;
  is_asset?: boolean | null;
  receipt_purpose_id?: string | null;
  is_media_player?: boolean | null;
  media_player_id?: string | null;
  // Additional fields for complete display
  po_number?: string | null;
  pr_number?: string | null;
  document_url?: string | null;
  purchase_document_url?: string | null;
  document_file_name?: string | null;
  company_id?: string | null;
  department_id?: string | null;
  warehouse_id?: string | null;
  asset_code?: string | null;
  equipment_id_code?: string | null;
  waiting_asset_code?: boolean | null;
  waiting_equipment_id?: boolean | null;
  depreciation_months?: number | null;
  // Temp fields for new products
  temp_category_id?: string | null;
  temp_subcategory_id?: string | null;
  temp_product_images?: string[] | null;
}

interface GroupedReceipts {
  parentDocNo: string;
  deliveryPerson: string;
  deliveryPhone: string | null;
  createdAt: string;
  items: PendingReceipt[];
  pendingCount: number;
  receivedCount: number;
  rejectedCount: number;
  totalItems: number;
}

interface ReceiveGroupedItemsProps {
  receipts: PendingReceipt[];
  onReceiveSingle: (receipt: PendingReceipt) => void;
  onReceiveBatch: (receipts: PendingReceipt[]) => void;
  onRejectSingle: (receipt: PendingReceipt) => void;
  getReceiptPurposeName: (purposeId: string | null | undefined) => string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-warning/10 text-warning"><Clock className="w-3 h-3 mr-1" />รอรับเข้า</Badge>;
    case "received":
      return <Badge variant="secondary" className="bg-success/10 text-success"><CheckCircle2 className="w-3 h-3 mr-1" />รับเข้าแล้ว</Badge>;
    case "rejected":
      return <Badge variant="secondary" className="bg-destructive/10 text-destructive"><XCircle className="w-3 h-3 mr-1" />ปฏิเสธ</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

// Extract parent document number (e.g., PD-20250125-001 from PD-20250125-001-01)
const getParentDocNo = (docNo: string): string => {
  // Pattern: PD-YYYYMMDD-XXX-YY -> return PD-YYYYMMDD-XXX
  const match = docNo.match(/^(PD-\d{8}-\d{3})(-\d+)?$/);
  if (match) {
    return match[1];
  }
  return docNo;
};

export const ReceiveGroupedItems = ({
  receipts,
  onReceiveSingle,
  onReceiveBatch,
  onRejectSingle,
  getReceiptPurposeName,
}: ReceiveGroupedItemsProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Group receipts by parent document number
  const groupedReceipts: GroupedReceipts[] = Object.values(
    receipts.reduce((acc, receipt) => {
      const parentDocNo = getParentDocNo(receipt.document_no);
      
      if (!acc[parentDocNo]) {
        acc[parentDocNo] = {
          parentDocNo,
          deliveryPerson: receipt.delivery_person_name,
          deliveryPhone: receipt.delivery_person_phone,
          createdAt: receipt.created_at,
          items: [],
          pendingCount: 0,
          receivedCount: 0,
          rejectedCount: 0,
          totalItems: 0,
        };
      }
      
      acc[parentDocNo].items.push(receipt);
      acc[parentDocNo].totalItems++;
      if (receipt.status === "pending") {
        acc[parentDocNo].pendingCount++;
      } else if (receipt.status === "received") {
        acc[parentDocNo].receivedCount++;
      } else if (receipt.status === "rejected") {
        acc[parentDocNo].rejectedCount++;
      }
      
      return acc;
    }, {} as Record<string, GroupedReceipts>)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(groupedReceipts);

  const toggleGroup = (parentDocNo: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(parentDocNo)) {
      newExpanded.delete(parentDocNo);
    } else {
      newExpanded.add(parentDocNo);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleItemSelection = (itemId: string, parentDocNo: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleAllInGroup = (group: GroupedReceipts) => {
    const pendingItems = group.items.filter(item => item.status === "pending");
    const allSelected = pendingItems.every(item => selectedItems.has(item.id));
    
    const newSelected = new Set(selectedItems);
    if (allSelected) {
      pendingItems.forEach(item => newSelected.delete(item.id));
    } else {
      pendingItems.forEach(item => newSelected.add(item.id));
    }
    setSelectedItems(newSelected);
  };

  const getSelectedPendingItems = (group: GroupedReceipts) => {
    return group.items.filter(item => 
      item.status === "pending" && selectedItems.has(item.id)
    );
  };

  const handleBatchReceive = (group: GroupedReceipts) => {
    const selectedPendingItems = getSelectedPendingItems(group);
    if (selectedPendingItems.length > 0) {
      onReceiveBatch(selectedPendingItems);
    }
  };

  if (groupedReceipts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        ไม่มีรายการ
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paginatedData.map((group) => {
        const isExpanded = expandedGroups.has(group.parentDocNo);
        const pendingItems = group.items.filter(item => item.status === "pending");
        const allPendingSelected = pendingItems.length > 0 && 
          pendingItems.every(item => selectedItems.has(item.id));
        const somePendingSelected = pendingItems.some(item => selectedItems.has(item.id));
        const selectedCount = getSelectedPendingItems(group).length;

        return (
          <div key={group.parentDocNo} className="border rounded-lg overflow-hidden">
            {/* Group Header */}
            <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.parentDocNo)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{group.parentDocNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.deliveryPerson} • {format(new Date(group.createdAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-normal">
                        {group.totalItems} รายการ
                      </Badge>
                      {group.pendingCount > 0 && (
                        <Badge variant="secondary" className="bg-warning/10 text-warning">
                          รอรับ {group.pendingCount}
                        </Badge>
                      )}
                      {group.receivedCount > 0 && (
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          รับแล้ว {group.receivedCount}
                        </Badge>
                      )}
                      {group.rejectedCount > 0 && (
                        <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                          ปฏิเสธ {group.rejectedCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                {/* Batch Action Bar */}
                {pendingItems.length > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={allPendingSelected}
                        onCheckedChange={() => toggleAllInGroup(group)}
                        className="border-primary"
                      />
                      <span className="text-sm text-muted-foreground">
                        {allPendingSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมดที่รอรับ"}
                      </span>
                    </div>
                    {selectedCount > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleBatchReceive(group)}
                        className="gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        รับเข้าคลัง {selectedCount} รายการ
                      </Button>
                    )}
                  </div>
                )}

                {/* Items Table */}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      {pendingItems.length > 1 && <TableHead className="w-12"></TableHead>}
                      <TableHead>ลำดับ</TableHead>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead>จำนวน</TableHead>
                      <TableHead>Serial No.</TableHead>
                      <TableHead>วัตถุประสงค์</TableHead>
                      <TableHead>ผู้จัดจำหน่าย</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="w-24">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        {pendingItems.length > 1 && (
                          <TableCell>
                            {item.status === "pending" && (
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => toggleItemSelection(item.id, group.parentDocNo)}
                              />
                            )}
                          </TableCell>
                        )}
                        <TableCell className="font-medium text-muted-foreground">
                          #{index + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              {item.is_media_player && (
                                <Monitor className="w-4 h-4 text-blue-500" />
                              )}
                              <p className="font-medium">{item.equipment_name || "-"}</p>
                            </div>
                            {item.equipment_code && (
                              <p className="text-xs text-muted-foreground">{item.equipment_code}</p>
                            )}
                            <div className="flex gap-1 mt-1">
                              {item.is_media_player && (
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-xs">
                                  Media Player
                                </Badge>
                              )}
                              {!item.equipment_id && !item.media_player_id && (
                                <Badge variant="outline" className="text-warning border-warning text-xs">
                                  สินค้าใหม่
                                </Badge>
                              )}
                              {item.temp_product_images && item.temp_product_images.length > 0 && (
                                <Badge variant="outline" className="text-blue-500 border-blue-300 text-xs">
                                  📷 {item.temp_product_images.length} รูป
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell className="text-sm">{item.serial_number || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal text-xs">
                            {getReceiptPurposeName(item.receipt_purpose_id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.supplier_name || "-"}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {item.status === "pending" && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReceiveSingle(item);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                รับเข้า
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRejectSingle(item);
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                ปฏิเสธ
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};
