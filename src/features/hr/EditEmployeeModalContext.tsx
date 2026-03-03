import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import EditEmployeeModal from "./EditEmployeeModal";

interface ModalState {
  open: boolean;
  employeeId: string;
  onSuccess: () => void;
}

interface EditEmployeeContextValue {
  openEditEmployee: (employeeId: string, onSuccess?: () => void) => void;
}

const EditEmployeeContext = createContext<EditEmployeeContextValue | null>(null);

export const EditEmployeeModalProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [state, setState] = useState<ModalState>({
    open: false,
    employeeId: "",
    onSuccess: () => {},
  });

  const openEditEmployee = useCallback(
    (employeeId: string, onSuccess: () => void = () => {}) => {
      setState({ open: true, employeeId, onSuccess });
    },
    []
  );

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleSuccess = useCallback(() => {
    state.onSuccess();
  }, [state]);

  return (
    <EditEmployeeContext.Provider value={{ openEditEmployee }}>
      {children}
      {state.open && state.employeeId && user && profile?.tenant_id && (
        <EditEmployeeModal
          open={state.open}
          employeeId={state.employeeId}
          tenantId={profile.tenant_id}
          userId={user.id}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </EditEmployeeContext.Provider>
  );
};

export const useEditEmployeeModal = (): EditEmployeeContextValue => {
  const ctx = useContext(EditEmployeeContext);
  if (!ctx) {
    throw new Error("useEditEmployeeModal must be used within EditEmployeeModalProvider");
  }
  return ctx;
};
