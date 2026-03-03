import { supabase } from "@/integrations/supabase/client";

export interface Employee {
  employee_id: string;
  employee_name: string;
  employee_number: string | null;
  position: string | null;
  employment_type: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  status: string | null;
  assigned_branch_id: string | null;
  basic_salary: number | null;
  hire_date: string | null;
  tenant_id: string;
  is_archived: boolean | null;
  outstanding_loan_amount: number | null;
  loan_balance: number | null;
  visa_charges_bal: number | null;
}

export interface CreateEmployeePayload {
  // Identity
  employee_name: string;
  employee_number: string | null;
  profile_photo_url: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  current_visa_status: string | null;
  current_visa_expiry_date: string | null;
  notes: string | null;
  // Employment
  referred_by: string | null;
  employment_type: string | null;
  hire_date: string | null;
  basic_salary: number | null;
  food_allowance: number | null;
  ot_amount: number | null;
  accommodation_amount: number | null;
  transport_amount: number | null;
  commission_rate: number | null;
  position: string | null;
  assigned_branch_id: string | null;
  status: string;
  // Documents
  visa_branch_id: string | null;
  visa_issued_by: string | null;
  visa_expiry_date: string | null;
  passport_number: string | null;
  passport_expiry_date: string | null;
  emirates_id_number: string | null;
  emirates_id_expiry_date: string | null;
  ohc_number: string | null;
  ohc_expiry_date: string | null;
  iloe_insurance_number: string | null;
  iloe_insurance_expiry_date: string | null;
  labor_card_number: string | null;
  labor_card_expiry_date: string | null;
  medical_insurance_number: string | null;
  medical_insurance_expiry_date: string | null;
  part_time_card_number: string | null;
  part_time_card_expiry_date: string | null;
  // System
  tenant_id: string;
  created_by: string;
  updated_by: string;
}

export async function fetchEmployees(tenantId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select(
      "employee_id, employee_name, employee_number, position, employment_type, gender, phone, email, nationality, status, assigned_branch_id, basic_salary, hire_date, tenant_id, is_archived, outstanding_loan_amount, loan_balance, visa_charges_bal"
    )
    .eq("tenant_id", tenantId)
    .neq("is_archived", true)
    .order("employee_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createEmployee(
  payload: CreateEmployeePayload
): Promise<void> {
  const { error } = await supabase.from("employees").insert(payload);
  if (error) throw new Error(error.message);
}

export type FullEmployee = CreateEmployeePayload & { employee_id: string };

export async function fetchEmployeeById(employeeId: string): Promise<FullEmployee> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("employee_id", employeeId)
    .single();
  if (error) throw new Error(error.message);
  return data as FullEmployee;
}

export type UpdateEmployeePayload = Omit<CreateEmployeePayload, "tenant_id" | "created_by">;

export async function updateEmployee(
  employeeId: string,
  payload: UpdateEmployeePayload
): Promise<void> {
  const { error } = await supabase
    .from("employees")
    .update(payload)
    .eq("employee_id", employeeId);
  if (error) throw new Error(error.message);
}
