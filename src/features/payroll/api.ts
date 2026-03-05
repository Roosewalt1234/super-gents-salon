import { supabase } from "@/integrations/supabase/client";

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface PayrollEmployee {
  employee_id: string;
  employee_name: string;
  basic_salary: number;
  commission_rate: number;
  outstanding_loan_amount: number;
  loan_balance: number;
  visa_charges_bal: number;
  assigned_branch_id: string | null;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_month: string;
  month: string;
  total_days_worked: number;
  basic_salary: number;
  salary_earned: number;
  commission_amount: number;
  overtime_amount: number;
  bonus_amount: number;
  gross_pay: number;
  visa_charges_ded_amount: number;
  loan_ded_amount: number;
  adv_ded_amount: number;
  net_pay: number;
  notes: string | null;
  pay_date: string | null;
  status: string;
  processed_at: string | null;
}

export interface BranchOption {
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
}

/* ── Reference data ───────────────────────────────────────────────────────── */

export async function fetchPayrollBranches(tenantId: string): Promise<BranchOption[]> {
  const { data, error } = await supabase
    .from("branch_details")
    .select("branch_id, branch_name, shop_number")
    .eq("tenant_id", tenantId)
    .order("branch_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPayrollEmployees(
  tenantId: string,
  branchId?: string
): Promise<PayrollEmployee[]> {
  let query = supabase
    .from("employees")
    .select(
      "employee_id, employee_name, basic_salary, commission_rate, outstanding_loan_amount, loan_balance, visa_charges_bal, assigned_branch_id"
    )
    .eq("tenant_id", tenantId)
    .neq("is_archived", true)
    .order("employee_name", { ascending: true });

  if (branchId) query = query.eq("assigned_branch_id", branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    ...e,
    basic_salary: e.basic_salary ?? 0,
    commission_rate: e.commission_rate ?? 0,
    outstanding_loan_amount: e.outstanding_loan_amount ?? 0,
    loan_balance: e.loan_balance ?? 0,
    visa_charges_bal: e.visa_charges_bal ?? 0,
  }));
}

/* ── Payroll records ──────────────────────────────────────────────────────── */

/** month format: "YYYY-MM" e.g. "2026-03" */
export async function fetchPayrollRecords(
  tenantId: string,
  month: string
): Promise<PayrollRecord[]> {
  const { data, error } = await supabase
    .from("payroll_records")
    .select("*, employees(employee_name)")
    .eq("tenant_id", tenantId)
    .eq("month", month)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    ...r,
    employee_name: r.employees?.employee_name ?? "",
  }));
}

export async function isPayrollProcessed(
  tenantId: string,
  employeeId: string,
  month: string
): Promise<boolean> {
  const { data } = await supabase
    .from("payroll_records")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("month", month)
    .maybeSingle();
  return !!data;
}

/* ── Attendance ───────────────────────────────────────────────────────────── */

/** monthNum: "3" for March, year: 2026 */
export async function fetchAttendanceDays(
  tenantId: string,
  employeeId: string,
  monthNum: string,
  year: number
): Promise<number> {
  const { data } = await supabase
    .from("monthly_attendance")
    .select("total_days_worked")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("month", monthNum)
    .eq("year", year)
    .maybeSingle();
  return data?.total_days_worked ?? 0;
}

/* ── Commission ───────────────────────────────────────────────────────────── */

export async function fetchCommissionAmount(
  tenantId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
  commissionRate: number
): Promise<number> {
  const { data } = await supabase
    .from("daily_sales")
    .select("total_amount")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .gte("sale_date", startDate)
    .lte("sale_date", endDate);
  const totalSales = (data ?? []).reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
  return totalSales * (commissionRate / 100);
}

/* ── Process individual payroll ───────────────────────────────────────────── */

export interface ProcessPayrollArgs {
  tenantId: string;
  employeeId: string;
  branchId: string;
  month: string;        /* "YYYY-MM" */
  pay_month: string;    /* "March 2026" */
  year: number;
  daysWorked: number;
  daysInMonth: number;
  basicSalary: number;
  commissionAmount: number;
  overtimeAmount: number;
  bonusAmount: number;
  advDeduction: number;
  loanDeduction: number;
  visaDeduction: number;
  notes: string;
}

export async function processEmployeePayroll(args: ProcessPayrollArgs): Promise<void> {
  const {
    tenantId, employeeId, branchId, month, pay_month, year,
    daysWorked, daysInMonth, basicSalary, commissionAmount,
    overtimeAmount, bonusAmount, advDeduction, loanDeduction, visaDeduction, notes,
  } = args;

  const salaryEarned = daysInMonth > 0 ? (basicSalary / daysInMonth) * daysWorked : 0;
  const grossPay = salaryEarned + commissionAmount + overtimeAmount + bonusAmount;
  const netPay = grossPay - advDeduction - loanDeduction - visaDeduction;
  const today = new Date().toLocaleDateString("en-CA");

  const [yearPart, monthPart] = month.split("-");
  const periodStart = `${month}-01`;
  const periodEnd = new Date(parseInt(yearPart), parseInt(monthPart), 0)
    .toLocaleDateString("en-CA");

  const payload = {
    employee_id: employeeId,
    tenant_id: tenantId,
    pay_period_start: periodStart,
    pay_period_end: periodEnd,
    pay_month,
    month,
    total_days_worked: daysWorked,
    basic_salary: basicSalary,
    salary_earned: Math.round(salaryEarned * 100) / 100,
    commission_amount: Math.round(commissionAmount * 100) / 100,
    overtime_amount: overtimeAmount,
    bonus_amount: bonusAmount,
    gross_pay: Math.round(grossPay * 100) / 100,
    visa_charges_ded_amount: visaDeduction,
    loan_ded_amount: loanDeduction,
    adv_ded_amount: advDeduction,
    net_pay: Math.round(netPay * 100) / 100,
    notes: notes || null,
    pay_date: today,
    status: "processed",
    processed_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("payroll_records")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("month", month)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("payroll_records")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("payroll_records").insert(payload);
    if (error) throw new Error(error.message);
  }

  /* Apply deductions to balances */
  if (advDeduction > 0 || loanDeduction > 0 || visaDeduction > 0) {
    const { data: emp } = await supabase
      .from("employees")
      .select("outstanding_loan_amount, loan_balance, visa_charges_bal")
      .eq("employee_id", employeeId)
      .single();

    const updates: Record<string, number> = {};
    const monthNum = String(new Date().getMonth() + 1);

    if (advDeduction > 0) {
      const newBal = Math.max(0, (emp?.outstanding_loan_amount ?? 0) - advDeduction);
      updates.outstanding_loan_amount = newBal;
      await supabase.from("employee_advance_records").insert({
        tenant_id: tenantId,
        employee_id: employeeId,
        branch_id: branchId,
        amount_given: 0,
        amount_deducted: advDeduction,
        advance_balance: newBal,
        transaction_date: today,
        description: `Salary deduction — ${pay_month}`,
        month: monthNum,
      });
    }

    if (loanDeduction > 0) {
      const newBal = Math.max(0, (emp?.loan_balance ?? 0) - loanDeduction);
      updates.loan_balance = newBal;
      await supabase.from("employee_loan_transactions").insert({
        tenant_id: tenantId,
        employee_id: employeeId,
        loan_amount: 0,
        loan_balance: newBal,
        loan_deduction_amount: loanDeduction,
        transaction_date: today,
      });
    }

    if (visaDeduction > 0) {
      const newBal = Math.max(0, (emp?.visa_charges_bal ?? 0) - visaDeduction);
      updates.visa_charges_bal = newBal;
      await supabase.from("employee_visa_charges_transactions").insert({
        tenant_id: tenantId,
        employee_id: employeeId,
        visa_charges_amount: 0,
        visa_charges_balance: newBal,
        visa_charges_deduction_amount: visaDeduction,
        transaction_date: today,
      });
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("employees").update(updates).eq("employee_id", employeeId);
    }
  }
}

/* ── Add deduction (increases balance) ───────────────────────────────────── */

export async function addAdvanceGiven(
  tenantId: string,
  employeeId: string,
  branchId: string,
  amount: number,
  description: string
): Promise<void> {
  const { data: emp } = await supabase
    .from("employees")
    .select("outstanding_loan_amount")
    .eq("employee_id", employeeId)
    .single();
  const newBal = (emp?.outstanding_loan_amount ?? 0) + amount;
  const today = new Date().toLocaleDateString("en-CA");
  const monthNum = String(new Date().getMonth() + 1);

  const { error: insErr } = await supabase.from("employee_advance_records").insert({
    tenant_id: tenantId,
    employee_id: employeeId,
    branch_id: branchId,
    amount_given: amount,
    amount_deducted: 0,
    advance_balance: newBal,
    transaction_date: today,
    description: description || null,
    month: monthNum,
  });
  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await supabase
    .from("employees")
    .update({ outstanding_loan_amount: newBal })
    .eq("employee_id", employeeId);
  if (updErr) throw new Error(updErr.message);
}

export async function addLoanGiven(
  tenantId: string,
  employeeId: string,
  amount: number
): Promise<void> {
  const { data: emp } = await supabase
    .from("employees")
    .select("loan_balance")
    .eq("employee_id", employeeId)
    .single();
  const newBal = (emp?.loan_balance ?? 0) + amount;
  const today = new Date().toLocaleDateString("en-CA");

  const { error: insErr } = await supabase.from("employee_loan_transactions").insert({
    tenant_id: tenantId,
    employee_id: employeeId,
    loan_amount: amount,
    loan_balance: newBal,
    loan_deduction_amount: 0,
    transaction_date: today,
  });
  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await supabase
    .from("employees")
    .update({ loan_balance: newBal })
    .eq("employee_id", employeeId);
  if (updErr) throw new Error(updErr.message);
}

export async function addVisaChargesGiven(
  tenantId: string,
  employeeId: string,
  amount: number
): Promise<void> {
  const { data: emp } = await supabase
    .from("employees")
    .select("visa_charges_bal")
    .eq("employee_id", employeeId)
    .single();
  const newBal = (emp?.visa_charges_bal ?? 0) + amount;
  const today = new Date().toLocaleDateString("en-CA");

  const { error: insErr } = await supabase.from("employee_visa_charges_transactions").insert({
    tenant_id: tenantId,
    employee_id: employeeId,
    visa_charges_amount: amount,
    visa_charges_balance: newBal,
    visa_charges_deduction_amount: 0,
    transaction_date: today,
  });
  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await supabase
    .from("employees")
    .update({ visa_charges_bal: newBal })
    .eq("employee_id", employeeId);
  if (updErr) throw new Error(updErr.message);
}

/* ── Process deduction (decreases balance) ────────────────────────────────── */

export async function deductAdvance(
  tenantId: string,
  employeeId: string,
  branchId: string,
  amount: number
): Promise<void> {
  const { data: emp } = await supabase
    .from("employees")
    .select("outstanding_loan_amount")
    .eq("employee_id", employeeId)
    .single();
  const newBal = Math.max(0, (emp?.outstanding_loan_amount ?? 0) - amount);
  const today = new Date().toLocaleDateString("en-CA");
  const monthNum = String(new Date().getMonth() + 1);

  const { error: insErr } = await supabase.from("employee_advance_records").insert({
    tenant_id: tenantId,
    employee_id: employeeId,
    branch_id: branchId,
    amount_given: 0,
    amount_deducted: amount,
    advance_balance: newBal,
    transaction_date: today,
    month: monthNum,
  });
  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await supabase
    .from("employees")
    .update({ outstanding_loan_amount: newBal })
    .eq("employee_id", employeeId);
  if (updErr) throw new Error(updErr.message);
}

export async function deductLoan(
  tenantId: string,
  employeeId: string,
  amount: number
): Promise<void> {
  const { data: emp } = await supabase
    .from("employees")
    .select("loan_balance")
    .eq("employee_id", employeeId)
    .single();
  const newBal = Math.max(0, (emp?.loan_balance ?? 0) - amount);
  const today = new Date().toLocaleDateString("en-CA");

  const { error: insErr } = await supabase.from("employee_loan_transactions").insert({
    tenant_id: tenantId,
    employee_id: employeeId,
    loan_amount: 0,
    loan_balance: newBal,
    loan_deduction_amount: amount,
    transaction_date: today,
  });
  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await supabase
    .from("employees")
    .update({ loan_balance: newBal })
    .eq("employee_id", employeeId);
  if (updErr) throw new Error(updErr.message);
}

export async function deductVisaCharges(
  tenantId: string,
  employeeId: string,
  amount: number
): Promise<void> {
  const { data: emp } = await supabase
    .from("employees")
    .select("visa_charges_bal")
    .eq("employee_id", employeeId)
    .single();
  const newBal = Math.max(0, (emp?.visa_charges_bal ?? 0) - amount);
  const today = new Date().toLocaleDateString("en-CA");

  const { error: insErr } = await supabase.from("employee_visa_charges_transactions").insert({
    tenant_id: tenantId,
    employee_id: employeeId,
    visa_charges_amount: 0,
    visa_charges_balance: newBal,
    visa_charges_deduction_amount: amount,
    transaction_date: today,
  });
  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await supabase
    .from("employees")
    .update({ visa_charges_bal: newBal })
    .eq("employee_id", employeeId);
  if (updErr) throw new Error(updErr.message);
}
