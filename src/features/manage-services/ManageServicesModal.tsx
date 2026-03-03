import { useEffect, useState, useCallback } from "react";
import { Scissors, Clock, X, DollarSign } from "lucide-react";
import { toast } from "sonner";
import {
  fetchBranchServicesData,
  upsertBranchService,
  BranchServiceItem,
} from "./api";

interface ManageServicesModalProps {
  open: boolean;
  branchId: string;
  branchName: string;
  tenantId: string;
  userId: string;
  onClose: () => void;
}

interface LocalRow {
  isActive: boolean;
  price: string;
}

const ManageServicesModal = ({
  open,
  branchId,
  branchName,
  tenantId,
  userId,
  onClose,
}: ManageServicesModalProps) => {
  const [items, setItems] = useState<BranchServiceItem[]>([]);
  const [local, setLocal] = useState<Map<string, LocalRow>>(new Map());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);

  /* ── Load services on open ── */
  useEffect(() => {
    if (!open) return;
    setFetching(true);
    fetchBranchServicesData(branchId)
      .then((data) => {
        setItems(data);
        const map = new Map<string, LocalRow>();
        for (const s of data) {
          map.set(s.service_id, {
            isActive: s.is_active,
            price: s.price != null ? String(s.price) : s.default_price != null ? String(s.default_price) : "",
          });
        }
        setLocal(map);
      })
      .catch(() => toast.error("Failed to load services"))
      .finally(() => setFetching(false));
  }, [open, branchId]);

  /* ── Upsert helper ── */
  const persist = useCallback(
    async (serviceId: string, isActive: boolean, priceStr: string) => {
      setSaving((prev) => new Set(prev).add(serviceId));
      try {
        const price = priceStr !== "" && !isNaN(Number(priceStr)) ? Number(priceStr) : null;
        await upsertBranchService({ branch_id: branchId, service_id: serviceId, tenant_id: tenantId, is_active: isActive, price, updated_by: userId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setSaving((prev) => {
          const next = new Set(prev);
          next.delete(serviceId);
          return next;
        });
      }
    },
    [branchId, tenantId]
  );

  /* ── Toggle ── */
  const handleToggle = (item: BranchServiceItem) => {
    const row = local.get(item.service_id)!;
    const newActive = !row.isActive;
    const newPrice = newActive && row.price === "" && item.default_price != null
      ? String(item.default_price)
      : row.price;
    setLocal((prev) => {
      const next = new Map(prev);
      next.set(item.service_id, { isActive: newActive, price: newPrice });
      return next;
    });
    persist(item.service_id, newActive, newPrice);
  };

  /* ── Price blur ── */
  const handlePriceBlur = (serviceId: string) => {
    const row = local.get(serviceId)!;
    if (row.isActive) persist(serviceId, true, row.price);
  };

  /* ── Stats ── */
  const activeRows = [...local.values()].filter((r) => r.isActive);
  const activeCount = activeRows.length;
  const totalCount = items.length;
  const revenue = activeRows.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);
  const avgPrice = activeCount > 0 ? revenue / activeCount : 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-3xl mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">
            Manage Services —{" "}
            <span className="text-primary">{branchName}</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-px bg-border shrink-0">
          {[
            {
              label: "Active Services",
              value: activeCount,
              sub: `out of ${totalCount} total`,
              highlight: false,
            },
            {
              label: "Revenue Potential",
              value: `AED ${revenue.toFixed(2)}`,
              sub: "per service cycle",
              highlight: true,
            },
            {
              label: "Average Price",
              value: `AED ${avgPrice.toFixed(2)}`,
              sub: "across active services",
              highlight: true,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-card px-5 py-4">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.highlight ? "text-primary" : "text-foreground"}`}>
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Section header ── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <p className="text-sm font-semibold text-foreground">Available Services</p>
          <span className="text-[11px] font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
            {activeCount} / {totalCount} enabled
          </span>
        </div>

        {/* ── Service list ── */}
        <div className="overflow-y-auto flex-1 p-4">
          {fetching ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">No services found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((item) => {
                const row = local.get(item.service_id) ?? { isActive: false, price: "" };
                const isSaving = saving.has(item.service_id);
                const perMin =
                  row.isActive && item.service_duration && parseFloat(row.price)
                    ? (parseFloat(row.price) / item.service_duration).toFixed(2)
                    : null;

                return (
                  <div
                    key={item.service_id}
                    className={`rounded-xl border p-4 transition-all duration-200 ${
                      row.isActive
                        ? "border-primary/50 bg-primary/5 shadow-sm"
                        : "border-border bg-card"
                    }`}
                  >
                    {/* Row 1: icon + name + toggle */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Scissors className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
                            {item.service_name}
                          </p>
                          {item.service_duration != null && (
                            <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-[11px]">
                              <Clock className="w-3 h-3" />
                              {item.service_duration}m
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={isSaving}
                        aria-label="Toggle service"
                        className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 mt-0.5 disabled:opacity-60 ${
                          row.isActive ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 flex items-center justify-center ${
                            row.isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        >
                        </span>
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 min-h-[1.5rem]">
                      {item.description || "—"}
                    </p>

                    {/* Active: badge + price input */}
                    {row.isActive && (
                      <>
                        <div className="border-t border-border/60 mb-3" />
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                            Active
                          </span>
                        </div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          <DollarSign className="inline w-3 h-3 mr-0.5" />
                          Price (AED)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.price}
                          onChange={(e) =>
                            setLocal((prev) => {
                              const next = new Map(prev);
                              next.set(item.service_id, { ...row, price: e.target.value });
                              return next;
                            })
                          }
                          onBlur={() => handlePriceBlur(item.service_id)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-right font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                          placeholder="0.00"
                        />
                        <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                          <span>{perMin != null ? `AED ${perMin} per min` : ""}</span>
                          {item.service_duration != null && (
                            <span>Duration: {item.service_duration}m</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageServicesModal;
