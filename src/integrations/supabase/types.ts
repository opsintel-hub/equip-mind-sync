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
      ad_issue_requests: {
        Row: {
          advertisement_id: string
          created_at: string
          created_by: string | null
          document_no: string
          id: string
          issue_purpose: string
          issued_at: string | null
          issued_by: string | null
          issued_quantity: number | null
          notes: string | null
          old_ad_action: string | null
          received_at: string | null
          status: string
          target_billboard_id: string | null
          updated_at: string
        }
        Insert: {
          advertisement_id: string
          created_at?: string
          created_by?: string | null
          document_no: string
          id?: string
          issue_purpose?: string
          issued_at?: string | null
          issued_by?: string | null
          issued_quantity?: number | null
          notes?: string | null
          old_ad_action?: string | null
          received_at?: string | null
          status?: string
          target_billboard_id?: string | null
          updated_at?: string
        }
        Update: {
          advertisement_id?: string
          created_at?: string
          created_by?: string | null
          document_no?: string
          id?: string
          issue_purpose?: string
          issued_at?: string | null
          issued_by?: string | null
          issued_quantity?: number | null
          notes?: string | null
          old_ad_action?: string | null
          received_at?: string | null
          status?: string
          target_billboard_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_issue_requests_advertisement_id_fkey"
            columns: ["advertisement_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_issue_requests_target_billboard_id_fkey"
            columns: ["target_billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_media_types: {
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
      ad_sizes: {
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
      ad_target_billboards: {
        Row: {
          advertisement_id: string
          billboard_id: string
          created_at: string
          id: string
        }
        Insert: {
          advertisement_id: string
          billboard_id: string
          created_at?: string
          id?: string
        }
        Update: {
          advertisement_id?: string
          billboard_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_target_billboards_advertisement_id_fkey"
            columns: ["advertisement_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_target_billboards_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_versions: {
        Row: {
          advertisement_id: string
          created_at: string
          id: string
          quantity: number
          version_name: string
        }
        Insert: {
          advertisement_id: string
          created_at?: string
          id?: string
          quantity?: number
          version_name: string
        }
        Update: {
          advertisement_id?: string
          created_at?: string
          id?: string
          quantity?: number
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_versions_advertisement_id_fkey"
            columns: ["advertisement_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisements: {
        Row: {
          ad_media_type_id: string | null
          ad_size_id: string | null
          code: string
          company_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          entry_type: string
          id: string
          installation_details: string | null
          installation_team_id: string | null
          is_active: boolean | null
          name: string
          notes: string | null
          photo_urls: string[] | null
          pickup_contractor_id: string | null
          retention_alert_sent: boolean | null
          retention_days: number | null
          retention_start_date: string | null
          status: string
          storage_in_datetime: string | null
          storage_location: string | null
          storage_out_datetime: string | null
          supporting_doc_url: string | null
          target_installation_date: string | null
          total_quantity: number | null
          updated_at: string
        }
        Insert: {
          ad_media_type_id?: string | null
          ad_size_id?: string | null
          code: string
          company_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          entry_type?: string
          id?: string
          installation_details?: string | null
          installation_team_id?: string | null
          is_active?: boolean | null
          name: string
          notes?: string | null
          photo_urls?: string[] | null
          pickup_contractor_id?: string | null
          retention_alert_sent?: boolean | null
          retention_days?: number | null
          retention_start_date?: string | null
          status?: string
          storage_in_datetime?: string | null
          storage_location?: string | null
          storage_out_datetime?: string | null
          supporting_doc_url?: string | null
          target_installation_date?: string | null
          total_quantity?: number | null
          updated_at?: string
        }
        Update: {
          ad_media_type_id?: string | null
          ad_size_id?: string | null
          code?: string
          company_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          entry_type?: string
          id?: string
          installation_details?: string | null
          installation_team_id?: string | null
          is_active?: boolean | null
          name?: string
          notes?: string | null
          photo_urls?: string[] | null
          pickup_contractor_id?: string | null
          retention_alert_sent?: boolean | null
          retention_days?: number | null
          retention_start_date?: string | null
          status?: string
          storage_in_datetime?: string | null
          storage_location?: string | null
          storage_out_datetime?: string | null
          supporting_doc_url?: string | null
          target_installation_date?: string | null
          total_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_ad_media_type_id_fkey"
            columns: ["ad_media_type_id"]
            isOneToOne: false
            referencedRelation: "ad_media_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_ad_size_id_fkey"
            columns: ["ad_size_id"]
            isOneToOne: false
            referencedRelation: "ad_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_installation_team_id_fkey"
            columns: ["installation_team_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_pickup_contractor_id_fkey"
            columns: ["pickup_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
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
      brands: {
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
      cms_types: {
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
      companies: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
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
          amp: number | null
          asset_code: string | null
          brand: string | null
          category: string
          code: string
          company_id: string | null
          created_at: string
          created_by: string | null
          department: string | null
          depreciation_months: number | null
          depth_cm: number | null
          description: string | null
          equipment_id_code: string | null
          expiry_date: string | null
          height_cm: number | null
          id: string
          is_active: boolean | null
          is_asset: boolean | null
          location_id: string | null
          lumen: number | null
          lux: number | null
          min_stock_level: number | null
          name: string
          notes: string | null
          quantity_in_stock: number
          serial_number: string | null
          subcategory_id: string | null
          unit: string
          unit_price: number
          updated_at: string
          volt: number | null
          volume_cm3: number | null
          warehouse_entry_date: string
          warranty_expiry_date: string | null
          watt: number | null
          width_cm: number | null
        }
        Insert: {
          amp?: number | null
          asset_code?: string | null
          brand?: string | null
          category: string
          code: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          depreciation_months?: number | null
          depth_cm?: number | null
          description?: string | null
          equipment_id_code?: string | null
          expiry_date?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          is_asset?: boolean | null
          location_id?: string | null
          lumen?: number | null
          lux?: number | null
          min_stock_level?: number | null
          name: string
          notes?: string | null
          quantity_in_stock?: number
          serial_number?: string | null
          subcategory_id?: string | null
          unit: string
          unit_price?: number
          updated_at?: string
          volt?: number | null
          volume_cm3?: number | null
          warehouse_entry_date?: string
          warranty_expiry_date?: string | null
          watt?: number | null
          width_cm?: number | null
        }
        Update: {
          amp?: number | null
          asset_code?: string | null
          brand?: string | null
          category?: string
          code?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          depreciation_months?: number | null
          depth_cm?: number | null
          description?: string | null
          equipment_id_code?: string | null
          expiry_date?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          is_asset?: boolean | null
          location_id?: string | null
          lumen?: number | null
          lux?: number | null
          min_stock_level?: number | null
          name?: string
          notes?: string | null
          quantity_in_stock?: number
          serial_number?: string | null
          subcategory_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
          volt?: number | null
          volume_cm3?: number | null
          warehouse_entry_date?: string
          warranty_expiry_date?: string | null
          watt?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      equipment_code_prefixes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          next_number: number
          prefix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          next_number?: number
          prefix: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          next_number?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment_images: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number | null
          equipment_id: string
          id: string
          image_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          equipment_id: string
          id?: string
          image_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          equipment_id?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_images_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_loans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          due_date: string
          equipment_id: string | null
          from_company_id: string
          id: string
          loan_date: string
          notes: string | null
          quantity: number
          requester_name: string
          requester_phone: string | null
          return_date: string | null
          return_notes: string | null
          returned_by: string | null
          returned_quantity: number | null
          status: string
          to_company_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          equipment_id?: string | null
          from_company_id: string
          id?: string
          loan_date?: string
          notes?: string | null
          quantity: number
          requester_name: string
          requester_phone?: string | null
          return_date?: string | null
          return_notes?: string | null
          returned_by?: string | null
          returned_quantity?: number | null
          status?: string
          to_company_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          equipment_id?: string | null
          from_company_id?: string
          id?: string
          loan_date?: string
          notes?: string | null
          quantity?: number
          requester_name?: string
          requester_phone?: string | null
          return_date?: string | null
          return_notes?: string | null
          returned_by?: string | null
          returned_quantity?: number | null
          status?: string
          to_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_loans_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_loans_from_company_id_fkey"
            columns: ["from_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_loans_to_company_id_fkey"
            columns: ["to_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_pm_history: {
        Row: {
          completed_by: string | null
          completed_date: string
          created_at: string
          equipment_pm_schedule_id: string
          id: string
          notes: string | null
        }
        Insert: {
          completed_by?: string | null
          completed_date: string
          created_at?: string
          equipment_pm_schedule_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          completed_by?: string | null
          completed_date?: string
          created_at?: string
          equipment_pm_schedule_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_pm_history_equipment_pm_schedule_id_fkey"
            columns: ["equipment_pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "equipment_pm_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_pm_schedules: {
        Row: {
          advance_notice_days: number
          created_at: string
          created_by: string | null
          department: string
          description: string | null
          equipment_id: string
          equipment_type: string
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
          created_at?: string
          created_by?: string | null
          department: string
          description?: string | null
          equipment_id: string
          equipment_type: string
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
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          equipment_id?: string
          equipment_type?: string
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
            foreignKeyName: "equipment_pm_schedules_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_pm_task_images: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          equipment_pm_task_id: string
          id: string
          image_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment_pm_task_id: string
          id?: string
          image_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment_pm_task_id?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_pm_task_images_equipment_pm_task_id_fkey"
            columns: ["equipment_pm_task_id"]
            isOneToOne: false
            referencedRelation: "equipment_pm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_pm_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          due_date: string
          equipment_pm_schedule_id: string
          id: string
          inspected_by: string | null
          inspection_date: string | null
          inspection_notes: string | null
          inspection_result: string | null
          observation_details: string | null
          parent_task_id: string | null
          quantity_checked: number | null
          status: string
          task_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          due_date: string
          equipment_pm_schedule_id: string
          id?: string
          inspected_by?: string | null
          inspection_date?: string | null
          inspection_notes?: string | null
          inspection_result?: string | null
          observation_details?: string | null
          parent_task_id?: string | null
          quantity_checked?: number | null
          status?: string
          task_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          due_date?: string
          equipment_pm_schedule_id?: string
          id?: string
          inspected_by?: string | null
          inspection_date?: string | null
          inspection_notes?: string | null
          inspection_result?: string | null
          observation_details?: string | null
          parent_task_id?: string | null
          quantity_checked?: number | null
          status?: string
          task_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_pm_tasks_equipment_pm_schedule_id_fkey"
            columns: ["equipment_pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "equipment_pm_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_pm_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "equipment_pm_tasks"
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            foreignKeyName: "goods_issue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          billboard_id: string | null
          company_id: string | null
          created_at: string
          destination: string | null
          document_no: string
          equipment_code: string | null
          equipment_id: string | null
          equipment_name: string | null
          id: string
          is_complete: boolean | null
          is_media_player: boolean | null
          issued_at: string | null
          issued_by: string | null
          issued_location_id: string | null
          issued_quantity: number | null
          last_partial_issue_at: string | null
          media_player_id: string | null
          notes: string | null
          partial_issue_count: number | null
          purpose: string | null
          purpose_id: string | null
          quantity: number
          reject_reason: string | null
          remaining_quantity: number | null
          requester_department: string | null
          requester_name: string
          requester_phone: string | null
          return_quantity: number | null
          returned_at: string | null
          returned_by: string | null
          status: string
          total_items: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          billboard_id?: string | null
          company_id?: string | null
          created_at?: string
          destination?: string | null
          document_no?: string
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          is_complete?: boolean | null
          is_media_player?: boolean | null
          issued_at?: string | null
          issued_by?: string | null
          issued_location_id?: string | null
          issued_quantity?: number | null
          last_partial_issue_at?: string | null
          media_player_id?: string | null
          notes?: string | null
          partial_issue_count?: number | null
          purpose?: string | null
          purpose_id?: string | null
          quantity: number
          reject_reason?: string | null
          remaining_quantity?: number | null
          requester_department?: string | null
          requester_name: string
          requester_phone?: string | null
          return_quantity?: number | null
          returned_at?: string | null
          returned_by?: string | null
          status?: string
          total_items?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          billboard_id?: string | null
          company_id?: string | null
          created_at?: string
          destination?: string | null
          document_no?: string
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          is_complete?: boolean | null
          is_media_player?: boolean | null
          issued_at?: string | null
          issued_by?: string | null
          issued_location_id?: string | null
          issued_quantity?: number | null
          last_partial_issue_at?: string | null
          media_player_id?: string | null
          notes?: string | null
          partial_issue_count?: number | null
          purpose?: string | null
          purpose_id?: string | null
          quantity?: number
          reject_reason?: string | null
          remaining_quantity?: number | null
          requester_department?: string | null
          requester_name?: string
          requester_phone?: string | null
          return_quantity?: number | null
          returned_at?: string | null
          returned_by?: string | null
          status?: string
          total_items?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_issue_pending_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "goods_issue_pending_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_issue_pending_purpose_id_fkey"
            columns: ["purpose_id"]
            isOneToOne: false
            referencedRelation: "issue_purposes"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_issue_pending_items: {
        Row: {
          billboard_id: string | null
          created_at: string | null
          equipment_code: string | null
          equipment_id: string | null
          equipment_name: string | null
          id: string
          is_media_player: boolean | null
          issued_quantity: number | null
          media_player_id: string | null
          notes: string | null
          pending_id: string
          quantity: number
          remaining_quantity: number | null
          serial_number: string | null
          status: string | null
          unit: string
        }
        Insert: {
          billboard_id?: string | null
          created_at?: string | null
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          is_media_player?: boolean | null
          issued_quantity?: number | null
          media_player_id?: string | null
          notes?: string | null
          pending_id: string
          quantity?: number
          remaining_quantity?: number | null
          serial_number?: string | null
          status?: string | null
          unit?: string
        }
        Update: {
          billboard_id?: string | null
          created_at?: string | null
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          is_media_player?: boolean | null
          issued_quantity?: number | null
          media_player_id?: string | null
          notes?: string | null
          pending_id?: string
          quantity?: number
          remaining_quantity?: number | null
          serial_number?: string | null
          status?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pending_id"
            columns: ["pending_id"]
            isOneToOne: false
            referencedRelation: "goods_issue_pending"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_issue_pending_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_issue_pending_items_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          document_no: string
          document_url: string | null
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
          company_id?: string | null
          created_at?: string
          created_by: string
          document_no: string
          document_url?: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string
          document_no?: string
          document_url?: string | null
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
            foreignKeyName: "goods_receipt_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          asset_code: string | null
          company_id: string | null
          created_at: string
          delivery_person_name: string
          delivery_person_phone: string | null
          department_id: string | null
          depreciation_months: number | null
          document_file_name: string | null
          document_no: string
          document_url: string | null
          equipment_code: string | null
          equipment_id: string | null
          equipment_id_code: string | null
          equipment_name: string | null
          expiry_date: string | null
          id: string
          is_asset: boolean | null
          is_media_player: boolean | null
          lot_number: string | null
          lot_number_2: string | null
          media_player_id: string | null
          notes: string | null
          po_number: string | null
          pr_number: string | null
          purchase_document_url: string | null
          quantity: number
          receipt_purpose_id: string | null
          received_at: string | null
          received_by: string | null
          received_location_id: string | null
          received_storage_slot_id: string | null
          received_sub_storage_slot_id: string | null
          serial_number: string | null
          status: string
          storage_depth_cm: number | null
          storage_height_cm: number | null
          storage_volume_cm3: number | null
          storage_width_cm: number | null
          supplier_id: string | null
          supplier_name: string | null
          temp_category_id: string | null
          temp_min_stock_level: number | null
          temp_product_images: string[] | null
          temp_subcategory_id: string | null
          unit: string
          unit_price: number | null
          updated_at: string
          waiting_asset_code: boolean | null
          waiting_equipment_id: boolean | null
          warehouse_id: string | null
          warranty_expiry_date: string | null
        }
        Insert: {
          asset_code?: string | null
          company_id?: string | null
          created_at?: string
          delivery_person_name: string
          delivery_person_phone?: string | null
          department_id?: string | null
          depreciation_months?: number | null
          document_file_name?: string | null
          document_no: string
          document_url?: string | null
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_id_code?: string | null
          equipment_name?: string | null
          expiry_date?: string | null
          id?: string
          is_asset?: boolean | null
          is_media_player?: boolean | null
          lot_number?: string | null
          lot_number_2?: string | null
          media_player_id?: string | null
          notes?: string | null
          po_number?: string | null
          pr_number?: string | null
          purchase_document_url?: string | null
          quantity: number
          receipt_purpose_id?: string | null
          received_at?: string | null
          received_by?: string | null
          received_location_id?: string | null
          received_storage_slot_id?: string | null
          received_sub_storage_slot_id?: string | null
          serial_number?: string | null
          status?: string
          storage_depth_cm?: number | null
          storage_height_cm?: number | null
          storage_volume_cm3?: number | null
          storage_width_cm?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          temp_category_id?: string | null
          temp_min_stock_level?: number | null
          temp_product_images?: string[] | null
          temp_subcategory_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          waiting_asset_code?: boolean | null
          waiting_equipment_id?: boolean | null
          warehouse_id?: string | null
          warranty_expiry_date?: string | null
        }
        Update: {
          asset_code?: string | null
          company_id?: string | null
          created_at?: string
          delivery_person_name?: string
          delivery_person_phone?: string | null
          department_id?: string | null
          depreciation_months?: number | null
          document_file_name?: string | null
          document_no?: string
          document_url?: string | null
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_id_code?: string | null
          equipment_name?: string | null
          expiry_date?: string | null
          id?: string
          is_asset?: boolean | null
          is_media_player?: boolean | null
          lot_number?: string | null
          lot_number_2?: string | null
          media_player_id?: string | null
          notes?: string | null
          po_number?: string | null
          pr_number?: string | null
          purchase_document_url?: string | null
          quantity?: number
          receipt_purpose_id?: string | null
          received_at?: string | null
          received_by?: string | null
          received_location_id?: string | null
          received_storage_slot_id?: string | null
          received_sub_storage_slot_id?: string | null
          serial_number?: string | null
          status?: string
          storage_depth_cm?: number | null
          storage_height_cm?: number | null
          storage_volume_cm3?: number | null
          storage_width_cm?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          temp_category_id?: string | null
          temp_min_stock_level?: number | null
          temp_product_images?: string[] | null
          temp_subcategory_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          waiting_asset_code?: boolean | null
          waiting_equipment_id?: boolean | null
          warehouse_id?: string | null
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_pending_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_pending_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_pending_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_pending_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_pending_receipt_purpose_id_fkey"
            columns: ["receipt_purpose_id"]
            isOneToOne: false
            referencedRelation: "receipt_purposes"
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
          {
            foreignKeyName: "goods_receipt_pending_temp_category_id_fkey"
            columns: ["temp_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_pending_temp_subcategory_id_fkey"
            columns: ["temp_subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_pending_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_purpose_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          issue_purpose_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          issue_purpose_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          issue_purpose_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_purpose_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_purpose_categories_issue_purpose_id_fkey"
            columns: ["issue_purpose_id"]
            isOneToOne: false
            referencedRelation: "issue_purposes"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_purposes: {
        Row: {
          allow_all_categories: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_billboard: boolean
          requires_return: boolean
          updated_at: string
        }
        Insert: {
          allow_all_categories?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_billboard?: boolean
          requires_return?: boolean
          updated_at?: string
        }
        Update: {
          allow_all_categories?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_billboard?: boolean
          requires_return?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          department: string | null
          depth_cm: number | null
          description: string | null
          height_cm: number | null
          id: string
          is_active: boolean | null
          name: string
          storage_area: string | null
          storage_area_size: string | null
          updated_at: string
          used_volume_cm3: number | null
          volume_cm3: number | null
          warehouse_id: string | null
          width_cm: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          depth_cm?: number | null
          description?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          storage_area?: string | null
          storage_area_size?: string | null
          updated_at?: string
          used_volume_cm3?: number | null
          volume_cm3?: number | null
          warehouse_id?: string | null
          width_cm?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          depth_cm?: number | null
          description?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          storage_area?: string | null
          storage_area_size?: string | null
          updated_at?: string
          used_volume_cm3?: number | null
          volume_cm3?: number | null
          warehouse_id?: string | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
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
      media_players: {
        Row: {
          asset_code: string | null
          billboard_id: string | null
          brand: string | null
          cms_type_id: string | null
          code: string
          company_id: string | null
          created_at: string
          created_by: string | null
          department: string | null
          depreciation_months: number | null
          description: string | null
          equipment_id_code: string | null
          group_led: string | null
          id: string
          id_display: string | null
          install_date: string | null
          is_active: boolean | null
          is_asset: boolean | null
          led_control: string | null
          location_id: string | null
          name: string
          notes: string | null
          quantity: number
          serial_number_1: string | null
          serial_number_2: string | null
          specification: string | null
          unit: string
          unit_price: number | null
          updated_at: string
          waiting_asset_code: boolean | null
          waiting_equipment_id: boolean | null
          warranty_expiry_date: string | null
        }
        Insert: {
          asset_code?: string | null
          billboard_id?: string | null
          brand?: string | null
          cms_type_id?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          depreciation_months?: number | null
          description?: string | null
          equipment_id_code?: string | null
          group_led?: string | null
          id?: string
          id_display?: string | null
          install_date?: string | null
          is_active?: boolean | null
          is_asset?: boolean | null
          led_control?: string | null
          location_id?: string | null
          name: string
          notes?: string | null
          quantity?: number
          serial_number_1?: string | null
          serial_number_2?: string | null
          specification?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          waiting_asset_code?: boolean | null
          waiting_equipment_id?: boolean | null
          warranty_expiry_date?: string | null
        }
        Update: {
          asset_code?: string | null
          billboard_id?: string | null
          brand?: string | null
          cms_type_id?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          depreciation_months?: number | null
          description?: string | null
          equipment_id_code?: string | null
          group_led?: string | null
          id?: string
          id_display?: string | null
          install_date?: string | null
          is_active?: boolean | null
          is_asset?: boolean | null
          led_control?: string | null
          location_id?: string | null
          name?: string
          notes?: string | null
          quantity?: number
          serial_number_1?: string | null
          serial_number_2?: string | null
          specification?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          waiting_asset_code?: boolean | null
          waiting_equipment_id?: boolean | null
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_players_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_players_cms_type_id_fkey"
            columns: ["cms_type_id"]
            isOneToOne: false
            referencedRelation: "cms_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_players_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_players_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      pm_results: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
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
      pm_types: {
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
      purchase_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          current_stock: number
          equipment_code: string
          equipment_id: string | null
          equipment_name: string
          id: string
          min_stock_level: number
          notes: string | null
          pr_number: string
          reason: string | null
          reject_reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          status: string
          suggested_quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_stock: number
          equipment_code: string
          equipment_id?: string | null
          equipment_name: string
          id?: string
          min_stock_level: number
          notes?: string | null
          pr_number: string
          reason?: string | null
          reject_reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string
          suggested_quantity: number
          unit?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_stock?: number
          equipment_code?: string
          equipment_id?: string | null
          equipment_name?: string
          id?: string
          min_stock_level?: number
          notes?: string | null
          pr_number?: string
          reason?: string | null
          reject_reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string
          suggested_quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_purposes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_storage_days: number | null
          name: string
          purpose_type: string
          requires_location: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_storage_days?: number | null
          name: string
          purpose_type?: string
          requires_location?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_storage_days?: number | null
          name?: string
          purpose_type?: string
          requires_location?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          equipment_code: string
          equipment_id: string
          equipment_name: string
          id: string
          location_id: string | null
          movement_type: string
          notes: string | null
          quantity: number
          reference_document: string | null
          reference_id: string | null
          reference_type: string | null
          stock_after: number
          stock_before: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          equipment_code: string
          equipment_id: string
          equipment_name: string
          id?: string
          location_id?: string | null
          movement_type: string
          notes?: string | null
          quantity: number
          reference_document?: string | null
          reference_id?: string | null
          reference_type?: string | null
          stock_after: number
          stock_before: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          equipment_code?: string
          equipment_id?: string
          equipment_name?: string
          id?: string
          location_id?: string | null
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference_document?: string | null
          reference_id?: string | null
          reference_type?: string | null
          stock_after?: number
          stock_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
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
          vendor_code: string | null
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
          vendor_code?: string | null
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
          vendor_code?: string | null
        }
        Relationships: []
      }
      tool_categories: {
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
      tool_pm_history: {
        Row: {
          completed_by: string | null
          completed_date: string
          created_at: string
          id: string
          inspector_name: string | null
          notes: string | null
          pm_result_id: string | null
          tool_id: string
          tool_pm_task_id: string
        }
        Insert: {
          completed_by?: string | null
          completed_date?: string
          created_at?: string
          id?: string
          inspector_name?: string | null
          notes?: string | null
          pm_result_id?: string | null
          tool_id: string
          tool_pm_task_id: string
        }
        Update: {
          completed_by?: string | null
          completed_date?: string
          created_at?: string
          id?: string
          inspector_name?: string | null
          notes?: string | null
          pm_result_id?: string | null
          tool_id?: string
          tool_pm_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_pm_history_pm_result_id_fkey"
            columns: ["pm_result_id"]
            isOneToOne: false
            referencedRelation: "pm_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_pm_history_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_pm_history_tool_pm_task_id_fkey"
            columns: ["tool_pm_task_id"]
            isOneToOne: false
            referencedRelation: "tool_pm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_pm_task_images: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string
          tool_pm_task_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url: string
          tool_pm_task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string
          tool_pm_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_pm_task_images_tool_pm_task_id_fkey"
            columns: ["tool_pm_task_id"]
            isOneToOne: false
            referencedRelation: "tool_pm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_pm_tasks: {
        Row: {
          created_at: string
          due_date: string
          id: string
          inspected_by: string | null
          inspection_date: string | null
          inspection_notes: string | null
          inspector_name: string | null
          observation_details: string | null
          pm_result_id: string | null
          quantity_checked: number | null
          status: string
          task_number: string
          tool_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          inspected_by?: string | null
          inspection_date?: string | null
          inspection_notes?: string | null
          inspector_name?: string | null
          observation_details?: string | null
          pm_result_id?: string | null
          quantity_checked?: number | null
          status?: string
          task_number?: string
          tool_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          inspected_by?: string | null
          inspection_date?: string | null
          inspection_notes?: string | null
          inspector_name?: string | null
          observation_details?: string | null
          pm_result_id?: string | null
          quantity_checked?: number | null
          status?: string
          task_number?: string
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_pm_tasks_pm_result_id_fkey"
            columns: ["pm_result_id"]
            isOneToOne: false
            referencedRelation: "pm_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_pm_tasks_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_pm_types: {
        Row: {
          created_at: string
          id: string
          pm_type_id: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pm_type_id: string
          tool_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pm_type_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_pm_types_pm_type_id_fkey"
            columns: ["pm_type_id"]
            isOneToOne: false
            referencedRelation: "pm_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_pm_types_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          brand: string | null
          code: string
          company_id: string | null
          created_at: string
          created_by: string | null
          current_quantity: number
          department: string | null
          description: string | null
          expiry_date: string | null
          has_warranty: boolean | null
          id: string
          initial_quantity: number
          is_active: boolean | null
          location_id: string | null
          name: string
          notes: string | null
          pm_interval_days: number | null
          serial_number: string | null
          tool_category_id: string | null
          unit: string
          unit_price: number | null
          updated_at: string
          warehouse_entry_date: string
          warranty_expiry_date: string | null
        }
        Insert: {
          brand?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          department?: string | null
          description?: string | null
          expiry_date?: string | null
          has_warranty?: boolean | null
          id?: string
          initial_quantity?: number
          is_active?: boolean | null
          location_id?: string | null
          name: string
          notes?: string | null
          pm_interval_days?: number | null
          serial_number?: string | null
          tool_category_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          warehouse_entry_date?: string
          warranty_expiry_date?: string | null
        }
        Update: {
          brand?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          department?: string | null
          description?: string | null
          expiry_date?: string | null
          has_warranty?: boolean | null
          id?: string
          initial_quantity?: number
          is_active?: boolean | null
          location_id?: string | null
          name?: string
          notes?: string | null
          pm_interval_days?: number | null
          serial_number?: string | null
          tool_category_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          warehouse_entry_date?: string
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_tool_category_id_fkey"
            columns: ["tool_category_id"]
            isOneToOne: false
            referencedRelation: "tool_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
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
      user_function_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          function_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          function_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          function_name?: string
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
      warehouses: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          department: string | null
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
          department?: string | null
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
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          storage_area?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_equipment_pm_task_number: { Args: never; Returns: string }
      generate_pr_number: { Args: never; Returns: string }
      generate_tool_pm_task_number: { Args: never; Returns: string }
      get_next_equipment_code: { Args: { p_prefix: string }; Returns: string }
      get_users_emails: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
      has_department_permission: {
        Args: { _department: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      has_function_permission: {
        Args: { _function_name: string; _user_id: string }
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
      app_role:
        | "admin"
        | "warehouse_staff"
        | "manager"
        | "receiver"
        | "requester"
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
      app_role: [
        "admin",
        "warehouse_staff",
        "manager",
        "receiver",
        "requester",
      ],
    },
  },
} as const
