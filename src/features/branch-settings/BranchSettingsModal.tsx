import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchBranchSettingsData,
  saveBranchSettings,
  BranchSettingsData,
  ChequeEntry,
} from "./api";

interface BranchSettingsModalProps {
  open: boolean;
  branchId: string;
  branchName: string;
  tenantId: string;
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/* ── Toggle Switch ───────────────────────────────────────────────────────── */
const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
      checked ? "bg-primary" : "bg-muted-foreground/30"
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

/* ── Section Card ────────────────────────────────────────────────────────── */
const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-card rounded-xl border border-border p-5">
    <h3 className="text-sm font-bold text-foreground mb-4">{title}</h3>
    {children}
  </div>
);

/* ── Main Modal ──────────────────────────────────────────────────────────── */
const BranchSettingsModal = ({
  open,
  branchId,
  branchName,
  tenantId,
  userId,
  onClose,
  onSuccess,
}: BranchSettingsModalProps) => {
  const [settings, setSettings] = useState<BranchSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ── Load on open ── */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchBranchSettingsData(branchId)
      .then(setSettings)
      .catch(() => toast.error("Failed to load branch settings"))
      .finally(() => setLoading(false));
  }, [open, branchId]);

  /* ── Auto-fill expiry date (start + 365 days) ── */
  useEffect(() => {
    if (!settings) return;
    if (settings.rental_agreement_start_date && !settings.rental_agreement_expiry_date) {
      const start = new Date(settings.rental_agreement_start_date);
      start.setDate(start.getDate() + 365);
      set("rental_agreement_expiry_date")(start.toISOString().split("T")[0]);
    }
  }, [settings?.rental_agreement_start_date]);

  /* ── Auto-recalculate cheque amounts ── */
  useEffect(() => {
    if (!settings || !settings.rent_amount || !settings.number_of_cheques || settings.number_of_cheques <= 0) return;
    const perCheque = settings.rent_amount / settings.number_of_cheques;
    setSettings((prev) =>
      prev ? { ...prev, cheques: prev.cheques.map((c) => ({ ...c, cheque_amount: perCheque })) } : prev
    );
  }, [settings?.rent_amount, settings?.number_of_cheques]);

  if (!open) return null;

  /* ── Helpers ── */
  const set =
    <K extends keyof BranchSettingsData>(field: K) =>
    (value: BranchSettingsData[K]) => {
      setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

  const updateCheque = (
    index: number,
    field: keyof ChequeEntry,
    value: string | number
  ) => {
    if (!settings) return;
    const updated = [...settings.cheques];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, cheques: updated });
  };

  const addCheque = () => {
    if (!settings) return;
    const newCount = settings.cheques.length + 1;
    const perCheque = settings.rent_amount ? settings.rent_amount / newCount : 0;
    const rebalanced = settings.cheques.map((c) => ({ ...c, cheque_amount: perCheque }));
    setSettings({
      ...settings,
      cheques: [...rebalanced, { cheque_number: "", cheque_amount: perCheque, cheque_date: "" }],
      number_of_cheques: newCount,
    });
  };

  const removeCheque = (index: number) => {
    if (!settings) return;
    const updated = settings.cheques.filter((_, i) => i !== index);
    const newCount = updated.length;
    const perCheque = newCount > 0 && settings.rent_amount ? settings.rent_amount / newCount : 0;
    setSettings({
      ...settings,
      cheques: updated.map((c) => ({ ...c, cheque_amount: perCheque })),
      number_of_cheques: newCount,
    });
  };

  const handleNumChequesChange = (numCheques: number) => {
    if (!settings) return;
    const current = settings.cheques;
    const perCheque = settings.rent_amount && numCheques > 0 ? settings.rent_amount / numCheques : 0;
    let updated: ChequeEntry[];
    if (numCheques > current.length) {
      const extras = Array.from({ length: numCheques - current.length }, () => ({
        cheque_number: "", cheque_amount: perCheque, cheque_date: "",
      }));
      updated = [...current.map((c) => ({ ...c, cheque_amount: perCheque })), ...extras];
    } else {
      updated = current.slice(0, numCheques).map((c) => ({ ...c, cheque_amount: perCheque }));
    }
    setSettings({ ...settings, number_of_cheques: numCheques, cheques: updated });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveBranchSettings(settings, tenantId, userId);
      toast.success("Branch settings saved successfully.");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">
            Branch Settings —{" "}
            <span className="text-primary">{branchName}</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !settings ? (
            <p className="text-center text-muted-foreground py-12 text-sm">Failed to load settings.</p>
          ) : (
            <>
              {/* Partnership */}
              <Section title="Partnership Settings">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Branch Partnership</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Enable if this branch has a business partner</p>
                  </div>
                  <Toggle checked={settings.has_partnership} onChange={set("has_partnership")} />
                </div>

                {settings.has_partnership && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Partner Company Name</Label>
                      <Input
                        value={settings.partner_company_name ?? ""}
                        onChange={(e) => set("partner_company_name")(e.target.value)}
                        placeholder="Enter partner company name"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Partner Name</Label>
                      <Input
                        value={settings.partner_name ?? ""}
                        onChange={(e) => set("partner_name")(e.target.value)}
                        placeholder="Enter partner's name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Investment Percentage (%)</Label>
                        <Input
                          type="number" min="0" max="100" step="0.01"
                          value={settings.investment_percentage ?? ""}
                          onChange={(e) => set("investment_percentage")(parseFloat(e.target.value) || null)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Profit Sharing (%)</Label>
                        <Input
                          type="number" min="0" max="100" step="0.01"
                          value={settings.profit_sharing_percentage ?? ""}
                          onChange={(e) => set("profit_sharing_percentage")(parseFloat(e.target.value) || null)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Section>

              {/* VAT */}
              <Section title="VAT Settings">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">VAT Applicable</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Enable if VAT should be applied to transactions at this branch</p>
                  </div>
                  <Toggle checked={settings.has_vat} onChange={set("has_vat")} />
                </div>
              </Section>

              {/* Capacity */}
              <Section title="Capacity Settings">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Number of Chairs</Label>
                  <Input
                    type="number" min="0"
                    value={settings.number_of_chairs}
                    onChange={(e) => set("number_of_chairs")(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Track the number of chairs available for capacity planning.</p>
              </Section>

              {/* Licensing */}
              <Section title="Licensing Settings">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">License Number</Label>
                      <Input
                        value={settings.license_number ?? ""}
                        onChange={(e) => set("license_number")(e.target.value)}
                        placeholder="Enter license number"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">License Expiry Date</Label>
                      <Input
                        type="date"
                        value={settings.license_expiry_date ?? ""}
                        onChange={(e) => set("license_expiry_date")(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Establishment Card Number</Label>
                      <Input
                        value={settings.establishment_card_number ?? ""}
                        onChange={(e) => set("establishment_card_number")(e.target.value)}
                        placeholder="Enter card number"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Establishment Card Expiry</Label>
                      <Input
                        type="date"
                        value={settings.establishment_card_expiry_date ?? ""}
                        onChange={(e) => set("establishment_card_expiry_date")(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </Section>

              {/* Rental */}
              <Section title="Rental Settings">
                <div className="space-y-4">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Rental Agreement Number</Label>
                    <Input
                      value={settings.rental_agreement_number ?? ""}
                      onChange={(e) => set("rental_agreement_number")(e.target.value)}
                      placeholder="Enter rental agreement number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Agreement Start Date</Label>
                      <Input
                        type="date"
                        value={settings.rental_agreement_start_date ?? ""}
                        onChange={(e) => set("rental_agreement_start_date")(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Agreement Expiry Date</Label>
                      <Input
                        type="date"
                        value={settings.rental_agreement_expiry_date ?? ""}
                        onChange={(e) => set("rental_agreement_expiry_date")(e.target.value)}
                        placeholder="Auto-filled: 365 days from start"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Rent Amount (AED)</Label>
                      <Input
                        type="number" min="0" step="0.01"
                        value={settings.rent_amount ?? ""}
                        onChange={(e) => set("rent_amount")(parseFloat(e.target.value) || null)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Number of Cheques</Label>
                      <Input
                        type="number" min="0"
                        value={settings.number_of_cheques ?? 0}
                        onChange={(e) => handleNumChequesChange(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>
                  </div>
                </div>
              </Section>

              {/* Cheque Management */}
              {(settings.number_of_cheques ?? 0) > 0 && (
                <Section title="Cheque Management">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-muted-foreground">{settings.cheques.length} cheque{settings.cheques.length !== 1 ? "s" : ""}</p>
                    <Button variant="outline" size="sm" onClick={addCheque} className="gap-1.5 h-8 text-xs">
                      <Plus className="w-3.5 h-3.5" /> Add Cheque
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {settings.cheques.map((cheque, index) => (
                      <div key={index} className="p-4 rounded-lg border border-border space-y-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground">Cheque {index + 1}</p>
                          {settings.cheques.length > 1 && (
                            <button
                              onClick={() => removeCheque(index)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Cheque Number</Label>
                            <Input
                              value={cheque.cheque_number}
                              onChange={(e) => updateCheque(index, "cheque_number", e.target.value)}
                              placeholder="Cheque #"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Amount (AED)</Label>
                            <Input
                              type="number" min="0" step="0.01"
                              value={cheque.cheque_amount}
                              onChange={(e) => updateCheque(index, "cheque_amount", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Cheque Date</Label>
                            <Input
                              type="date"
                              value={cheque.cheque_date}
                              onChange={(e) => updateCheque(index, "cheque_date", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving} className="min-w-[90px]">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !settings}
            className="min-w-[140px] teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BranchSettingsModal;
