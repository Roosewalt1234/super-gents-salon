import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import AddBranchModal from "./AddBranchModal";

interface BranchModalState {
  open: boolean;
  onSuccess: () => void;
}

interface BranchModalContextValue {
  openAddBranch: (onSuccess?: () => void) => void;
}

const BranchModalContext = createContext<BranchModalContextValue | null>(null);

export const BranchModalProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [state, setState] = useState<BranchModalState>({
    open: false,
    onSuccess: () => {},
  });

  const openAddBranch = useCallback((onSuccess: () => void = () => {}) => {
    setState({ open: true, onSuccess });
  }, []);

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleSuccess = useCallback(() => {
    state.onSuccess();
  }, [state]);

  return (
    <BranchModalContext.Provider value={{ openAddBranch }}>
      {children}
      {state.open && user && profile?.tenant_id && (
        <AddBranchModal
          open={state.open}
          tenantId={profile.tenant_id}
          userId={user.id}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </BranchModalContext.Provider>
  );
};

export const useAddBranchModal = (): BranchModalContextValue => {
  const ctx = useContext(BranchModalContext);
  if (!ctx) {
    throw new Error("useAddBranchModal must be used within BranchModalProvider");
  }
  return ctx;
};
