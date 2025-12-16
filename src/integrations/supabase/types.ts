export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      billboard_equipment: {
        Row: {
          billboard_id: string
          created_at: string
          created_by: string | null
          equipment_id: string
          id: string
          installation_date: string | null
          notes: string | null
          quantity: number
        }
        Insert: {
          billboard_id: string
          created_at?: string
          created_by?: string | null
          equipment_id: string
          id?: string
          installation_date?: string | null
          notes?: string | null
          quantity: number
        }
        Update: {
          billboard_id?: string
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          id?: string
          installation_date?: string | null
          notes?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "billboard_equipment_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billboard_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      billboard_equipment_history: {
        Row: {
          billboard_id: string
          created_at: string
          equipment_id: string
          id: string
          installation_date: string | null
          installation_notes: string | null
          installed_by: string | null
          quantity: number
          return_location_id: string | null
          return_to_stock: boolean | null
          uninstall_date: string
          uninstall_reason: string | null
          uninstalled_by: string | null
        }
        Insert: {
          billboard_id: string
          created_at?: string
          equipment_id: string
          id?: string
          installation_date?: string | null
          installation_notes?: string | null
          installed_by?: string | null
          quantity: number
          return_location_id?: string | null
          return_to_stock?: boolean | null
          uninstall_date?: string
          uninstall_reason?: string | null
          uninstalled_by?: string | null
        }
        Update: {
          billboard_id?: string
          created_at?: string
          equipment_id?: string
          id?: string
          installation_date?: string | null
          installation_notes?: string | null
          installed_by?: string | null
          quantity?: number
          return_location_id?: string | null
          return_to_stock?: boolean | null
          uninstall_date?: string
          uninstall_reason?: string | null
          uninstalled_by?: string | null
        }
        Relationships: []
      }
      billboards: {
        Row: {
          bkk_upc: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          district: string | null
          equipment_id: string
          extra_1: string | null
          extra_2: string | null
          extra_3: string | null
          id: string
          location_name: string | null
          media_class: string | null
          media_segment: string | null
          media_type: string | null
          notes: string | null
          old_code: string | null
          region: string | null
          route_install_demolish: string | null
          route_monitoring: string | null
          route_pm: string | null
          route_report_photo: string | null
          status: string
          target_monitoring: string | null
          territory: string | null
          updated_at: string
        }
        Insert: {
          bkk_upc?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          district?: string | null
          equipment_id: string
          extra_1?: string | null
          extra_2?: string | null
          extra_3?: string | null
          id?: string
          location_name?: string | null
          media_class?: string | null
          media_segment?: string | null
          media_type?: string | null
          notes?: string | null
          old_code?: string | null
          region?: string | null
          route_install_demolish?: string | null
          route_monitoring?: string | null
          route_pm?: string | null
          route_report_photo?: string | null
          status?: string
          target_monitoring?: string | null
          territory?: string | null
          updated_at?: string
        }
        Update: {
          bkk_upc?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          district?: string | null
          equipment_id?: string
          extra_1?: string | null
          extra_2?: string | null
          extra_3?: string | null
          id?: string
          location_name?: string | null
          media_class?: string | null
          media_segment?: string | null
          media_type?: string | null
          notes?: string | null
          old_code?: string | null
          region?: string | null
          route_install_demolish?: string | null
          route_monitoring?: string | null
          route_pm?: string | null
          route_report_photo?: string | null
          status?: string
          target_monitoring?: string | null
          territory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          min_stock_level: number | null
          name: string
          notes: string | null
          quantity_in_stock: number
          serial_number: string | null
          subcategory_id: string | null
          unit: string
          unit_price: number
          updated_at: string
          warehouse_entry_date: string
          warranty_expiry_date: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          min_stock_level?: number | null
          name: string
          notes?: string | null
          quantity_in_stock?: number
          serial_number?: string | null
          subcategory_id?: string | null
          unit: string
          unit_price?: number
          updated_at?: string
          warehouse_entry_date?: string
          warranty_expiry_date?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          min_stock_level?: number | null
          name?: string
          notes?: string | null
          quantity_in_stock?: number
          serial_number?: string | null
          subcategory_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
          warehouse_entry_date?: string
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_transfers: {
        Row: {
          created_at: string
          created_by: string
          equipment_id: string
          from_location_id: string | null
          id: string
          notes: string | null
          quantity: number
          to_location_id: string
          transfer_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          equipment_id: string
          from_location_id?: string | null
          id?: string
          notes?: string | null
          quantity: number
          to_location_id: string
          transfer_date?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          equipment_id?: string
          from_location_id?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          to_location_id?: string
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_transfers_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_issue: {
        Row: {
          created_at: string
          created_by: string
          document_no: string
          equipment_id: string
          id: string
          issue_date: string
          location_id: string
          notes: string | null
          purpose: string | null
          quantity: number
          requester: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_no: string
          equipment_id: string
          id?: string
          issue_date: string
          location_id: string
          notes?: string | null
          purpose?: string | null
          quantity: number
          requester: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_no?: string
          equipment_id?: string
          id?: string
          issue_date?: string
          location_id?: string
          notes?: string | null
          purpose?: string | null
          quantity?: number
          requester?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_issue_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_issue_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_issue_pending: {
        Row: {
          created_at: string
          destination: string | null
          document_no: string
          equipment_code: string | null
          equipment_id: string | null
          equipment_name: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          issued_location_id: string | null
          issued_quantity: number | null
          notes: string | null
          purpose: string | null
          quantity: number
          reject_reason: string | null
          requester_department: string | null
          requester_name: string
          requester_phone: string | null
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination?: string | null
          document_no?: string
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          issued_location_id?: string | null
          issued_quantity?: number | null
          notes?: string | null
          purpose?: string | null
          quantity: number
          reject_reason?: string | null
          requester_department?: string | null
          requester_name: string
          requester_phone?: string | null
          status?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination?: string | null
          document_no?: string
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          issued_location_id?: string | null
          issued_quantity?: number | null
          notes?: string | null
          purpose?: string | null
          quantity?: number
          reject_reason?: string | null
          requester_department?: string | null
          requester_name?: string
          requester_phone?: string | null
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_issue_pending_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_issue_pending_issued_location_id_fkey"
            columns: ["issued_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt: {
        Row: {
          created_at: string
          created_by: string
          document_no: string
          equipment_id: string
          id: string
          location_id: string
          notes: string | null
          quantity: number
          receipt_date: string
          status: string
          supplier: string
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          document_no: string
          equipment_id: string
          id?: string
          location_id: string
          notes?: string | null
          quantity: number
          receipt_date: string
          status?: string
          supplier: string
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          document_no?: string
          equipment_id?: string
          id?: string
          location_id?: string
          notes?: string | null
          quantity?: number
          receipt_date?: string
          status?: string
          supplier?: string
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_pending: {
        Row: {
          created_at: string
          delivery_person_name: string
          delivery_person_phone: string | null
          document_no: string
          equipment_code: string | null
          equipment_id: string | null
          equipment_name: string | null
          expiry_date: string | null
          id: string
          lot_number: string | null
          notes: string | null
          quantity: number
          received_at: string | null
          received_by: string | null
          received_location_id: string | null
          received_storage_slot_id: string | null
          received_sub_storage_slot_id: string | null
          serial_number: string | null
          status: string
          supplier_id: string | null
          supplier_name: string | null
          unit: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_person_name: string
          delivery_person_phone?: string | null
          document_no: string
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          quantity: number
          received_at?: string | null
          received_by?: string | null
          received_location_id?: string | null
          received_storage_slot_id?: string | null
          received_sub_storage_slot_id?: string | null
          serial_number?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_person_name?: string
          delivery_person_phone?: string | null
          document_no?: string
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          quantity?: number
          received_at?: string | null
          received_by?: string | null
          received_location_id?: string | null
          received_storage_slot_id?: string | null
          received_sub_storage_slot_id?: string | null
          serial_number?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_pending_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_pending_received_location_id_fkey"
            columns: ["received_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_pending_received_storage_slot_id_fkey"
            columns: ["received_storage_slot_id"]
            isOneToOne: false
            referencedRelation: "storage_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_pending_received_sub_storage_slot_id_fkey"
            columns: ["received_sub_storage_slot_id"]
            isOneToOne: false
            referencedRelation: "sub_storage_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_pending_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          storage_area: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          storage_area?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          storage_area?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      low_stock_alerts: {
        Row: {
          alert_date: string
          created_at: string
          current_stock: number
          department: string
          equipment_code: string
          equipment_id: string
          equipment_name: string
          id: string
          is_resolved: boolean
          min_stock_level: number
          resolved_at: string | null
        }
        Insert: {
          alert_date?: string
          created_at?: string
          current_stock: number
          department: string
          equipment_code: string
          equipment_id: string
          equipment_name: string
          id?: string
          is_resolved?: boolean
          min_stock_level: number
          resolved_at?: string | null
        }
        Update: {
          alert_date?: string
          created_at?: string
          current_stock?: number
          department?: string
          equipment_code?: string
          equipment_id?: string
          equipment_name?: string
          id?: string
          is_resolved?: boolean
          min_stock_level?: number
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_alerts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          advance_days: number
          created_at: string
          email_addresses: string[] | null
          id: string
          notify_equipment_expiry: boolean
          notify_low_stock: boolean
          notify_pm_schedule: boolean
          notify_warranty_expiry: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          advance_days?: number
          created_at?: string
          email_addresses?: string[] | null
          id?: string
          notify_equipment_expiry?: boolean
          notify_low_stock?: boolean
          notify_pm_schedule?: boolean
          notify_warranty_expiry?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          advance_days?: number
          created_at?: string
          email_addresses?: string[] | null
          id?: string
          notify_equipment_expiry?: boolean
          notify_low_stock?: boolean
          notify_pm_schedule?: boolean
          notify_warranty_expiry?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pm_history: {
        Row: {
          completed_by: string | null
          completed_date: string
          created_at: string
          id: string
          notes: string | null
          pm_schedule_id: string
        }
        Insert: {
          completed_by?: string | null
          completed_date: string
          created_at?: string
          id?: string
          notes?: string | null
          pm_schedule_id: string
        }
        Update: {
          completed_by?: string | null
          completed_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          pm_schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_history_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "pm_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_schedules: {
        Row: {
          advance_notice_days: number
          billboard_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_completed_date: string | null
          next_due_date: string
          schedule_type: string
          title: string
          updated_at: string
        }
        Insert: {
          advance_notice_days?: number
          billboard_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_completed_date?: string | null
          next_due_date: string
          schedule_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          advance_notice_days?: number
          billboard_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_completed_date?: string | null
          next_due_date?: string
          schedule_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_schedules_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      storage_slots: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          location_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_slots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_storage_slots: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          storage_slot_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          storage_slot_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          storage_slot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_storage_slots_storage_slot_id_fkey"
            columns: ["storage_slot_id"]
            isOneToOne: false
            referencedRelation: "storage_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_departments: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          department: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          department: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          department?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_department_permission: {
        Args: { _department: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "warehouse_staff" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "warehouse_staff", "manager"],
    },
  },
} as const
