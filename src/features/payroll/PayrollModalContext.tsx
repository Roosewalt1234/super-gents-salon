import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  BranchOption,
  PayrollEmployee,
  fetchPayrollBranches,
  fetchPayrollEmployees,
} from "./api";
import AddDeductionModal        from "./modals/AddDeductionModal";
import ProcessDeductionModal    from "./modals/ProcessDeductionModal";
import ProcessBranchSalaryModal from "./modals/ProcessBranchSalaryModal";
import ProcessIndividualSalaryModal from "./modals/ProcessIndividualSalaryModal";

/* ── Context value ────────────────────────────────────────────────────────── */

interface PayrollModalContextValue {
  openAddDeduction:           (employeeId?: string, onSuccess?: () => void) => void;
  openProcessDeduction:       (employeeId?: string, onSuccess?: () => void) => void;
  openProcessBranchSalary:    (branchId?: string,   onSuccess?: () => void) => void;
  openProcessAllSalary:       (onSuccess?: () => void) => void;
  openProcessIndividualSalary:(employeeId?: string, onSuccess?: () => void) => void;
}

const PayrollModalContext = createContext<PayrollModalContextValue | null>(null);

/* ── Closed sentinel ──────────────────────────────────────────────────────── */

interface ModalState {
  open: boolean;
  preselectedId: string | undefined;
  onSuccess: () => void;
}

const CLOSED: ModalState = { open: false, preselectedId: undefined, onSuccess: () => {} };

/* ── Provider ─────────────────────────────────────────────────────────────── */

export const PayrollModalProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();

  const [branches,  setBranches]  = useState<BranchOption[]>([]);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);

  const [addDedState,    setAddDedState]    = useState<ModalState>(CLOSED);
  const [procDedState,   setProcDedState]   = useState<ModalState>(CLOSED);
  const [branchSalState, setBranchSalState] = useState<ModalState>(CLOSED);
  const [indivSalState,  setIndivSalState]  = useState<ModalState>(CLOSED);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    Promise.all([
      fetchPayrollBranches(profile.tenant_id),
      fetchPayrollEmployees(profile.tenant_id),
    ]).then(([b, e]) => {
      setBranches(b);
      setEmployees(e);
    });
  }, [profile?.tenant_id]);

  /* Re-fetch employees after a deduction/salary change so balances stay fresh */
  const refreshEmployees = useCallback(() => {
    if (!profile?.tenant_id) return;
    fetchPayrollEmployees(profile.tenant_id).then(setEmployees);
  }, [profile?.tenant_id]);

  /* ── Open helpers ── */

  const openAddDeduction = useCallback(
    (employeeId?: string, onSuccess: () => void = () => {}) => {
      setAddDedState({ open: true, preselectedId: employeeId, onSuccess });
    },
    []
  );

  const openProcessDeduction = useCallback(
    (employeeId?: string, onSuccess: () => void = () => {}) => {
      setProcDedState({ open: true, preselectedId: employeeId, onSuccess });
    },
    []
  );

  const openProcessBranchSalary = useCallback(
    (branchId?: string, onSuccess: () => void = () => {}) => {
      setBranchSalState({ open: true, preselectedId: branchId, onSuccess });
    },
    []
  );

  const openProcessAllSalary = useCallback(
    (onSuccess: () => void = () => {}) => {
      setBranchSalState({ open: true, preselectedId: "all", onSuccess });
    },
    []
  );

  const openProcessIndividualSalary = useCallback(
    (employeeId?: string, onSuccess: () => void = () => {}) => {
      setIndivSalState({ open: true, preselectedId: employeeId, onSuccess });
    },
    []
  );

  const makeClose = (setter: React.Dispatch<React.SetStateAction<ModalState>>) =>
    () => setter((s) => ({ ...s, open: false }));

  const makeSuccess = (
    state: ModalState,
    setter: React.Dispatch<React.SetStateAction<ModalState>>
  ) => () => {
    state.onSuccess();
    refreshEmployees();
    setter((s) => ({ ...s, open: false }));
  };

  const tenantId = profile?.tenant_id ?? "";

  return (
    <PayrollModalContext.Provider
      value={{
        openAddDeduction,
        openProcessDeduction,
        openProcessBranchSalary,
        openProcessAllSalary,
        openProcessIndividualSalary,
      }}
    >
      {children}

      {addDedState.open && tenantId && (
        <AddDeductionModal
          open
          tenantId={tenantId}
          employees={employees}
          branches={branches}
          preselectedEmployeeId={addDedState.preselectedId}
          onClose={makeClose(setAddDedState)}
          onSuccess={makeSuccess(addDedState, setAddDedState)}
        />
      )}

      {procDedState.open && tenantId && (
        <ProcessDeductionModal
          open
          tenantId={tenantId}
          employees={employees}
          branches={branches}
          preselectedEmployeeId={procDedState.preselectedId}
          onClose={makeClose(setProcDedState)}
          onSuccess={makeSuccess(procDedState, setProcDedState)}
        />
      )}

      {branchSalState.open && tenantId && (
        <ProcessBranchSalaryModal
          open
          tenantId={tenantId}
          branches={branches}
          preselectedBranchId={branchSalState.preselectedId}
          onClose={makeClose(setBranchSalState)}
          onSuccess={branchSalState.onSuccess}
        />
      )}

      {indivSalState.open && tenantId && (
        <ProcessIndividualSalaryModal
          open
          tenantId={tenantId}
          employees={employees}
          branches={branches}
          preselectedEmployeeId={indivSalState.preselectedId}
          onClose={makeClose(setIndivSalState)}
          onSuccess={makeSuccess(indivSalState, setIndivSalState)}
        />
      )}
    </PayrollModalContext.Provider>
  );
};

/* ── Hook ─────────────────────────────────────────────────────────────────── */

export const usePayrollModals = (): PayrollModalContextValue => {
  const ctx = useContext(PayrollModalContext);
  if (!ctx) throw new Error("usePayrollModals must be used within PayrollModalProvider");
  return ctx;
};
