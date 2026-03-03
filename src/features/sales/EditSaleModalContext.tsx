import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import EditSaleModal from "./EditSaleModal";
import {
  SaleRecord,
  BranchOption,
  EmployeeOption,
  fetchBranchOptions,
  fetchEmployeeOptions,
} from "./api";

interface ModalState {
  open: boolean;
  sale: SaleRecord | null;
  onSuccess: () => void;
}

interface EditSaleContextValue {
  openEditSale: (sale: SaleRecord, onSuccess?: () => void) => void;
}

const EditSaleContext = createContext<EditSaleContextValue | null>(null);

export const EditSaleModalProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [state, setState] = useState<ModalState>({
    open: false,
    sale: null,
    onSuccess: () => {},
  });
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  /* Pre-load branches + employees when tenant is known */
  useEffect(() => {
    if (!profile?.tenant_id) return;
    Promise.all([
      fetchBranchOptions(profile.tenant_id),
      fetchEmployeeOptions(profile.tenant_id),
    ]).then(([b, e]) => {
      setBranches(b);
      setEmployees(e);
    });
  }, [profile?.tenant_id]);

  const openEditSale = useCallback((sale: SaleRecord, onSuccess: () => void = () => {}) => {
    setState({ open: true, sale, onSuccess });
  }, []);

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleSuccess = useCallback(() => {
    state.onSuccess();
  }, [state]);

  return (
    <EditSaleContext.Provider value={{ openEditSale }}>
      {children}
      {state.open && state.sale && user && profile?.tenant_id && (
        <EditSaleModal
          open={state.open}
          sale={state.sale}
          tenantId={profile.tenant_id}
          branches={branches}
          employees={employees}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </EditSaleContext.Provider>
  );
};

export const useEditSaleModal = (): EditSaleContextValue => {
  const ctx = useContext(EditSaleContext);
  if (!ctx) throw new Error("useEditSaleModal must be used within EditSaleModalProvider");
  return ctx;
};
