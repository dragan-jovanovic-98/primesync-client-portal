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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_agg_call_minutes: {
        Row: {
          id: boolean
          total_call_minutes: number
        }
        Insert: {
          id?: boolean
          total_call_minutes?: number
        }
        Update: {
          id?: boolean
          total_call_minutes?: number
        }
        Relationships: []
      }
      all_client_calls: {
        Row: {
          agent_name: string | null
          agent_state: string | null
          agent_type: string | null
          ai_cost: number | null
          appointment_activity: boolean | null
          appointment_reviewed: boolean | null
          appointment_scheduled: boolean | null
          appointment_scheduling_review: boolean | null
          assistant_id: string | null
          call_date: string | null
          call_direction: string | null
          call_duration_min: number | null
          call_duration_s: number | null
          call_id: string
          call_outcome: string | null
          call_outcome_success: boolean | null
          call_successful: boolean | null
          client_notes: string | null
          company_id: string | null
          cycle_start: string | null
          database_id: number
          embedding: string | null
          ended_reason: string | null
          Hour: number | null
          in_voicemail: boolean | null
          latency: number | null
          location_id: string | null
          phone_number: number | null
          recording_url: string | null
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          summary: string | null
          telephony_cost: number | null
          tool_calls: Json | null
          total_cost: number | null
          total_cost_client: number | null
          transcript: string | null
          user_sentiment: string | null
          user_sentiment_num: number | null
        }
        Insert: {
          agent_name?: string | null
          agent_state?: string | null
          agent_type?: string | null
          ai_cost?: number | null
          appointment_activity?: boolean | null
          appointment_reviewed?: boolean | null
          appointment_scheduled?: boolean | null
          appointment_scheduling_review?: boolean | null
          assistant_id?: string | null
          call_date?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id: string
          call_outcome?: string | null
          call_outcome_success?: boolean | null
          call_successful?: boolean | null
          client_notes?: string | null
          company_id?: string | null
          cycle_start?: string | null
          database_id?: number
          embedding?: string | null
          ended_reason?: string | null
          Hour?: number | null
          in_voicemail?: boolean | null
          latency?: number | null
          location_id?: string | null
          phone_number?: number | null
          recording_url?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          summary?: string | null
          telephony_cost?: number | null
          tool_calls?: Json | null
          total_cost?: number | null
          total_cost_client?: number | null
          transcript?: string | null
          user_sentiment?: string | null
          user_sentiment_num?: number | null
        }
        Update: {
          agent_name?: string | null
          agent_state?: string | null
          agent_type?: string | null
          ai_cost?: number | null
          appointment_activity?: boolean | null
          appointment_reviewed?: boolean | null
          appointment_scheduled?: boolean | null
          appointment_scheduling_review?: boolean | null
          assistant_id?: string | null
          call_date?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id?: string
          call_outcome?: string | null
          call_outcome_success?: boolean | null
          call_successful?: boolean | null
          client_notes?: string | null
          company_id?: string | null
          cycle_start?: string | null
          database_id?: number
          embedding?: string | null
          ended_reason?: string | null
          Hour?: number | null
          in_voicemail?: boolean | null
          latency?: number | null
          location_id?: string | null
          phone_number?: number | null
          recording_url?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          summary?: string | null
          telephony_cost?: number | null
          tool_calls?: Json | null
          total_cost?: number | null
          total_cost_client?: number | null
          transcript?: string | null
          user_sentiment?: string | null
          user_sentiment_num?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "all_client_calls_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "all_client_calls_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      assistants: {
        Row: {
          agent_name: string
          appointment_setting_agent: boolean | null
          assistant_id: string
          company_id: string | null
          llm_id: string | null
          location_id: string | null
          phone_number: string | null
          scenario_id: string | null
          settings_name: string | null
          status: boolean | null
          type: string | null
          voice_id: string | null
        }
        Insert: {
          agent_name: string
          appointment_setting_agent?: boolean | null
          assistant_id: string
          company_id?: string | null
          llm_id?: string | null
          location_id?: string | null
          phone_number?: string | null
          scenario_id?: string | null
          settings_name?: string | null
          status?: boolean | null
          type?: string | null
          voice_id?: string | null
        }
        Update: {
          agent_name?: string
          appointment_setting_agent?: boolean | null
          assistant_id?: string
          company_id?: string | null
          llm_id?: string | null
          location_id?: string | null
          phone_number?: string | null
          scenario_id?: string | null
          settings_name?: string | null
          status?: boolean | null
          type?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "assistants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "assistants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "assistants_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_payment_methods: {
        Row: {
          added_at: string | null
          brand: string | null
          client_id: string | null
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean | null
          last4: string | null
          stripe_payment_method_id: string
        }
        Insert: {
          added_at?: string | null
          brand?: string | null
          client_id?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          stripe_payment_method_id: string
        }
        Update: {
          added_at?: string | null
          brand?: string | null
          client_id?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          stripe_payment_method_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payment_methods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          billing_cycle_anchor: string | null
          billing_emails: string[]
          company_id: string | null
          created_at: string
          cycle_length_months: number | null
          dashboard_password: string | null
          default_payment_method_id: string | null
          email: string | null
          id: string
          included_minutes_override: number | null
          industry: string | null
          is_active: boolean | null
          name: string
          onboarded_at: string | null
          overage_rate_min_override: number | null
          plan_id: string | null
          prepaid_rate_min_override: number | null
          report_avg_order_value: number
          report_close_rate: number
          report_emails: string[]
          report_frequency: string
          report_last_sent_at: string | null
          retell_error_streak: number
          service_emails: string[]
          status: Database["public"]["Enums"]["client_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          timezone: string
          trial_end: string | null
          trial_start: string | null
          wallet_balance: number | null
        }
        Insert: {
          billing_cycle_anchor?: string | null
          billing_emails?: string[]
          company_id?: string | null
          created_at?: string
          cycle_length_months?: number | null
          dashboard_password?: string | null
          default_payment_method_id?: string | null
          email?: string | null
          id?: string
          included_minutes_override?: number | null
          industry?: string | null
          is_active?: boolean | null
          name: string
          onboarded_at?: string | null
          overage_rate_min_override?: number | null
          plan_id?: string | null
          prepaid_rate_min_override?: number | null
          report_avg_order_value?: number
          report_close_rate?: number
          report_emails?: string[]
          report_frequency?: string
          report_last_sent_at?: string | null
          retell_error_streak?: number
          service_emails?: string[]
          status?: Database["public"]["Enums"]["client_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          timezone?: string
          trial_end?: string | null
          trial_start?: string | null
          wallet_balance?: number | null
        }
        Update: {
          billing_cycle_anchor?: string | null
          billing_emails?: string[]
          company_id?: string | null
          created_at?: string
          cycle_length_months?: number | null
          dashboard_password?: string | null
          default_payment_method_id?: string | null
          email?: string | null
          id?: string
          included_minutes_override?: number | null
          industry?: string | null
          is_active?: boolean | null
          name?: string
          onboarded_at?: string | null
          overage_rate_min_override?: number | null
          plan_id?: string | null
          prepaid_rate_min_override?: number | null
          report_avg_order_value?: number
          report_close_rate?: number
          report_emails?: string[]
          report_frequency?: string
          report_last_sent_at?: string | null
          retell_error_streak?: number
          service_emails?: string[]
          status?: Database["public"]["Enums"]["client_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          timezone?: string
          trial_end?: string | null
          trial_start?: string | null
          wallet_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["contact_role"]
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["contact_role"]
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["contact_role"]
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
        ]
      }
      hirsch_casino_night_call_extractions: {
        Row: {
          additional_questions: Json
          attendee_email: string | null
          attendee_first_name: string | null
          attendee_last_name: string | null
          attendee_phone: string | null
          attending: boolean | null
          bringing_guest: boolean | null
          call_at: string | null
          call_id: string
          client_phone: string | null
          created_at: string
          followup_details: string | null
          followup_required: boolean
          guest_first_name: string | null
          guest_last_name: string | null
          has_additional_questions: boolean
          id: string
          notes: string | null
        }
        Insert: {
          additional_questions?: Json
          attendee_email?: string | null
          attendee_first_name?: string | null
          attendee_last_name?: string | null
          attendee_phone?: string | null
          attending?: boolean | null
          bringing_guest?: boolean | null
          call_at?: string | null
          call_id: string
          client_phone?: string | null
          created_at?: string
          followup_details?: string | null
          followup_required?: boolean
          guest_first_name?: string | null
          guest_last_name?: string | null
          has_additional_questions?: boolean
          id?: string
          notes?: string | null
        }
        Update: {
          additional_questions?: Json
          attendee_email?: string | null
          attendee_first_name?: string | null
          attendee_last_name?: string | null
          attendee_phone?: string | null
          attending?: boolean | null
          bringing_guest?: boolean | null
          call_at?: string | null
          call_id?: string
          client_phone?: string | null
          created_at?: string
          followup_details?: string | null
          followup_required?: boolean
          guest_first_name?: string | null
          guest_last_name?: string | null
          has_additional_questions?: boolean
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      hirsch_casino_night_jan13_afternoon_call_logs: {
        Row: {
          answered: boolean | null
          call_date: string | null
          call_date_local: string | null
          call_direction: string | null
          call_duration_min: number | null
          call_duration_s: number | null
          call_id: string
          ended_reason: string | null
          latency: string | null
          phone_number: number | null
          recording_url: string | null
          summary: string | null
          transcript: string | null
          user_sentiment: string | null
        }
        Insert: {
          answered?: boolean | null
          call_date?: string | null
          call_date_local?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id: string
          ended_reason?: string | null
          latency?: string | null
          phone_number?: number | null
          recording_url?: string | null
          summary?: string | null
          transcript?: string | null
          user_sentiment?: string | null
        }
        Update: {
          answered?: boolean | null
          call_date?: string | null
          call_date_local?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id?: string
          ended_reason?: string | null
          latency?: string | null
          phone_number?: number | null
          recording_url?: string | null
          summary?: string | null
          transcript?: string | null
          user_sentiment?: string | null
        }
        Relationships: []
      }
      hirsch_casino_night_june13_call_logs: {
        Row: {
          answered: boolean | null
          assistant_id: string | null
          call_date: string | null
          call_direction: string | null
          call_duration_min: number | null
          call_duration_s: number | null
          call_id: string
          ended_reason: string | null
          latency: string | null
          phone_number: number | null
          recording_url: string | null
          summary: string | null
          transcript: string | null
          user_sentiment: string | null
        }
        Insert: {
          answered?: boolean | null
          assistant_id?: string | null
          call_date?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id: string
          ended_reason?: string | null
          latency?: string | null
          phone_number?: number | null
          recording_url?: string | null
          summary?: string | null
          transcript?: string | null
          user_sentiment?: string | null
        }
        Update: {
          answered?: boolean | null
          assistant_id?: string | null
          call_date?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id?: string
          ended_reason?: string | null
          latency?: string | null
          phone_number?: number | null
          recording_url?: string | null
          summary?: string | null
          transcript?: string | null
          user_sentiment?: string | null
        }
        Relationships: []
      }
      hirsch_casino_night_leads: {
        Row: {
          additional_questions: string | null
          attendee_email: string | null
          attendee_phone: string | null
          attending: boolean | null
          bringing_guest: boolean | null
          call_attempts: number | null
          callback_requested: boolean | null
          company: string | null
          completed: boolean | null
          created_at: string
          email: string | null
          error_status: string | null
          first_name: string | null
          google_sheet_row_id: number | null
          guest_name: string | null
          id: number
          last_call_date: string | null
          last_name: string | null
          next_call_date: string | null
          notes: string | null
          phone_e164: string | null
          primary_attendee_name: string | null
          status: string | null
          valid_phone_status: boolean | null
        }
        Insert: {
          additional_questions?: string | null
          attendee_email?: string | null
          attendee_phone?: string | null
          attending?: boolean | null
          bringing_guest?: boolean | null
          call_attempts?: number | null
          callback_requested?: boolean | null
          company?: string | null
          completed?: boolean | null
          created_at?: string
          email?: string | null
          error_status?: string | null
          first_name?: string | null
          google_sheet_row_id?: number | null
          guest_name?: string | null
          id?: number
          last_call_date?: string | null
          last_name?: string | null
          next_call_date?: string | null
          notes?: string | null
          phone_e164?: string | null
          primary_attendee_name?: string | null
          status?: string | null
          valid_phone_status?: boolean | null
        }
        Update: {
          additional_questions?: string | null
          attendee_email?: string | null
          attendee_phone?: string | null
          attending?: boolean | null
          bringing_guest?: boolean | null
          call_attempts?: number | null
          callback_requested?: boolean | null
          company?: string | null
          completed?: boolean | null
          created_at?: string
          email?: string | null
          error_status?: string | null
          first_name?: string | null
          google_sheet_row_id?: number | null
          guest_name?: string | null
          id?: number
          last_call_date?: string | null
          last_name?: string | null
          next_call_date?: string | null
          notes?: string | null
          phone_e164?: string | null
          primary_attendee_name?: string | null
          status?: string | null
          valid_phone_status?: boolean | null
        }
        Relationships: []
      }
      hirsch_inbound_sms: {
        Row: {
          body: string | null
          created_at: string
          from_phone: string | null
          id: number
        }
        Insert: {
          body?: string | null
          created_at?: string
          from_phone?: string | null
          id?: number
        }
        Update: {
          body?: string | null
          created_at?: string
          from_phone?: string | null
          id?: number
        }
        Relationships: []
      }
      hirsch_webhooks: {
        Row: {
          created_at: string
          error: string | null
          event: string
          id: number
          net_request_id: number | null
          payload: Json
          record_id: number
          table_name: string
          url: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event: string
          id?: number
          net_request_id?: number | null
          payload: Json
          record_id: number
          table_name: string
          url: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event?: string
          id?: number
          net_request_id?: number | null
          payload?: Json
          record_id?: number
          table_name?: string
          url?: string
        }
        Relationships: []
      }
      holidays_us: {
        Row: {
          date: string
          holiday: string
          id: number
        }
        Insert: {
          date: string
          holiday: string
          id?: number
        }
        Update: {
          date?: string
          holiday?: string
          id?: number
        }
        Relationships: []
      }
      import_calls_sept12: {
        Row: {
          assistant_id: string | null
          call_date: string | null
          call_direction: string | null
          call_duration_min: number | null
          call_duration_s: number | null
          call_id: string
          company_id: string | null
          ended_reason: string | null
          latency: number | null
          phone_number: number | null
          recording_url: string | null
          summary: string | null
          total_cost: number | null
          transcript: string | null
          user_sentiment: string | null
        }
        Insert: {
          assistant_id?: string | null
          call_date?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id: string
          company_id?: string | null
          ended_reason?: string | null
          latency?: number | null
          phone_number?: number | null
          recording_url?: string | null
          summary?: string | null
          total_cost?: number | null
          transcript?: string | null
          user_sentiment?: string | null
        }
        Update: {
          assistant_id?: string | null
          call_date?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id?: string
          company_id?: string | null
          ended_reason?: string | null
          latency?: number | null
          phone_number?: number | null
          recording_url?: string | null
          summary?: string | null
          total_cost?: number | null
          transcript?: string | null
          user_sentiment?: string | null
        }
        Relationships: []
      }
      import_calls_sept13: {
        Row: {
          assistant_id: string | null
          call_date: string | null
          call_direction: string | null
          call_duration_min: number | null
          call_duration_s: number | null
          call_id: string
          company_id: string | null
          ended_reason: string | null
          From: string | null
          latency: number | null
          phone_number: number | null
          recording_url: string | null
          summary: string | null
          To: string | null
          total_cost: number | null
          transcript: string | null
          user_sentiment: string | null
        }
        Insert: {
          assistant_id?: string | null
          call_date?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id: string
          company_id?: string | null
          ended_reason?: string | null
          From?: string | null
          latency?: number | null
          phone_number?: number | null
          recording_url?: string | null
          summary?: string | null
          To?: string | null
          total_cost?: number | null
          transcript?: string | null
          user_sentiment?: string | null
        }
        Update: {
          assistant_id?: string | null
          call_date?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id?: string
          company_id?: string | null
          ended_reason?: string | null
          From?: string | null
          latency?: number | null
          phone_number?: number | null
          recording_url?: string | null
          summary?: string | null
          To?: string | null
          total_cost?: number | null
          transcript?: string | null
          user_sentiment?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: string
          token: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          token?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          token?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_due: number | null
          collection_method: string | null
          company_id: string | null
          created_at: string | null
          currency: string | null
          due_at: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string
          subscription_id: string | null
          subtotal: number | null
          synced_at: string | null
          tax: number | null
          tax_percent: number | null
          total: number | null
          voided_at: string | null
        }
        Insert: {
          amount_due?: number | null
          collection_method?: string | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id: string
          subscription_id?: string | null
          subtotal?: number | null
          synced_at?: string | null
          tax?: number | null
          tax_percent?: number | null
          total?: number | null
          voided_at?: string | null
        }
        Update: {
          amount_due?: number | null
          collection_method?: string | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string
          subscription_id?: string | null
          subtotal?: number | null
          synced_at?: string | null
          tax?: number | null
          tax_percent?: number | null
          total?: number | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
        ]
      }
      invoices_v2: {
        Row: {
          amount_due: number
          collection_method: string | null
          company_id: string | null
          created_at: string
          currency: string
          due_at: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          metadata: Json | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string
          subscription_id: string | null
          subtotal: number
          synced_at: string
          tax: number | null
          total: number
          voided_at: string | null
        }
        Insert: {
          amount_due?: number
          collection_method?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          due_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          metadata?: Json | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id: string
          subscription_id?: string | null
          subtotal?: number
          synced_at?: string
          tax?: number | null
          total?: number
          voided_at?: string | null
        }
        Update: {
          amount_due?: number
          collection_method?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          due_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          metadata?: Json | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string
          subscription_id?: string | null
          subtotal?: number
          synced_at?: string
          tax?: number | null
          total?: number
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_v2_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "invoices_v2_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "invoices_v2_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
        ]
      }
      location_closures: {
        Row: {
          closure_date: string
          created_at: string | null
          created_by: string | null
          id: string
          location_id: string
          reason: string
          recurring: boolean
        }
        Insert: {
          closure_date: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id: string
          reason?: string
          recurring?: boolean
        }
        Update: {
          closure_date?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string
          reason?: string
          recurring?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "location_closures_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          agent_config: string | null
          agent_phone: string | null
          agent_prompt_data: Json | null
          business_hours: Json | null
          client_status: Database["public"]["Enums"]["client_status"] | null
          company_id: string
          config_editable: boolean
          created_at: string | null
          id: string
          intro_message: string | null
          location_name: string | null
          make_webhook_url: string | null
          modules_config: Json | null
          notification_emails: string[] | null
          phone_number: string | null
          phone_number_preference: string
          post_call_emails: string[] | null
          retell_llm_snapshot: Json | null
          timezone: string | null
          voice_gender: string | null
        }
        Insert: {
          address?: string | null
          agent_config?: string | null
          agent_phone?: string | null
          agent_prompt_data?: Json | null
          business_hours?: Json | null
          client_status?: Database["public"]["Enums"]["client_status"] | null
          company_id: string
          config_editable?: boolean
          created_at?: string | null
          id?: string
          intro_message?: string | null
          location_name?: string | null
          make_webhook_url?: string | null
          modules_config?: Json | null
          notification_emails?: string[] | null
          phone_number?: string | null
          phone_number_preference?: string
          post_call_emails?: string[] | null
          retell_llm_snapshot?: Json | null
          timezone?: string | null
          voice_gender?: string | null
        }
        Update: {
          address?: string | null
          agent_config?: string | null
          agent_phone?: string | null
          agent_prompt_data?: Json | null
          business_hours?: Json | null
          client_status?: Database["public"]["Enums"]["client_status"] | null
          company_id?: string
          config_editable?: boolean
          created_at?: string | null
          id?: string
          intro_message?: string | null
          location_name?: string | null
          make_webhook_url?: string | null
          modules_config?: Json | null
          notification_emails?: string[] | null
          phone_number?: string | null
          phone_number_preference?: string
          post_call_emails?: string[] | null
          retell_llm_snapshot?: Json | null
          timezone?: string | null
          voice_gender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          id: number
          type: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: number
          type?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: number
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
        ]
      }
      opex_subscriptions: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          is_active: boolean
          monthly_cost: number
          service_name: string
          started_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          monthly_cost?: number
          service_name: string
          started_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          monthly_cost?: number
          service_name?: string
          started_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          card_brand: string | null
          company_id: string | null
          currency: string | null
          customer_id: string | null
          id: string
          invoice_id: string | null
          invoice_pdf: string | null
          invoice_url: string | null
          last4: string | null
          payment_intent_id: string | null
          payment_ts: string | null
          plan_type: string | null
          receipt_url: string | null
          ref: string | null
          status: string | null
        }
        Insert: {
          amount: number
          card_brand?: string | null
          company_id?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_pdf?: string | null
          invoice_url?: string | null
          last4?: string | null
          payment_intent_id?: string | null
          payment_ts?: string | null
          plan_type?: string | null
          receipt_url?: string | null
          ref?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          card_brand?: string | null
          company_id?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_pdf?: string | null
          invoice_url?: string | null
          last4?: string | null
          payment_intent_id?: string | null
          payment_ts?: string | null
          plan_type?: string | null
          receipt_url?: string | null
          ref?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
        ]
      }
      payments_v2: {
        Row: {
          amount: number
          card_brand: string | null
          card_last4: string | null
          company_id: string | null
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          payment_ts: string
          receipt_url: string | null
          status: string
          stripe_charge_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount?: number
          card_brand?: string | null
          card_last4?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          payment_ts?: string
          receipt_url?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          card_brand?: string | null
          card_last4?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          payment_ts?: string
          receipt_url?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_v2_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payments_v2_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payments_v2_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          location_id: string | null
          monthly_cost: number
          phone_number: string
          provider: string
          provisioned_at: string | null
          retell_agent_id: string | null
          status: string
          twilio_sid: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          monthly_cost?: number
          phone_number: string
          provider?: string
          provisioned_at?: string | null
          retell_agent_id?: string | null
          status?: string
          twilio_sid?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          monthly_cost?: number
          phone_number?: string
          provider?: string
          provisioned_at?: string | null
          retell_agent_id?: string | null
          status?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "phone_numbers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "phone_numbers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "phone_numbers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          display_name: string | null
          id: string
          included_minutes: number | null
          name: string
          overage_rate_min: number | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          prepaid_rate_min: number | null
        }
        Insert: {
          display_name?: string | null
          id?: string
          included_minutes?: number | null
          name: string
          overage_rate_min?: number | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          prepaid_rate_min?: number | null
        }
        Update: {
          display_name?: string | null
          id?: string
          included_minutes?: number | null
          name?: string
          overage_rate_min?: number | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          prepaid_rate_min?: number | null
        }
        Relationships: []
      }
      portal_audit_log: {
        Row: {
          action: string
          actor_portal_user_id: string | null
          company_id: string
          created_at: string
          id: string
          metadata: Json
          target_portal_user_id: string | null
        }
        Insert: {
          action: string
          actor_portal_user_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_portal_user_id?: string | null
        }
        Update: {
          action?: string
          actor_portal_user_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_portal_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_audit_log_actor_portal_user_id_fkey"
            columns: ["actor_portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_audit_log_target_portal_user_id_fkey"
            columns: ["target_portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_notifications: {
        Row: {
          call_id: string | null
          company_id: string
          created_at: string
          id: string
          message: string
          metadata: Json
          portal_user_id: string | null
          read: boolean
          title: string
          type: string
        }
        Insert: {
          call_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          portal_user_id?: string | null
          read?: boolean
          title: string
          type: string
        }
        Update: {
          call_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          portal_user_id?: string | null
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_notifications_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "all_client_calls"
            referencedColumns: ["call_id"]
          },
          {
            foreignKeyName: "portal_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "portal_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "portal_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "portal_notifications_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_revenue_settings: {
        Row: {
          average_order_value: number
          category_settings: Json
          company_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          average_order_value?: number
          category_settings?: Json
          company_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          average_order_value?: number
          category_settings?: Json
          company_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_revenue_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "portal_revenue_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "portal_revenue_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
        ]
      }
      portal_setup_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          portal_user_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          portal_user_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          portal_user_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_setup_tokens_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_users: {
        Row: {
          auth_user_id: string
          company_id: string
          created_at: string
          email: string
          full_name: string | null
          has_completed_onboarding: boolean
          id: string
          invited_at: string
          invited_by: string | null
          is_owner: boolean
          last_sign_in_at: string | null
          role: string
          status: string
        }
        Insert: {
          auth_user_id: string
          company_id: string
          created_at?: string
          email: string
          full_name?: string | null
          has_completed_onboarding?: boolean
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_owner?: boolean
          last_sign_in_at?: string | null
          role?: string
          status?: string
        }
        Update: {
          auth_user_id?: string
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          has_completed_onboarding?: boolean
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_owner?: boolean
          last_sign_in_at?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "portal_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "portal_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
        ]
      }
      prompt_fragments: {
        Row: {
          agent_type: string
          content: string
          created_at: string | null
          description: string | null
          id: string
          slug: string
          state_id: string
        }
        Insert: {
          agent_type?: string
          content: string
          created_at?: string | null
          description?: string | null
          id?: string
          slug: string
          state_id?: string
        }
        Update: {
          agent_type?: string
          content?: string
          created_at?: string | null
          description?: string | null
          id?: string
          slug?: string
          state_id?: string
        }
        Relationships: []
      }
      raw_import_calls_sept15: {
        Row: {
          assistant_id: string | null
          call_date: string | null
          call_direction: string | null
          call_duration_min: number | null
          call_duration_s: number | null
          call_id: string
          company_id: string | null
          ended_reason: string | null
          latency: number | null
          recording_url: string | null
          summary: string | null
          total_cost: string | null
          user_sentiment: string | null
        }
        Insert: {
          assistant_id?: string | null
          call_date?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id: string
          company_id?: string | null
          ended_reason?: string | null
          latency?: number | null
          recording_url?: string | null
          summary?: string | null
          total_cost?: string | null
          user_sentiment?: string | null
        }
        Update: {
          assistant_id?: string | null
          call_date?: string | null
          call_direction?: string | null
          call_duration_min?: number | null
          call_duration_s?: number | null
          call_id?: string
          company_id?: string | null
          ended_reason?: string | null
          latency?: number | null
          recording_url?: string | null
          summary?: string | null
          total_cost?: string | null
          user_sentiment?: string | null
        }
        Relationships: []
      }
      referral_link: {
        Row: {
          company_id: string | null
          created_at: string
          id: number
          referral_code: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: number
          referral_code?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: number
          referral_code?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          business_name: string | null
          company_id: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: number
          referral_code: string | null
          status: string | null
        }
        Insert: {
          business_name?: string | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: number
          referral_code?: string | null
          status?: string | null
        }
        Update: {
          business_name?: string | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: number
          referral_code?: string | null
          status?: string | null
        }
        Relationships: []
      }
      retell_call_errors: {
        Row: {
          assistant_id: string | null
          call_direction: string | null
          call_id: string
          company_id: string | null
          error_type: string | null
          from_number: string | null
          imported_at: string
          occurred_at: string | null
          to_number: string | null
        }
        Insert: {
          assistant_id?: string | null
          call_direction?: string | null
          call_id: string
          company_id?: string | null
          error_type?: string | null
          from_number?: string | null
          imported_at?: string
          occurred_at?: string | null
          to_number?: string | null
        }
        Update: {
          assistant_id?: string | null
          call_direction?: string | null
          call_id?: string
          company_id?: string | null
          error_type?: string | null
          from_number?: string | null
          imported_at?: string
          occurred_at?: string | null
          to_number?: string | null
        }
        Relationships: []
      }
      retell_calls_june: {
        Row: {
          "Agent Name": string | null
          "Call Duration": string | null
          "Call ID": string
          Cost: number | null
          Time: string | null
        }
        Insert: {
          "Agent Name"?: string | null
          "Call Duration"?: string | null
          "Call ID": string
          Cost?: number | null
          Time?: string | null
        }
        Update: {
          "Agent Name"?: string | null
          "Call Duration"?: string | null
          "Call ID"?: string
          Cost?: number | null
          Time?: string | null
        }
        Relationships: []
      }
      review: {
        Row: {
          call_id: string | null
          check: boolean | null
          created_at: string
          id: number
          note: string | null
        }
        Insert: {
          call_id?: string | null
          check?: boolean | null
          created_at?: string
          id?: number
          note?: string | null
        }
        Update: {
          call_id?: string | null
          check?: boolean | null
          created_at?: string
          id?: number
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "all_client_calls"
            referencedColumns: ["call_id"]
          },
        ]
      }
      support_requests: {
        Row: {
          category: string
          company_id: string
          created_at: string
          id: string
          message: string
          metadata: Json
          portal_user_id: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          portal_user_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          portal_user_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "support_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "support_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "support_requests_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_errors: {
        Row: {
          created_at: string
          id: number
          service_name: string
          status_indicator: string
          status_message: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          service_name: string
          status_indicator: string
          status_message?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          service_name?: string
          status_indicator?: string
          status_message?: string | null
        }
        Relationships: []
      }
      twilio_expenses: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          expense_type: string
          id: string
          period_end: string
          period_start: string
          phone_number_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          expense_type: string
          id?: string
          period_end: string
          period_start: string
          phone_number_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          expense_type?: string
          id?: string
          period_end?: string
          period_start?: string
          phone_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twilio_expenses_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_cycle: {
        Row: {
          company_id: string | null
          cycle_end: string
          cycle_start: string
          id: string
          overage_cost: number | null
          updated_at: string | null
          used_minutes: number | null
        }
        Insert: {
          company_id?: string | null
          cycle_end: string
          cycle_start: string
          id?: string
          overage_cost?: number | null
          updated_at?: string | null
          used_minutes?: number | null
        }
        Update: {
          company_id?: string | null
          cycle_end?: string
          cycle_start?: string
          id?: string
          overage_cost?: number | null
          updated_at?: string | null
          used_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_cycle_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "usage_cycle_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_client_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "usage_cycle_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_company_billing"
            referencedColumns: ["company_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_sign_in_at: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          last_sign_in_at?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_sign_in_at?: string | null
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      latest_month: {
        Row: {
          avg_duration: number | null
          avg_latency: number | null
          avg_total_cost: number | null
          dropped_calls_pct: number | null
          month: string | null
          negative_sentiment_pct: number | null
          total_calls: number | null
          total_spent: number | null
        }
        Relationships: []
      }
      product_all_time_metrics: {
        Row: {
          avg_duration: number | null
          avg_latency: number | null
          avg_total_cost: number | null
          dropped_calls_pct: number | null
          negative_sentiment_pct: number | null
          total_calls: number | null
          total_spent: number | null
        }
        Relationships: []
      }
      product_monthly_metrics: {
        Row: {
          avg_duration: number | null
          avg_latency: number | null
          avg_total_cost: number | null
          dropped_calls_pct: number | null
          month: string | null
          negative_sentiment_pct: number | null
          total_calls: number | null
          total_spent: number | null
        }
        Relationships: []
      }
      product_trailing_30d_comparison: {
        Row: {
          change_pct: number | null
          current_30d: number | null
          metric: string | null
          previous_30d: number | null
        }
        Relationships: []
      }
      product_trailing_30d_comparison_chart: {
        Row: {
          current_30d: number | null
          metric: string | null
          previous_30d: number | null
        }
        Relationships: []
      }
      product_trailing_30d_current: {
        Row: {
          avg_duration: number | null
          avg_latency: number | null
          avg_total_cost: number | null
          dropped_calls_pct: number | null
          negative_sentiment_pct: number | null
          total_calls: number | null
          total_spent: number | null
        }
        Relationships: []
      }
      product_trailing_30d_metrics: {
        Row: {
          avg_duration: number | null
          avg_latency: number | null
          avg_total_cost: number | null
          dropped_calls_pct: number | null
          negative_sentiment_pct: number | null
          total_calls: number | null
          total_spent: number | null
          window_end: string | null
          window_start: string | null
        }
        Relationships: []
      }
      product_trailing_30d_previous: {
        Row: {
          avg_duration: number | null
          avg_latency: number | null
          avg_total_cost: number | null
          dropped_calls_pct: number | null
          negative_sentiment_pct: number | null
          total_calls: number | null
          total_spent: number | null
        }
        Relationships: []
      }
      trailing_30d: {
        Row: {
          avg_duration: number | null
          avg_latency: number | null
          avg_total_cost: number | null
          dropped_calls_pct: number | null
          negative_sentiment_pct: number | null
          total_calls: number | null
          total_spent: number | null
          window_end: string | null
          window_start: string | null
        }
        Relationships: []
      }
      v_client_summary: {
        Row: {
          active_assistants: number | null
          client_name: string | null
          company_id: string | null
          is_active: boolean | null
          status: Database["public"]["Enums"]["client_status"] | null
          total_call_minutes: number | null
          total_spend: number | null
        }
        Relationships: []
      }
      v_company_billing: {
        Row: {
          company_id: string | null
          cycle_end: string | null
          cycle_start: string | null
          overage_charges: number | null
          plan_name: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          remaining_minutes: number | null
          wallet_remaining: number | null
        }
        Relationships: []
      }
      v_daily_minutes_all_time: {
        Row: {
          call_date: string | null
          total_minutes: number | null
        }
        Relationships: []
      }
      v_daily_minutes_last_31_days: {
        Row: {
          call_date: string | null
          total_minutes: number | null
        }
        Relationships: []
      }
      v_invoice_unpaid_overdue_summary: {
        Row: {
          overdue_count: number | null
          overdue_total: number | null
          unpaid_count: number | null
          unpaid_total: number | null
        }
        Relationships: []
      }
      v_monthly_minutes_last_16_months: {
        Row: {
          month_start: string | null
          total_minutes: number | null
        }
        Relationships: []
      }
      v_total_minutes: {
        Row: {
          total_minutes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_agents_disabled: { Args: never; Returns: Json }
      admin_audit_log_filtered: {
        Args: {
          p_action?: string
          p_end_date?: string
          p_entity_type?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_order?: string
          p_start_date?: string
          p_user_id?: string
        }
        Returns: Json
      }
      admin_billing_overview_stats: { Args: never; Returns: Json }
      admin_call_minutes_monthly_change: { Args: never; Returns: Json }
      admin_client_calls_filtered: {
        Args: {
          p_agent_name?: string
          p_company_id?: string
          p_end_date?: string
          p_ended_reason?: string
          p_limit?: number
          p_location_id?: string
          p_max_duration_s?: number
          p_min_duration_s?: number
          p_offset?: number
          p_sort_by?: string
          p_sort_order?: string
          p_start_date?: string
          p_user_sentiment?: string
        }
        Returns: Json
      }
      admin_client_overview_stats: {
        Args: {
          p_company_id: string
          p_days?: number
          p_trial_end?: string
          p_trial_start?: string
        }
        Returns: Json
      }
      admin_client_summary_paginated: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      admin_clients_filtered: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_searchinfo?: string
          p_sort_by?: string
          p_sort_order?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_dashboard_client_stats: {
        Args: never
        Returns: {
          active_clients_total: number
          agent_created_clients_total: number
          new_clients_this_week: number
          paused_clients_total: number
          pending_clients_total: number
          trial_clients_current: number
          trial_clients_ending_next_3_days: number
        }[]
      }
      admin_dashboard_financial_stats: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      admin_invoices_filtered: {
        Args: {
          p_company_id?: string
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_sort_by?: string
          p_sort_order?: string
          p_start_date?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_invoices_v2_filtered: {
        Args: {
          p_company_id?: string
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_sort_column?: string
          p_sort_order?: string
          p_start_date?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_total_payments_sum: { Args: never; Returns: Json }
      current_portal_company_id: { Args: never; Returns: string }
      current_portal_user_id: { Args: never; Returns: string }
      demote_portal_user: {
        Args: { p_target_user_id: string }
        Returns: {
          auth_user_id: string
          company_id: string
          created_at: string
          email: string
          full_name: string | null
          has_completed_onboarding: boolean
          id: string
          invited_at: string
          invited_by: string | null
          is_owner: boolean
          last_sign_in_at: string | null
          role: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "portal_users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      disable_portal_user: {
        Args: { p_target_user_id: string }
        Returns: {
          auth_user_id: string
          company_id: string
          created_at: string
          email: string
          full_name: string | null
          has_completed_onboarding: boolean
          id: string
          invited_at: string
          invited_by: string | null
          is_owner: boolean
          last_sign_in_at: string | null
          role: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "portal_users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      filter_client_calls: {
        Args: { p_column: string; p_conditions: string }
        Returns: {
          total_count: number
          total_sum: number
        }[]
      }
      filter_client_calls_avg: {
        Args: { p_column: string; p_conditions: string }
        Returns: {
          total_count: number
          total_sum: number
        }[]
      }
      find_auth_user_id_by_email: { Args: { p_email: string }; Returns: string }
      generate_client_report_data: {
        Args: { p_company_id: string; p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_hourly_call_counts: {
        Args: {
          input_company_id: string
          input_end_date: string
          input_start_date: string
        }
        Returns: {
          call_count: number
          hour: number
        }[]
      }
      get_portal_call: {
        Args: { p_call_id: string }
        Returns: {
          agent_name: string | null
          agent_state: string | null
          agent_type: string | null
          ai_cost: number | null
          appointment_activity: boolean | null
          appointment_reviewed: boolean | null
          appointment_scheduled: boolean | null
          appointment_scheduling_review: boolean | null
          assistant_id: string | null
          call_date: string | null
          call_direction: string | null
          call_duration_min: number | null
          call_duration_s: number | null
          call_id: string
          call_outcome: string | null
          call_outcome_success: boolean | null
          call_successful: boolean | null
          client_notes: string | null
          company_id: string | null
          cycle_start: string | null
          database_id: number
          embedding: string | null
          ended_reason: string | null
          Hour: number | null
          in_voicemail: boolean | null
          latency: number | null
          location_id: string | null
          phone_number: number | null
          recording_url: string | null
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          summary: string | null
          telephony_cost: number | null
          tool_calls: Json | null
          total_cost: number | null
          total_cost_client: number | null
          transcript: string | null
          user_sentiment: string | null
          user_sentiment_num: number | null
        }
        SetofOptions: {
          from: "*"
          to: "all_client_calls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_portal_calls: {
        Args: {
          p_agent?: string
          p_direction?: string
          p_duration_max?: number
          p_duration_min?: number
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_outcome_null?: boolean
          p_outcomes?: string[]
          p_reviewed_state?: string
          p_search?: string
          p_sentiments?: string[]
          p_sort_by?: string
          p_sort_order?: string
          p_to?: string
        }
        Returns: {
          agent_name: string
          assistant_id: string
          call_date: string
          call_direction: string
          call_duration_s: number
          call_id: string
          call_outcome: string
          location_id: string
          phone_number: number
          reviewed: boolean
          summary: string
          total_count: number
          user_sentiment: string
        }[]
      }
      get_portal_notifications: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          call_id: string
          company_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json
          portal_user_id: string
          title: string
          total_count: number
          type: string
          unread_count: number
        }[]
      }
      get_portal_usage: {
        Args: {
          p_assistant_ids?: string[]
          p_from?: string
          p_limit?: number
          p_location_ids?: string[]
          p_offset?: number
          p_to?: string
        }
        Returns: {
          agent_name: string
          assistant_id: string
          call_date: string
          call_duration_s: number
          call_id: string
          call_outcome: string
          location_id: string
          location_name: string
          total_cost_client: number
          total_count: number
        }[]
      }
      get_total_client_cost: {
        Args: { input_company_id: string }
        Returns: number
      }
      get_unique_agents_by_company: {
        Args: { input_company_id: string }
        Returns: {
          agent_name: string
        }[]
      }
      invite_portal_user: {
        Args: {
          p_auth_user_id: string
          p_email: string
          p_full_name: string
          p_role: string
        }
        Returns: {
          auth_user_id: string
          company_id: string
          created_at: string
          email: string
          full_name: string | null
          has_completed_onboarding: boolean
          id: string
          invited_at: string
          invited_by: string | null
          is_owner: boolean
          last_sign_in_at: string | null
          role: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "portal_users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_portal_admin: { Args: never; Returns: boolean }
      mark_all_portal_notifications_read: { Args: never; Returns: undefined }
      mark_portal_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      match_calls: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_agent_name?: string
          p_company_id?: string
          p_end_date?: string
          p_location_id?: string
          p_start_date?: string
          query_embedding: string
        }
        Returns: {
          agent_name: string
          ai_cost: number
          appointment_activity: boolean
          appointment_reviewed: boolean
          appointment_scheduled: boolean
          appointment_scheduling_review: boolean
          assistant_id: string
          call_date: string
          call_direction: string
          call_duration_min: number
          call_duration_s: number
          call_id: string
          company_id: string
          cycle_start: string
          database_id: number
          ended_reason: string
          Hour: number
          latency: number
          location_id: string
          phone_number: number
          recording_url: string
          similarity: number
          summary: string
          telephony_cost: number
          total_cost: number
          total_cost_client: number
          transcript: string
          user_sentiment: string
          user_sentiment_num: number
        }[]
      }
      promote_portal_user: {
        Args: { p_target_user_id: string }
        Returns: {
          auth_user_id: string
          company_id: string
          created_at: string
          email: string
          full_name: string | null
          has_completed_onboarding: boolean
          id: string
          invited_at: string
          invited_by: string | null
          is_owner: boolean
          last_sign_in_at: string | null
          role: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "portal_users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      query_eligible_report_clients: {
        Args: never
        Returns: {
          company_id: string
          name: string
          report_emails: string[]
          report_frequency: string
          report_last_sent_at: string
        }[]
      }
      reenable_portal_user: {
        Args: { p_target_user_id: string }
        Returns: {
          auth_user_id: string
          company_id: string
          created_at: string
          email: string
          full_name: string | null
          has_completed_onboarding: boolean
          id: string
          invited_at: string
          invited_by: string | null
          is_owner: boolean
          last_sign_in_at: string | null
          role: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "portal_users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_call_notes: {
        Args: { p_call_id: string; p_notes: string }
        Returns: {
          agent_name: string | null
          agent_state: string | null
          agent_type: string | null
          ai_cost: number | null
          appointment_activity: boolean | null
          appointment_reviewed: boolean | null
          appointment_scheduled: boolean | null
          appointment_scheduling_review: boolean | null
          assistant_id: string | null
          call_date: string | null
          call_direction: string | null
          call_duration_min: number | null
          call_duration_s: number | null
          call_id: string
          call_outcome: string | null
          call_outcome_success: boolean | null
          call_successful: boolean | null
          client_notes: string | null
          company_id: string | null
          cycle_start: string | null
          database_id: number
          embedding: string | null
          ended_reason: string | null
          Hour: number | null
          in_voicemail: boolean | null
          latency: number | null
          location_id: string | null
          phone_number: number | null
          recording_url: string | null
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          summary: string | null
          telephony_cost: number | null
          tool_calls: Json | null
          total_cost: number | null
          total_cost_client: number | null
          transcript: string | null
          user_sentiment: string | null
          user_sentiment_num: number | null
        }
        SetofOptions: {
          from: "*"
          to: "all_client_calls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_call_reviewed: {
        Args: { p_call_id: string; p_reviewed: boolean }
        Returns: {
          agent_name: string | null
          agent_state: string | null
          agent_type: string | null
          ai_cost: number | null
          appointment_activity: boolean | null
          appointment_reviewed: boolean | null
          appointment_scheduled: boolean | null
          appointment_scheduling_review: boolean | null
          assistant_id: string | null
          call_date: string | null
          call_direction: string | null
          call_duration_min: number | null
          call_duration_s: number | null
          call_id: string
          call_outcome: string | null
          call_outcome_success: boolean | null
          call_successful: boolean | null
          client_notes: string | null
          company_id: string | null
          cycle_start: string | null
          database_id: number
          embedding: string | null
          ended_reason: string | null
          Hour: number | null
          in_voicemail: boolean | null
          latency: number | null
          location_id: string | null
          phone_number: number | null
          recording_url: string | null
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          summary: string | null
          telephony_cost: number | null
          tool_calls: Json | null
          total_cost: number | null
          total_cost_client: number | null
          transcript: string | null
          user_sentiment: string | null
          user_sentiment_num: number | null
        }
        SetofOptions: {
          from: "*"
          to: "all_client_calls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      client_status:
        | "pending"
        | "trial"
        | "active"
        | "revisions"
        | "paused"
        | "lost"
        | "agent_created"
      contact_role:
        | "owner"
        | "manager"
        | "front_desk"
        | "technician"
        | "bookkeeper"
        | "dispatcher"
        | "other"
      plan_type: "prepaid" | "subscription"
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
      client_status: [
        "pending",
        "trial",
        "active",
        "revisions",
        "paused",
        "lost",
        "agent_created",
      ],
      contact_role: [
        "owner",
        "manager",
        "front_desk",
        "technician",
        "bookkeeper",
        "dispatcher",
        "other",
      ],
      plan_type: ["prepaid", "subscription"],
    },
  },
} as const

