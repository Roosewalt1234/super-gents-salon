import { supabase } from "@/integrations/supabase/client";

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface ExpenseRecord {
  id: string;
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
  category_id: string;
  category_name: string;
  sub_category_id: string | null;
  sub_category_name: string | null;
  employee_id: string | null;
  employee_name: string | null;
  amount: number | null;
  payment_method: string | null;
  transaction_date: string;
  vendor_name: string | null;
  receipt_number: string | null;
  description: string | null;
  created_at: string;
}

export interface CreateExpensePayload {
  tenant_id: string;
  branch_id: string;
  category_id: string;
  sub_category_id: string | null;
  employee_id: string | null;
  amount: number;
  payment_method: string;
  transaction_date: string;
  vendor_name: string | null;
  receipt_number: string | null;
  description: string | null;
  created_by: string | null;
}

export interface CategoryOption {
  category_id: string;
  category_name: string;
}

export interface SubCategoryOption {
  sub_category_id: string;
  sub_category_name: string;
  category_id: string;
}

export interface ExpenseBranchOption {
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
}

export interface ExpenseEmployeeOption {
  employee_id: string;
  employee_name: string;
  assigned_branch_id: string | null;
}

/* ── Fetch ────────────────────────────────────────────────────────────────── */

export async function fetchExpenses(
  tenantId: string,
  fromDate: string,
  toDate: string,
  branchId?: string,
  categoryId?: string
): Promise<ExpenseRecord[]> {
  let query = supabase
    .from("expenses_register")
    .select(
      `id, branch_id, category_id, sub_category_id, employee_id,
       amount, payment_method, transaction_date,
       vendor_name, receipt_number, description, created_at,
       branch_details!inner(branch_name, shop_number),
       expenses_category!inner(category_name),
       expenses_sub_category(sub_category_name),
       employees(employee_name)`
    )
    .eq("tenant_id", tenantId)
    .gte("transaction_date", fromDate)
    .lte("transaction_date", toDate)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    branch_id: row.branch_id,
    branch_name: row.branch_details?.branch_name ?? "",
    shop_number: row.branch_details?.shop_number ?? null,
    category_id: row.category_id,
    category_name: row.expenses_category?.category_name ?? "",
    sub_category_id: row.sub_category_id,
    sub_category_name: row.expenses_sub_category?.sub_category_name ?? null,
    employee_id: row.employee_id,
    employee_name: row.employees?.employee_name ?? null,
    amount: row.amount,
    payment_method: row.payment_method,
    transaction_date: row.transaction_date,
    vendor_name: row.vendor_name,
    receipt_number: row.receipt_number,
    description: row.description,
    created_at: row.created_at,
  }));
}

export async function fetchCategories(): Promise<CategoryOption[]> {
  const { data, error } = await supabase
    .from("expenses_category")
    .select("category_id, category_name")
    .order("category_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchSubCategories(): Promise<SubCategoryOption[]> {
  const { data, error } = await supabase
    .from("expenses_sub_category")
    .select("sub_category_id, sub_category_name, category_id")
    .order("sub_category_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchExpenseBranches(tenantId: string): Promise<ExpenseBranchOption[]> {
  const { data, error } = await supabase
    .from("branch_details")
    .select("branch_id, branch_name, shop_number")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("branch_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchExpenseEmployees(tenantId: string): Promise<ExpenseEmployeeOption[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("employee_id, employee_name, assigned_branch_id")
    .eq("tenant_id", tenantId)
    .neq("is_archived", true)
    .order("employee_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/* ── Create / Update / Delete ─────────────────────────────────────────────── */

export async function createExpense(payload: CreateExpensePayload): Promise<void> {
  const { error } = await supabase.from("expenses_register").insert(payload);
  if (error) throw new Error(error.message);
}

export async function updateExpense(
  id: string,
  tenantId: string,
  userId: string | null,
  payload: Omit<CreateExpensePayload, "tenant_id" | "created_by">
): Promise<void> {
  const { error } = await supabase
    .from("expenses_register")
    .update({ ...payload, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export async function deleteExpense(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from("expenses_register")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}
