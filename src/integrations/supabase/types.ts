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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ad_issue_requests: {
        Row: {
          advertisement_id: string
          confirmation_token: string | null
          confirmed_at: string | null
          confirmed_by_name: string | null
          created_at: string
          created_by: string | null
          document_no: string
          id: string
          issue_purpose: string
          issue_report_description: string | null
          issue_report_type: string | null
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
          confirmation_token?: string | null
          confirmed_at?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          created_by?: string | null
          document_no: string
          id?: string
          issue_purpose?: string
          issue_report_description?: string | null
          issue_report_type?: string | null
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
          confirmation_token?: string | null
          confirmed_at?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          created_by?: string | null
          document_no?: string
          id?: string
          issue_purpose?: string
          issue_report_description?: string | null
          issue_report_type?: string | null
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
      admin_guide_entries: {
        Row: {
          bullets: string[]
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          entry_key: string
          icon: string | null
          id: string
          kind: string
          label: string
          related: string[]
          updated_at: string
        }
        Insert: {
          bullets?: string[]
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          entry_key: string
          icon?: string | null
          id?: string
          kind: string
          label: string
          related?: string[]
          updated_at?: string
        }
        Update: {
          bullets?: string[]
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          entry_key?: string
          icon?: string | null
          id?: string
          kind?: string
          label?: string
          related?: string[]
          updated_at?: string
        }
        Relationships: []
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
          contractor_access_pin: string | null
          contractor_access_token: string | null
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
          contractor_access_pin?: string | null
          contractor_access_token?: string | null
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
          contractor_access_pin?: string | null
          contractor_access_token?: string | null
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
      assessment_logs: {
        Row: {
          assessed_at: string
          assessed_by: string | null
          assessment_result_id: string | null
          assessor_name: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          diagnosis_notes: string | null
          document_no: string
          document_urls: string[] | null
          equipment_id: string | null
          external_repair_contact: string | null
          external_repair_phone: string | null
          external_repair_vendor: string | null
          id: string
          media_player_id: string | null
          notes: string | null
          outcome: string | null
          photo_urls: string[] | null
          recommended_action: string | null
          repair_action_ids: string[] | null
          repair_actions_snapshot: Json | null
          repair_completed_at: string | null
          repair_completed_by: string | null
          repair_cost: number | null
          repair_description: string | null
          repair_result: string | null
          repair_scope: string[] | null
          repair_status: string | null
          return_location_id: string | null
          serial_number: string | null
          source_reference_id: string | null
          source_type: string
          status: string
          symptom_description: string | null
          symptom_id: string | null
          updated_at: string
        }
        Insert: {
          assessed_at?: string
          assessed_by?: string | null
          assessment_result_id?: string | null
          assessor_name?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis_notes?: string | null
          document_no: string
          document_urls?: string[] | null
          equipment_id?: string | null
          external_repair_contact?: string | null
          external_repair_phone?: string | null
          external_repair_vendor?: string | null
          id?: string
          media_player_id?: string | null
          notes?: string | null
          outcome?: string | null
          photo_urls?: string[] | null
          recommended_action?: string | null
          repair_action_ids?: string[] | null
          repair_actions_snapshot?: Json | null
          repair_completed_at?: string | null
          repair_completed_by?: string | null
          repair_cost?: number | null
          repair_description?: string | null
          repair_result?: string | null
          repair_scope?: string[] | null
          repair_status?: string | null
          return_location_id?: string | null
          serial_number?: string | null
          source_reference_id?: string | null
          source_type?: string
          status?: string
          symptom_description?: string | null
          symptom_id?: string | null
          updated_at?: string
        }
        Update: {
          assessed_at?: string
          assessed_by?: string | null
          assessment_result_id?: string | null
          assessor_name?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis_notes?: string | null
          document_no?: string
          document_urls?: string[] | null
          equipment_id?: string | null
          external_repair_contact?: string | null
          external_repair_phone?: string | null
          external_repair_vendor?: string | null
          id?: string
          media_player_id?: string | null
          notes?: string | null
          outcome?: string | null
          photo_urls?: string[] | null
          recommended_action?: string | null
          repair_action_ids?: string[] | null
          repair_actions_snapshot?: Json | null
          repair_completed_at?: string | null
          repair_completed_by?: string | null
          repair_cost?: number | null
          repair_description?: string | null
          repair_result?: string | null
          repair_scope?: string[] | null
          repair_status?: string | null
          return_location_id?: string | null
          serial_number?: string | null
          source_reference_id?: string | null
          source_type?: string
          status?: string
          symptom_description?: string | null
          symptom_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_logs_assessment_result_id_fkey"
            columns: ["assessment_result_id"]
            isOneToOne: false
            referencedRelation: "mp_assessment_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_logs_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_logs_return_location_id_fkey"
            columns: ["return_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_logs_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "mp_symptoms"
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
          item_condition: string
          notes: string | null
          quantity: number
          serial_number: string | null
        }
        Insert: {
          billboard_id: string
          created_at?: string
          created_by?: string | null
          equipment_id: string
          id?: string
          installation_date?: string | null
          item_condition?: string
          notes?: string | null
          quantity: number
          serial_number?: string | null
        }
        Update: {
          billboard_id?: string
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          id?: string
          installation_date?: string | null
          item_condition?: string
          notes?: string | null
          quantity?: number
          serial_number?: string | null
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
      billboard_package_items: {
        Row: {
          billboard_id: string
          created_at: string
          id: string
          package_id: string
        }
        Insert: {
          billboard_id: string
          created_at?: string
          id?: string
          package_id: string
        }
        Update: {
          billboard_id?: string
          created_at?: string
          id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billboard_package_items_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billboard_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "billboard_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      billboard_packages: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          media_type: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      billboard_pm_actions: {
        Row: {
          action_type: string
          action_type_id: string | null
          billboard_id: string
          created_at: string
          created_by: string | null
          equipment_snapshot: Json | null
          id: string
          notes: string | null
          pm_reason: string
          snooze_until: string | null
        }
        Insert: {
          action_type: string
          action_type_id?: string | null
          billboard_id: string
          created_at?: string
          created_by?: string | null
          equipment_snapshot?: Json | null
          id?: string
          notes?: string | null
          pm_reason: string
          snooze_until?: string | null
        }
        Update: {
          action_type?: string
          action_type_id?: string | null
          billboard_id?: string
          created_at?: string
          created_by?: string | null
          equipment_snapshot?: Json | null
          id?: string
          notes?: string | null
          pm_reason?: string
          snooze_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billboard_pm_actions_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "pm_action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billboard_pm_actions_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
        ]
      }
      billboard_pm_history: {
        Row: {
          action_label: string
          action_type_id: string | null
          actioned_at: string
          actioned_by: string | null
          billboard_id: string
          billboard_snapshot: Json | null
          created_at: string
          equipment_snapshot: Json | null
          id: string
          notes: string | null
          pm_reason: string
        }
        Insert: {
          action_label: string
          action_type_id?: string | null
          actioned_at?: string
          actioned_by?: string | null
          billboard_id: string
          billboard_snapshot?: Json | null
          created_at?: string
          equipment_snapshot?: Json | null
          id?: string
          notes?: string | null
          pm_reason: string
        }
        Update: {
          action_label?: string
          action_type_id?: string | null
          actioned_at?: string
          actioned_by?: string | null
          billboard_id?: string
          billboard_snapshot?: Json | null
          created_at?: string
          equipment_snapshot?: Json | null
          id?: string
          notes?: string | null
          pm_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "billboard_pm_history_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "pm_action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billboard_pm_history_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
        ]
      }
      billboard_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string | null
          details: Json | null
          error_message: string | null
          id: string
          rows_failed: number
          rows_fetched: number
          rows_inserted: number
          rows_skipped: number
          rows_updated: number
          started_at: string
          status: string
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          connection_id?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          rows_failed?: number
          rows_fetched?: number
          rows_inserted?: number
          rows_skipped?: number
          rows_updated?: number
          started_at?: string
          status?: string
          trigger_type?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          connection_id?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          rows_failed?: number
          rows_fetched?: number
          rows_inserted?: number
          rows_skipped?: number
          rows_updated?: number
          started_at?: string
          status?: string
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billboard_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "external_db_connections"
            referencedColumns: ["id"]
          },
        ]
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
          last_synced_at: string | null
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
          size: string | null
          status: string
          sync_source: string
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
          last_synced_at?: string | null
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
          size?: string | null
          status?: string
          sync_source?: string
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
          last_synced_at?: string | null
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
          size?: string | null
          status?: string
          sync_source?: string
          target_monitoring?: string | null
          territory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          brand_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          brand_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          brand_type?: string | null
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
          examples: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          name: string
          updated_at: string
          usage_hint: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          examples?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          name: string
          updated_at?: string
          usage_hint?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          examples?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          name?: string
          updated_at?: string
          usage_hint?: string | null
        }
        Relationships: []
      }
      claim_progress_logs: {
        Row: {
          claim_record_id: string
          cost_amount: number | null
          created_at: string
          id: string
          logged_at: string
          logged_by: string | null
          logged_by_name: string | null
          note: string | null
        }
        Insert: {
          claim_record_id: string
          cost_amount?: number | null
          created_at?: string
          id?: string
          logged_at?: string
          logged_by?: string | null
          logged_by_name?: string | null
          note?: string | null
        }
        Update: {
          claim_record_id?: string
          cost_amount?: number | null
          created_at?: string
          id?: string
          logged_at?: string
          logged_by?: string | null
          logged_by_name?: string | null
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_progress_logs_claim_record_id_fkey"
            columns: ["claim_record_id"]
            isOneToOne: false
            referencedRelation: "claim_records"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_records: {
        Row: {
          claim_result_id: string | null
          claim_ticket_no: string | null
          closed_at: string | null
          closed_by: string | null
          cost_amount: number | null
          created_at: string
          created_by: string | null
          document_no: string
          document_urls: string[] | null
          equipment_id: string | null
          id: string
          is_under_warranty: boolean | null
          manufacturer: string | null
          media_player_id: string | null
          notes: string | null
          photo_urls: string[] | null
          receiver_name: string | null
          replacement_serial: string | null
          restock_decision: string | null
          result_notes: string | null
          return_location_id: string | null
          returned_at: string | null
          returned_by: string | null
          serial_number: string | null
          source_reference_id: string | null
          source_type: string | null
          status: string
          subject_type: string
          submitted_at: string | null
          submitted_by: string | null
          submitter_name: string | null
          supplier_id: string | null
          supplier_name: string | null
          symptom_description: string | null
          symptom_id: string | null
          updated_at: string
          warranty_expiry_date: string | null
          warranty_notes: string | null
        }
        Insert: {
          claim_result_id?: string | null
          claim_ticket_no?: string | null
          closed_at?: string | null
          closed_by?: string | null
          cost_amount?: number | null
          created_at?: string
          created_by?: string | null
          document_no: string
          document_urls?: string[] | null
          equipment_id?: string | null
          id?: string
          is_under_warranty?: boolean | null
          manufacturer?: string | null
          media_player_id?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          receiver_name?: string | null
          replacement_serial?: string | null
          restock_decision?: string | null
          result_notes?: string | null
          return_location_id?: string | null
          returned_at?: string | null
          returned_by?: string | null
          serial_number?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          status?: string
          subject_type?: string
          submitted_at?: string | null
          submitted_by?: string | null
          submitter_name?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          symptom_description?: string | null
          symptom_id?: string | null
          updated_at?: string
          warranty_expiry_date?: string | null
          warranty_notes?: string | null
        }
        Update: {
          claim_result_id?: string | null
          claim_ticket_no?: string | null
          closed_at?: string | null
          closed_by?: string | null
          cost_amount?: number | null
          created_at?: string
          created_by?: string | null
          document_no?: string
          document_urls?: string[] | null
          equipment_id?: string | null
          id?: string
          is_under_warranty?: boolean | null
          manufacturer?: string | null
          media_player_id?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          receiver_name?: string | null
          replacement_serial?: string | null
          restock_decision?: string | null
          result_notes?: string | null
          return_location_id?: string | null
          returned_at?: string | null
          returned_by?: string | null
          serial_number?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          status?: string
          subject_type?: string
          submitted_at?: string | null
          submitted_by?: string | null
          submitter_name?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          symptom_description?: string | null
          symptom_id?: string | null
          updated_at?: string
          warranty_expiry_date?: string | null
          warranty_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_records_claim_result_id_fkey"
            columns: ["claim_result_id"]
            isOneToOne: false
            referencedRelation: "mp_claim_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_records_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_records_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_records_return_location_id_fkey"
            columns: ["return_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_records_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "mp_symptoms"
            referencedColumns: ["id"]
          },
        ]
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
          aliases: string[]
          code: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_hidden: boolean
          name: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          code: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          code?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean
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
      defective_returns: {
        Row: {
          assessment_log_id: string | null
          billboard_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_by_name: string | null
          created_at: string
          created_by: string | null
          disposal_approved_at: string | null
          disposal_approved_by: string | null
          disposal_evidence_urls: string[] | null
          disposal_method: string | null
          disposal_notes: string | null
          dispose_status: string
          document_no: string
          equipment_id: string | null
          id: string
          is_media_player: boolean
          item_condition: string
          media_player_id: string | null
          notes: string | null
          quantity: number
          quarantine_location_id: string | null
          reason: string | null
          receive_location_id: string | null
          received_at: string | null
          received_by: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_by_name: string | null
          rejection_reason: string | null
          reporter_department: string | null
          reporter_name: string | null
          source_document: string | null
          source_issue_item_id: string | null
          source_type: string
          status: string
          stock_deducted_at: string | null
          stock_disposed_at: string | null
          swap_request_id: string | null
          symptom_id: string | null
          symptom_other: string | null
          updated_at: string
        }
        Insert: {
          assessment_log_id?: string | null
          billboard_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          created_by?: string | null
          disposal_approved_at?: string | null
          disposal_approved_by?: string | null
          disposal_evidence_urls?: string[] | null
          disposal_method?: string | null
          disposal_notes?: string | null
          dispose_status?: string
          document_no?: string
          equipment_id?: string | null
          id?: string
          is_media_player?: boolean
          item_condition?: string
          media_player_id?: string | null
          notes?: string | null
          quantity?: number
          quarantine_location_id?: string | null
          reason?: string | null
          receive_location_id?: string | null
          received_at?: string | null
          received_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_by_name?: string | null
          rejection_reason?: string | null
          reporter_department?: string | null
          reporter_name?: string | null
          source_document?: string | null
          source_issue_item_id?: string | null
          source_type?: string
          status?: string
          stock_deducted_at?: string | null
          stock_disposed_at?: string | null
          swap_request_id?: string | null
          symptom_id?: string | null
          symptom_other?: string | null
          updated_at?: string
        }
        Update: {
          assessment_log_id?: string | null
          billboard_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          created_by?: string | null
          disposal_approved_at?: string | null
          disposal_approved_by?: string | null
          disposal_evidence_urls?: string[] | null
          disposal_method?: string | null
          disposal_notes?: string | null
          dispose_status?: string
          document_no?: string
          equipment_id?: string | null
          id?: string
          is_media_player?: boolean
          item_condition?: string
          media_player_id?: string | null
          notes?: string | null
          quantity?: number
          quarantine_location_id?: string | null
          reason?: string | null
          receive_location_id?: string | null
          received_at?: string | null
          received_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_by_name?: string | null
          rejection_reason?: string | null
          reporter_department?: string | null
          reporter_name?: string | null
          source_document?: string | null
          source_issue_item_id?: string | null
          source_type?: string
          status?: string
          stock_deducted_at?: string | null
          stock_disposed_at?: string | null
          swap_request_id?: string | null
          symptom_id?: string | null
          symptom_other?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "defective_returns_assessment_log_id_fkey"
            columns: ["assessment_log_id"]
            isOneToOne: false
            referencedRelation: "assessment_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_returns_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_returns_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_returns_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_returns_quarantine_location_id_fkey"
            columns: ["quarantine_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_returns_receive_location_id_fkey"
            columns: ["receive_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_returns_source_issue_item_id_fkey"
            columns: ["source_issue_item_id"]
            isOneToOne: false
            referencedRelation: "goods_issue_pending_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_returns_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "mp_symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_confirmations: {
        Row: {
          actual_quantity: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          direct_shipment_id: string | null
          document_no: string
          document_urls: string[] | null
          goods_issue_pending_id: string | null
          id: string
          issue_description: string | null
          issue_type: string | null
          notes: string | null
          photo_urls: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_quantity?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          direct_shipment_id?: string | null
          document_no: string
          document_urls?: string[] | null
          goods_issue_pending_id?: string | null
          id?: string
          issue_description?: string | null
          issue_type?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_quantity?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          direct_shipment_id?: string | null
          document_no?: string
          document_urls?: string[] | null
          goods_issue_pending_id?: string | null
          id?: string
          issue_description?: string | null
          issue_type?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_confirmations_direct_shipment_id_fkey"
            columns: ["direct_shipment_id"]
            isOneToOne: false
            referencedRelation: "direct_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_confirmations_goods_issue_pending_id_fkey"
            columns: ["goods_issue_pending_id"]
            isOneToOne: false
            referencedRelation: "goods_issue_pending"
            referencedColumns: ["id"]
          },
        ]
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
      direct_shipment_items: {
        Row: {
          created_at: string
          direct_shipment_id: string
          equipment_code: string | null
          equipment_id: string | null
          equipment_name: string | null
          id: string
          is_media_player: boolean
          lot_number: string | null
          media_player_id: string | null
          notes: string | null
          quantity: number
          serial_number: string | null
          serial_number_2: string | null
          unit: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          direct_shipment_id: string
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          is_media_player?: boolean
          lot_number?: string | null
          media_player_id?: string | null
          notes?: string | null
          quantity?: number
          serial_number?: string | null
          serial_number_2?: string | null
          unit?: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          direct_shipment_id?: string
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          is_media_player?: boolean
          lot_number?: string | null
          media_player_id?: string | null
          notes?: string | null
          quantity?: number
          serial_number?: string | null
          serial_number_2?: string | null
          unit?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_shipment_items_direct_shipment_id_fkey"
            columns: ["direct_shipment_id"]
            isOneToOne: false
            referencedRelation: "direct_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_shipment_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_shipment_items_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_shipments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          company_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          delivery_person_name: string | null
          department: string | null
          destination_description: string | null
          destination_lat: number | null
          destination_lng: number | null
          document_no: string
          expected_arrival_date: string | null
          id: string
          notes: string | null
          po_document_url: string | null
          po_number: string | null
          pr_document_url: string | null
          pr_number: string | null
          processed_at: string | null
          processed_by: string | null
          purpose: string | null
          receiver_name: string | null
          receiver_phone: string | null
          rejection_reason: string | null
          requested_items_description: string | null
          requester_name: string | null
          requester_phone: string | null
          section_id: string | null
          shipping_date: string | null
          status: string
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          delivery_person_name?: string | null
          department?: string | null
          destination_description?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          document_no?: string
          expected_arrival_date?: string | null
          id?: string
          notes?: string | null
          po_document_url?: string | null
          po_number?: string | null
          pr_document_url?: string | null
          pr_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          purpose?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          rejection_reason?: string | null
          requested_items_description?: string | null
          requester_name?: string | null
          requester_phone?: string | null
          section_id?: string | null
          shipping_date?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          delivery_person_name?: string | null
          department?: string | null
          destination_description?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          document_no?: string
          expected_arrival_date?: string | null
          id?: string
          notes?: string | null
          po_document_url?: string | null
          po_number?: string | null
          pr_document_url?: string | null
          pr_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          purpose?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          rejection_reason?: string | null
          requested_items_description?: string | null
          requester_name?: string | null
          requester_phone?: string | null
          section_id?: string | null
          shipping_date?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_shipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_shipments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_shipments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          amp: number | null
          asset_code: string | null
          billboard_compatibility_mode: string
          brand: string | null
          category: string
          code: string
          company_id: string | null
          compatibility_notes: string | null
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
          is_consumable: boolean
          item_condition: string
          location_id: string | null
          lumen: number | null
          lux: number | null
          min_stock_level: number | null
          name: string
          notes: string | null
          po_item_no: string | null
          quantity_in_stock: number
          return_policy_note: string | null
          serial_number: string | null
          subcategory_id: string | null
          supplier_id: string | null
          unit: string
          unit_price: number
          updated_at: string
          volt: number | null
          volume_cm3: number | null
          warehouse_entry_date: string
          warranty_expiry_date: string | null
          warranty_years: number | null
          watt: number | null
          width_cm: number | null
        }
        Insert: {
          amp?: number | null
          asset_code?: string | null
          billboard_compatibility_mode?: string
          brand?: string | null
          category: string
          code: string
          company_id?: string | null
          compatibility_notes?: string | null
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
          is_consumable?: boolean
          item_condition?: string
          location_id?: string | null
          lumen?: number | null
          lux?: number | null
          min_stock_level?: number | null
          name: string
          notes?: string | null
          po_item_no?: string | null
          quantity_in_stock?: number
          return_policy_note?: string | null
          serial_number?: string | null
          subcategory_id?: string | null
          supplier_id?: string | null
          unit: string
          unit_price?: number
          updated_at?: string
          volt?: number | null
          volume_cm3?: number | null
          warehouse_entry_date?: string
          warranty_expiry_date?: string | null
          warranty_years?: number | null
          watt?: number | null
          width_cm?: number | null
        }
        Update: {
          amp?: number | null
          asset_code?: string | null
          billboard_compatibility_mode?: string
          brand?: string | null
          category?: string
          code?: string
          company_id?: string | null
          compatibility_notes?: string | null
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
          is_consumable?: boolean
          item_condition?: string
          location_id?: string | null
          lumen?: number | null
          lux?: number | null
          min_stock_level?: number | null
          name?: string
          notes?: string | null
          po_item_no?: string | null
          quantity_in_stock?: number
          return_policy_note?: string | null
          serial_number?: string | null
          subcategory_id?: string | null
          supplier_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
          volt?: number | null
          volume_cm3?: number | null
          warehouse_entry_date?: string
          warranty_expiry_date?: string | null
          warranty_years?: number | null
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
          {
            foreignKeyName: "equipment_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_billboard_compatibility: {
        Row: {
          billboard_id: string
          created_at: string
          equipment_id: string
          source: string
          source_package_id: string | null
        }
        Insert: {
          billboard_id: string
          created_at?: string
          equipment_id: string
          source?: string
          source_package_id?: string | null
        }
        Update: {
          billboard_id?: string
          created_at?: string
          equipment_id?: string
          source?: string
          source_package_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_billboard_compatibility_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_billboard_compatibility_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_billboard_compatibility_source_package_id_fkey"
            columns: ["source_package_id"]
            isOneToOne: false
            referencedRelation: "billboard_packages"
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
      equipment_compatibility_packages: {
        Row: {
          created_at: string
          equipment_id: string
          package_id: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          package_id: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_compatibility_packages_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_compatibility_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "billboard_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_images: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number | null
          equipment_id: string
          id: string
          image_url: string
          is_primary: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          equipment_id: string
          id?: string
          image_url: string
          is_primary?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          equipment_id?: string
          id?: string
          image_url?: string
          is_primary?: boolean
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
          from_company_id: string | null
          holder_name: string | null
          holder_user_id: string | null
          id: string
          is_cross_department: boolean
          issued_at: string | null
          issued_by: string | null
          item_kind: string
          loan_date: string
          notes: string | null
          pm_task_id: string | null
          purpose: string | null
          quantity: number
          requester_name: string
          requester_phone: string | null
          return_date: string | null
          return_notes: string | null
          return_required: boolean
          returned_by: string | null
          returned_quantity: number | null
          status: string
          to_company_id: string | null
          tool_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          equipment_id?: string | null
          from_company_id?: string | null
          holder_name?: string | null
          holder_user_id?: string | null
          id?: string
          is_cross_department?: boolean
          issued_at?: string | null
          issued_by?: string | null
          item_kind?: string
          loan_date?: string
          notes?: string | null
          pm_task_id?: string | null
          purpose?: string | null
          quantity: number
          requester_name: string
          requester_phone?: string | null
          return_date?: string | null
          return_notes?: string | null
          return_required?: boolean
          returned_by?: string | null
          returned_quantity?: number | null
          status?: string
          to_company_id?: string | null
          tool_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          equipment_id?: string | null
          from_company_id?: string | null
          holder_name?: string | null
          holder_user_id?: string | null
          id?: string
          is_cross_department?: boolean
          issued_at?: string | null
          issued_by?: string | null
          item_kind?: string
          loan_date?: string
          notes?: string | null
          pm_task_id?: string | null
          purpose?: string | null
          quantity?: number
          requester_name?: string
          requester_phone?: string | null
          return_date?: string | null
          return_notes?: string | null
          return_required?: boolean
          returned_by?: string | null
          returned_quantity?: number | null
          status?: string
          to_company_id?: string | null
          tool_id?: string | null
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
          {
            foreignKeyName: "equipment_loans_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
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
      equipment_serial_numbers: {
        Row: {
          billboard_id: string | null
          created_at: string
          created_by: string | null
          equipment_id: string
          id: string
          is_refurbished: boolean
          issue_document_no: string | null
          issued_at: string | null
          location_id: string | null
          notes: string | null
          receipt_document_no: string | null
          received_at: string | null
          refurbished_at: string | null
          refurbished_notes: string | null
          serial_number: string
          status: string
          updated_at: string
        }
        Insert: {
          billboard_id?: string | null
          created_at?: string
          created_by?: string | null
          equipment_id: string
          id?: string
          is_refurbished?: boolean
          issue_document_no?: string | null
          issued_at?: string | null
          location_id?: string | null
          notes?: string | null
          receipt_document_no?: string | null
          received_at?: string | null
          refurbished_at?: string | null
          refurbished_notes?: string | null
          serial_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          billboard_id?: string | null
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          id?: string
          is_refurbished?: boolean
          issue_document_no?: string | null
          issued_at?: string | null
          location_id?: string | null
          notes?: string | null
          receipt_document_no?: string | null
          received_at?: string | null
          refurbished_at?: string | null
          refurbished_notes?: string | null
          serial_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_serial_numbers_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_serial_numbers_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_serial_numbers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      external_db_connections: {
        Row: {
          auto_sync_days: number[] | null
          auto_sync_enabled: boolean
          auto_sync_time: string | null
          created_at: string
          created_by: string | null
          database_name: string
          db_type: string
          host: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_status: string | null
          name: string
          password_secret_name: string
          port: number
          table_name: string
          updated_at: string
          username: string
        }
        Insert: {
          auto_sync_days?: number[] | null
          auto_sync_enabled?: boolean
          auto_sync_time?: string | null
          created_at?: string
          created_by?: string | null
          database_name: string
          db_type?: string
          host: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_status?: string | null
          name?: string
          password_secret_name?: string
          port?: number
          table_name?: string
          updated_at?: string
          username: string
        }
        Update: {
          auto_sync_days?: number[] | null
          auto_sync_enabled?: boolean
          auto_sync_time?: string | null
          created_at?: string
          created_by?: string | null
          database_name?: string
          db_type?: string
          host?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_status?: string | null
          name?: string
          password_secret_name?: string
          port?: number
          table_name?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
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
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          billboard_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
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
          item_condition: string | null
          last_partial_issue_at: string | null
          media_player_id: string | null
          notes: string | null
          partial_issue_count: number | null
          pickup_date: string | null
          pickup_time: string | null
          pickup_type: string | null
          purpose: string | null
          purpose_id: string | null
          quantity: number
          reject_reason: string | null
          remaining_quantity: number | null
          requester_department: string | null
          requester_name: string
          requester_phone: string | null
          requires_approval: boolean | null
          return_quantity: number | null
          returned_at: string | null
          returned_by: string | null
          status: string
          total_items: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billboard_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          item_condition?: string | null
          last_partial_issue_at?: string | null
          media_player_id?: string | null
          notes?: string | null
          partial_issue_count?: number | null
          pickup_date?: string | null
          pickup_time?: string | null
          pickup_type?: string | null
          purpose?: string | null
          purpose_id?: string | null
          quantity: number
          reject_reason?: string | null
          remaining_quantity?: number | null
          requester_department?: string | null
          requester_name: string
          requester_phone?: string | null
          requires_approval?: boolean | null
          return_quantity?: number | null
          returned_at?: string | null
          returned_by?: string | null
          status?: string
          total_items?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billboard_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          item_condition?: string | null
          last_partial_issue_at?: string | null
          media_player_id?: string | null
          notes?: string | null
          partial_issue_count?: number | null
          pickup_date?: string | null
          pickup_time?: string | null
          pickup_type?: string | null
          purpose?: string | null
          purpose_id?: string | null
          quantity?: number
          reject_reason?: string | null
          remaining_quantity?: number | null
          requester_department?: string | null
          requester_name?: string
          requester_phone?: string | null
          requires_approval?: boolean | null
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
          install_status: string
          intended_billboard_id: string | null
          is_media_player: boolean | null
          issued_quantity: number | null
          media_player_id: string | null
          needs_return: boolean | null
          needs_return_overridden: boolean
          notes: string | null
          pending_id: string
          quantity: number
          remaining_quantity: number | null
          return_location_id: string | null
          returned_at: string | null
          returned_by: string | null
          returned_defective_qty: number
          returned_good_qty: number
          serial_number: string | null
          status: string | null
          sub_media_type: string | null
          unit: string
        }
        Insert: {
          billboard_id?: string | null
          created_at?: string | null
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          install_status?: string
          intended_billboard_id?: string | null
          is_media_player?: boolean | null
          issued_quantity?: number | null
          media_player_id?: string | null
          needs_return?: boolean | null
          needs_return_overridden?: boolean
          notes?: string | null
          pending_id: string
          quantity?: number
          remaining_quantity?: number | null
          return_location_id?: string | null
          returned_at?: string | null
          returned_by?: string | null
          returned_defective_qty?: number
          returned_good_qty?: number
          serial_number?: string | null
          status?: string | null
          sub_media_type?: string | null
          unit?: string
        }
        Update: {
          billboard_id?: string | null
          created_at?: string | null
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          install_status?: string
          intended_billboard_id?: string | null
          is_media_player?: boolean | null
          issued_quantity?: number | null
          media_player_id?: string | null
          needs_return?: boolean | null
          needs_return_overridden?: boolean
          notes?: string | null
          pending_id?: string
          quantity?: number
          remaining_quantity?: number | null
          return_location_id?: string | null
          returned_at?: string | null
          returned_by?: string | null
          returned_defective_qty?: number
          returned_good_qty?: number
          serial_number?: string | null
          status?: string | null
          sub_media_type?: string | null
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
            foreignKeyName: "goods_issue_pending_items_intended_billboard_id_fkey"
            columns: ["intended_billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_issue_pending_items_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_issue_pending_items_return_location_id_fkey"
            columns: ["return_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          delivery_note_document_url: string | null
          document_no: string
          document_url: string | null
          equipment_id: string
          id: string
          invoice_document_url: string | null
          location_id: string
          notes: string | null
          po_document_url: string | null
          pr_document_url: string | null
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
          delivery_note_document_url?: string | null
          document_no: string
          document_url?: string | null
          equipment_id: string
          id?: string
          invoice_document_url?: string | null
          location_id: string
          notes?: string | null
          po_document_url?: string | null
          pr_document_url?: string | null
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
          delivery_note_document_url?: string | null
          document_no?: string
          document_url?: string | null
          equipment_id?: string
          id?: string
          invoice_document_url?: string | null
          location_id?: string
          notes?: string | null
          po_document_url?: string | null
          pr_document_url?: string | null
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
          activate_windows: string | null
          asset_caretaker: string | null
          asset_code: string | null
          company_id: string | null
          created_at: string
          delivery_note_document_url: string | null
          delivery_note_number: string | null
          delivery_person_name: string
          delivery_person_phone: string | null
          department_id: string | null
          depreciation_months: number | null
          device_type: string | null
          document_file_name: string | null
          document_no: string
          document_url: string | null
          equipment_code: string | null
          equipment_id: string | null
          equipment_id_code: string | null
          equipment_name: string | null
          expiry_date: string | null
          id: string
          invoice_document_url: string | null
          invoice_number: string | null
          is_asset: boolean | null
          is_media_player: boolean | null
          lot_number: string | null
          lot_number_2: string | null
          media_player_id: string | null
          media_player_image_url: string | null
          notes: string | null
          order_for_project: string | null
          planned_install_location: string | null
          po_document_url: string | null
          po_item_no: string | null
          po_number: string | null
          pr_document_url: string | null
          pr_number: string | null
          purchase_document_url: string | null
          quantity: number
          receipt_purpose_id: string | null
          received_at: string | null
          received_by: string | null
          received_location_id: string | null
          remote_name: string | null
          serial_number: string | null
          serial_number_2: string | null
          specification: string | null
          status: string
          storage_depth_cm: number | null
          storage_height_cm: number | null
          storage_volume_cm3: number | null
          storage_width_cm: number | null
          sub_media_type: string | null
          supplier_id: string | null
          supplier_name: string | null
          temp_category_id: string | null
          temp_min_stock_level: number | null
          temp_product_images: string[] | null
          temp_subcategory_id: string | null
          unit: string
          unit_price: number | null
          updated_at: string
          usage_lifespan_months: number | null
          waiting_asset_code: boolean | null
          waiting_equipment_id: boolean | null
          warehouse_id: string | null
          warranty_expiry_date: string | null
          warranty_years: number | null
        }
        Insert: {
          activate_windows?: string | null
          asset_caretaker?: string | null
          asset_code?: string | null
          company_id?: string | null
          created_at?: string
          delivery_note_document_url?: string | null
          delivery_note_number?: string | null
          delivery_person_name: string
          delivery_person_phone?: string | null
          department_id?: string | null
          depreciation_months?: number | null
          device_type?: string | null
          document_file_name?: string | null
          document_no: string
          document_url?: string | null
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_id_code?: string | null
          equipment_name?: string | null
          expiry_date?: string | null
          id?: string
          invoice_document_url?: string | null
          invoice_number?: string | null
          is_asset?: boolean | null
          is_media_player?: boolean | null
          lot_number?: string | null
          lot_number_2?: string | null
          media_player_id?: string | null
          media_player_image_url?: string | null
          notes?: string | null
          order_for_project?: string | null
          planned_install_location?: string | null
          po_document_url?: string | null
          po_item_no?: string | null
          po_number?: string | null
          pr_document_url?: string | null
          pr_number?: string | null
          purchase_document_url?: string | null
          quantity: number
          receipt_purpose_id?: string | null
          received_at?: string | null
          received_by?: string | null
          received_location_id?: string | null
          remote_name?: string | null
          serial_number?: string | null
          serial_number_2?: string | null
          specification?: string | null
          status?: string
          storage_depth_cm?: number | null
          storage_height_cm?: number | null
          storage_volume_cm3?: number | null
          storage_width_cm?: number | null
          sub_media_type?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          temp_category_id?: string | null
          temp_min_stock_level?: number | null
          temp_product_images?: string[] | null
          temp_subcategory_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          usage_lifespan_months?: number | null
          waiting_asset_code?: boolean | null
          waiting_equipment_id?: boolean | null
          warehouse_id?: string | null
          warranty_expiry_date?: string | null
          warranty_years?: number | null
        }
        Update: {
          activate_windows?: string | null
          asset_caretaker?: string | null
          asset_code?: string | null
          company_id?: string | null
          created_at?: string
          delivery_note_document_url?: string | null
          delivery_note_number?: string | null
          delivery_person_name?: string
          delivery_person_phone?: string | null
          department_id?: string | null
          depreciation_months?: number | null
          device_type?: string | null
          document_file_name?: string | null
          document_no?: string
          document_url?: string | null
          equipment_code?: string | null
          equipment_id?: string | null
          equipment_id_code?: string | null
          equipment_name?: string | null
          expiry_date?: string | null
          id?: string
          invoice_document_url?: string | null
          invoice_number?: string | null
          is_asset?: boolean | null
          is_media_player?: boolean | null
          lot_number?: string | null
          lot_number_2?: string | null
          media_player_id?: string | null
          media_player_image_url?: string | null
          notes?: string | null
          order_for_project?: string | null
          planned_install_location?: string | null
          po_document_url?: string | null
          po_item_no?: string | null
          po_number?: string | null
          pr_document_url?: string | null
          pr_number?: string | null
          purchase_document_url?: string | null
          quantity?: number
          receipt_purpose_id?: string | null
          received_at?: string | null
          received_by?: string | null
          received_location_id?: string | null
          remote_name?: string | null
          serial_number?: string | null
          serial_number_2?: string | null
          specification?: string | null
          status?: string
          storage_depth_cm?: number | null
          storage_height_cm?: number | null
          storage_volume_cm3?: number | null
          storage_width_cm?: number | null
          sub_media_type?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          temp_category_id?: string | null
          temp_min_stock_level?: number | null
          temp_product_images?: string[] | null
          temp_subcategory_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          usage_lifespan_months?: number | null
          waiting_asset_code?: boolean | null
          waiting_equipment_id?: boolean | null
          warehouse_id?: string | null
          warranty_expiry_date?: string | null
          warranty_years?: number | null
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
          zone_id: string | null
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
          zone_id?: string | null
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
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
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
      media_player_billboard_history: {
        Row: {
          billboard_id: string
          created_at: string
          id: string
          installation_date: string | null
          installation_notes: string | null
          installed_by: string | null
          media_player_id: string
          return_location_id: string | null
          return_to_stock: boolean | null
          uninstall_date: string | null
          uninstall_reason: string | null
          uninstalled_by: string | null
        }
        Insert: {
          billboard_id: string
          created_at?: string
          id?: string
          installation_date?: string | null
          installation_notes?: string | null
          installed_by?: string | null
          media_player_id: string
          return_location_id?: string | null
          return_to_stock?: boolean | null
          uninstall_date?: string | null
          uninstall_reason?: string | null
          uninstalled_by?: string | null
        }
        Update: {
          billboard_id?: string
          created_at?: string
          id?: string
          installation_date?: string | null
          installation_notes?: string | null
          installed_by?: string | null
          media_player_id?: string
          return_location_id?: string | null
          return_to_stock?: boolean | null
          uninstall_date?: string | null
          uninstall_reason?: string | null
          uninstalled_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_player_billboard_history_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_player_billboard_history_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_player_billboard_history_return_location_id_fkey"
            columns: ["return_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_player_code_prefixes: {
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
      media_player_images: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean
          media_player_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean
          media_player_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean
          media_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_player_images_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
        ]
      }
      media_player_models: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      media_player_names: {
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
      media_player_serial_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          claim_document_no: string | null
          claim_record_id: string | null
          created_at: string
          id: string
          media_player_id: string
          new_invoice_number: string | null
          new_po_number: string | null
          new_serial: string | null
          new_warranty_expiry_date: string | null
          old_serial: string | null
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          claim_document_no?: string | null
          claim_record_id?: string | null
          created_at?: string
          id?: string
          media_player_id: string
          new_invoice_number?: string | null
          new_po_number?: string | null
          new_serial?: string | null
          new_warranty_expiry_date?: string | null
          old_serial?: string | null
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          claim_document_no?: string | null
          claim_record_id?: string | null
          created_at?: string
          id?: string
          media_player_id?: string
          new_invoice_number?: string | null
          new_po_number?: string | null
          new_serial?: string | null
          new_warranty_expiry_date?: string | null
          old_serial?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_player_serial_history_claim_record_id_fkey"
            columns: ["claim_record_id"]
            isOneToOne: false
            referencedRelation: "claim_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_player_serial_history_media_player_id_fkey"
            columns: ["media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
        ]
      }
      media_player_specifications: {
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
      media_player_statuses: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      media_players: {
        Row: {
          activate_windows: string | null
          asset_caretaker: string | null
          asset_code: string | null
          billboard_id: string | null
          brand: string | null
          cms_type_id: string | null
          code: string
          company_id: string | null
          created_at: string
          created_by: string | null
          date_of_receipt: string | null
          delivery_note_document_url: string | null
          delivery_note_number: string | null
          department: string | null
          depreciation_months: number | null
          description: string | null
          device_type: string
          equipment_id_code: string | null
          id: string
          image_url: string | null
          install_date: string | null
          invoice_document_url: string | null
          invoice_number: string | null
          is_active: boolean | null
          is_asset: boolean | null
          is_refurbished: boolean
          item_condition: string
          location_id: string | null
          model_id: string | null
          name: string
          notes: string | null
          order_for_project: string | null
          planned_install_location: string | null
          po_document_url: string | null
          po_item_no: string | null
          po_number: string | null
          pr_document_url: string | null
          pr_number: string | null
          quantity: number
          refurbished_at: string | null
          refurbished_notes: string | null
          remote_name: string | null
          serial_number_1: string | null
          serial_number_2: string | null
          specification: string | null
          status: string | null
          sub_media_type: string | null
          supplier_id: string | null
          unit: string
          unit_price: number | null
          updated_at: string
          usage_lifespan_months: number | null
          waiting_asset_code: boolean | null
          waiting_equipment_id: boolean | null
          warranty_expiry_date: string | null
          warranty_years: number | null
        }
        Insert: {
          activate_windows?: string | null
          asset_caretaker?: string | null
          asset_code?: string | null
          billboard_id?: string | null
          brand?: string | null
          cms_type_id?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_receipt?: string | null
          delivery_note_document_url?: string | null
          delivery_note_number?: string | null
          department?: string | null
          depreciation_months?: number | null
          description?: string | null
          device_type?: string
          equipment_id_code?: string | null
          id?: string
          image_url?: string | null
          install_date?: string | null
          invoice_document_url?: string | null
          invoice_number?: string | null
          is_active?: boolean | null
          is_asset?: boolean | null
          is_refurbished?: boolean
          item_condition?: string
          location_id?: string | null
          model_id?: string | null
          name: string
          notes?: string | null
          order_for_project?: string | null
          planned_install_location?: string | null
          po_document_url?: string | null
          po_item_no?: string | null
          po_number?: string | null
          pr_document_url?: string | null
          pr_number?: string | null
          quantity?: number
          refurbished_at?: string | null
          refurbished_notes?: string | null
          remote_name?: string | null
          serial_number_1?: string | null
          serial_number_2?: string | null
          specification?: string | null
          status?: string | null
          sub_media_type?: string | null
          supplier_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          usage_lifespan_months?: number | null
          waiting_asset_code?: boolean | null
          waiting_equipment_id?: boolean | null
          warranty_expiry_date?: string | null
          warranty_years?: number | null
        }
        Update: {
          activate_windows?: string | null
          asset_caretaker?: string | null
          asset_code?: string | null
          billboard_id?: string | null
          brand?: string | null
          cms_type_id?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_receipt?: string | null
          delivery_note_document_url?: string | null
          delivery_note_number?: string | null
          department?: string | null
          depreciation_months?: number | null
          description?: string | null
          device_type?: string
          equipment_id_code?: string | null
          id?: string
          image_url?: string | null
          install_date?: string | null
          invoice_document_url?: string | null
          invoice_number?: string | null
          is_active?: boolean | null
          is_asset?: boolean | null
          is_refurbished?: boolean
          item_condition?: string
          location_id?: string | null
          model_id?: string | null
          name?: string
          notes?: string | null
          order_for_project?: string | null
          planned_install_location?: string | null
          po_document_url?: string | null
          po_item_no?: string | null
          po_number?: string | null
          pr_document_url?: string | null
          pr_number?: string | null
          quantity?: number
          refurbished_at?: string | null
          refurbished_notes?: string | null
          remote_name?: string | null
          serial_number_1?: string | null
          serial_number_2?: string | null
          specification?: string | null
          status?: string | null
          sub_media_type?: string | null
          supplier_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          usage_lifespan_months?: number | null
          waiting_asset_code?: boolean | null
          waiting_equipment_id?: boolean | null
          warranty_expiry_date?: string | null
          warranty_years?: number | null
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
          {
            foreignKeyName: "media_players_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      media_sites: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mp_assessment_results: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      mp_claim_results: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          result_kind: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          result_kind?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          result_kind?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      mp_swap_reject_reasons: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      mp_symptoms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notification_dismissals: {
        Row: {
          dismissed_at: string
          id: string
          notification_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          notification_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dismissals_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          advance_days: number
          created_at: string
          department_emails: Json | null
          email_addresses: string[] | null
          id: string
          notify_ad_retention: boolean | null
          notify_billboard_pm: boolean | null
          notify_direct_shipping_approval: boolean
          notify_disposal_approval: boolean
          notify_equipment_expiry: boolean
          notify_incomplete_issues: boolean | null
          notify_loan_overdue: boolean | null
          notify_low_stock: boolean
          notify_manager_approval: boolean
          notify_media_player_expiry: boolean | null
          notify_media_player_warranty: boolean | null
          notify_pending_assessment: boolean
          notify_pending_asset_codes: boolean
          notify_pending_requests: boolean | null
          notify_pm_schedule: boolean
          notify_tool_pm: boolean | null
          notify_warranty_expiry: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          advance_days?: number
          created_at?: string
          department_emails?: Json | null
          email_addresses?: string[] | null
          id?: string
          notify_ad_retention?: boolean | null
          notify_billboard_pm?: boolean | null
          notify_direct_shipping_approval?: boolean
          notify_disposal_approval?: boolean
          notify_equipment_expiry?: boolean
          notify_incomplete_issues?: boolean | null
          notify_loan_overdue?: boolean | null
          notify_low_stock?: boolean
          notify_manager_approval?: boolean
          notify_media_player_expiry?: boolean | null
          notify_media_player_warranty?: boolean | null
          notify_pending_assessment?: boolean
          notify_pending_asset_codes?: boolean
          notify_pending_requests?: boolean | null
          notify_pm_schedule?: boolean
          notify_tool_pm?: boolean | null
          notify_warranty_expiry?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          advance_days?: number
          created_at?: string
          department_emails?: Json | null
          email_addresses?: string[] | null
          id?: string
          notify_ad_retention?: boolean | null
          notify_billboard_pm?: boolean | null
          notify_direct_shipping_approval?: boolean
          notify_disposal_approval?: boolean
          notify_equipment_expiry?: boolean
          notify_incomplete_issues?: boolean | null
          notify_loan_overdue?: boolean | null
          notify_low_stock?: boolean
          notify_manager_approval?: boolean
          notify_media_player_expiry?: boolean | null
          notify_media_player_warranty?: boolean | null
          notify_pending_assessment?: boolean
          notify_pending_asset_codes?: boolean
          notify_pending_requests?: boolean | null
          notify_pm_schedule?: boolean
          notify_tool_pm?: boolean | null
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
          department: string | null
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
          department?: string | null
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
          department?: string | null
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
      permission_templates: {
        Row: {
          created_at: string
          default_dept_can_create: boolean
          default_dept_can_delete: boolean
          default_dept_can_edit: boolean
          default_dept_can_view: boolean
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          is_quick_preset: boolean
          label: string
          suggested_functions: string[]
          suggested_roles: Database["public"]["Enums"]["app_role"][]
          template_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_dept_can_create?: boolean
          default_dept_can_delete?: boolean
          default_dept_can_edit?: boolean
          default_dept_can_view?: boolean
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_quick_preset?: boolean
          label: string
          suggested_functions?: string[]
          suggested_roles?: Database["public"]["Enums"]["app_role"][]
          template_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_dept_can_create?: boolean
          default_dept_can_delete?: boolean
          default_dept_can_edit?: boolean
          default_dept_can_view?: boolean
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_quick_preset?: boolean
          label?: string
          suggested_functions?: string[]
          suggested_roles?: Database["public"]["Enums"]["app_role"][]
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      pm_action_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_snooze: boolean
          name: string
          snooze_days: number | null
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_snooze?: boolean
          name: string
          snooze_days?: number | null
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_snooze?: boolean
          name?: string
          snooze_days?: number | null
          sort_order?: number
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
          department: string | null
          display_name: string | null
          full_name: string
          id: string
          is_hidden: boolean
          phone: string | null
          requested_department: string | null
          requested_job_role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          display_name?: string | null
          full_name: string
          id: string
          is_hidden?: boolean
          phone?: string | null
          requested_department?: string | null
          requested_job_role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          display_name?: string | null
          full_name?: string
          id?: string
          is_hidden?: boolean
          phone?: string | null
          requested_department?: string | null
          requested_job_role?: string | null
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
      repair_actions: {
        Row: {
          applies_to_device: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          scope: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          applies_to_device?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          scope: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          applies_to_device?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          scope?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      section_scopes: {
        Row: {
          created_at: string
          id: string
          ref_id: string | null
          ref_text: string | null
          scope_type: string
          section_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ref_id?: string | null
          ref_text?: string | null
          scope_type: string
          section_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ref_id?: string | null
          ref_text?: string | null
          scope_type?: string
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_scopes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
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
          item_condition: string | null
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
          item_condition?: string | null
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
          item_condition?: string | null
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
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
          examples: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          name: string
          updated_at: string
          usage_hint: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          examples?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          name: string
          updated_at?: string
          usage_hint?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          examples?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          name?: string
          updated_at?: string
          usage_hint?: string | null
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
          company_code: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          media_site_name: string | null
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
          vendor_code: string | null
        }
        Insert: {
          address?: string | null
          code: string
          company_code?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          media_site_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          vendor_code?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          company_code?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          media_site_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          vendor_code?: string | null
        }
        Relationships: []
      }
      swap_executions: {
        Row: {
          after_photo_urls: string[] | null
          before_photo_urls: string[] | null
          created_at: string
          executed_at: string
          executed_by: string | null
          id: string
          notes: string | null
          old_billboard_equipment_id: string | null
          old_equipment_id: string | null
          old_media_player_id: string | null
          old_serial_number: string | null
          reject_reason_id: string | null
          reject_reason_other: string | null
          result: string
          return_location_id: string | null
          spare_equipment_id: string | null
          spare_media_player_id: string | null
          spare_serial_number: string | null
          spare_source_location_id: string | null
          spare_type: string
          swap_request_id: string
        }
        Insert: {
          after_photo_urls?: string[] | null
          before_photo_urls?: string[] | null
          created_at?: string
          executed_at?: string
          executed_by?: string | null
          id?: string
          notes?: string | null
          old_billboard_equipment_id?: string | null
          old_equipment_id?: string | null
          old_media_player_id?: string | null
          old_serial_number?: string | null
          reject_reason_id?: string | null
          reject_reason_other?: string | null
          result: string
          return_location_id?: string | null
          spare_equipment_id?: string | null
          spare_media_player_id?: string | null
          spare_serial_number?: string | null
          spare_source_location_id?: string | null
          spare_type: string
          swap_request_id: string
        }
        Update: {
          after_photo_urls?: string[] | null
          before_photo_urls?: string[] | null
          created_at?: string
          executed_at?: string
          executed_by?: string | null
          id?: string
          notes?: string | null
          old_billboard_equipment_id?: string | null
          old_equipment_id?: string | null
          old_media_player_id?: string | null
          old_serial_number?: string | null
          reject_reason_id?: string | null
          reject_reason_other?: string | null
          result?: string
          return_location_id?: string | null
          spare_equipment_id?: string | null
          spare_media_player_id?: string | null
          spare_serial_number?: string | null
          spare_source_location_id?: string | null
          spare_type?: string
          swap_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swap_executions_old_billboard_equipment_id_fkey"
            columns: ["old_billboard_equipment_id"]
            isOneToOne: false
            referencedRelation: "billboard_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_executions_old_equipment_id_fkey"
            columns: ["old_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_executions_old_media_player_id_fkey"
            columns: ["old_media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_executions_reject_reason_id_fkey"
            columns: ["reject_reason_id"]
            isOneToOne: false
            referencedRelation: "mp_swap_reject_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_executions_return_location_id_fkey"
            columns: ["return_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_executions_spare_equipment_id_fkey"
            columns: ["spare_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_executions_spare_media_player_id_fkey"
            columns: ["spare_media_player_id"]
            isOneToOne: false
            referencedRelation: "media_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_executions_spare_source_location_id_fkey"
            columns: ["spare_source_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_executions_swap_request_id_fkey"
            columns: ["swap_request_id"]
            isOneToOne: false
            referencedRelation: "swap_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      swap_requests: {
        Row: {
          asset_type: string
          billboard_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          defective_return_id: string | null
          description: string | null
          document_no: string
          id: string
          new_equipment_id: string | null
          new_media_player_id: string | null
          new_serial_number: string | null
          notes: string | null
          old_equipment_id: string | null
          old_media_player_id: string | null
          old_serial_number: string | null
          photo_urls: string[] | null
          priority: string
          received_at: string | null
          received_by: string | null
          received_by_name: string | null
          reported_asset_type: string | null
          reported_billboard_equipment_id: string | null
          reported_equipment_id: string | null
          reported_item_code: string | null
          reported_item_name: string | null
          reported_media_player_id: string | null
          reported_photos: string[] | null
          reported_serial_number: string | null
          status: string
          symptom_id: string | null
          symptom_other: string | null
          technician_name: string | null
          technician_phone: string | null
          updated_at: string
        }
        Insert: {
          asset_type?: string
          billboard_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          defective_return_id?: string | null
          description?: string | null
          document_no: string
          id?: string
          new_equipment_id?: string | null
          new_media_player_id?: string | null
          new_serial_number?: string | null
          notes?: string | null
          old_equipment_id?: string | null
          old_media_player_id?: string | null
          old_serial_number?: string | null
          photo_urls?: string[] | null
          priority?: string
          received_at?: string | null
          received_by?: string | null
          received_by_name?: string | null
          reported_asset_type?: string | null
          reported_billboard_equipment_id?: string | null
          reported_equipment_id?: string | null
          reported_item_code?: string | null
          reported_item_name?: string | null
          reported_media_player_id?: string | null
          reported_photos?: string[] | null
          reported_serial_number?: string | null
          status?: string
          symptom_id?: string | null
          symptom_other?: string | null
          technician_name?: string | null
          technician_phone?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          billboard_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          defective_return_id?: string | null
          description?: string | null
          document_no?: string
          id?: string
          new_equipment_id?: string | null
          new_media_player_id?: string | null
          new_serial_number?: string | null
          notes?: string | null
          old_equipment_id?: string | null
          old_media_player_id?: string | null
          old_serial_number?: string | null
          photo_urls?: string[] | null
          priority?: string
          received_at?: string | null
          received_by?: string | null
          received_by_name?: string | null
          reported_asset_type?: string | null
          reported_billboard_equipment_id?: string | null
          reported_equipment_id?: string | null
          reported_item_code?: string | null
          reported_item_name?: string | null
          reported_media_player_id?: string | null
          reported_photos?: string[] | null
          reported_serial_number?: string | null
          status?: string
          symptom_id?: string | null
          symptom_other?: string | null
          technician_name?: string | null
          technician_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swap_requests_billboard_id_fkey"
            columns: ["billboard_id"]
            isOneToOne: false
            referencedRelation: "billboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_requests_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "mp_symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      technician_tools: {
        Row: {
          assigned_date: string
          created_at: string
          id: string
          notes: string | null
          technician_id: string
          tool_id: string
          updated_at: string
        }
        Insert: {
          assigned_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          technician_id: string
          tool_id: string
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          technician_id?: string
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_tools_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tool_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          examples: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          name: string
          updated_at: string
          usage_hint: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          examples?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          name: string
          updated_at?: string
          usage_hint?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          examples?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          name?: string
          updated_at?: string
          usage_hint?: string | null
        }
        Relationships: []
      }
      tool_code_prefixes: {
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
      tool_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          tool_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          tool_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          tool_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_documents_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          tool_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          tool_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_images_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
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
          interval_days: number
          pm_type_id: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_days?: number
          pm_type_id: string
          tool_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_days?: number
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
      tool_subcategories: {
        Row: {
          created_at: string
          description: string | null
          examples: string | null
          id: string
          is_active: boolean
          keywords: string[] | null
          name: string
          tool_category_id: string
          updated_at: string
          usage_hint: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          examples?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          name: string
          tool_category_id: string
          updated_at?: string
          usage_hint?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          examples?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          name?: string
          tool_category_id?: string
          updated_at?: string
          usage_hint?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_subcategories_tool_category_id_fkey"
            columns: ["tool_category_id"]
            isOneToOne: false
            referencedRelation: "tool_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          asset_code: string | null
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
          is_asset: boolean | null
          is_personal_tool: boolean | null
          location_id: string | null
          name: string
          notes: string | null
          pm_interval_days: number | null
          requires_approval: boolean
          responsible_person: string | null
          return_required: boolean
          serial_number: string | null
          supplier_id: string | null
          tool_category_id: string | null
          tool_subcategory_id: string | null
          unit: string
          unit_price: number | null
          updated_at: string
          warehouse_entry_date: string
          warranty_expiry_date: string | null
        }
        Insert: {
          asset_code?: string | null
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
          is_asset?: boolean | null
          is_personal_tool?: boolean | null
          location_id?: string | null
          name: string
          notes?: string | null
          pm_interval_days?: number | null
          requires_approval?: boolean
          responsible_person?: string | null
          return_required?: boolean
          serial_number?: string | null
          supplier_id?: string | null
          tool_category_id?: string | null
          tool_subcategory_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          warehouse_entry_date?: string
          warranty_expiry_date?: string | null
        }
        Update: {
          asset_code?: string | null
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
          is_asset?: boolean | null
          is_personal_tool?: boolean | null
          location_id?: string | null
          name?: string
          notes?: string | null
          pm_interval_days?: number | null
          requires_approval?: boolean
          responsible_person?: string | null
          return_required?: boolean
          serial_number?: string | null
          supplier_id?: string | null
          tool_category_id?: string | null
          tool_subcategory_id?: string | null
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
            foreignKeyName: "tools_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_tool_category_id_fkey"
            columns: ["tool_category_id"]
            isOneToOne: false
            referencedRelation: "tool_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_tool_subcategory_id_fkey"
            columns: ["tool_subcategory_id"]
            isOneToOne: false
            referencedRelation: "tool_subcategories"
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
      user_sections: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          section_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          section_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          section_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
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
      zones: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_pr_from_shortage: {
        Args: {
          _available_qty: number
          _equipment_code: string
          _equipment_id: string
          _equipment_name: string
          _is_media_player: boolean
          _requested_qty: number
          _requester_name: string
          _unit: string
        }
        Returns: Json
      }
      generate_assessment_log_number: { Args: never; Returns: string }
      generate_claim_record_number: { Args: never; Returns: string }
      generate_equipment_pm_task_number: { Args: never; Returns: string }
      generate_pr_number: { Args: never; Returns: string }
      generate_swap_request_number: { Args: never; Returns: string }
      generate_tool_pm_task_number: { Args: never; Returns: string }
      get_next_equipment_code: { Args: { p_prefix: string }; Returns: string }
      get_next_media_player_code: {
        Args: { p_prefix: string }
        Returns: string
      }
      get_next_tool_code: { Args: { p_prefix: string }; Returns: string }
      get_pending_reservations: {
        Args: never
        Returns: {
          equipment_id: string
          media_player_id: string
          reserved: number
        }[]
      }
      get_public_schema_info: { Args: never; Returns: Json }
      get_public_schema_relations: { Args: never; Returns: Json }
      get_suppliers_admin: {
        Args: never
        Returns: {
          address: string | null
          code: string
          company_code: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          media_site_name: string | null
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
          vendor_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "suppliers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_section_scopes: {
        Args: { _user_id: string }
        Returns: {
          ref_id: string
          ref_text: string
          scope_type: string
          section_id: string
        }[]
      }
      get_users_admin_meta: {
        Args: never
        Returns: {
          banned_until: string
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
        }[]
      }
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
      import_equipment_row: { Args: { p: Json }; Returns: Json }
      import_media_player_row: { Args: { p: Json }; Returns: Json }
      import_tool_row: { Args: { p: Json }; Returns: Json }
      public_confirm_ad_issue_request: {
        Args: { _receiver_name: string; _token: string }
        Returns: boolean
      }
      public_get_ad_by_contractor_token: {
        Args: { _pin: string; _token: string }
        Returns: Json
      }
      public_get_ad_issue_request: { Args: { _token: string }; Returns: Json }
      public_get_billboard: { Args: { _id: string }; Returns: Json }
      public_get_billboard_equipment: {
        Args: { _billboard_id: string }
        Returns: {
          billboard_id: string
          equipment_category: string
          equipment_code: string
          equipment_id: string
          equipment_name: string
          equipment_unit: string
          expiry_date: string
          id: string
          installation_date: string
          quantity: number
          warranty_expiry_date: string
        }[]
      }
      public_get_billboards_min: {
        Args: { _ids: string[] }
        Returns: {
          equipment_id: string
          id: string
          location_name: string
          old_code: string
        }[]
      }
      public_get_direct_shipment: { Args: { _id: string }; Returns: Json }
      public_get_media_player_profile: { Args: { _id: string }; Returns: Json }
      public_get_mp_billboard_equipment: {
        Args: { _media_player_id: string }
        Returns: {
          billboard_id: string
          installation_date: string
          quantity: number
        }[]
      }
      public_get_mp_billboard_history: {
        Args: { _media_player_id: string }
        Returns: {
          billboard_id: string
          installation_date: string
          quantity: number
          uninstall_date: string
          uninstall_reason: string
        }[]
      }
      public_get_mp_stock_movements: {
        Args: { _media_player_id: string }
        Returns: {
          created_at: string
          id: string
          item_condition: string
          movement_type: string
          notes: string
          quantity: number
          reference_document: string
          stock_after: number
          stock_before: number
        }[]
      }
      public_get_supplier_name: { Args: { _id: string }; Returns: string }
      public_report_ad_issue: {
        Args: {
          _report_description: string
          _report_type: string
          _reporter_name: string
          _token: string
        }
        Returns: boolean
      }
      save_equipment_compatibility: {
        Args: {
          _billboard_ids: string[]
          _equipment_id: string
          _mode: string
          _notes: string
          _package_ids: string[]
        }
        Returns: Json
      }
      save_user_roles: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _target_user_id: string
        }
        Returns: undefined
      }
      user_has_section: {
        Args: { _section_id: string; _user_id: string }
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
        | "super_admin"
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
        "super_admin",
      ],
    },
  },
} as const
