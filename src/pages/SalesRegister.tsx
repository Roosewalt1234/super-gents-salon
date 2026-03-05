import { useAuth } from "@/contexts/AuthContext";
import { useAddSaleModal } from "@/features/sales/AddSaleModalContext";
import { useEditSaleModal } from "@/features/sales/EditSaleModalContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
  ShoppingCart,
  Banknote,
  CreditCard,
  TrendingUp,
  Award,
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
import { SaleRecord, fetchSales, deleteSale } from "@/features/sales/api";

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

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function branchLabel(branch_name: string, shop_number: string | null): string {
  return shop_number ? `${shop_number} - ${branch_name}` : branch_name;
}

interface BranchRow {
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
}

const PAGE_SIZE = 20;

/* ── Component ────────────────────────────────────────────────────────────── */

const SalesRegister = () => {
  const { user, role, profile, loading } = useAuth();
  const { openAddSale } = useAddSaleModal();
  const { openEditSale } = useEditSaleModal();

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [fetching, setFetching] = useState(true);

  /* Filters */
  const [fromDate, setFromDate] = useState(firstOfMonthStr());
  const [toDate, setToDate] = useState(todayStr());
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /* Delete dialog */
  const [deleteTarget, setDeleteTarget] = useState<SaleRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Load data ── */

  useEffect(() => {
    if (profile?.tenant_id) {
      loadBranches();
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    if (profile?.tenant_id) {
      loadSales();
    }
  }, [profile?.tenant_id, fromDate, toDate, branchFilter]);

  const loadBranches = async () => {
    const { data } = await supabase
      .from("branch_details")
      .select("branch_id, branch_name, shop_number")
      .eq("tenant_id", profile!.tenant_id!)
      .order("branch_name", { ascending: true });
    setBranches(data ?? []);
  };

  const loadSales = async () => {
    setFetching(true);
    setPage(1);
    try {
      const data = await fetchSales(
        profile!.tenant_id!,
        fromDate,
        toDate,
        branchFilter !== "all" ? branchFilter : undefined
      );
      setSales(data);
    } catch (err) {
      toast.error("Failed to load sales.");
    } finally {
      setFetching(false);
    }
  };

  /* ── Stats ── */

  const stats = useMemo(() => {
    const totalCash = sales
      .filter((s) => s.payment_method === "cash")
      .reduce((sum, s) => sum + (s.total_amount ?? 0), 0);

    const totalCard = sales
      .filter((s) => s.payment_method === "card")
      .reduce((sum, s) => sum + (s.total_amount ?? 0), 0);

    const totalAmount = sales.reduce((sum, s) => sum + (s.total_amount ?? 0), 0);

    /* Top branch by total */
    const branchTotals = new Map<string, { label: string; total: number }>();
    for (const s of sales) {
      const label = branchLabel(s.branch_name, s.shop_number);
      const prev = branchTotals.get(s.branch_id) ?? { label, total: 0 };
      branchTotals.set(s.branch_id, { label, total: prev.total + (s.total_amount ?? 0) });
    }
    let topBranch = "—";
    let topBranchAmt = 0;
    for (const { label, total } of branchTotals.values()) {
      if (total > topBranchAmt) {
        topBranchAmt = total;
        topBranch = label;
      }
    }

    return { totalCash, totalCard, totalAmount, topBranch, topBranchAmt, count: sales.length };
  }, [sales]);

  /* ── Filtered + paginated list ── */

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (s) =>
        (s.employee_name ?? "").toLowerCase().includes(q) ||
        (s.service_name ?? "").toLowerCase().includes(q) ||
        branchLabel(s.branch_name, s.shop_number).toLowerCase().includes(q) ||
        (s.payment_method ?? "").toLowerCase().includes(q)
    );
  }, [sales, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Delete ── */

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSale(deleteTarget.sale_id, profile!.tenant_id!);
      toast.success("Sale deleted.");
      setDeleteTarget(null);
      loadSales();
    } catch (err) {
      toast.error("Failed to delete sale.");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Export CSV ── */

  const handleExport = () => {
    if (filtered.length === 0) { toast.info("No data to export."); return; }

    const headers = [
      "Date", "Time", "Weekday", "Branch", "Barber", "Service",
      "Amount", "Discount%", "Discount", "Subtotal", "VAT", "Bank Charges", "Total", "Payment"
    ];

    const rows = filtered.map((s) => [
      s.sale_date,
      formatTime(s.sale_time),
      s.weekday ?? "",
      branchLabel(s.branch_name, s.shop_number),
      s.employee_name ?? "",
      s.service_name ?? "",
      s.amount?.toFixed(2) ?? "0.00",
      s.discount_percentage?.toFixed(1) ?? "0.0",
      s.discount_amount?.toFixed(2) ?? "0.00",
      s.subtotal?.toFixed(2) ?? "0.00",
      s.vat_amount?.toFixed(2) ?? "0.00",
      s.bank_charges?.toFixed(2) ?? "0.00",
      s.total_amount?.toFixed(2) ?? "0.00",
      s.payment_method ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_register_${fromDate}_to_${toDate}.csv`;
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
      label: "Total Revenue",
      value: `AED ${stats.totalAmount.toFixed(2)}`,
      icon: TrendingUp,
      gradient: "from-teal-500/40 to-cyan-600/40",
    },
    {
      label: "Top Branch",
      value: stats.topBranch,
      sub: stats.topBranchAmt > 0 ? `AED ${stats.topBranchAmt.toFixed(2)}` : undefined,
      icon: Award,
      gradient: "from-amber-500/40 to-orange-500/40",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Sales Register"
        subtitle={`${stats.count} transaction${stats.count !== 1 ? "s" : ""} \u2022 ${formatDate(fromDate)} \u2013 ${formatDate(toDate)}`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => openAddSale(loadSales)}
            className="gap-2 teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md"
          >
            <Plus className="w-4 h-4" />
            Add Sale
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

            {/* Branch filter */}
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[200px]">
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

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by barber, service, branch…"
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
              <ShoppingCart className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No sales found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {search ? `No results for "${search}"` : "Try adjusting the date range or filters."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Barber</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((sale, idx) => (
                      <tr
                        key={sale.sale_id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{formatDate(sale.sale_date)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatTime(sale.sale_time)}{sale.weekday ? ` · ${sale.weekday}` : ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{branchLabel(sale.branch_name, sale.shop_number)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{sale.employee_name ?? <span className="text-muted-foreground">—</span>}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{sale.service_name ?? <span className="text-muted-foreground">—</span>}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-foreground">AED {(sale.amount ?? 0).toFixed(2)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-foreground">AED {(sale.total_amount ?? 0).toFixed(2)}</p>
                          {(sale.vat_amount ?? 0) > 0 && (
                            <p className="text-xs text-blue-500 mt-0.5">incl. VAT AED {sale.vat_amount!.toFixed(2)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              sale.payment_method === "cash"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {sale.payment_method === "cash" ? (
                              <><Banknote className="w-3 h-3" /> Cash</>
                            ) : (
                              <><CreditCard className="w-3 h-3" /> Card</>
                            )}
                          </span>
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
                                onClick={() => openEditSale(sale, loadSales)}
                              >
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                Edit Sale
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(sale)}
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="w-8 h-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-foreground px-2">{page} / {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="w-8 h-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the sale record of{" "}
              <strong>AED {(deleteTarget?.total_amount ?? 0).toFixed(2)}</strong>{" "}
              from <strong>{deleteTarget ? formatDate(deleteTarget.sale_date) : ""}</strong>.
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

export default SalesRegister;
