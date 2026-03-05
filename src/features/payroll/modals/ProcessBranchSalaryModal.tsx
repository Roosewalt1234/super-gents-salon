import { useState, useCallback } from "react";
import { X, Building2, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PayrollEmployee,
  BranchOption,
  fetchPayrollEmployees,
  fetchPayrollRecords,
  processEmployeePayroll,
} from "../api";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface PayrollRow {
  employee: PayrollEmployee;
  daysWorked: number;
  daysInMonth: number;
  salaryEarned: number;
  commission: number;
  advDeduction: number;
  loanDeduction: number;
  visaDeduction: number;
  netPay: number;
  isProcessed: boolean;
  processing: boolean;
}

interface Props {
  open: boolean;
  tenantId: string;
  branches: BranchOption[];
  /** Pass "all" to show all-branches mode, or a specific branch_id */
  preselectedBranchId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MONTHS = [
  { value: 1,  label: "January"   },
  { value: 2,  label: "February"  },
  { value: 3,  label: "March"     },
  { value: 4,  label: "April"     },
  { value: 5,  label: "May"       },
  { value: 6,  label: "June"      },
  { value: 7,  label: "July"      },
  { value: 8,  label: "August"    },
  { value: 9,  label: "September" },
  { value: 10, label: "October"   },
  { value: 11, label: "November"  },
  { value: 12, label: "December"  },
];

const branchLabel = (b: BranchOption) =>
  b.shop_number ? `${b.shop_number} - ${b.branch_name}` : b.branch_name;

const fmt = (n: number) =>
  n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Component ──────────────────────────────────────────────────────────────── */

const ProcessBranchSalaryModal = ({
  open,
  tenantId,
  branches,
  preselectedBranchId,
  onClose,
  onSuccess,
}: Props) => {
  const now = new Date();
  /* "all" means all branches; "" means nothing selected yet */
  const [branchId, setBranchId] = useState(preselectedBranchId ?? "");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);

  if (!open) return null;

  const isAllBranches = branchId === "all";
  const monthKey    = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const monthNum    = String(selectedMonth);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const periodStart = `${monthKey}-01`;
  const periodEnd   = new Date(selectedYear, selectedMonth, 0).toLocaleDateString("en-CA");
  const pay_month   = `${MONTHS.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`;

  const loadPayroll = async () => {
    if (!branchId) { toast.error("Select a branch or All Branches"); return; }
    setLoading(true);
    try {
      /* Fetch employees — optionally filtered by branch */
      const employees = await fetchPayrollEmployees(
        tenantId,
        isAllBranches ? undefined : branchId
      );

      /* Attendance — all employees for that month/year */
      const attendanceRes = await supabase
        .from("monthly_attendance")
        .select("employee_id, total_days_worked")
        .eq("tenant_id", tenantId)
        .eq("month", monthNum)
        .eq("year", selectedYear);

      /* Sales — optionally filtered by branch */
      let salesQuery = supabase
        .from("daily_sales")
        .select("employee_id, total_amount")
        .eq("tenant_id", tenantId)
        .gte("sale_date", periodStart)
        .lte("sale_date", periodEnd);
      if (!isAllBranches) salesQuery = salesQuery.eq("branch_id", branchId);
      const salesRes = await salesQuery;

      /* Existing payroll records for this period */
      const payrollRecs = await fetchPayrollRecords(tenantId, monthKey);

      /* Build lookup maps */
      const attendanceMap = new Map<string, number>(
        (attendanceRes.data ?? []).map((a) => [a.employee_id, a.total_days_worked ?? 0])
      );
      const salesMap = new Map<string, number>();
      for (const s of salesRes.data ?? []) {
        salesMap.set(s.employee_id, (salesMap.get(s.employee_id) ?? 0) + (s.total_amount ?? 0));
      }
      const processedSet = new Set(payrollRecs.map((r) => r.employee_id));

      setRows(
        employees.map((emp) => {
          const daysWorked   = attendanceMap.get(emp.employee_id) ?? 0;
          const salaryEarned = daysInMonth > 0 ? (emp.basic_salary / daysInMonth) * daysWorked : 0;
          const totalSales   = salesMap.get(emp.employee_id) ?? 0;
          const commission   = totalSales * (emp.commission_rate / 100);
          const isProcessed  = processedSet.has(emp.employee_id);
          return {
            employee: emp,
            daysWorked,
            daysInMonth,
            salaryEarned,
            commission,
            advDeduction: 0,
            loanDeduction: 0,
            visaDeduction: 0,
            netPay: salaryEarned + commission,
            isProcessed,
            processing: false,
          };
        })
      );
      setLoaded(true);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  const recalcRow = (row: PayrollRow): PayrollRow => ({
    ...row,
    netPay:
      row.salaryEarned +
      row.commission -
      row.advDeduction -
      row.loanDeduction -
      row.visaDeduction,
  });

  const updateDeduction = (
    idx: number,
    field: "advDeduction" | "loanDeduction" | "visaDeduction",
    value: string
  ) => {
    setRows((prev) => {
      const next = [...prev];
      const updated = { ...next[idx], [field]: parseFloat(value) || 0 };
      next[idx] = recalcRow(updated);
      return next;
    });
  };

  const processRow = useCallback(
    async (idx: number, currentRows: PayrollRow[]) => {
      const row = currentRows[idx];
      const empBranchId = row.employee.assigned_branch_id ?? "";
      setRows((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], processing: true };
        return next;
      });
      try {
        await processEmployeePayroll({
          tenantId,
          employeeId: row.employee.employee_id,
          branchId: isAllBranches ? empBranchId : branchId,
          month: monthKey,
          pay_month,
          year: selectedYear,
          daysWorked: row.daysWorked,
          daysInMonth,
          basicSalary: row.employee.basic_salary,
          commissionAmount: row.commission,
          overtimeAmount: 0,
          bonusAmount: 0,
          advDeduction: row.advDeduction,
          loanDeduction: row.loanDeduction,
          visaDeduction: row.visaDeduction,
          notes: "",
        });
        setRows((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], isProcessed: true, processing: false };
          return next;
        });
        toast.success(`Processed: ${row.employee.employee_name}`);
        onSuccess();
      } catch (err: any) {
        setRows((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], processing: false };
          return next;
        });
        toast.error(`${row.employee.employee_name}: ${err.message ?? "Failed"}`);
      }
    },
    [tenantId, branchId, isAllBranches, monthKey, pay_month, selectedYear, daysInMonth, onSuccess]
  );

  const processAll = async () => {
    const snapshot = [...rows];
    const pending  = snapshot.map((r, i) => ({ r, i })).filter(({ r }) => !r.isProcessed);
    if (pending.length === 0) { toast.info("All employees already processed"); return; }
    setProcessingAll(true);
    for (const { i } of pending) {
      /* Pass fresh snapshot so each row uses its own deductions */
      await processRow(i, snapshot);
    }
    setProcessingAll(false);
  };

  const pendingCount = rows.filter((r) => !r.isProcessed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-5xl mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-none">
                {isAllBranches ? "Process All Salary" : "Process Branch Salary"}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isAllBranches
                  ? "Process monthly salary for all employees across all branches"
                  : "Process monthly salary for all branch employees"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5 flex-1 min-w-[180px]">
              <Label className="text-xs font-medium">Branch</Label>
              <Select
                value={branchId}
                onValueChange={(v) => { setBranchId(v); setLoaded(false); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id} value={b.branch_id}>
                      {branchLabel(b)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-[150px]">
              <Label className="text-xs font-medium">Month</Label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => { setSelectedMonth(Number(v)); setLoaded(false); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-[100px]">
              <Label className="text-xs font-medium">Year</Label>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => { setSelectedYear(Number(e.target.value)); setLoaded(false); }}
                min={2020}
                max={2100}
              />
            </div>
            <Button
              onClick={loadPayroll}
              disabled={loading || !branchId}
              className="gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Loading...</>
              ) : (
                <><RefreshCw className="w-4 h-4" />Load Payroll</>
              )}
            </Button>
            {loaded && pendingCount > 0 && (
              <Button
                onClick={processAll}
                disabled={processingAll}
                className="teal-gradient text-primary-foreground gap-2"
              >
                {processingAll ? "Processing..." : `Process All (${pendingCount})`}
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          {!loaded ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              {branchId
                ? "Click Load Payroll to fetch employee data"
                : "Select a branch and click Load Payroll"}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              No employees found for this selection
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Employee</th>
                  {isAllBranches && (
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Branch</th>
                  )}
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Days</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Basic</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Salary Earned</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Commission</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Adv Bal</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Adv Ded</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Loan Bal</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Loan Ded</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Visa Bal</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Visa Ded</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Net Pay</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const empBranch = branches.find(
                    (b) => b.branch_id === row.employee.assigned_branch_id
                  );
                  return (
                    <tr
                      key={row.employee.employee_id}
                      className={`border-t border-border/40 hover:bg-muted/10 transition-colors ${row.isProcessed ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                        {row.employee.employee_name}
                      </td>
                      {isAllBranches && (
                        <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {empBranch ? branchLabel(empBranch) : "—"}
                        </td>
                      )}
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                        {row.daysWorked}/{row.daysInMonth}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                        {fmt(row.employee.basic_salary)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-emerald-600 whitespace-nowrap">
                        {fmt(row.salaryEarned)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-amber-500 whitespace-nowrap">
                        {fmt(row.commission)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-orange-400 whitespace-nowrap">
                        {fmt(row.employee.outstanding_loan_amount)}
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          className="w-20 h-7 text-xs text-right tabular-nums"
                          value={row.advDeduction || ""}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          disabled={row.isProcessed}
                          onChange={(e) => updateDeduction(idx, "advDeduction", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-orange-400 whitespace-nowrap">
                        {fmt(row.employee.loan_balance)}
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          className="w-20 h-7 text-xs text-right tabular-nums"
                          value={row.loanDeduction || ""}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          disabled={row.isProcessed}
                          onChange={(e) => updateDeduction(idx, "loanDeduction", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-orange-400 whitespace-nowrap">
                        {fmt(row.employee.visa_charges_bal)}
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          className="w-20 h-7 text-xs text-right tabular-nums"
                          value={row.visaDeduction || ""}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          disabled={row.isProcessed}
                          onChange={(e) => updateDeduction(idx, "visaDeduction", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-foreground whitespace-nowrap">
                        {fmt(row.netPay)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {row.isProcessed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Processed
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={row.processing}
                            onClick={() => processRow(idx, rows)}
                            className="h-7 text-xs teal-gradient text-primary-foreground"
                          >
                            {row.processing ? (
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              "Process"
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {loaded && (
              <>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {rows.filter((r) => r.isProcessed).length} processed
                </span>
                {pendingCount > 0 && (
                  <span className="ml-3 inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {pendingCount} pending
                  </span>
                )}
              </>
            )}
          </p>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessBranchSalaryModal;
