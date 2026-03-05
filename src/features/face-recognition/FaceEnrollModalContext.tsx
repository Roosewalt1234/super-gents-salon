import { createContext, useContext, useState, ReactNode } from "react";

interface FaceEnrollTarget {
  employeeId: string;
  employeeName: string;
}

interface FaceEnrollModalContextType {
  isOpen: boolean;
  target: FaceEnrollTarget | null;
  openEnroll: (target: FaceEnrollTarget, onDone?: () => void) => void;
  closeEnroll: () => void;
  onDone: (() => void) | null;
}

const FaceEnrollModalContext = createContext<FaceEnrollModalContextType | null>(null);

export const FaceEnrollModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen]   = useState(false);
  const [target, setTarget]   = useState<FaceEnrollTarget | null>(null);
  const [onDone, setOnDone]   = useState<(() => void) | null>(null);

  const openEnroll = (t: FaceEnrollTarget, cb?: () => void) => {
    setTarget(t);
    setOnDone(() => cb ?? null);
    setIsOpen(true);
  };

  const closeEnroll = () => {
    setIsOpen(false);
    setTarget(null);
    setOnDone(null);
  };

  return (
    <FaceEnrollModalContext.Provider value={{ isOpen, target, openEnroll, closeEnroll, onDone }}>
      {children}
    </FaceEnrollModalContext.Provider>
  );
};

export const useFaceEnrollModal = () => {
  const ctx = useContext(FaceEnrollModalContext);
  if (!ctx) throw new Error("useFaceEnrollModal must be used within FaceEnrollModalProvider");
  return ctx;
};
