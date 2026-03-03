import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import BranchBarbersModal from "./BranchBarbersModal";

interface ModalState {
  open: boolean;
  branchId: string;
  branchName: string;
  onSuccess: () => void;
}

interface BranchBarbersContextValue {
  openBranchBarbers: (branchId: string, branchName: string, onSuccess?: () => void) => void;
}

const BranchBarbersContext = createContext<BranchBarbersContextValue | null>(null);

export const BranchBarbersModalProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [state, setState] = useState<ModalState>({
    open: false,
    branchId: "",
    branchName: "",
    onSuccess: () => {},
  });

  const openBranchBarbers = useCallback(
    (branchId: string, branchName: string, onSuccess: () => void = () => {}) => {
      setState({ open: true, branchId, branchName, onSuccess });
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
    <BranchBarbersContext.Provider value={{ openBranchBarbers }}>
      {children}
      {state.open && state.branchId && user && profile?.tenant_id && (
        <BranchBarbersModal
          open={state.open}
          branchId={state.branchId}
          branchName={state.branchName}
          tenantId={profile.tenant_id}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </BranchBarbersContext.Provider>
  );
};

export const useBranchBarbersModal = (): BranchBarbersContextValue => {
  const ctx = useContext(BranchBarbersContext);
  if (!ctx) {
    throw new Error("useBranchBarbersModal must be used within BranchBarbersModalProvider");
  }
  return ctx;
};
