import { supabase } from "@/integrations/supabase/client";

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface SaleRecord {
  sale_id: string;
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
  employee_id: string | null;
  employee_name: string | null;
  service_id: string | null;
  service_name: string | null;
  amount: number | null;
  subtotal: number | null;
  discount_amount: number | null;
  discount_percentage: number | null;
  vat_amount: number | null;
  bank_charges: number | null;
  total_amount: number | null;
  payment_method: string | null;
  sale_date: string;
  sale_time: string | null;
  weekday: string | null;
  created_at: string;
}

export interface CreateSalePayload {
  tenant_id: string;
  branch_id: string;
  employee_id: string | null;
  service_id: string | null;
  amount: number;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  vat_amount: number;
  bank_charges: number;
  total_amount: number;
  payment_method: string;
  sale_date: string;
  sale_time: string;
  weekday: string;
}

export interface BranchOption {
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
  has_vat: boolean | null;
}

export interface EmployeeOption {
  employee_id: string;
  employee_name: string;
  assigned_branch_id: string | null;
}

export interface ServiceOption {
  service_id: string;
  service_name: string;
  price: number | null;
}

/* ── Fetch ────────────────────────────────────────────────────────────────── */

export async function fetchSales(
  tenantId: string,
  fromDate: string,
  toDate: string,
  branchId?: string
): Promise<SaleRecord[]> {
  let query = supabase
    .from("daily_sales")
    .select(
      `sale_id, branch_id, employee_id, service_id,
       amount, subtotal, discount_amount, discount_percentage,
       vat_amount, bank_charges, total_amount,
       payment_method, sale_date, sale_time, weekday, created_at,
       branch_details!inner(branch_name, shop_number),
       employees(employee_name),
       default_services(service_name)`
    )
    .eq("tenant_id", tenantId)
    .gte("sale_date", fromDate)
    .lte("sale_date", toDate)
    .order("sale_date", { ascending: false })
    .order("sale_time", { ascending: false });

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    sale_id: row.sale_id,
    branch_id: row.branch_id,
    branch_name: row.branch_details?.branch_name ?? "",
    shop_number: row.branch_details?.shop_number ?? null,
    employee_id: row.employee_id,
    employee_name: row.employees?.employee_name ?? null,
    service_id: row.service_id,
    service_name: row.default_services?.service_name ?? null,
    amount: row.amount,
    subtotal: row.subtotal,
    discount_amount: row.discount_amount,
    discount_percentage: row.discount_percentage,
    vat_amount: row.vat_amount,
    bank_charges: row.bank_charges,
    total_amount: row.total_amount,
    payment_method: row.payment_method,
    sale_date: row.sale_date,
    sale_time: row.sale_time,
    weekday: row.weekday,
    created_at: row.created_at,
  }));
}

export async function fetchBranchOptions(tenantId: string): Promise<BranchOption[]> {
  const { data, error } = await supabase
    .from("branch_details")
    .select("branch_id, branch_name, shop_number, has_vat")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("branch_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchEmployeeOptions(tenantId: string): Promise<EmployeeOption[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("employee_id, employee_name, assigned_branch_id")
    .eq("tenant_id", tenantId)
    .neq("is_archived", true)
    .order("employee_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchBranchServices(branchId: string): Promise<ServiceOption[]> {
  const { data, error } = await supabase
    .from("branches_active_services")
    .select("service_id, price, default_services(service_name)")
    .eq("branch_id", branchId)
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    service_id: row.service_id,
    service_name: row.default_services?.service_name ?? "",
    price: row.price,
  })).sort((a, b) => a.service_name.localeCompare(b.service_name));
}

/* ── Create / Update / Delete ─────────────────────────────────────────────── */

export async function createSale(payload: CreateSalePayload): Promise<void> {
  const { error } = await supabase.from("daily_sales").insert(payload);
  if (error) throw new Error(error.message);
}

export async function updateSale(
  saleId: string,
  tenantId: string,
  payload: Omit<CreateSalePayload, "tenant_id">
): Promise<void> {
  const { error } = await supabase
    .from("daily_sales")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("sale_id", saleId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export async function deleteSale(saleId: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from("daily_sales")
    .delete()
    .eq("sale_id", saleId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}
