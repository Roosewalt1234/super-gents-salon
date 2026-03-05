import { useAuth } from "@/contexts/AuthContext";
import { useExpenseModal } from "@/features/expenses/ExpenseModalContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
  Receipt,
  Banknote,
  CreditCard,
  TrendingDown,
  Tag,
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ExpenseRecord,
  CategoryOption,
  fetchExpenses,
  fetchCategories,
  deleteExpense,
} from "@/features/expenses/api";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

function firstOfMonthStr(): string {
  const d = new Date();
  d.setDate(1);
  return d.toLocaleDateString("en-CA");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

function branchLabel(branch_name: string, shop_number: string | null): string {
  return shop_number ? `${shop_number} - ${branch_name}` : branch_name;
}

function paymentLabel(method: string | null): string {
  switch (method) {
    case "cash": return "Cash";
    case "card": return "Card";
    case "bank_transfer": return "Transfer";
    case "cheque": return "Cheque";
    default: return method ?? "—";
  }
}

interface BranchRow {
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
}

const PAGE_SIZE = 20;

/* ── Component ────────────────────────────────────────────────────────────── */

const ExpensesRegister = () => {
  const { user, role, profile, loading } = useAuth();
  const { openAddExpense, openEditExpense } = useExpenseModal();

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [fetching, setFetching] = useState(true);

  /* Filters */
  const [fromDate, setFromDate] = useState(firstOfMonthStr());
  const [toDate, setToDate] = useState(todayStr());
  const [branchFilter, setBranchFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /* Delete dialog */
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Load data ── */

  useEffect(() => {
    if (profile?.tenant_id) {
      loadBranches();
      loadCategories();
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    if (profile?.tenant_id) {
      loadExpenses();
    }
  }, [profile?.tenant_id, fromDate, toDate, branchFilter, categoryFilter]);

  const loadBranches = async () => {
    const { data } = await supabase
      .from("branch_details")
      .select("branch_id, branch_name, shop_number")
      .eq("tenant_id", profile!.tenant_id!)
      .order("branch_name", { ascending: true });
    setBranches(data ?? []);
  };

  const loadCategories = async () => {
    try {
      setCategories(await fetchCategories());
    } catch {
      /* non-blocking */
    }
  };

  const loadExpenses = async () => {
    setFetching(true);
    setPage(1);
    try {
      const data = await fetchExpenses(
        profile!.tenant_id!,
        fromDate,
        toDate,
        branchFilter !== "all" ? branchFilter : undefined,
        categoryFilter !== "all" ? categoryFilter : undefined
      );
      setExpenses(data);
    } catch {
      toast.error("Failed to load expenses.");
    } finally {
      setFetching(false);
    }
  };

  /* ── Stats ── */

  const stats = useMemo(() => {
    const totalCash = expenses
      .filter((e) => e.payment_method === "cash")
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);

    const totalCard = expenses
      .filter((e) => e.payment_method === "card")
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);

    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

    /* Top category by spend */
    const catTotals = new Map<string, { name: string; total: number }>();
    for (const e of expenses) {
      const prev = catTotals.get(e.category_id) ?? { name: e.category_name, total: 0 };
      catTotals.set(e.category_id, { name: e.category_name, total: prev.total + (e.amount ?? 0) });
    }
    let topCategory = "—";
    let topCategoryAmt = 0;
    for (const { name, total } of catTotals.values()) {
      if (total > topCategoryAmt) {
        topCategoryAmt = total;
        topCategory = name;
      }
    }

    return { totalCash, totalCard, totalAmount, topCategory, topCategoryAmt, count: expenses.length };
  }, [expenses]);

  /* ── Filtered + paginated ── */

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return expenses;
    return expenses.filter(
      (e) =>
        (e.vendor_name ?? "").toLowerCase().includes(q) ||
        (e.employee_name ?? "").toLowerCase().includes(q) ||
        e.category_name.toLowerCase().includes(q) ||
        (e.sub_category_name ?? "").toLowerCase().includes(q) ||
        branchLabel(e.branch_name, e.shop_number).toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q) ||
        (e.receipt_number ?? "").toLowerCase().includes(q)
    );
  }, [expenses, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Delete ── */

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteTarget.id, profile!.tenant_id!);
      toast.success("Expense deleted.");
      setDeleteTarget(null);
      loadExpenses();
    } catch {
      toast.error("Failed to delete expense.");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Export CSV ── */

  const handleExport = () => {
    if (filtered.length === 0) { toast.info("No data to export."); return; }

    const headers = [
      "Date", "Branch", "Category", "Sub-category", "Employee",
      "Vendor", "Receipt No.", "Amount", "Payment", "Description"
    ];

    const rows = filtered.map((e) => [
      e.transaction_date,
      branchLabel(e.branch_name, e.shop_number),
      e.category_name,
      e.sub_category_name ?? "",
      e.employee_name ?? "",
      e.vendor_name ?? "",
      e.receipt_number ?? "",
      e.amount?.toFixed(2) ?? "0.00",
      paymentLabel(e.payment_method),
      e.description ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_register_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  };

  /* ── Auth guard ── */

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role !== "tenant_admin" && role !== "superadmin") return <Navigate to="/dashboard" replace />;

  /* ── Render ── */

  const statCards = [
    {
      label: "Total Cash",
      value: `AED ${stats.totalCash.toFixed(2)}`,
      icon: Banknote,
      gradient: "from-emerald-500/40 to-teal-600/40",
    },
    {
      label: "Total Card",
      value: `AED ${stats.totalCard.toFixed(2)}`,
      icon: CreditCard,
      gradient: "from-blue-500/40 to-indigo-600/40",
    },
    {
      label: "Total Expenses",
      value: `AED ${stats.totalAmount.toFixed(2)}`,
      icon: TrendingDown,
      gradient: "from-red-500/40 to-rose-600/40",
    },
    {
      label: "Top Category",
      value: stats.topCategory,
      sub: stats.topCategoryAmt > 0 ? `AED ${stats.topCategoryAmt.toFixed(2)}` : undefined,
      icon: Tag,
      gradient: "from-amber-500/40 to-orange-500/40",
    },
  ];

  const paymentBadge = (method: string | null) => {
    const map: Record<string, { label: string; classes: string; icon: typeof Banknote }> = {
      cash:          { label: "Cash",     classes: "bg-emerald-500/10 text-emerald-600", icon: Banknote },
      card:          { label: "Card",     classes: "bg-blue-500/10 text-blue-600",       icon: CreditCard },
      bank_transfer: { label: "Transfer", classes: "bg-purple-500/10 text-purple-600",   icon: TrendingDown },
      cheque:        { label: "Cheque",   classes: "bg-amber-500/10 text-amber-600",     icon: Receipt },
    };
    const item = map[method ?? ""] ?? { label: method ?? "—", classes: "bg-muted text-muted-foreground", icon: Banknote };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${item.classes}`}>
        <item.icon className="w-3 h-3" />
        {item.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Expenses Register"
        subtitle={`${stats.count} expense${stats.count !== 1 ? "s" : ""} \u2022 ${formatDate(fromDate)} \u2013 ${formatDate(toDate)}`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 mb-6">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => openAddExpense(loadExpenses)}
            className="gap-2 teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </Button>
        </div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} px-5 py-5 shadow-md hover:shadow-lg transition-shadow`}
            >
              <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-white/15 pointer-events-none" />
              <div className="absolute right-4 -bottom-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
              <div className="relative flex items-start justify-between mb-3">
                <p className="text-[11px] font-semibold text-black/70 uppercase tracking-widest">{card.label}</p>
                <card.icon className="w-5 h-5 text-black/60 shrink-0" />
              </div>
              <p className="relative text-2xl font-bold text-black tabular-nums leading-tight truncate">{card.value}</p>
              {card.sub && <p className="relative text-[11px] text-black/60 mt-1">{card.sub}</p>}
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            {/* Date range */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[150px]"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[150px]"
              />
            </div>

            {/* Branch */}
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.branch_id} value={b.branch_id}>
                    {branchLabel(b.branch_name, b.shop_number)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by vendor, category, branch…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Receipt className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No expenses found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {search ? `No results for "${search}"` : "Try adjusting the date range or filters."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((exp, idx) => (
                      <tr
                        key={exp.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{formatDate(exp.transaction_date)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{branchLabel(exp.branch_name, exp.shop_number)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{exp.category_name}</p>
                          {exp.sub_category_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">{exp.sub_category_name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{exp.vendor_name ?? <span className="text-muted-foreground">—</span>}</p>
                          {exp.receipt_number && (
                            <p className="text-xs text-muted-foreground mt-0.5">#{exp.receipt_number}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{exp.employee_name ?? <span className="text-muted-foreground">—</span>}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-destructive">AED {(exp.amount ?? 0).toFixed(2)}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {paymentBadge(exp.payment_method)}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => openEditExpense(exp, loadExpenses)}
                              >
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(exp)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 p-0">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-foreground px-2">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 p-0">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense of{" "}
              <strong>AED {(deleteTarget?.amount ?? 0).toFixed(2)}</strong>{" "}
              from <strong>{deleteTarget ? formatDate(deleteTarget.transaction_date) : ""}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpensesRegister;
