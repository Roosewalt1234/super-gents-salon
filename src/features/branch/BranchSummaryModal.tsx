import { useEffect, useState } from "react";
import { X, BarChart2, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface PeriodSummary {
  label: string;
  isCurrent: boolean;
  sales: number;
  expenses: number;
  salaries: number;
  commission: number;
  rent: number;
}

interface Props {
  open: boolean;
  branchId: string;
  branchName: string;
  tenantId: string;
  onClose: () => void;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function toDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-AE", { month: "long", year: "numeric" });
}

/* ── Component ──────────────────────────────────────────────────────────────── */

const BranchSummaryModal = ({ open, branchId, branchName, tenantId, onClose }: Props) => {
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<PeriodSummary[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchData();
  }, [open, branchId]);

  const fetchData = async () => {
    setLoading(true);

    const now = new Date();

    /* Build 3 period definitions: months -2, -1, 0 (current) */
    interface PeriodDef {
      label: string;
      startStr: string;
      endStr: string;
      days: number;
      totalDays: number;
      isCurrent: boolean;
    }

    const pDefs: PeriodDef[] = [2, 1, 0].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const totalDays = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const isCurrent = offset === 0;
      const end = isCurrent ? now : new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return {
        label: monthLabel(d),
        startStr: toDateStr(d),
        endStr: toDateStr(end),
        days: isCurrent ? now.getDate() : totalDays,
        totalDays,
        isCurrent,
      };
    });

    const rangeStart = pDefs[0].startStr;
    const rangeEnd   = pDefs[2].endStr; // today

    const [branchRes, employeeRes, salesRes, expensesRes] = await Promise.all([
      supabase
        .from("branch_details")
        .select("rent_amount")
        .eq("branch_id", branchId)
        .single(),
      supabase
        .from("employees")
        .select("employee_id, basic_salary, commission_rate")
        .eq("assigned_branch_id", branchId)
        .eq("tenant_id", tenantId)
        .neq("is_archived", true),
      supabase
        .from("daily_sales")
        .select("sale_date, total_amount, employee_id")
        .eq("branch_id", branchId)
        .eq("tenant_id", tenantId)
        .gte("sale_date", rangeStart)
        .lte("sale_date", rangeEnd),
      supabase
        .from("expenses_register")
        .select("transaction_date, amount")
        .eq("branch_id", branchId)
        .eq("tenant_id", tenantId)
        .gte("transaction_date", rangeStart)
        .lte("transaction_date", rangeEnd),
    ]);

    const rentAmount         = (branchRes.data?.rent_amount ?? 0) as number;
    const dailyRent          = rentAmount / 365;
    const totalMonthlySalary = (employeeRes.data ?? []).reduce(
      (s, e) => s + (e.basic_salary ?? 0), 0
    );

    /* commission_rate lookup: employee_id -> rate (as fraction, e.g. 0.05 for 5%) */
    const commissionRateMap = new Map<string, number>();
    for (const emp of employeeRes.data ?? []) {
      commissionRateMap.set(emp.employee_id, (emp.commission_rate ?? 0) / 100);
    }

    /* Aggregate sales and commissions per period */
    const salesMap      = new Map<string, number>();
    const commissionMap = new Map<string, number>();
    for (const row of salesRes.data ?? []) {
      const p = pDefs.find((p) => row.sale_date >= p.startStr && row.sale_date <= p.endStr);
      if (!p) continue;
      const amount = row.total_amount ?? 0;
      salesMap.set(p.startStr, (salesMap.get(p.startStr) ?? 0) + amount);
      if (row.employee_id) {
        const rate = commissionRateMap.get(row.employee_id) ?? 0;
        commissionMap.set(p.startStr, (commissionMap.get(p.startStr) ?? 0) + amount * rate);
      }
    }

    /* Aggregate expenses per period */
    const expensesMap = new Map<string, number>();
    for (const row of expensesRes.data ?? []) {
      const p = pDefs.find((p) => row.transaction_date >= p.startStr && row.transaction_date <= p.endStr);
      if (p) expensesMap.set(p.startStr, (expensesMap.get(p.startStr) ?? 0) + (row.amount ?? 0));
    }

    setPeriods(
      pDefs.map((p) => ({
        label: p.label,
        isCurrent: p.isCurrent,
        sales: salesMap.get(p.startStr) ?? 0,
        expenses: expensesMap.get(p.startStr) ?? 0,
        salaries: p.isCurrent
          ? totalMonthlySalary * (p.days / p.totalDays)
          : totalMonthlySalary,
        commission: commissionMap.get(p.startStr) ?? 0,
        rent: dailyRent * p.days,
      }))
    );
    setLoading(false);
  };

  if (!open) return null;

  const fmt = (n: number) =>
    n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const rows: { key: keyof PeriodSummary; label: string; colorClass: string }[] = [
    { key: "sales",      label: "Sales",            colorClass: "text-emerald-600" },
    { key: "expenses",   label: "Expenses",         colorClass: "text-orange-500"  },
    { key: "salaries",   label: "Salaries",         colorClass: "text-blue-500"    },
    { key: "commission", label: "Sales Commission", colorClass: "text-amber-500"   },
    { key: "rent",       label: "Rent",             colorClass: "text-purple-500"  },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-none">{branchName} — Summary</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Sales, costs & profit overview</p>
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
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">

              {/* Column headers */}
              <div className="grid grid-cols-[160px_1fr_1fr_1fr] gap-2 mb-4">
                <div />
                {periods.map((p) => (
                  <div
                    key={p.label}
                    className={`text-center rounded-xl py-2.5 px-2 space-y-0.5 ${
                      p.isCurrent ? "bg-primary/10 border border-primary/20" : "bg-muted/40"
                    }`}
                  >
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${p.isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                      {p.label}
                    </p>
                    {p.isCurrent && (
                      <p className="text-[10px] text-primary/70 font-medium">to date</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Sales / Expenses / Salaries / Rent rows */}
              {rows.map(({ key, label, colorClass }) => (
                <div key={key} className="grid grid-cols-[160px_1fr_1fr_1fr] gap-2 items-center py-1.5 rounded-lg hover:bg-muted/20 px-1">
                  <span className="text-sm font-medium text-muted-foreground">{label}</span>
                  {periods.map((p) => (
                    <div key={p.label} className="text-right pr-3">
                      <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>
                        {fmt(p[key] as number)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Divider */}
              <div className="border-t border-border my-2" />

              {/* Total Costs */}
              <div className="grid grid-cols-[160px_1fr_1fr_1fr] gap-2 items-center py-1.5 px-1">
                <span className="text-sm font-semibold text-foreground">Total Costs</span>
                {periods.map((p) => {
                  const total = p.expenses + p.salaries + p.commission + p.rent;
                  return (
                    <div key={p.label} className="text-right pr-3">
                      <span className="text-sm font-semibold text-destructive tabular-nums">
                        {fmt(total)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-border my-2" />

              {/* Profit */}
              <div className="grid grid-cols-[160px_1fr_1fr_1fr] gap-2 items-center">
                <span className="text-sm font-bold text-foreground pl-1">Profit / Loss</span>
                {periods.map((p) => {
                  const profit = p.sales - p.expenses - p.salaries - p.commission - p.rent;
                  const positive = profit >= 0;
                  return (
                    <div
                      key={p.label}
                      className={`rounded-xl py-2.5 px-2 text-center ${
                        positive ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-destructive/10 border border-destructive/20"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        {positive
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          : <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                        <span className={`text-base font-bold tabular-nums ${positive ? "text-emerald-600" : "text-destructive"}`}>
                          {fmt(profit)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="px-6 py-3 border-t border-border shrink-0">
          <p className="text-[11px] text-muted-foreground">
            Amounts in AED. Salaries are based on current employee basic salaries (prorated for the current month). Commission = total sales × each employee's commission rate. Rent = annual rent ÷ 365 × days in period.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BranchSummaryModal;
