import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import BranchSettingsModal from "./BranchSettingsModal";

interface ModalState {
  open: boolean;
  branchId: string;
  branchName: string;
  onSuccess: () => void;
}

interface BranchSettingsContextValue {
  openBranchSettings: (branchId: string, branchName: string, onSuccess?: () => void) => void;
}

const BranchSettingsContext = createContext<BranchSettingsContextValue | null>(null);

export const BranchSettingsModalProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [state, setState] = useState<ModalState>({
    open: false,
    branchId: "",
    branchName: "",
    onSuccess: () => {},
  });

  const openBranchSettings = useCallback(
    (branchId: string, branchName: string, onSuccess: () => void = () => {}) => {
      setState({ open: true, branchId, branchName, onSuccess });
    },
    []
  );

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <BranchSettingsContext.Provider value={{ openBranchSettings }}>
      {children}
      {state.open && user && profile?.tenant_id && (
        <BranchSettingsModal
          open={state.open}
          branchId={state.branchId}
          branchName={state.branchName}
          tenantId={profile.tenant_id}
          userId={user.id}
          onClose={handleClose}
          onSuccess={state.onSuccess}
        />
      )}
    </BranchSettingsContext.Provider>
  );
};

export const useBranchSettingsModal = (): BranchSettingsContextValue => {
  const ctx = useContext(BranchSettingsContext);
  if (!ctx) {
    throw new Error("useBranchSettingsModal must be used within BranchSettingsModalProvider");
  }
  return ctx;
};
