import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import AddEmployeeModal from "./AddEmployeeModal";

interface ModalState {
  open: boolean;
  onSuccess: () => void;
}

interface AddEmployeeContextValue {
  openAddEmployee: (onSuccess?: () => void) => void;
}

const AddEmployeeContext = createContext<AddEmployeeContextValue | null>(null);

export const AddEmployeeModalProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [state, setState] = useState<ModalState>({
    open: false,
    onSuccess: () => {},
  });

  const openAddEmployee = useCallback((onSuccess: () => void = () => {}) => {
    setState({ open: true, onSuccess });
  }, []);

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleSuccess = useCallback(() => {
    state.onSuccess();
  }, [state]);

  return (
    <AddEmployeeContext.Provider value={{ openAddEmployee }}>
      {children}
      {state.open && user && profile?.tenant_id && (
        <AddEmployeeModal
          open={state.open}
          tenantId={profile.tenant_id}
          userId={user.id}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </AddEmployeeContext.Provider>
  );
};

export const useAddEmployeeModal = (): AddEmployeeContextValue => {
  const ctx = useContext(AddEmployeeContext);
  if (!ctx) {
    throw new Error("useAddEmployeeModal must be used within AddEmployeeModalProvider");
  }
  return ctx;
};
