import { useEffect, useRef, useState } from "react";
import { X, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CategoryOption,
  SubCategoryOption,
  ExpenseBranchOption,
  ExpenseEmployeeOption,
  ExpenseRecord,
  CreateExpensePayload,
  createExpense,
  updateExpense,
} from "./api";
import { toast } from "sonner";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

/* ── Props ────────────────────────────────────────────────────────────────── */

interface ExpenseFormModalProps {
  open: boolean;
  mode: "add" | "edit";
  expense?: ExpenseRecord;          // only for edit
  tenantId: string;
  userId: string;
  branches: ExpenseBranchOption[];
  employees: ExpenseEmployeeOption[];
  categories: CategoryOption[];
  subCategories: SubCategoryOption[];
  onClose: () => void;
  onSuccess: () => void;
}

/* ── Modal ────────────────────────────────────────────────────────────────── */

const ExpenseFormModal = ({
  open,
  mode,
  expense,
  tenantId,
  userId,
  branches,
  employees,
  categories,
  subCategories,
  onClose,
  onSuccess,
}: ExpenseFormModalProps) => {
  const isEdit = mode === "edit";

  const [branchId, setBranchId] = useState(expense?.branch_id ?? "");
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? "");
  const [subCategoryId, setSubCategoryId] = useState(expense?.sub_category_id ?? "");
  const [employeeId, setEmployeeId] = useState(expense?.employee_id ?? "");
  const [amount, setAmount] = useState(String(expense?.amount ?? ""));
  const [paymentMethod, setPaymentMethod] = useState(expense?.payment_method ?? "cash");
  const [transactionDate, setTransactionDate] = useState(expense?.transaction_date ?? todayStr());
  const [vendorName, setVendorName] = useState(expense?.vendor_name ?? "");
  const [receiptNumber, setReceiptNumber] = useState(expense?.receipt_number ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [saving, setSaving] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const vendorRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  const nextOnEnter = (next: React.RefObject<HTMLElement>) =>
    (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); next.current?.focus(); } };

  /* Reset when opening in add mode */
  useEffect(() => {
    if (!open || isEdit) return;
    setBranchId("");
    setCategoryId("");
    setSubCategoryId("");
    setEmployeeId("");
    setAmount("");
    setPaymentMethod("cash");
    setTransactionDate(todayStr());
    setVendorName("");
    setReceiptNumber("");
    setDescription("");
  }, [open]);

  if (!open) return null;

  /* ── Derived ── */

  const filteredSubCategories = subCategories.filter(
    (sc) => sc.category_id === categoryId
  );

  const filteredEmployees = branchId
    ? employees.filter((e) => e.assigned_branch_id === branchId)
    : employees;

  const amountNum = parseFloat(amount) || 0;

  /* ── Handlers ── */

  const handleCategoryChange = (val: string) => {
    setCategoryId(val);
    setSubCategoryId(""); // reset sub-category when category changes
  };

  const handleSave = async () => {
    if (!branchId) { toast.error("Please select a branch."); return; }
    if (!categoryId) { toast.error("Please select a category."); return; }
    if (!amountNum || amountNum <= 0) { toast.error("Please enter a valid amount."); return; }
    if (!transactionDate) { toast.error("Please select a date."); return; }

    const payload: Omit<CreateExpensePayload, "tenant_id" | "created_by"> = {
      branch_id: branchId,
      category_id: categoryId,
      sub_category_id: subCategoryId || null,
      employee_id: employeeId && employeeId !== "none" ? employeeId : null,
      amount: amountNum,
      payment_method: paymentMethod,
      transaction_date: transactionDate,
      vendor_name: vendorName.trim() || null,
      receipt_number: receiptNumber.trim() || null,
      description: description.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit && expense) {
        await updateExpense(expense.id, tenantId, userId, payload);
        toast.success("Expense updated successfully.");
      } else {
        await createExpense({ ...payload, tenant_id: tenantId, created_by: userId });
        toast.success("Expense recorded successfully.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save expense.");
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
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-none">
                {isEdit ? "Edit Expense" : "Add Expense"}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isEdit ? "Update expense details" : "Record a new expense"}
              </p>
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
            <Select value={branchId} onValueChange={(v) => { setBranchId(v); setEmployeeId(""); }}>
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

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category *</Label>
            <Select value={categoryId} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub-category */}
          {categoryId && filteredSubCategories.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sub-category</Label>
              <Select value={subCategoryId || "none"} onValueChange={(v) => setSubCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-category…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {filteredSubCategories.map((sc) => (
                    <SelectItem key={sc.sub_category_id} value={sc.sub_category_id}>
                      {sc.sub_category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Employee */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</Label>
            <Select value={employeeId || "none"} onValueChange={(v) => setEmployeeId(v === "none" ? "" : v)} disabled={!branchId}>
              <SelectTrigger>
                <SelectValue placeholder={branchId ? "Select employee…" : "Select branch first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {filteredEmployees.map((e) => (
                  <SelectItem key={e.employee_id} value={e.employee_id}>
                    {e.employee_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (AED) *</Label>
              <Input
                ref={amountRef}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={nextOnEnter(dateRef)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Date *</Label>
            <Input
              ref={dateRef}
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              onKeyDown={nextOnEnter(vendorRef)}
            />
          </div>

          {/* Vendor + Receipt */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendor Name</Label>
              <Input
                ref={vendorRef}
                placeholder="Vendor / Supplier…"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                onKeyDown={nextOnEnter(receiptRef)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Receipt No.</Label>
              <Input
                ref={receiptRef}
                placeholder="Receipt number…"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                onKeyDown={nextOnEnter(descRef)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
            <Textarea
              ref={descRef}
              placeholder="Optional notes…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={nextOnEnter(saveRef)}
              rows={2}
              className="resize-none"
            />
          </div>
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
            ref={saveRef}
            onClick={handleSave}
            disabled={saving}
            className="min-w-[130px] teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Saving…
              </span>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Record Expense"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseFormModal;
