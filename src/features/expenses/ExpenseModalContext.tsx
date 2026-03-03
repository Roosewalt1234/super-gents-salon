import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import ExpenseFormModal from "./ExpenseFormModal";
import {
  ExpenseRecord,
  ExpenseBranchOption,
  ExpenseEmployeeOption,
  CategoryOption,
  SubCategoryOption,
  fetchExpenseBranches,
  fetchExpenseEmployees,
  fetchCategories,
  fetchSubCategories,
} from "./api";

/* ── Context value ────────────────────────────────────────────────────────── */

interface ExpenseModalContextValue {
  openAddExpense: (onSuccess?: () => void) => void;
  openEditExpense: (expense: ExpenseRecord, onSuccess?: () => void) => void;
}

const ExpenseModalContext = createContext<ExpenseModalContextValue | null>(null);

/* ── Modal state ──────────────────────────────────────────────────────────── */

interface ModalState {
  open: boolean;
  mode: "add" | "edit";
  expense: ExpenseRecord | null;
  onSuccess: () => void;
}

const CLOSED: ModalState = { open: false, mode: "add", expense: null, onSuccess: () => {} };

/* ── Provider ─────────────────────────────────────────────────────────────── */

export const ExpenseModalProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();

  const [state, setState] = useState<ModalState>(CLOSED);

  /* Shared reference data — loaded once when tenant is known */
  const [branches, setBranches] = useState<ExpenseBranchOption[]>([]);
  const [employees, setEmployees] = useState<ExpenseEmployeeOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    Promise.all([
      fetchExpenseBranches(profile.tenant_id),
      fetchExpenseEmployees(profile.tenant_id),
      fetchCategories(),
      fetchSubCategories(),
    ]).then(([b, e, c, sc]) => {
      setBranches(b);
      setEmployees(e);
      setCategories(c);
      setSubCategories(sc);
    });
  }, [profile?.tenant_id]);

  /* ── Open helpers ── */

  const openAddExpense = useCallback((onSuccess: () => void = () => {}) => {
    setState({ open: true, mode: "add", expense: null, onSuccess });
  }, []);

  const openEditExpense = useCallback((expense: ExpenseRecord, onSuccess: () => void = () => {}) => {
    setState({ open: true, mode: "edit", expense, onSuccess });
  }, []);

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleSuccess = useCallback(() => {
    state.onSuccess();
  }, [state]);

  return (
    <ExpenseModalContext.Provider value={{ openAddExpense, openEditExpense }}>
      {children}
      {state.open && user && profile?.tenant_id && (
        <ExpenseFormModal
          open={state.open}
          mode={state.mode}
          expense={state.expense ?? undefined}
          tenantId={profile.tenant_id}
          userId={user.id}
          branches={branches}
          employees={employees}
          categories={categories}
          subCategories={subCategories}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </ExpenseModalContext.Provider>
  );
};

/* ── Hook ─────────────────────────────────────────────────────────────────── */

export const useExpenseModal = (): ExpenseModalContextValue => {
  const ctx = useContext(ExpenseModalContext);
  if (!ctx) throw new Error("useExpenseModal must be used within ExpenseModalProvider");
  return ctx;
};
