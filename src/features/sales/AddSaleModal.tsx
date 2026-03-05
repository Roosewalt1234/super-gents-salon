import { useEffect, useState, useRef } from "react";
import {
  DollarSign, User, Calculator,
  Banknote, CreditCard, Save, X, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BranchOption, EmployeeOption } from "./api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

function nowTimeStr(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}:00`;
}

/* ── Types ────────────────────────────────────────────────────────────────── */

interface BarberRow {
  employee_id: string;
  employee_name: string;
  cash_amount: number;
  card_amount: number;
}

/* ── Props ────────────────────────────────────────────────────────────────── */

interface AddSaleModalProps {
  open: boolean;
  tenantId: string;
  branches: BranchOption[];
  employees: EmployeeOption[];
  onClose: () => void;
  onSuccess: () => void;
}

/* ── Modal ────────────────────────────────────────────────────────────────── */

const AddSaleModal = ({
  open,
  tenantId,
  branches,
  employees,
  onClose,
  onSuccess,
}: AddSaleModalProps) => {
  const [branchId, setBranchId] = useState("");
  const [saleDate, setSaleDate] = useState(todayStr());
  const [searchTerm, setSearchTerm] = useState("");
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const saveRef = useRef<HTMLButtonElement>(null);
  const cashRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cardRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Reset when opened */
  useEffect(() => {
    if (!open) return;
    setBranchId("");
    setSaleDate(todayStr());
    setSearchTerm("");
    setBarbers([]);
    setShowConfirm(false);
  }, [open]);

  /* Load barbers when branch changes */
  useEffect(() => {
    if (!branchId) { setBarbers([]); return; }
    const filtered = employees
      .filter((e) => e.assigned_branch_id === branchId)
      .map((e) => ({ employee_id: e.employee_id, employee_name: e.employee_name, cash_amount: 0, card_amount: 0 }));
    setBarbers(filtered);
    setSearchTerm("");
  }, [branchId, employees]);

  if (!open) return null;

  /* ── Derived ── */

  const filteredBarbers = barbers.filter((b) =>
    b.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCash = barbers.reduce((s, b) => s + b.cash_amount, 0);
  const totalCard = barbers.reduce((s, b) => s + b.card_amount, 0);
  const grandTotal = totalCash + totalCard;

  /* ── Handlers ── */

  const handleBarberField = (employeeId: string, field: "cash_amount" | "card_amount", value: string) => {
    const num = parseFloat(value) || 0;
    setBarbers((prev) =>
      prev.map((b) => b.employee_id === employeeId ? { ...b, [field]: num } : b)
    );
  };

  // Row-by-row: cash[i] → card[i] → cash[i+1] → card[i+1] → ... → Save
  const handleCashKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      cardRefs.current[index]?.focus();
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextCash = cashRefs.current[index + 1];
      if (nextCash) nextCash.focus();
      else saveRef.current?.focus();
    }
  };

  const handleClearAll = () => {
    setBarbers((prev) => prev.map((b) => ({ ...b, cash_amount: 0, card_amount: 0 })));
  };

  const handleSave = () => {
    if (!branchId) { toast.error("Please select a branch."); return; }
    if (grandTotal === 0) { toast.error("Please enter at least one sales amount."); return; }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setSaving(true);

    try {
      const saleDateObj = new Date(saleDate + "T00:00:00");
      const weekday = WEEKDAYS[saleDateObj.getDay()];
      const saleTime = nowTimeStr();

      const activeBarbers = barbers.filter((b) => b.cash_amount > 0 || b.card_amount > 0);
      const eligibleBarbers = barbers.filter((b) => b.cash_amount + b.card_amount > 1.00);

      /* ── Insert daily_sales (one record per barber per payment type) ── */
      const records: object[] = [];

      const base = {
        tenant_id: tenantId,
        branch_id: branchId,
        service_id: null,
        discount_amount: 0,
        discount_percentage: 0,
        vat_amount: 0,
        bank_charges: 0,
        sale_date: saleDate,
        sale_time: saleTime,
        weekday,
      };

      for (const barber of activeBarbers) {
        if (barber.cash_amount > 0) {
          records.push({
            ...base,
            employee_id: barber.employee_id,
            amount: barber.cash_amount,
            subtotal: barber.cash_amount,
            total_amount: barber.cash_amount,
            payment_method: "cash",
          });
        }
        if (barber.card_amount > 0) {
          records.push({
            ...base,
            employee_id: barber.employee_id,
            amount: barber.card_amount,
            subtotal: barber.card_amount,
            total_amount: barber.card_amount,
            payment_method: "card",
          });
        }
      }

      const { error: salesError } = await supabase.from("daily_sales").insert(records);
      if (salesError) throw new Error(salesError.message);

      /* ── Attendance: check daily_attendance_records first, then update both tables ── */
      if (eligibleBarbers.length > 0) {
        const year = saleDateObj.getFullYear();
        const month = String(saleDateObj.getMonth() + 1);

        for (const barber of eligibleBarbers) {
          // Check if attendance already logged for this employee on this date
          const { data: existingAtt } = await supabase
            .from("daily_attendance_records")
            .select("id")
            .eq("employee_id", barber.employee_id)
            .eq("date", saleDate)
            .maybeSingle();

          // Already attended today — skip both tables entirely
          if (existingAtt) continue;

          // No existing record — insert attendance and increment monthly count
          await supabase.from("daily_attendance_records").insert({
            tenant_id: tenantId,
            branch_id: branchId,
            employee_id: barber.employee_id,
            date: saleDate,
            status: "present",
            recognition_method: "Sales Entry",
          });

          const { data: existingMonth } = await supabase
            .from("monthly_attendance")
            .select("id, total_days_worked")
            .eq("employee_id", barber.employee_id)
            .eq("tenant_id", tenantId)
            .eq("month", month)
            .eq("year", year)
            .maybeSingle();

          if (existingMonth) {
            await supabase
              .from("monthly_attendance")
              .update({ total_days_worked: (existingMonth.total_days_worked || 0) + 1 })
              .eq("id", existingMonth.id);
          } else {
            await supabase.from("monthly_attendance").insert({
              employee_id: barber.employee_id,
              tenant_id: tenantId,
              month,
              year,
              total_days_worked: 1,
            });
          }
        }
      }

      toast.success("Branch sales recorded successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record sales.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */

  return (
    <>
      {/* Main modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => { if (!saving) onClose(); }}
        />

        <div className="relative z-10 w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground leading-none">Add Branch Sales</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Record daily sales per barber</p>
              </div>
            </div>
            <button
              onClick={() => { if (!saving) onClose(); }}
              disabled={saving}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Branch + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch *</label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select branch…" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.branch_id} value={b.branch_id}>
                        {b.shop_number ? `${b.shop_number} - ${b.branch_name}` : b.branch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sale Date *</label>
                <Input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); cashRefs.current[0]?.focus(); } }}
                  className="h-11"
                />
              </div>
            </div>

            {/* Barbers list */}
            {branchId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Barbers ({filteredBarbers.length})
                  </h3>
                  <Input
                    placeholder="Search barbers…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 h-8 text-sm"
                  />
                </div>

                {/* Column headers */}
                {filteredBarbers.length > 0 && (
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 items-center">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Barber</span>
                    <span className="w-28 text-center text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center justify-center gap-1">
                      <Banknote className="w-3 h-3" /> Cash
                    </span>
                    <span className="w-28 text-center text-[11px] font-semibold text-blue-600 uppercase tracking-wider flex items-center justify-center gap-1">
                      <CreditCard className="w-3 h-3" /> Card
                    </span>
                    <span className="w-24 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</span>
                  </div>
                )}

                {filteredBarbers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No barbers assigned to this branch.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {filteredBarbers.map((barber, index) => {
                      const barberTotal = barber.cash_amount + barber.card_amount;
                      return (
                        <div
                          key={barber.employee_id}
                          className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center bg-muted/30 border border-border rounded-xl px-4 py-2.5"
                        >
                          {/* Name */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{barber.employee_name}</p>
                          </div>

                          {/* Cash */}
                          <Input
                            ref={(el) => { cashRefs.current[index] = el; }}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={barber.cash_amount === 0 ? "" : String(barber.cash_amount)}
                            onChange={(e) => handleBarberField(barber.employee_id, "cash_amount", e.target.value)}
                            onKeyDown={(e) => handleCashKeyDown(e, index)}
                            className="w-28 h-8 text-sm text-right border-emerald-200 focus:border-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />

                          {/* Card */}
                          <Input
                            ref={(el) => { cardRefs.current[index] = el; }}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={barber.card_amount === 0 ? "" : String(barber.card_amount)}
                            onChange={(e) => handleBarberField(barber.employee_id, "card_amount", e.target.value)}
                            onKeyDown={(e) => handleCardKeyDown(e, index)}
                            className="w-28 h-8 text-sm text-right border-blue-200 focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />

                          {/* Total */}
                          <div className="w-24 text-right">
                            <span className={`text-sm font-semibold ${barberTotal > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                              AED {barberTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Summary totals */}
            {branchId && grandTotal > 0 && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Summary</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/20">
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-center gap-1 mb-1">
                      <Banknote className="w-3 h-3" /> Cash
                    </p>
                    <p className="text-base font-bold text-emerald-700">AED {totalCash.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
                    <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider flex items-center justify-center gap-1 mb-1">
                      <CreditCard className="w-3 h-3" /> Card
                    </p>
                    <p className="text-base font-bold text-blue-700">AED {totalCard.toFixed(2)}</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
                    <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">Total</p>
                    <p className="text-base font-bold text-primary">AED {grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-6 py-4 border-t border-border shrink-0">
            <Button
              variant="outline"
              onClick={() => { if (!saving) onClose(); }}
              disabled={saving}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={saving || !branchId}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
            <Button
              ref={saveRef}
              onClick={handleSave}
              disabled={saving || !branchId || grandTotal === 0}
              className="flex-1 teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Sales
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirm(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl border border-border p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Confirm Sales Entry</h3>
            <p className="text-sm text-muted-foreground">Please review the details before submitting.</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Branch</p>
                <p className="font-medium text-foreground mt-0.5">
                  {(() => {
                    const b = branches.find((b) => b.branch_id === branchId);
                    return b ? (b.shop_number ? `${b.shop_number} - ${b.branch_name}` : b.branch_name) : "";
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Date</p>
                <p className="font-medium text-foreground mt-0.5">
                  {new Date(saleDate + "T00:00:00").toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-emerald-600" /> Cash
                </p>
                <p className="font-bold text-emerald-700 mt-0.5">AED {totalCash.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-blue-600" /> Card
                </p>
                <p className="font-bold text-blue-700 mt-0.5">AED {totalCard.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex justify-between items-center px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
              <span className="text-sm font-semibold text-primary">Grand Total</span>
              <span className="text-base font-bold text-primary">AED {grandTotal.toFixed(2)}</span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Barbers</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {barbers.filter((b) => b.cash_amount + b.card_amount > 0).map((b) => (
                  <div key={b.employee_id} className="flex justify-between items-center text-sm">
                    <span className="text-foreground">{b.employee_name}</span>
                    <span className="flex items-center gap-3 text-xs">
                      {b.cash_amount > 0 && <span className="text-emerald-600">Cash AED {b.cash_amount.toFixed(2)}</span>}
                      {b.card_amount > 0 && <span className="text-blue-600">Card AED {b.card_amount.toFixed(2)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleConfirmSave}
                disabled={saving}
                className="flex-1 teal-gradient text-primary-foreground"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : "Confirm & Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddSaleModal;
