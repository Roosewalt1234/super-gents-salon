import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import ManageServicesModal from "./ManageServicesModal";

interface ModalState {
  open: boolean;
  branchId: string;
  branchName: string;
}

interface ManageServicesContextValue {
  openManageServices: (branchId: string, branchName: string) => void;
}

const ManageServicesContext = createContext<ManageServicesContextValue | null>(null);

export const ManageServicesModalProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [state, setState] = useState<ModalState>({
    open: false,
    branchId: "",
    branchName: "",
  });

  const openManageServices = useCallback((branchId: string, branchName: string) => {
    setState({ open: true, branchId, branchName });
  }, []);

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <ManageServicesContext.Provider value={{ openManageServices }}>
      {children}
      {state.open && user && profile?.tenant_id && (
        <ManageServicesModal
          open={state.open}
          branchId={state.branchId}
          branchName={state.branchName}
          tenantId={profile.tenant_id}
          userId={user.id}
          onClose={handleClose}
        />
      )}
    </ManageServicesContext.Provider>
  );
};

export const useManageServicesModal = (): ManageServicesContextValue => {
  const ctx = useContext(ManageServicesContext);
  if (!ctx) {
    throw new Error("useManageServicesModal must be used within ManageServicesModalProvider");
  }
  return ctx;
};
