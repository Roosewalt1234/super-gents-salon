import { useAuth } from "@/contexts/AuthContext";
import { usePayrollModals } from "@/features/payroll/PayrollModalContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Wallet,
  PlusCircle,
  Minus,
  Building2,
  UserCog,
  Users,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchPayrollRecords,
  fetchPayrollBranches,
  PayrollRecord,
  BranchOption,
} from "@/features/payroll/api";

/* ── Helpers ────────────────────────────────────────────────────────────────── */

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

/* ── Page component ─────────────────────────────────────────────────────────── */

const PayrollManagement = () => {
  const { user, role, profile, loading } = useAuth();
  const {
    openAddDeduction,
    openProcessDeduction,
    openProcessBranchSalary,
    openProcessAllSalary,
    openProcessIndividualSalary,
  } = usePayrollModals();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [branchFilter,  setBranchFilter]  = useState("all");
  const [search,        setSearch]        = useState("");
  const [fetching,      setFetching]      = useState(false);
  const [records,       setRecords]       = useState<PayrollRecord[]>([]);
  const [branches,      setBranches]      = useState<BranchOption[]>([]);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchPayrollBranches(profile.tenant_id).then(setBranches);
      loadRecords();
    }
  }, [profile?.tenant_id, selectedMonth, selectedYear]);

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const loadRecords = async () => {
    if (!profile?.tenant_id) return;
    setFetching(true);
    try {
      const data = await fetchPayrollRecords(profile.tenant_id, monthKey);
      setRecords(data);
    } catch {
      toast.error("Failed to load payroll records");
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role === "superadmin") return <Navigate to="/admin" replace />;

  /* Filter */
  const filtered = records.filter((r) => {
    const matchesSearch = (r.employee_name ?? "")
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesSearch;
  });

  /* Summary totals */
  const totals = filtered.reduce(
    (acc, r) => ({
      salary:  acc.salary  + r.salary_earned,
      comm:    acc.comm    + r.commission_amount,
      gross:   acc.gross   + r.gross_pay,
      ded:     acc.ded     + r.adv_ded_amount + r.loan_ded_amount + r.visa_charges_ded_amount,
      net:     acc.net     + r.net_pay,
    }),
    { salary: 0, comm: 0, gross: 0, ded: 0, net: 0 }
  );

  return (
    <div className="min-h-screen mesh-gradient">
      <AppHeader
        title="Payroll Management"
        subtitle="Process and manage employee payroll"
      />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-border hover:border-primary/30 active:scale-95 transition-all duration-200"
              onClick={() => openAddDeduction(undefined, loadRecords)}
            >
              <PlusCircle className="w-4 h-4" /> Add Deduction
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-border hover:border-orange-500/30 active:scale-95 transition-all duration-200"
              onClick={() => openProcessDeduction(undefined, loadRecords)}
            >
              <Minus className="w-4 h-4" /> Process Deduction
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-border hover:border-primary/30 active:scale-95 transition-all duration-200"
              onClick={() => openProcessBranchSalary(undefined, loadRecords)}
            >
              <Building2 className="w-4 h-4" /> Process Branch Salary
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-border hover:border-primary/30 active:scale-95 transition-all duration-200"
              onClick={() => openProcessIndividualSalary(undefined, loadRecords)}
            >
              <UserCog className="w-4 h-4" /> Process Individual Salary
            </Button>
            <Button
              onClick={() => openProcessAllSalary(loadRecords)}
              className="teal-gradient text-primary-foreground gap-2 shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200 ml-auto"
            >
              <Users className="w-4 h-4" /> Process All Salary
            </Button>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              className="w-[90px]"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              min={2020}
              max={2100}
            />
            <Button
              variant="outline"
              onClick={loadRecords}
              disabled={fetching}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Summary cards */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Salary Earned",  value: totals.salary, color: "text-emerald-600" },
                { label: "Commission",     value: totals.comm,   color: "text-amber-500"   },
                { label: "Gross Pay",      value: totals.gross,  color: "text-primary"     },
                { label: "Deductions",     value: totals.ded,    color: "text-destructive" },
                { label: "Net Pay",        value: totals.net,    color: "text-foreground"  },
              ].map((card) => (
                <div key={card.label} className="bg-card rounded-xl border border-border px-4 py-3">
                  <p className="text-[11px] text-muted-foreground font-medium">{card.label}</p>
                  <p className={`text-base font-bold tabular-nums mt-0.5 ${card.color}`}>
                    {fmt(card.value)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {fetching ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Wallet className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No payroll records for{" "}
                  {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Use the buttons above to process salary
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Employee</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Days</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Salary</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Commission</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Gross Pay</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Adv Ded</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Loan Ded</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Visa Ded</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Net Pay</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-t border-border/40 hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                          {r.employee_name}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                          {r.total_days_worked}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-600 whitespace-nowrap">
                          {fmt(r.salary_earned)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-500 whitespace-nowrap">
                          {fmt(r.commission_amount)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium whitespace-nowrap">
                          {fmt(r.gross_pay)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-destructive whitespace-nowrap">
                          {r.adv_ded_amount > 0 ? fmt(r.adv_ded_amount) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-destructive whitespace-nowrap">
                          {r.loan_ded_amount > 0 ? fmt(r.loan_ded_amount) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-destructive whitespace-nowrap">
                          {r.visa_charges_ded_amount > 0 ? fmt(r.visa_charges_ded_amount) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-foreground whitespace-nowrap">
                          {fmt(r.net_pay)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.status === "processed" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Processed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Draft
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() =>
                              openProcessIndividualSalary(r.employee_id, loadRecords)
                            }
                          >
                            Re-process
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      <footer className="container pb-6">
        <p className="text-[10px] text-muted-foreground/60 font-mono text-center">
          Super Salon v1.0 • Multi-Tenant Salon Management
        </p>
      </footer>
    </div>
  );
};

export default PayrollManagement;
