import { useState } from "react";
import { X, Minus } from "lucide-react";
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
import {
  PayrollEmployee,
  BranchOption,
  deductAdvance,
  deductLoan,
  deductVisaCharges,
} from "../api";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type DeductionType = "advance" | "loan" | "visa";

interface Props {
  open: boolean;
  tenantId: string;
  employees: PayrollEmployee[];
  branches: BranchOption[];
  preselectedEmployeeId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPES: { value: DeductionType; label: string; balanceKey: keyof PayrollEmployee }[] = [
  { value: "advance", label: "Advance",      balanceKey: "outstanding_loan_amount" },
  { value: "loan",    label: "Loan",          balanceKey: "loan_balance"            },
  { value: "visa",    label: "Visa Charges",  balanceKey: "visa_charges_bal"        },
];

const branchLabel = (b: BranchOption) =>
  b.shop_number ? `${b.shop_number} - ${b.branch_name}` : b.branch_name;

/* ── Component ──────────────────────────────────────────────────────────────── */

const ProcessDeductionModal = ({
  open,
  tenantId,
  employees,
  branches,
  preselectedEmployeeId,
  onClose,
  onSuccess,
}: Props) => {
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId ?? "");
  const [type, setType] = useState<DeductionType>("advance");
  const [amount, setAmount] = useState("");
  const [branchId, setBranchId] = useState("");

  if (!open) return null;

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    const emp = employees.find((e) => e.employee_id === id);
    if (emp?.assigned_branch_id) setBranchId(emp.assigned_branch_id);
  };

  const handleSubmit = async () => {
    if (!employeeId) { toast.error("Select an employee"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (type === "advance" && !branchId) { toast.error("Select a branch"); return; }

    const selectedType = TYPES.find((t) => t.value === type)!;
    const emp = employees.find((e) => e.employee_id === employeeId);
    const currentBal = (emp?.[selectedType.balanceKey] as number) ?? 0;

    if (amt > currentBal) {
      toast.error(`Amount exceeds current balance (AED ${currentBal.toFixed(2)})`);
      return;
    }

    setSaving(true);
    try {
      if (type === "advance") {
        await deductAdvance(tenantId, employeeId, branchId, amt);
      } else if (type === "loan") {
        await deductLoan(tenantId, employeeId, amt);
      } else {
        await deductVisaCharges(tenantId, employeeId, amt);
      }
      toast.success("Deduction processed successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to process deduction");
    } finally {
      setSaving(false);
    }
  };

  const selectedEmp = employees.find((e) => e.employee_id === employeeId);
  const selectedTypeInfo = TYPES.find((t) => t.value === type)!;
  const currentBalance = selectedEmp
    ? ((selectedEmp[selectedTypeInfo.balanceKey] as number) ?? 0)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl border border-border">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Minus className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-none">Process Deduction</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Deduct from advance, loan or visa balance</p>
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
        <div className="px-6 py-5 space-y-4">

          {/* Employee */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Employee</Label>
            <Select value={employeeId} onValueChange={handleEmployeeChange}>
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

          {/* Current balances */}
          {selectedEmp && (
            <div className="rounded-xl bg-muted/40 px-4 py-3 text-[12px] text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Advance Balance</span>
                <span className={`font-semibold ${selectedEmp.outstanding_loan_amount > 0 ? "text-orange-500" : "text-foreground"}`}>
                  AED {selectedEmp.outstanding_loan_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Loan Balance</span>
                <span className={`font-semibold ${selectedEmp.loan_balance > 0 ? "text-orange-500" : "text-foreground"}`}>
                  AED {selectedEmp.loan_balance.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Visa Charges Balance</span>
                <span className={`font-semibold ${selectedEmp.visa_charges_bal > 0 ? "text-orange-500" : "text-foreground"}`}>
                  AED {selectedEmp.visa_charges_bal.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Deduction type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Deduction Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DeductionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch — advance only */}
          {type === "advance" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.branch_id} value={b.branch_id}>
                      {branchLabel(b)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Deduction Amount (AED)
              {currentBalance !== null && (
                <span className="ml-2 text-muted-foreground font-normal">
                  Balance: {currentBalance.toFixed(2)}
                </span>
              )}
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {saving ? "Processing..." : "Process Deduction"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessDeductionModal;
