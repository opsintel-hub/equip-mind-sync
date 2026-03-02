import { supabase } from "@/integrations/supabase/client";

export type MovementType = 
  | 'receive' 
  | 'issue' 
  | 'transfer_in' 
  | 'transfer_out' 
  | 'return_from_billboard' 
  | 'install_to_billboard';

export interface StockMovementData {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  movement_type: MovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference_type?: string;
  reference_id?: string;
  reference_document?: string;
  location_id?: string | null;
  notes?: string;
  item_condition?: string;
}

export async function logStockMovement(data: StockMovementData) {
  const { data: userData } = await supabase.auth.getUser();
  
  const { error } = await supabase.from("stock_movements").insert({
    equipment_id: data.equipment_id,
    equipment_code: data.equipment_code,
    equipment_name: data.equipment_name,
    movement_type: data.movement_type,
    quantity: data.quantity,
    stock_before: data.stock_before,
    stock_after: data.stock_after,
    reference_type: data.reference_type,
    reference_id: data.reference_id,
    reference_document: data.reference_document,
    location_id: data.location_id,
    notes: data.notes,
    item_condition: data.item_condition,
    created_by: userData?.user?.id,
  });

  if (error) {
    console.error("Failed to log stock movement:", error);
    // Don't throw - logging should not block main operation
  }
}
