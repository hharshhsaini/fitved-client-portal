import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { PauseRecord } from "@/lib/mockData";
import { mockPauses } from "@/lib/mockData";

interface PauseContextValue {
  activePause: PauseRecord | null;
  history: PauseRecord[];
  pause: (from: string, to: string) => void;
  resume: () => void;
}

const PauseContext = createContext<PauseContextValue | undefined>(undefined);

export function PauseProvider({ children }: { children: ReactNode }) {
  const [activePause, setActivePause] = useState<PauseRecord | null>(null);
  const [history, setHistory] = useState<PauseRecord[]>(mockPauses);

  const pause = useCallback((from: string, to: string) => {
    setActivePause({ id: `p_${Date.now()}`, from, to, status: "active" });
  }, []);

  const resume = useCallback(() => {
    setActivePause((curr) => {
      if (curr) setHistory((h) => [{ ...curr, status: "completed" }, ...h]);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ activePause, history, pause, resume }), [activePause, history, pause, resume]);
  return <PauseContext.Provider value={value}>{children}</PauseContext.Provider>;
}

export function usePauseStore() {
  const ctx = useContext(PauseContext);
  if (!ctx) throw new Error("usePauseStore must be used inside PauseProvider");
  return ctx;
}
