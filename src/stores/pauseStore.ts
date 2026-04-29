import { create } from "zustand";
import type { PauseRecord } from "@/lib/mockData";
import { mockPauses } from "@/lib/mockData";

interface PauseState {
  activePause: PauseRecord | null;
  history: PauseRecord[];
  pause: (from: string, to: string) => void;
  resume: () => void;
}

export const usePauseStore = create<PauseState>((set) => ({
  activePause: null,
  history: mockPauses,
  pause: (from, to) =>
    set((s) => ({
      activePause: { id: `p_${Date.now()}`, from, to, status: "active" },
      history: s.history,
    })),
  resume: () =>
    set((s) => ({
      activePause: null,
      history: s.activePause
        ? [{ ...s.activePause, status: "completed" }, ...s.history]
        : s.history,
    })),
}));
