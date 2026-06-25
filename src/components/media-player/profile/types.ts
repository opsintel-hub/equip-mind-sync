export interface MediaPlayerRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  serial_number_1: string | null;
  serial_number_2: string | null;
  brand: string | null;
  specification: string | null;
  status: string | null;
  item_condition: string;
  department: string | null;
  sub_media_type: string | null;
  billboard_id: string | null;
  install_date: string | null;
  date_of_receipt: string | null;
  warranty_expiry_date: string | null;
  depreciation_months: number | null;
  usage_lifespan_months: number | null;
  unit_price: number | null;
  asset_code: string | null;
  equipment_id_code: string | null;
  po_number: string | null;
  pr_number: string | null;
  invoice_number: string | null;
  po_document_url: string | null;
  pr_document_url: string | null;
  invoice_document_url: string | null;
  remote_name: string | null;
  activate_windows: string | null;
  order_for_project: string | null;
  asset_caretaker: string | null;
  planned_install_location: string | null;
  po_item_no: string | null;
  warranty_years: number | null;
  notes: string | null;
  cms_type_id: string | null;
  company_id: string | null;
  model_id: string | null;
  location_id: string | null;
  created_at: string;
  image_url: string | null;
  billboard?: { id: string; equipment_id: string; old_code: string | null; location_name: string | null } | null;
  companies?: { name: string } | null;
  cms_types?: { name: string } | null;
  locations?: { name: string } | null;
  suppliers?: { name: string } | null;
}

export interface BillboardJourney {
  billboard_id: string;
  billboard_name: string;
  installation_date: string | null;
  uninstall_date: string | null;
  duration_days: number | null;
  uninstall_reason: string | null;
  quantity: number;
}

export interface StockMovement {
  id: string;
  created_at: string;
  movement_type: string;
  quantity: number;
  stock_before: number | null;
  stock_after: number | null;
  reference_document: string | null;
  notes: string | null;
  item_condition: string | null;
}

export interface SearchResult {
  id: string;
  code: string;
  name: string;
  serial_number_1: string | null;
  serial_number_2: string | null;
  receipt_serials?: string[];
}
