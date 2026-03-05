import { useState, useEffect } from "react";
import { Building2, X, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBranch } from "./api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddBranchModalProps {
  open: boolean;
  tenantId: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  shop_number: string;
  branch_name: string;
  phone: string;
  location: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  shop_number: "",
  branch_name: "",
  phone: "",
  location: "",
  description: "",
};

const AddBranchModal = ({
  open,
  tenantId,
  userId,
  onClose,
  onSuccess,
}: AddBranchModalProps) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !tenantId) return;
    supabase
      .from("branch_details")
      .select("shop_number")
      .eq("tenant_id", tenantId)
      .then(({ data }) => {
        const parsed = (data ?? [])
          .map((r) => {
            const m = (r.shop_number ?? "").match(/^([A-Za-z]*)(\d+)$/);
            return m ? { prefix: m[1], num: parseInt(m[2], 10), width: m[2].length } : null;
          })
          .filter(Boolean) as { prefix: string; num: number; width: number }[];

        if (parsed.length === 0) {
          setForm((prev) => ({ ...prev, shop_number: "1" }));
          return;
        }

        const max = parsed.reduce((a, b) => (b.num > a.num ? b : a));
        const nextNum = String(max.num + 1).padStart(max.width, "0");
        setForm((prev) => ({ ...prev, shop_number: `${max.prefix}${nextNum}` }));
      });
  }, [open, tenantId]);

  if (!open) return null;

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const next: Partial<FormState> = {};
    if (!form.branch_name.trim()) next.branch_name = "Branch name is required.";
    if (!form.location.trim()) next.location = "Location is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createBranch({
        shop_number: form.shop_number.trim(),
        branch_name: form.branch_name.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        tenant_id: tenantId,
        created_by: userId,
      });
      toast.success("Branch created successfully!");
      setForm(EMPTY_FORM);
      setErrors({});
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create branch.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground">Add New Branch</h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Section heading */}
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            Branch Information
          </div>

          {/* Row: Shop Number + Branch Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="shop_number" className="text-sm font-medium text-foreground">
                Shop Number
              </Label>
              <Input
                id="shop_number"
                placeholder="e.g., SHOP001"
                value={form.shop_number}
                onChange={set("shop_number")}
                disabled={submitting}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch_name" className="text-sm font-medium text-foreground">
                Branch Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="branch_name"
                placeholder="e.g., Downtown Dubai"
                value={form.branch_name}
                onChange={set("branch_name")}
                disabled={submitting}
                className={`h-10 ${errors.branch_name ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {errors.branch_name && (
                <p className="text-[11px] text-destructive">{errors.branch_name}</p>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-medium text-foreground">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="+971 4 123 4567"
                value={form.phone}
                onChange={set("phone")}
                disabled={submitting}
                className="h-10 pl-9"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-sm font-medium text-foreground">
              Location <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                id="location"
                placeholder="e.g., DIFC, Sheikh Zayed Road, Dubai"
                value={form.location}
                onChange={set("location")}
                disabled={submitting}
                rows={3}
                className={`pl-9 resize-none ${errors.location ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
            </div>
            {errors.location && (
              <p className="text-[11px] text-destructive">{errors.location}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description{" "}
              <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description about this branch..."
              value={form.description}
              onChange={set("description")}
              disabled={submitting}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
            className="min-w-[90px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="min-w-[130px] teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              "Create Branch"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddBranchModal;
