import { useState } from "react";
import { X, PlusCircle } from "lucide-react";
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
  addAdvanceGiven,
  addLoanGiven,
  addVisaChargesGiven,
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

const TYPES: { value: DeductionType; label: string }[] = [
  { value: "advance", label: "Advance Given" },
  { value: "loan",    label: "Loan Given"     },
  { value: "visa",    label: "Visa Charges"   },
];

const branchLabel = (b: BranchOption) =>
  b.shop_number ? `${b.shop_number} - ${b.branch_name}` : b.branch_name;

/* ── Component ──────────────────────────────────────────────────────────────── */

const AddDeductionModal = ({
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
  const [description, setDescription] = useState("");
  const [branchId, setBranchId] = useState("");

  if (!open) return null;

  /* Auto-fill branch from employee when advance is selected */
  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    if (type === "advance") {
      const emp = employees.find((e) => e.employee_id === id);
      if (emp?.assigned_branch_id) setBranchId(emp.assigned_branch_id);
    }
  };

  const handleSubmit = async () => {
    if (!employeeId) { toast.error("Select an employee"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (type === "advance" && !branchId) { toast.error("Select a branch"); return; }

    setSaving(true);
    try {
      if (type === "advance") {
        await addAdvanceGiven(tenantId, employeeId, branchId, amt, description);
      } else if (type === "loan") {
        await addLoanGiven(tenantId, employeeId, amt);
      } else {
        await addVisaChargesGiven(tenantId, employeeId, amt);
      }
      toast.success("Record added successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const selectedEmp = employees.find((e) => e.employee_id === employeeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl border border-border">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-none">Add Deduction</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Record advance, loan or visa charge</p>
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

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Type</Label>
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

          {/* Branch — only for advance */}
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

          {/* Current balance info */}
          {selectedEmp && (
            <div className="rounded-xl bg-muted/40 px-4 py-3 text-[12px] text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Advance Balance</span>
                <span className="font-medium text-foreground">AED {selectedEmp.outstanding_loan_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Loan Balance</span>
                <span className="font-medium text-foreground">AED {selectedEmp.loan_balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Visa Charges Balance</span>
                <span className="font-medium text-foreground">AED {selectedEmp.visa_charges_bal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Amount (AED)</Label>
            <Input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Description — advance only */}
          {type === "advance" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description (optional)</Label>
              <Input
                placeholder="Enter description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="teal-gradient text-primary-foreground"
          >
            {saving ? "Saving..." : "Add Record"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddDeductionModal;
