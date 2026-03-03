import { useEffect, useState } from "react";
import { X, Pencil, Calculator } from "lucide-react";
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
import {
  BranchOption,
  EmployeeOption,
  ServiceOption,
  SaleRecord,
  fetchBranchServices,
  updateSale,
} from "./api";
import { toast } from "sonner";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return WEEKDAYS[d.getDay()];
}

/* ── Props ────────────────────────────────────────────────────────────────── */

interface EditSaleModalProps {
  open: boolean;
  sale: SaleRecord;
  tenantId: string;
  branches: BranchOption[];
  employees: EmployeeOption[];
  onClose: () => void;
  onSuccess: () => void;
}

/* ── Modal ────────────────────────────────────────────────────────────────── */

const EditSaleModal = ({
  open,
  sale,
  tenantId,
  branches,
  employees,
  onClose,
  onSuccess,
}: EditSaleModalProps) => {
  const [branchId, setBranchId] = useState(sale.branch_id);
  const [employeeId, setEmployeeId] = useState(sale.employee_id ?? "");
  const [serviceId, setServiceId] = useState(sale.service_id ?? "");
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [amount, setAmount] = useState(String(sale.amount ?? ""));
  const [discountPct, setDiscountPct] = useState(String(sale.discount_percentage ?? "0"));
  const [paymentMethod, setPaymentMethod] = useState(sale.payment_method ?? "cash");
  const [saleDate, setSaleDate] = useState(sale.sale_date);
  const [saleTime, setSaleTime] = useState(sale.sale_time?.slice(0, 5) ?? "");
  const [loadingServices, setLoadingServices] = useState(false);
  const [saving, setSaving] = useState(false);

  /* Load services when branch set/changes */
  useEffect(() => {
    if (!branchId) return;
    setLoadingServices(true);
    fetchBranchServices(branchId)
      .then(setServices)
      .catch(() => toast.error("Failed to load services."))
      .finally(() => setLoadingServices(false));
  }, [branchId]);

  if (!open) return null;

  /* ── Derived values ── */

  const selectedBranch = branches.find((b) => b.branch_id === branchId);
  const hasVat = selectedBranch?.has_vat ?? false;

  const filteredEmployees = branchId
    ? employees.filter((e) => e.assigned_branch_id === branchId)
    : employees;

  const amountNum = parseFloat(amount) || 0;
  const discountPctNum = Math.min(100, Math.max(0, parseFloat(discountPct) || 0));
  const discountAmt = parseFloat(((amountNum * discountPctNum) / 100).toFixed(2));
  const subtotal = parseFloat((amountNum - discountAmt).toFixed(2));
  const vatAmt = hasVat ? parseFloat((subtotal * 0.05).toFixed(2)) : 0;
  const bankCharges = paymentMethod === "card" ? parseFloat((subtotal * 0.015).toFixed(2)) : 0;
  const total = parseFloat((subtotal + vatAmt + bankCharges).toFixed(2));

  /* ── Handlers ── */

  const handleBranchChange = (v: string) => {
    setBranchId(v);
    setEmployeeId("");
    setServiceId("");
    setServices([]);
    setAmount("");
  };

  const handleServiceChange = (sid: string) => {
    setServiceId(sid);
    const svc = services.find((s) => s.service_id === sid);
    if (svc?.price != null) {
      setAmount(String(svc.price));
    }
  };

  const handleSave = async () => {
    if (!branchId) { toast.error("Please select a branch."); return; }
    if (!amountNum || amountNum <= 0) { toast.error("Please enter a valid amount."); return; }
    if (!saleDate) { toast.error("Please select a sale date."); return; }

    setSaving(true);
    try {
      await updateSale(sale.sale_id, tenantId, {
        branch_id: branchId,
        employee_id: employeeId && employeeId !== "none" ? employeeId : null,
        service_id: serviceId && serviceId !== "none" ? serviceId : null,
        amount: amountNum,
        subtotal,
        discount_amount: discountAmt,
        discount_percentage: discountPctNum,
        vat_amount: vatAmt,
        bank_charges: bankCharges,
        total_amount: total,
        payment_method: paymentMethod,
        sale_date: saleDate,
        sale_time: saleTime ? `${saleTime}:00` : "00:00:00",
        weekday: getWeekday(saleDate),
      });
      toast.success("Sale updated successfully.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update sale.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => { if (!saving) onClose(); }}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-none">Edit Sale</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Update transaction details</p>
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
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Branch */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch *</Label>
            <Select value={branchId} onValueChange={handleBranchChange}>
              <SelectTrigger>
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

          {/* Employee */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Barber</Label>
            <Select value={employeeId || "none"} onValueChange={(v) => setEmployeeId(v === "none" ? "" : v)} disabled={!branchId}>
              <SelectTrigger>
                <SelectValue placeholder={branchId ? "Select barber…" : "Select branch first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No barber —</SelectItem>
                {filteredEmployees.map((e) => (
                  <SelectItem key={e.employee_id} value={e.employee_id}>
                    {e.employee_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</Label>
            <Select
              value={serviceId || "none"}
              onValueChange={(v) => v === "none" ? setServiceId("") : handleServiceChange(v)}
              disabled={!branchId || loadingServices}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !branchId ? "Select branch first" :
                  loadingServices ? "Loading…" :
                  "Select service…"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No service —</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.service_id} value={s.service_id}>
                    {s.service_name}{s.price != null ? ` — AED ${s.price}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (AED) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Discount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discount (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="0"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sale Date *</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sale Time</Label>
              <Input
                type="time"
                value={saleTime}
                onChange={(e) => setSaleTime(e.target.value)}
              />
            </div>
          </div>

          {/* Summary */}
          {amountNum > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Summary</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">AED {amountNum.toFixed(2)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-orange-500">
                    <span>Discount ({discountPctNum}%)</span>
                    <span>- AED {discountAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">AED {subtotal.toFixed(2)}</span>
                </div>
                {vatAmt > 0 && (
                  <div className="flex justify-between text-blue-500">
                    <span>VAT (5%)</span>
                    <span>+ AED {vatAmt.toFixed(2)}</span>
                  </div>
                )}
                {bankCharges > 0 && (
                  <div className="flex justify-between text-purple-500">
                    <span>Bank charges (1.5%)</span>
                    <span>+ AED {bankCharges.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                  <span>Total</span>
                  <span className="text-primary">AED {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button
            variant="outline"
            onClick={() => { if (!saving) onClose(); }}
            disabled={saving}
            className="min-w-[80px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[130px] teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditSaleModal;
