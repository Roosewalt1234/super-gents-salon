import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import AddSaleModal from "./AddSaleModal";
import {
  BranchOption,
  EmployeeOption,
  fetchBranchOptions,
  fetchEmployeeOptions,
} from "./api";

interface AddSaleContextValue {
  openAddSale: (onSuccess?: () => void) => void;
}

const AddSaleContext = createContext<AddSaleContextValue | null>(null);

export const AddSaleModalProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [onSuccessCb, setOnSuccessCb] = useState<() => void>(() => () => {});
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

  const openAddSale = useCallback((onSuccess: () => void = () => {}) => {
    setOnSuccessCb(() => onSuccess);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);
  const handleSuccess = useCallback(() => onSuccessCb(), [onSuccessCb]);

  return (
    <AddSaleContext.Provider value={{ openAddSale }}>
      {children}
      {open && user && profile?.tenant_id && (
        <AddSaleModal
          open={open}
          tenantId={profile.tenant_id}
          branches={branches}
          employees={employees}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </AddSaleContext.Provider>
  );
};

export const useAddSaleModal = (): AddSaleContextValue => {
  const ctx = useContext(AddSaleContext);
  if (!ctx) throw new Error("useAddSaleModal must be used within AddSaleModalProvider");
  return ctx;
};
