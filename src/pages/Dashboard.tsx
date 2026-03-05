import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp,
  TrendingDown,
  Store,
  Users,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ShoppingCart,
  UserCog,
  BarChart2,
  MapPin,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface BranchStat {
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
  status: string | null;
  todaySales: number;
  mtdSales: number;
  mtdExpenses: number;
}

interface RecentSale {
  sale_id: string;
  branch_name: string;
  shop_number: string | null;
  total_amount: number;
  sale_date: string;
  payment_method: string | null;
}

interface DashboardData {
  todaySales: number;
  todayExpenses: number;
  todayTransactions: number;
  mtdSales: number;
  mtdExpenses: number;
  prevMtdSales: number;
  activeBranches: number;
  totalBranches: number;
  totalEmployees: number;
  totalAdvanceBalance: number;
  totalLoanBalance: number;
  totalVisaCharges: number;
  branchStats: BranchStat[];
  recentSales: RecentSale[];
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
};

const pctChange = (current: number, previous: number): number | null => {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

const branchLabel = (b: { branch_name: string; shop_number: string | null }) =>
  b.shop_number ? `${b.shop_number} - ${b.branch_name}` : b.branch_name;

/* ── Component ──────────────────────────────────────────────────────────────── */

const Dashboard = () => {
  const { user, role, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [fetching, setFetching] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (profile?.tenant_id) loadDashboard();
  }, [profile?.tenant_id]);

  const loadDashboard = async () => {
    const tenantId = profile!.tenant_id!;
    setFetching(true);

    const now         = new Date();
    const today       = now.toLocaleDateString("en-CA");
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA");
    const prevStart   = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("en-CA");
    const prevEnd     = new Date(now.getFullYear(), now.getMonth(), 0).toLocaleDateString("en-CA");

    const [
      branchRes,
      empRes,
      todaySalesRes,
      mtdSalesRes,
      prevSalesRes,
      todayExpRes,
      mtdExpRes,
      recentRes,
    ] = await Promise.all([
      supabase
        .from("branch_details")
        .select("branch_id, branch_name, shop_number, status")
        .eq("tenant_id", tenantId),
      supabase
        .from("employees")
        .select("outstanding_loan_amount, loan_balance, visa_charges_bal")
        .eq("tenant_id", tenantId)
        .neq("is_archived", true),
      supabase
        .from("daily_sales")
        .select("branch_id, total_amount")
        .eq("tenant_id", tenantId)
        .eq("sale_date", today),
      supabase
        .from("daily_sales")
        .select("branch_id, total_amount")
        .eq("tenant_id", tenantId)
        .gte("sale_date", monthStart)
        .lte("sale_date", today),
      supabase
        .from("daily_sales")
        .select("total_amount")
        .eq("tenant_id", tenantId)
        .gte("sale_date", prevStart)
        .lte("sale_date", prevEnd),
      supabase
        .from("expenses_register")
        .select("branch_id, amount")
        .eq("tenant_id", tenantId)
        .eq("transaction_date", today),
      supabase
        .from("expenses_register")
        .select("branch_id, amount")
        .eq("tenant_id", tenantId)
        .gte("transaction_date", monthStart)
        .lte("transaction_date", today),
      supabase
        .from("daily_sales")
        .select("sale_id, branch_id, total_amount, sale_date, payment_method, branch_details(branch_name, shop_number)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    /* ── Aggregate sales by branch ── */
    const todaySalesByBranch = new Map<string, number>();
    for (const r of todaySalesRes.data ?? []) {
      todaySalesByBranch.set(r.branch_id, (todaySalesByBranch.get(r.branch_id) ?? 0) + (r.total_amount ?? 0));
    }

    const mtdSalesByBranch = new Map<string, number>();
    for (const r of mtdSalesRes.data ?? []) {
      mtdSalesByBranch.set(r.branch_id, (mtdSalesByBranch.get(r.branch_id) ?? 0) + (r.total_amount ?? 0));
    }

    const mtdExpByBranch = new Map<string, number>();
    for (const r of mtdExpRes.data ?? []) {
      mtdExpByBranch.set(r.branch_id, (mtdExpByBranch.get(r.branch_id) ?? 0) + (r.amount ?? 0));
    }

    /* ── Totals ── */
    const todaySales    = [...todaySalesByBranch.values()].reduce((a, b) => a + b, 0);
    const todayExpenses = (todayExpRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
    const mtdSales      = [...mtdSalesByBranch.values()].reduce((a, b) => a + b, 0);
    const mtdExpenses   = [...mtdExpByBranch.values()].reduce((a, b) => a + b, 0);
    const prevMtdSales  = (prevSalesRes.data ?? []).reduce((s, r) => s + (r.total_amount ?? 0), 0);

    /* ── HR totals ── */
    const employees = empRes.data ?? [];
    const totalAdvanceBalance = employees.reduce((s, e) => s + (e.outstanding_loan_amount ?? 0), 0);
    const totalLoanBalance    = employees.reduce((s, e) => s + (e.loan_balance ?? 0), 0);
    const totalVisaCharges    = employees.reduce((s, e) => s + (e.visa_charges_bal ?? 0), 0);

    /* ── Branch stats ── */
    const branches = branchRes.data ?? [];
    const branchStats: BranchStat[] = branches
      .map((b) => ({
        branch_id:    b.branch_id,
        branch_name:  b.branch_name,
        shop_number:  b.shop_number,
        status:       b.status,
        todaySales:   todaySalesByBranch.get(b.branch_id) ?? 0,
        mtdSales:     mtdSalesByBranch.get(b.branch_id) ?? 0,
        mtdExpenses:  mtdExpByBranch.get(b.branch_id) ?? 0,
      }))
      .sort((a, b) => b.mtdSales - a.mtdSales);

    /* ── Recent sales ── */
    const recentSales: RecentSale[] = (recentRes.data ?? []).map((r: any) => ({
      sale_id:        r.sale_id,
      branch_name:    r.branch_details?.branch_name ?? "",
      shop_number:    r.branch_details?.shop_number ?? null,
      total_amount:   r.total_amount ?? 0,
      sale_date:      r.sale_date,
      payment_method: r.payment_method,
    }));

    setData({
      todaySales,
      todayExpenses,
      todayTransactions: todaySalesRes.data?.length ?? 0,
      mtdSales,
      mtdExpenses,
      prevMtdSales,
      activeBranches: branches.filter((b) => (b.status || "active").toLowerCase() === "active").length,
      totalBranches:  branches.length,
      totalEmployees: employees.length,
      totalAdvanceBalance,
      totalLoanBalance,
      totalVisaCharges,
      branchStats,
      recentSales,
    });

    setFetching(false);
  };

  /* ── Guards ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role === "superadmin") return <Navigate to="/admin" replace />;

  /* ── Derived ── */
  const todayNet   = (data?.todaySales ?? 0) - (data?.todayExpenses ?? 0);
  const mtdNet     = (data?.mtdSales ?? 0) - (data?.mtdExpenses ?? 0);
  const salePct    = pctChange(data?.mtdSales ?? 0, data?.prevMtdSales ?? 0);

  const now = new Date();

  /* ── KPI card helper ── */
  const KpiCard = ({
    label, value, sub, icon: Icon, gradient, pct, delay = 0,
  }: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    gradient: string;
    pct?: number | null;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} px-5 py-5 shadow-md hover:shadow-lg transition-shadow`}
    >
      {/* Decorative circles */}
      <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-white/15 pointer-events-none" />
      <div className="absolute right-4 -bottom-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />

      <div className="relative flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold text-black/70 uppercase tracking-widest">{label}</p>
        <Icon className="w-5 h-5 text-black/60 shrink-0" />
      </div>
      <p className="relative text-2xl font-bold tabular-nums leading-tight text-black">
        {value}
      </p>
      {sub && <p className="relative text-[11px] text-black/60 mt-1">{sub}</p>}
      {pct !== undefined && pct !== null && (
        <p className="relative text-[11px] font-semibold mt-1.5 text-black/80">
          {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% vs last month
        </p>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen mesh-gradient">
      <AppHeader
        title="Dashboard"
        subtitle={`Welcome back, ${profile?.full_name || "there"}!`}
      />

      <main className="container py-8 space-y-6">

        {fetching ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* ── TODAY KPIs ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Today</p>
                <button
                  onClick={loadDashboard}
                  disabled={fetching}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <TrendingUp className={`w-3.5 h-3.5 ${fetching ? "animate-pulse" : ""}`} />
                  {fetching ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  label="Revenue"
                  value={`AED ${fmtCompact(data.todaySales)}`}
                  sub={`${data.todayTransactions} transaction${data.todayTransactions !== 1 ? "s" : ""}`}
                  icon={ShoppingCart}
                  gradient="from-emerald-500/40 to-teal-600/40"
                  delay={0}
                />
                <KpiCard
                  label="Expenses"
                  value={`AED ${fmtCompact(data.todayExpenses)}`}
                  icon={Receipt}
                  gradient="from-orange-500/40 to-red-500/40"
                  delay={0.04}
                />
                <KpiCard
                  label="Net Profit"
                  value={`AED ${fmtCompact(todayNet)}`}
                  icon={todayNet >= 0 ? TrendingUp : TrendingDown}
                  gradient={todayNet >= 0 ? "from-teal-500/40 to-cyan-600/40" : "from-red-500/40 to-rose-600/40"}
                  delay={0.08}
                />
                <KpiCard
                  label="Active Branches"
                  value={String(data.activeBranches)}
                  sub={`of ${data.totalBranches} total`}
                  icon={Store}
                  gradient="from-purple-500/40 to-indigo-600/40"
                  delay={0.12}
                />
              </div>
            </div>

            {/* ── MONTH-TO-DATE KPIs ── */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                {now.toLocaleDateString("en-AE", { month: "long" })} — Month to Date
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  label="MTD Revenue"
                  value={`AED ${fmtCompact(data.mtdSales)}`}
                  icon={TrendingUp}
                  gradient="from-emerald-500/40 to-teal-600/40"
                  pct={salePct}
                  delay={0.16}
                />
                <KpiCard
                  label="MTD Expenses"
                  value={`AED ${fmtCompact(data.mtdExpenses)}`}
                  icon={Receipt}
                  gradient="from-orange-500/40 to-red-500/40"
                  delay={0.20}
                />
                <KpiCard
                  label="MTD Net Profit"
                  value={`AED ${fmtCompact(mtdNet)}`}
                  icon={mtdNet >= 0 ? TrendingUp : TrendingDown}
                  gradient={mtdNet >= 0 ? "from-teal-500/40 to-cyan-600/40" : "from-red-500/40 to-rose-600/40"}
                  delay={0.24}
                />
                <KpiCard
                  label="Total Employees"
                  value={String(data.totalEmployees)}
                  icon={Users}
                  gradient="from-blue-500/40 to-indigo-600/40"
                  delay={0.28}
                />
              </div>
            </div>

            {/* ── BRANCH PERFORMANCE + RECENT SALES ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

              {/* Branch performance table */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.3 }}
                className="lg:col-span-3 bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Branch Performance (MTD)</h3>
                  </div>
                  <button
                    onClick={() => navigate("/branch_management")}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Manage →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">#</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Branch</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Today</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">MTD Sales</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">MTD Exp</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.branchStats.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-xs">
                            No branch data available
                          </td>
                        </tr>
                      ) : (
                        data.branchStats.map((b, i) => {
                          const net = b.mtdSales - b.mtdExpenses;
                          return (
                            <tr key={b.branch_id} className="border-t border-border/40 hover:bg-muted/10 transition-colors">
                              <td className="px-5 py-3">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  i === 0 ? "bg-amber-400/20 text-amber-600"
                                  : i === 1 ? "bg-slate-400/20 text-slate-600"
                                  : i === 2 ? "bg-orange-400/20 text-orange-600"
                                  : "bg-muted text-muted-foreground"
                                }`}>
                                  {i + 1}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <p className="font-medium text-foreground text-xs whitespace-nowrap">{branchLabel(b)}</p>
                                <span className={`text-[10px] font-bold ${
                                  (b.status || "active").toLowerCase() === "active"
                                    ? "text-emerald-600"
                                    : "text-destructive"
                                }`}>
                                  {(b.status || "ACTIVE").toUpperCase()}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                                {fmt(b.todaySales)}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-xs font-semibold text-emerald-600 whitespace-nowrap">
                                {fmt(b.mtdSales)}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-xs text-orange-500 whitespace-nowrap">
                                {fmt(b.mtdExpenses)}
                              </td>
                              <td className="px-5 py-3 text-right tabular-nums text-xs font-bold whitespace-nowrap">
                                <span className={net >= 0 ? "text-primary" : "text-destructive"}>
                                  {fmt(net)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {data.branchStats.length > 0 && (
                      <tfoot className="bg-muted/20 border-t border-border">
                        <tr>
                          <td colSpan={2} className="px-5 py-2.5 text-xs font-bold text-foreground">Total</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-xs font-bold text-muted-foreground">
                            {fmt(data.todaySales)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-xs font-bold text-emerald-600">
                            {fmt(data.mtdSales)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-xs font-bold text-orange-500">
                            {fmt(data.mtdExpenses)}
                          </td>
                          <td className={`px-5 py-2.5 text-right tabular-nums text-xs font-bold ${mtdNet >= 0 ? "text-primary" : "text-destructive"}`}>
                            {fmt(mtdNet)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </motion.div>

              {/* Right panel: HR Snapshot + Recent Sales */}
              <div className="lg:col-span-2 flex flex-col gap-5">

                {/* HR Financial Snapshot */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36, duration: 0.3 }}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Wallet className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">HR Financial Snapshot</h3>
                    </div>
                    <button
                      onClick={() => navigate("/hr_management")}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      View HR →
                    </button>
                  </div>
                  <div className="p-5 space-y-3">
                    {[
                      {
                        label: "Total Employees",
                        value: String(data.totalEmployees),
                        icon: Users,
                        color: "text-blue-500",
                        bg: "bg-blue-500/10",
                        numeric: false,
                      },
                      {
                        label: "Outstanding Advances",
                        value: `AED ${fmt(data.totalAdvanceBalance)}`,
                        icon: CreditCard,
                        color: data.totalAdvanceBalance > 0 ? "text-orange-500" : "text-muted-foreground",
                        bg: data.totalAdvanceBalance > 0 ? "bg-orange-500/10" : "bg-muted/40",
                        numeric: true,
                      },
                      {
                        label: "Loan Balance",
                        value: `AED ${fmt(data.totalLoanBalance)}`,
                        icon: data.totalLoanBalance > 0 ? AlertCircle : Minus,
                        color: data.totalLoanBalance > 0 ? "text-destructive" : "text-muted-foreground",
                        bg: data.totalLoanBalance > 0 ? "bg-destructive/10" : "bg-muted/40",
                        numeric: true,
                      },
                      {
                        label: "Visa Charges Balance",
                        value: `AED ${fmt(data.totalVisaCharges)}`,
                        icon: data.totalVisaCharges > 0 ? AlertCircle : Minus,
                        color: data.totalVisaCharges > 0 ? "text-purple-500" : "text-muted-foreground",
                        bg: data.totalVisaCharges > 0 ? "bg-purple-500/10" : "bg-muted/40",
                        numeric: true,
                      },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${row.bg}`}>
                            <row.icon className={`w-3.5 h-3.5 ${row.color}`} />
                          </div>
                          <span className="text-xs text-muted-foreground truncate">{row.label}</span>
                        </div>
                        <span className={`text-xs font-semibold tabular-nums whitespace-nowrap ${row.color}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Recent Sales */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.40, duration: 0.3 }}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex-1"
                >
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Recent Sales</h3>
                    </div>
                    <button
                      onClick={() => navigate("/sales_register")}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      All Sales →
                    </button>
                  </div>
                  <div className="divide-y divide-border/40">
                    {data.recentSales.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No recent sales</p>
                    ) : (
                      data.recentSales.map((s) => (
                        <div key={s.sale_id} className="px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {branchLabel({ branch_name: s.branch_name, shop_number: s.shop_number })}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {s.sale_date}
                              {s.payment_method && (
                                <span className="ml-1.5 capitalize">{s.payment_method}</span>
                              )}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                            AED {fmt(s.total_amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ── QUICK ACTIONS ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.3 }}
              className="bg-card rounded-2xl border border-border shadow-sm p-5"
            >
              <h3 className="text-sm font-bold text-foreground mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  {
                    label: "Sales Register",
                    icon: ShoppingCart,
                    path: "/sales_register",
                    color: "text-emerald-600 bg-emerald-500/10",
                    border: "from-emerald-400/45 via-emerald-400/15 to-transparent",
                    glow: "from-emerald-500/35 via-teal-500/25 to-sky-500/35",
                  },
                  {
                    label: "Expenses",
                    icon: Receipt,
                    path: "/expenses_register",
                    color: "text-orange-500 bg-orange-500/10",
                    border: "from-orange-400/45 via-amber-400/15 to-transparent",
                    glow: "from-orange-500/35 via-amber-500/25 to-rose-500/30",
                  },
                  {
                    label: "Branches",
                    icon: Store,
                    path: "/branch_management",
                    color: "text-primary bg-primary/10",
                    border: "from-cyan-400/45 via-sky-400/15 to-transparent",
                    glow: "from-cyan-500/35 via-blue-500/25 to-indigo-500/30",
                  },
                  {
                    label: "HR Management",
                    icon: UserCog,
                    path: "/hr_management",
                    color: "text-blue-500 bg-blue-500/10",
                    border: "from-blue-400/45 via-indigo-400/15 to-transparent",
                    glow: "from-blue-500/35 via-indigo-500/25 to-violet-500/30",
                  },
                  {
                    label: "Payroll",
                    icon: Wallet,
                    path: "/payroll_management",
                    color: "text-purple-500 bg-purple-500/10",
                    border: "from-violet-400/45 via-fuchsia-400/15 to-transparent",
                    glow: "from-violet-500/35 via-fuchsia-500/25 to-indigo-500/30",
                  },
                  {
                    label: "Reports",
                    icon: BarChart2,
                    path: "/reports",
                    color: "text-primary bg-primary/10",
                    border: "from-teal-400/45 via-cyan-400/15 to-transparent",
                    glow: "from-teal-500/35 via-cyan-500/25 to-blue-500/30",
                  },
                ].map((action) => (
                  <div
                    key={action.label}
                    className={`group relative rounded-xl bg-gradient-to-br p-px transition-all duration-200 hover:-translate-y-0.5 ${action.border}`}
                  >
                    <div
                      className={`pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r opacity-0 blur-lg transition-opacity duration-200 group-hover:opacity-55 ${action.glow}`}
                    />
                    <button
                      onClick={() => navigate(action.path)}
                      className="relative flex w-full flex-col items-center gap-2.5 rounded-xl border border-white/50 bg-card p-4 text-xs font-medium text-foreground transition-all duration-200 group-hover:shadow-sm active:scale-[0.97]"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.color}`}>
                        <action.icon className="w-4.5 h-4.5" />
                      </div>
                      {action.label}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        ) : null}
      </main>

      <footer className="container pb-6">
        <p className="text-[10px] text-muted-foreground/60 font-mono text-center">
          Super Salon v1.0 • Multi-Tenant Salon Management
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
