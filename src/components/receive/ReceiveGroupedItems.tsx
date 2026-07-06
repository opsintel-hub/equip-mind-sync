import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Clock, CheckCircle2, Edit, Eye, Package, Monitor, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ColumnChooser, ColumnDef, useVisibleCols } from "@/components/ColumnChooser";

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
  received_at?: string | null;
  received_location_id?: string | null;
  received_storage_slot_id?: string | null;
  received_sub_storage_slot_id?: string | null;
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
  temp_category_id?: string | null;
  temp_subcategory_id?: string | null;
  temp_product_images?: string[] | null;
  planned_install_location?: string | null;
  asset_caretaker?: string | null;
  po_item_no?: string | null;
  warranty_years?: number | null;
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
  onViewReceipt?: (receipt: PendingReceipt) => void;
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

const getParentDocNo = (docNo: string): string => {
  const match = docNo.match(/^(PD-\d{8}-\d{3})(-\d+)?$/);
  if (match) return match[1];
  return docNo;
};

type ColKey =
  | "seq"
  | "name"
  | "qty"
  | "serial"
  | "location"
  | "caretaker"
  | "warranty"
  | "purpose"
  | "supplier"
  | "status"
  | "actions";

const COLUMNS: ColumnDef<ColKey>[] = [
  { key: "seq", label: "ลำดับ", locked: true },
  { key: "name", label: "ชื่อสินค้า", locked: true },
  { key: "qty", label: "จำนวน" },
  { key: "serial", label: "Serial No." },
  { key: "location", label: "Location ตามแผน" },
  { key: "caretaker", label: "ผู้ดูแล" },
  { key: "warranty", label: "รับประกัน (ปี)" },
  { key: "purpose", label: "วัตถุประสงค์" },
  { key: "supplier", label: "ผู้จัดจำหน่าย" },
  { key: "status", label: "สถานะ", locked: true },
  { key: "actions", label: "จัดการ", locked: true },
];

export const ReceiveGroupedItems = ({
  receipts,
  onReceiveSingle,
  onReceiveBatch,
  onRejectSingle,
  onViewReceipt,
  getReceiptPurposeName,
}: ReceiveGroupedItemsProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useVisibleCols<ColKey>("receive-grouped-cols-v1", COLUMNS);
  const visibleSet = new Set(visibleCols);
  const show = (k: ColKey) => visibleSet.has(k);

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
      if (receipt.status === "pending") acc[parentDocNo].pendingCount++;
      else if (receipt.status === "received") acc[parentDocNo].receivedCount++;
      else if (receipt.status === "rejected") acc[parentDocNo].rejectedCount++;
      return acc;
    }, {} as Record<string, GroupedReceipts>)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(groupedReceipts);

  const toggleGroup = (parentDocNo: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(parentDocNo)) newExpanded.delete(parentDocNo);
    else newExpanded.add(parentDocNo);
    setExpandedGroups(newExpanded);
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) newSelected.delete(itemId);
    else newSelected.add(itemId);
    setSelectedItems(newSelected);
  };

  const toggleAllInGroup = (group: GroupedReceipts) => {
    const pendingItems = group.items.filter(item => item.status === "pending");
    const allSelected = pendingItems.every(item => selectedItems.has(item.id));
    const newSelected = new Set(selectedItems);
    if (allSelected) pendingItems.forEach(item => newSelected.delete(item.id));
    else pendingItems.forEach(item => newSelected.add(item.id));
    setSelectedItems(newSelected);
  };

  const getSelectedPendingItems = (group: GroupedReceipts) =>
    group.items.filter(item => item.status === "pending" && selectedItems.has(item.id));

  const handleBatchReceive = (group: GroupedReceipts) => {
    const selectedPendingItems = getSelectedPendingItems(group);
    if (selectedPendingItems.length > 0) onReceiveBatch(selectedPendingItems);
  };

  if (groupedReceipts.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">ไม่มีรายการ</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ColumnChooser columns={COLUMNS} visible={visibleCols} onChange={setVisibleCols} />
      </div>
      {paginatedData.map((group) => {
        const isExpanded = expandedGroups.has(group.parentDocNo);
        const pendingItems = group.items.filter(item => item.status === "pending");
        const allPendingSelected = pendingItems.length > 0 && pendingItems.every(item => selectedItems.has(item.id));
        const selectedCount = getSelectedPendingItems(group).length;
        const showSelectCol = pendingItems.length > 1;

        return (
          <div key={group.parentDocNo} className="border rounded-lg overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.parentDocNo)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
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
                      <Badge variant="outline" className="font-normal">{group.totalItems} รายการ</Badge>
                      {group.pendingCount > 0 && <Badge variant="secondary" className="bg-warning/10 text-warning">รอรับ {group.pendingCount}</Badge>}
                      {group.receivedCount > 0 && <Badge variant="secondary" className="bg-success/10 text-success">รับแล้ว {group.receivedCount}</Badge>}
                      {group.rejectedCount > 0 && <Badge variant="secondary" className="bg-destructive/10 text-destructive">ปฏิเสธ {group.rejectedCount}</Badge>}
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                {showSelectCol && (
                  <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={allPendingSelected} onCheckedChange={() => toggleAllInGroup(group)} className="border-primary" />
                      <span className="text-sm text-muted-foreground">
                        {allPendingSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมดที่รอรับ"}
                      </span>
                    </div>
                    {selectedCount > 0 && (
                      <Button size="sm" onClick={() => handleBatchReceive(group)} className="gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        รับเข้าคลัง {selectedCount} รายการ
                      </Button>
                    )}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table className="min-w-max">
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        {showSelectCol && <TableHead className="w-12 sticky left-0 bg-muted/40 z-10"></TableHead>}
                        {show("seq") && <TableHead className="w-16 whitespace-nowrap">ลำดับ</TableHead>}
                        {show("name") && <TableHead className="min-w-[240px]">ชื่อสินค้า</TableHead>}
                        {show("qty") && <TableHead className="w-24 whitespace-nowrap">จำนวน</TableHead>}
                        {show("serial") && <TableHead className="min-w-[140px] whitespace-nowrap">Serial No.</TableHead>}
                        {show("location") && <TableHead className="min-w-[200px]">Location ตามแผน</TableHead>}
                        {show("caretaker") && <TableHead className="min-w-[140px]">ผู้ดูแล</TableHead>}
                        {show("warranty") && <TableHead className="w-28 text-right whitespace-nowrap">รับประกัน (ปี)</TableHead>}
                        {show("purpose") && <TableHead className="min-w-[140px] whitespace-nowrap">วัตถุประสงค์</TableHead>}
                        {show("supplier") && <TableHead className="min-w-[180px]">ผู้จัดจำหน่าย</TableHead>}
                        {show("status") && <TableHead className="w-28 whitespace-nowrap">สถานะ</TableHead>}
                        {show("actions") && <TableHead className="min-w-[180px] whitespace-nowrap">จัดการ</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          {showSelectCol && (
                            <TableCell className="sticky left-0 bg-background z-10">
                              {item.status === "pending" && (
                                <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleItemSelection(item.id)} />
                              )}
                            </TableCell>
                          )}
                          {show("seq") && (
                            <TableCell className="font-medium text-muted-foreground whitespace-nowrap">#{index + 1}</TableCell>
                          )}
                          {show("name") && (
                            <TableCell>
                              <div>
                                <div className="flex items-center gap-2">
                                  {item.is_media_player && <Monitor className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                                  <p className="font-medium">{item.equipment_name || "-"}</p>
                                </div>
                                {item.equipment_code && <p className="text-xs text-muted-foreground">{item.equipment_code}</p>}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.is_media_player && (
                                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-xs">Media Player</Badge>
                                  )}
                                  {!item.equipment_id && !item.media_player_id && (
                                    <Badge variant="outline" className="text-warning border-warning text-xs">สินค้าใหม่</Badge>
                                  )}
                                  {item.temp_product_images && item.temp_product_images.length > 0 && (
                                    <Badge variant="outline" className="text-blue-500 border-blue-300 text-xs">
                                      📷 {item.temp_product_images.length} รูป
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          )}
                          {show("qty") && <TableCell className="whitespace-nowrap">{item.quantity} {item.unit}</TableCell>}
                          {show("serial") && <TableCell className="text-sm whitespace-pre-line">{item.serial_number || "-"}</TableCell>}
                          {show("location") && (
                            <TableCell className="text-sm">
                              {item.planned_install_location ? (
                                <span className="text-foreground">{item.planned_install_location}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                          {show("caretaker") && <TableCell className="text-sm whitespace-nowrap">{item.asset_caretaker || "-"}</TableCell>}
                          {show("warranty") && (
                            <TableCell className="text-sm text-right whitespace-nowrap">
                              {item.warranty_years != null ? item.warranty_years : "-"}
                            </TableCell>
                          )}
                          {show("purpose") && (
                            <TableCell>
                              <Badge variant="outline" className="font-normal text-xs whitespace-nowrap">
                                {getReceiptPurposeName(item.receipt_purpose_id)}
                              </Badge>
                            </TableCell>
                          )}
                          {show("supplier") && <TableCell className="text-sm">{item.supplier_name || "-"}</TableCell>}
                          {show("status") && <TableCell className="whitespace-nowrap">{getStatusBadge(item.status)}</TableCell>}
                          {show("actions") && (
                            <TableCell>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                {item.status === "received" && onViewReceipt && (
                                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onViewReceipt(item); }}>
                                    <Eye className="w-4 h-4 mr-1" />
                                    ดูรับเข้า
                                  </Button>
                                )}
                                {item.status === "pending" && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onReceiveSingle(item); }}>
                                      <Edit className="w-4 h-4 mr-1" />
                                      รับเข้า
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10"
                                      onClick={(e) => { e.stopPropagation(); onRejectSingle(item); }}>
                                      <XCircle className="w-4 h-4 mr-1" />
                                      ปฏิเสธ
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
