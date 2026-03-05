import { useState, useEffect } from "react";
import { X, UserCog, RefreshCw, CheckCircle2 } from "lucide-react";
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
  processEmployeePayroll,
  isPayrollProcessed,
} from "../api";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface CalcData {
  daysWorked: number;
  daysInMonth: number;
  salaryEarned: number;
  commission: number;
  isProcessed: boolean;
}

interface Props {
  open: boolean;
  tenantId: string;
  employees: PayrollEmployee[];
  branches: BranchOption[];
  preselectedEmployeeId?: string;
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

const fmt = (n: number) =>
  n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Component ──────────────────────────────────────────────────────────────── */

const ProcessIndividualSalaryModal = ({
  open,
  tenantId,
  employees,
  branches,
  preselectedEmployeeId,
  onClose,
  onSuccess,
}: Props) => {
  const now = new Date();
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId ?? "");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [calcData, setCalcData] = useState<CalcData | null>(null);
  const [loading, setLoading] = useState(false);

  const [advDeduction, setAdvDeduction] = useState("");
  const [loanDeduction, setLoanDeduction] = useState("");
  const [visaDeduction, setVisaDeduction] = useState("");
  const [overtime, setOvertime] = useState("");
  const [bonus, setBonus] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const selectedEmp = employees.find((e) => e.employee_id === employeeId);
  const monthKey    = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const monthNum    = String(selectedMonth);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const pay_month   = `${MONTHS.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`;
  const periodStart = `${monthKey}-01`;
  const periodEnd   = new Date(selectedYear, selectedMonth, 0).toLocaleDateString("en-CA");

  const advDed  = parseFloat(advDeduction)  || 0;
  const loanDed = parseFloat(loanDeduction) || 0;
  const visaDed = parseFloat(visaDeduction) || 0;
  const ot      = parseFloat(overtime)      || 0;
  const bon     = parseFloat(bonus)         || 0;

  const salaryEarned  = calcData ? calcData.salaryEarned : 0;
  const commission    = calcData ? calcData.commission   : 0;
  const grossPay      = salaryEarned + commission + ot + bon;
  const netPay        = grossPay - advDed - loanDed - visaDed;

  const loadCalc = async () => {
    if (!employeeId) { toast.error("Select an employee"); return; }
    if (!selectedEmp) return;
    setLoading(true);
    try {
      const [attendanceRes, salesRes, alreadyProcessed] = await Promise.all([
        supabase
          .from("monthly_attendance")
          .select("total_days_worked")
          .eq("tenant_id", tenantId)
          .eq("employee_id", employeeId)
          .eq("month", monthNum)
          .eq("year", selectedYear)
          .maybeSingle(),
        supabase
          .from("daily_sales")
          .select("total_amount")
          .eq("tenant_id", tenantId)
          .eq("employee_id", employeeId)
          .gte("sale_date", periodStart)
          .lte("sale_date", periodEnd),
        isPayrollProcessed(tenantId, employeeId, monthKey),
      ]);

      const daysWorked   = attendanceRes.data?.total_days_worked ?? 0;
      const salaryEarned = daysInMonth > 0 ? (selectedEmp.basic_salary / daysInMonth) * daysWorked : 0;
      const totalSales   = (salesRes.data ?? []).reduce((s, r) => s + (r.total_amount ?? 0), 0);
      const commission   = totalSales * (selectedEmp.commission_rate / 100);

      setCalcData({ daysWorked, daysInMonth, salaryEarned, commission, isProcessed: alreadyProcessed });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  /* Auto-load when employee/month/year changes and employee is selected */
  useEffect(() => {
    if (employeeId && open) {
      setCalcData(null);
    }
  }, [employeeId, selectedMonth, selectedYear]);

  const handleProcess = async () => {
    if (!employeeId || !selectedEmp) { toast.error("Select an employee"); return; }
    if (!calcData) { toast.error("Click Load Calculation first"); return; }

    const branchId = selectedEmp.assigned_branch_id ?? branches[0]?.branch_id ?? "";
    if (!branchId) { toast.error("Employee has no assigned branch"); return; }

    setSaving(true);
    try {
      await processEmployeePayroll({
        tenantId,
        employeeId,
        branchId,
        month: monthKey,
        pay_month,
        year: selectedYear,
        daysWorked: calcData.daysWorked,
        daysInMonth,
        basicSalary: selectedEmp.basic_salary,
        commissionAmount: commission,
        overtimeAmount: ot,
        bonusAmount: bon,
        advDeduction: advDed,
        loanDeduction: loanDed,
        visaDeduction: visaDed,
        notes,
      });
      toast.success("Salary processed successfully");
      setCalcData((prev) => prev ? { ...prev, isProcessed: true } : null);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to process salary");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-none">Process Individual Salary</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Calculate and process employee monthly salary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Employee + Period selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.employee_id} value={e.employee_id}>
                      {e.employee_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Month</Label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(Number(v))}
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
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Year</Label>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                min={2020}
                max={2100}
              />
            </div>
          </div>

          {/* Load button */}
          <Button
            variant="outline"
            onClick={loadCalc}
            disabled={loading || !employeeId}
            className="w-full gap-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Loading...</>
            ) : (
              <><RefreshCw className="w-4 h-4" />Load Calculation</>
            )}
          </Button>

          {/* Salary breakdown */}
          {calcData && selectedEmp && (
            <>
              {calcData.isProcessed && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-500/10 rounded-xl px-4 py-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Salary already processed for {pay_month}. You can re-process to update.
                </div>
              )}

              {/* Earnings */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span className="font-medium">AED {fmt(selectedEmp.basic_salary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days Worked</span>
                    <span className="font-medium">{calcData.daysWorked} / {daysInMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Salary Earned</span>
                    <span className="font-semibold text-emerald-600">AED {fmt(calcData.salaryEarned)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission ({selectedEmp.commission_rate}%)</span>
                    <span className="font-semibold text-amber-500">AED {fmt(calcData.commission)}</span>
                  </div>
                </div>

                {/* OT + Bonus */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Overtime (AED)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={overtime}
                      onChange={(e) => setOvertime(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Bonus (AED)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={bonus}
                      onChange={(e) => setBonus(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductions</p>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Advance Deduction</p>
                      <p className="text-[11px] text-orange-500">Balance: AED {fmt(selectedEmp.outstanding_loan_amount)}</p>
                    </div>
                    <Input
                      type="number"
                      className="w-28 h-8 text-sm text-right"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={advDeduction}
                      onChange={(e) => setAdvDeduction(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Loan Deduction</p>
                      <p className="text-[11px] text-orange-500">Balance: AED {fmt(selectedEmp.loan_balance)}</p>
                    </div>
                    <Input
                      type="number"
                      className="w-28 h-8 text-sm text-right"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={loanDeduction}
                      onChange={(e) => setLoanDeduction(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Visa Charges Deduction</p>
                      <p className="text-[11px] text-orange-500">Balance: AED {fmt(selectedEmp.visa_charges_bal)}</p>
                    </div>
                    <Input
                      type="number"
                      className="w-28 h-8 text-sm text-right"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={visaDeduction}
                      onChange={(e) => setVisaDeduction(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Net Pay summary */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Gross Pay</span>
                  <span className="font-semibold">AED {fmt(grossPay)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Total Deductions</span>
                  <span className="font-semibold text-destructive">- AED {fmt(advDed + loanDed + visaDed)}</span>
                </div>
                <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Net Pay</span>
                  <span className={`text-lg font-bold ${netPay >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    AED {fmt(netPay)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Notes (optional)</Label>
                <Input
                  placeholder="Any remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-border shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleProcess}
            disabled={saving || !calcData}
            className="teal-gradient text-primary-foreground"
          >
            {saving ? "Processing..." : "Process Salary"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessIndividualSalaryModal;
