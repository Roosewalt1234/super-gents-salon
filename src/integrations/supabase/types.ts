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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      branch_details: {
        Row: {
          barbers_count: number | null
          branch_id: string
          branch_name: string
          created_at: string
          created_by: string | null
          description: string | null
          establishment_card_expiry_date: string | null
          establishment_card_number: string | null
          has_partnership: boolean | null
          has_vat: boolean | null
          investment_percentage: number | null
          last_updated_by: string | null
          license_expiry_date: string | null
          license_number: string | null
          location: string | null
          number_of_chairs: number | null
          number_of_cheques: number | null
          partner_company_name: string | null
          partner_name: string | null
          phone: string | null
          profit_sharing_percentage: number | null
          rent_amount: number | null
          rental_agreement_expiry_date: string | null
          rental_agreement_number: string | null
          rental_agreement_start_date: string | null
          services_count: number | null
          shop_number: string | null
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          barbers_count?: number | null
          branch_id?: string
          branch_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          establishment_card_expiry_date?: string | null
          establishment_card_number?: string | null
          has_partnership?: boolean | null
          has_vat?: boolean | null
          investment_percentage?: number | null
          last_updated_by?: string | null
          license_expiry_date?: string | null
          license_number?: string | null
          location?: string | null
          number_of_chairs?: number | null
          number_of_cheques?: number | null
          partner_company_name?: string | null
          partner_name?: string | null
          phone?: string | null
          profit_sharing_percentage?: number | null
          rent_amount?: number | null
          rental_agreement_expiry_date?: string | null
          rental_agreement_number?: string | null
          rental_agreement_start_date?: string | null
          services_count?: number | null
          shop_number?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          barbers_count?: number | null
          branch_id?: string
          branch_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          establishment_card_expiry_date?: string | null
          establishment_card_number?: string | null
          has_partnership?: boolean | null
          has_vat?: boolean | null
          investment_percentage?: number | null
          last_updated_by?: string | null
          license_expiry_date?: string | null
          license_number?: string | null
          location?: string | null
          number_of_chairs?: number | null
          number_of_cheques?: number | null
          partner_company_name?: string | null
          partner_name?: string | null
          phone?: string | null
          profit_sharing_percentage?: number | null
          rent_amount?: number | null
          rental_agreement_expiry_date?: string | null
          rental_agreement_number?: string | null
          rental_agreement_start_date?: string | null
          services_count?: number | null
          shop_number?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_details_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales: {
        Row: {
          amount: number | null
          bank_charges: number | null
          branch_id: string
          created_at: string
          discount_amount: number | null
          discount_percentage: number | null
          employee_id: string | null
          payment_method: string | null
          sale_date: string
          sale_id: string
          sale_time: string | null
          service_id: string | null
          subtotal: number | null
          tenant_id: string
          total_amount: number | null
          updated_at: string
          vat_amount: number | null
          weekday: string | null
        }
        Insert: {
          amount?: number | null
          bank_charges?: number | null
          branch_id: string
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          employee_id?: string | null
          payment_method?: string | null
          sale_date?: string
          sale_id?: string
          sale_time?: string | null
          service_id?: string | null
          subtotal?: number | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
          weekday?: string | null
        }
        Update: {
          amount?: number | null
          bank_charges?: number | null
          branch_id?: string
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          employee_id?: string | null
          payment_method?: string | null
          sale_date?: string
          sale_id?: string
          sale_time?: string | null
          service_id?: string | null
          subtotal?: number | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
          weekday?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branch_details"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "daily_sales_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "daily_sales_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "default_services"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "daily_sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      default_services: {
        Row: {
          created_at: string
          created_by: string | null
          default_price: number | null
          description: string | null
          image_url: string | null
          service_duration: number | null
          service_id: string
          service_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_price?: number | null
          description?: string | null
          image_url?: string | null
          service_duration?: number | null
          service_id?: string
          service_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_price?: number | null
          description?: string | null
          image_url?: string | null
          service_duration?: number | null
          service_id?: string
          service_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      employee_advance_records: {
        Row: {
          advance_balance: number | null
          amount_deducted: number | null
          amount_given: number | null
          branch_id: string
          created_at: string
          description: string | null
          employee_id: string
          id: string
          month: string | null
          tenant_id: string
          transaction_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          advance_balance?: number | null
          amount_deducted?: number | null
          amount_given?: number | null
          branch_id: string
          created_at?: string
          description?: string | null
          employee_id: string
          id?: string
          month?: string | null
          tenant_id: string
          transaction_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          advance_balance?: number | null
          amount_deducted?: number | null
          amount_given?: number | null
          branch_id?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          id?: string
          month?: string | null
          tenant_id?: string
          transaction_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_advance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branch_details"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "employee_advance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_advance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_loan_transactions: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          loan_amount: number | null
          loan_balance: number | null
          loan_deduction_amount: number | null
          tenant_id: string
          transaction_date: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          loan_amount?: number | null
          loan_balance?: number | null
          loan_deduction_amount?: number | null
          tenant_id: string
          transaction_date?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          loan_amount?: number | null
          loan_balance?: number | null
          loan_deduction_amount?: number | null
          tenant_id?: string
          transaction_date?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_loan_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_loan_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          accommodation_amount: number | null
          address: string | null
          advance_balance: number | null
          assigned_branch_id: string | null
          basic_salary: number | null
          city: string | null
          commission_rate: number | null
          country: string | null
          created_at: string
          created_by: string | null
          current_visa_expiry_date: string | null
          current_visa_status: string | null
          date_of_birth: string | null
          email: string | null
          emirates_id_expiry_date: string | null
          emirates_id_number: string | null
          employee_id: string
          employee_name: string
          employee_number: string | null
          employment_type: string | null
          face_image_url: string | null
          food_allowance: number | null
          gender: string | null
          hire_date: string | null
          home_country_contact: string | null
          iloe_insurance_expiry_date: string | null
          iloe_insurance_number: string | null
          is_archived: boolean | null
          labor_card_expiry_date: string | null
          labor_card_number: string | null
          loan_balance: number | null
          medical_insurance_expiry_date: string | null
          medical_insurance_number: string | null
          nationality: string | null
          notes: string | null
          ohc_expiry_date: string | null
          ohc_number: string | null
          ot_amount: number | null
          outstanding_loan_amount: number | null
          part_time_card_expiry_date: string | null
          part_time_card_number: string | null
          passport_expiry_date: string | null
          passport_issue_date: string | null
          passport_issuing_country: string | null
          passport_number: string | null
          phone: string | null
          position: string | null
          postal_code: string | null
          profile_photo_url: string | null
          recommended_by: string | null
          referred_by: string | null
          state: string | null
          status: string | null
          tenant_id: string
          transport_amount: number | null
          updated_at: string
          updated_by: string | null
          visa_branch_id: string | null
          visa_charges_bal: number | null
          visa_expiry_date: string | null
          visa_issued_by: string | null
        }
        Insert: {
          accommodation_amount?: number | null
          address?: string | null
          advance_balance?: number | null
          assigned_branch_id?: string | null
          basic_salary?: number | null
          city?: string | null
          commission_rate?: number | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_visa_expiry_date?: string | null
          current_visa_status?: string | null
          date_of_birth?: string | null
          email?: string | null
          emirates_id_expiry_date?: string | null
          emirates_id_number?: string | null
          employee_id?: string
          employee_name: string
          employee_number?: string | null
          employment_type?: string | null
          face_image_url?: string | null
          food_allowance?: number | null
          gender?: string | null
          hire_date?: string | null
          home_country_contact?: string | null
          iloe_insurance_expiry_date?: string | null
          iloe_insurance_number?: string | null
          is_archived?: boolean | null
          labor_card_expiry_date?: string | null
          labor_card_number?: string | null
          loan_balance?: number | null
          medical_insurance_expiry_date?: string | null
          medical_insurance_number?: string | null
          nationality?: string | null
          notes?: string | null
          ohc_expiry_date?: string | null
          ohc_number?: string | null
          ot_amount?: number | null
          outstanding_loan_amount?: number | null
          part_time_card_expiry_date?: string | null
          part_time_card_number?: string | null
          passport_expiry_date?: string | null
          passport_issue_date?: string | null
          passport_issuing_country?: string | null
          passport_number?: string | null
          phone?: string | null
          position?: string | null
          postal_code?: string | null
          profile_photo_url?: string | null
          recommended_by?: string | null
          referred_by?: string | null
          state?: string | null
          status?: string | null
          tenant_id: string
          transport_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          visa_branch_id?: string | null
          visa_charges_bal?: number | null
          visa_expiry_date?: string | null
          visa_issued_by?: string | null
        }
        Update: {
          accommodation_amount?: number | null
          address?: string | null
          advance_balance?: number | null
          assigned_branch_id?: string | null
          basic_salary?: number | null
          city?: string | null
          commission_rate?: number | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_visa_expiry_date?: string | null
          current_visa_status?: string | null
          date_of_birth?: string | null
          email?: string | null
          emirates_id_expiry_date?: string | null
          emirates_id_number?: string | null
          employee_id?: string
          employee_name?: string
          employee_number?: string | null
          employment_type?: string | null
          face_image_url?: string | null
          food_allowance?: number | null
          gender?: string | null
          hire_date?: string | null
          home_country_contact?: string | null
          iloe_insurance_expiry_date?: string | null
          iloe_insurance_number?: string | null
          is_archived?: boolean | null
          labor_card_expiry_date?: string | null
          labor_card_number?: string | null
          loan_balance?: number | null
          medical_insurance_expiry_date?: string | null
          medical_insurance_number?: string | null
          nationality?: string | null
          notes?: string | null
          ohc_expiry_date?: string | null
          ohc_number?: string | null
          ot_amount?: number | null
          outstanding_loan_amount?: number | null
          part_time_card_expiry_date?: string | null
          part_time_card_number?: string | null
          passport_expiry_date?: string | null
          passport_issue_date?: string | null
          passport_issuing_country?: string | null
          passport_number?: string | null
          phone?: string | null
          position?: string | null
          postal_code?: string | null
          profile_photo_url?: string | null
          recommended_by?: string | null
          referred_by?: string | null
          state?: string | null
          status?: string | null
          tenant_id?: string
          transport_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          visa_branch_id?: string | null
          visa_charges_bal?: number | null
          visa_expiry_date?: string | null
          visa_issued_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_assigned_branch_id_fkey"
            columns: ["assigned_branch_id"]
            isOneToOne: false
            referencedRelation: "branch_details"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_visa_branch_id_fkey"
            columns: ["visa_branch_id"]
            isOneToOne: false
            referencedRelation: "branch_details"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          owner_id: string | null
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_id?: string | null
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string | null
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "tenant_admin" | "staff"
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
      app_role: ["superadmin", "tenant_admin", "staff"],
    },
  },
} as const
