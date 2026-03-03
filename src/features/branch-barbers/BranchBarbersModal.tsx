import { useEffect, useState } from "react";
import { X, Users, UserPlus, UserMinus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchTenantEmployees, saveBranchAssignments, BranchEmployee } from "./api";
import { toast } from "sonner";

/* ── Types ────────────────────────────────────────────────────────────────── */

interface BranchBarbersModalProps {
  open: boolean;
  branchId: string;
  branchName: string;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type AssignmentState = "assigned" | "available" | "unavailable";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/* ── Modal ────────────────────────────────────────────────────────────────── */

const BranchBarbersModal = ({
  open,
  branchId,
  branchName,
  tenantId,
  onClose,
  onSuccess,
}: BranchBarbersModalProps) => {
  const [employees, setEmployees] = useState<BranchEmployee[]>([]);
  const [localAssigned, setLocalAssigned] = useState<Record<string, boolean>>({});
  const [originalBranchIds, setOriginalBranchIds] = useState<Record<string, string | null>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Load on open */
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setLoading(true);

    fetchTenantEmployees(tenantId)
      .then((data) => {
        setEmployees(data);
        const assigned: Record<string, boolean> = {};
        const origIds: Record<string, string | null> = {};
        for (const emp of data) {
          assigned[emp.employee_id] = emp.assigned_branch_id === branchId;
          origIds[emp.employee_id] = emp.assigned_branch_id;
        }
        setLocalAssigned(assigned);
        setOriginalBranchIds(origIds);
      })
      .catch(() => toast.error("Failed to load employees."))
      .finally(() => setLoading(false));
  }, [open, branchId, tenantId]);

  if (!open) return null;

  /* ── Helpers ── */

  const getState = (emp: BranchEmployee): AssignmentState => {
    if (localAssigned[emp.employee_id]) return "assigned";
    const origBranch = originalBranchIds[emp.employee_id];
    if (origBranch && origBranch !== branchId) return "unavailable";
    return "available";
  };

  const toggle = (empId: string) => {
    const origBranch = originalBranchIds[empId];
    // Block if assigned to a different branch
    if (origBranch && origBranch !== branchId && !localAssigned[empId]) return;
    setLocalAssigned((prev) => ({ ...prev, [empId]: !prev[empId] }));
  };

  /* ── Filtered + sorted list ── */

  const filtered = employees
    .filter((emp) => {
      const q = search.toLowerCase();
      return (
        emp.employee_name.toLowerCase().includes(q) ||
        (emp.employee_number ?? "").toLowerCase().includes(q) ||
        (emp.position ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const priority: Record<AssignmentState, number> = {
        assigned: 1,
        available: 2,
        unavailable: 3,
      };
      const pa = priority[getState(a)];
      const pb = priority[getState(b)];
      if (pa !== pb) return pa - pb;
      return a.employee_name.localeCompare(b.employee_name);
    });

  /* ── Save ── */

  const handleSave = async () => {
    const toAssign: string[] = [];
    const toRemove: string[] = [];
    const affectedBranchIds: string[] = [branchId];

    for (const emp of employees) {
      const isNowAssigned = localAssigned[emp.employee_id];
      const wasAssigned = originalBranchIds[emp.employee_id] === branchId;

      if (isNowAssigned && !wasAssigned) {
        toAssign.push(emp.employee_id);
        // If previously in another branch, that branch count also needs refresh
        const prevBranch = originalBranchIds[emp.employee_id];
        if (prevBranch && prevBranch !== branchId) {
          affectedBranchIds.push(prevBranch);
        }
      } else if (!isNowAssigned && wasAssigned) {
        toRemove.push(emp.employee_id);
      }
    }

    if (toAssign.length === 0 && toRemove.length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      await saveBranchAssignments(branchId, tenantId, toAssign, toRemove, affectedBranchIds);
      const assignedCount = Object.values(localAssigned).filter(Boolean).length;
      toast.success(`Updated: ${assignedCount} employee(s) assigned to ${branchName}.`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save assignments.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */

  const assignedCount = Object.values(localAssigned).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => { if (!saving) onClose(); }}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-none">
                Manage Barbers
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {branchName} · {assignedCount} assigned
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

        {/* Search */}
        {!loading && employees.length > 0 && (
          <div className="px-6 pt-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or position…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No employees found.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add employees in HR Management first.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No results for "{search}"</p>
            </div>
          ) : (
            filtered.map((emp) => {
              const state = getState(emp);
              const isAssigned = state === "assigned";
              const isUnavailable = state === "unavailable";

              return (
                <div
                  key={emp.employee_id}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                    isAssigned
                      ? "border-primary/25 bg-primary/5"
                      : isUnavailable
                      ? "border-border bg-muted/20 opacity-60"
                      : "border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isAssigned ? "bg-primary/15" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold ${
                        isAssigned ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {getInitials(emp.employee_name)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-sm font-semibold leading-tight truncate ${
                          isUnavailable ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {emp.employee_name}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isAssigned
                            ? "bg-primary/15 text-primary"
                            : isUnavailable
                            ? "bg-muted text-muted-foreground border border-border"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isAssigned ? "Assigned" : isUnavailable ? "Other Branch" : "Available"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[emp.position, emp.employee_number]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>

                  {/* Action */}
                  <Button
                    size="sm"
                    variant={isAssigned ? "destructive" : "default"}
                    disabled={isUnavailable || saving}
                    onClick={() => toggle(emp.employee_id)}
                    className={`shrink-0 h-8 px-3 text-xs ${
                      !isAssigned && !isUnavailable
                        ? "teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md"
                        : ""
                    }`}
                  >
                    {isUnavailable ? (
                      "Unavailable"
                    ) : isAssigned ? (
                      <span className="flex items-center gap-1">
                        <UserMinus className="w-3 h-3" /> Remove
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserPlus className="w-3 h-3" /> Assign
                      </span>
                    )}
                  </Button>
                </div>
              );
            })
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
            disabled={saving || loading}
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

export default BranchBarbersModal;
