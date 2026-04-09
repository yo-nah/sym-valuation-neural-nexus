import { create } from "zustand";

export type HeatmapMode = "bull" | "bear" | "net" | "off";
export type PageId = "landing" | "assumptions" | "firm" | "ecosystem" | "historical" | "consumer" | "global" | "academia" | "government" | "derivatives" | "executive" | "appendix";

export interface Assumption {
  id: string;
  category: string;
  key: string;
  label: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  unit: string;
  description: string;
  bullImpact: number;
  bearImpact: number;
}

export interface Valuation {
  dcf: number;
  compsRev: number;
  compsEbitda: number;
  ensemble: number;
  bull: number;
  bear: number;
  revenues: { rev1: number; rev2: number; rev3: number; rev4: number; rev5: number };
  fcfs: { fcf1: number; fcf2: number; fcf3: number; fcf4: number; fcf5: number };
  terminalValue: number;
  enterpriseValue: number;
}

export interface PageToggle {
  firm: boolean;
  ecosystem: boolean;
  historical: boolean;
  consumer: boolean;
  global: boolean;
  academia: boolean;
  government: boolean;
  derivatives: boolean;
}

export interface NexusPulse {
  nodeId: string;
  timestamp: number;
}

interface NexusStore {
  // Current page
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;

  // Assumptions
  assumptions: Assumption[];
  setAssumptions: (assumptions: Assumption[]) => void;
  updateAssumption: (id: string, value: number) => void;

  // Valuation
  valuation: Valuation | null;
  setValuation: (v: Valuation) => void;

  // Heatmap mode
  heatmapMode: HeatmapMode;
  setHeatmapMode: (mode: HeatmapMode) => void;

  // Page toggles (for Executive Summary)
  pageToggles: PageToggle;
  setPageToggle: (page: keyof PageToggle, value: boolean) => void;
  // (keep pageToggles: PageToggle defaulted with derivatives: true)

  // Nexus sidebar open
  nexusOpen: boolean;
  setNexusOpen: (open: boolean) => void;

  // Neural pulses
  pulses: NexusPulse[];
  addPulse: (nodeId: string) => void;
  clearPulses: () => void;

  // Globe selected country
  selectedCountry: string | null;
  setSelectedCountry: (c: string | null) => void;
}

export const useNexusStore = create<NexusStore>((set) => ({
  currentPage: "landing",
  setCurrentPage: (page) => set({ currentPage: page }),

  assumptions: [],
  setAssumptions: (assumptions) => set({ assumptions }),
  updateAssumption: (id, value) =>
    set((state) => ({
      assumptions: state.assumptions.map((a) =>
        a.id === id ? { ...a, value } : a
      ),
    })),

  valuation: null,
  setValuation: (valuation) => set({ valuation }),

  heatmapMode: "net",
  setHeatmapMode: (mode) => set({ heatmapMode: mode }),

  pageToggles: {
    firm: true,
    ecosystem: true,
    historical: true,
    consumer: true,
    global: true,
    academia: true,
    government: true,
    derivatives: true,
  },
  setPageToggle: (page, value) =>
    set((state) => ({
      pageToggles: { ...state.pageToggles, [page]: value },
    })),

  nexusOpen: true,
  setNexusOpen: (open) => set({ nexusOpen: open }),

  pulses: [],
  addPulse: (nodeId) =>
    set((state) => ({
      pulses: [...state.pulses.slice(-10), { nodeId, timestamp: Date.now() }],
    })),
  clearPulses: () => set({ pulses: [] }),

  selectedCountry: null,
  setSelectedCountry: (c) => set({ selectedCountry: c }),
}));

// ── Heatmap color helper ─────────────────────────────────────────────────────
// Heatmap modes:
//  BULL - "What drives the upside?" Colors by bullImpact. Green = big upside driver.
//  BEAR - "What are the biggest risks?" Colors by |bearImpact|. Red = big downside risk.
//  NET  - "What moves the target most overall?" Colors by average magnitude, sign = net direction.
//  OFF  - No color coding.
export function getHeatmapClass(assumption: Assumption, mode: HeatmapMode): string {
  if (mode === "off") return "";

  let impact: number;
  if (mode === "bull") {
    impact = assumption.bullImpact;
  } else if (mode === "bear") {
    impact = assumption.bearImpact; // stored negative for bear cases
  } else {
    // NET: magnitude = average of both sides; sign = direction of net expected move
    const magnitude = (Math.abs(assumption.bullImpact) + Math.abs(assumption.bearImpact)) / 2;
    impact = assumption.bullImpact >= 0 ? magnitude : -magnitude;
  }

  if (impact > 12) return "heatmap-strong-bull";
  if (impact > 5)  return "heatmap-bull";
  if (impact < -12) return "heatmap-strong-bear";
  if (impact < -5)  return "heatmap-bear";
  return "heatmap-neutral";
}

export function getHeatmapColor(assumption: Assumption, mode: HeatmapMode): string {
  if (mode === "off") return "hsl(196 100% 50%)";

  let impact: number;
  if (mode === "bull") {
    impact = assumption.bullImpact;
  } else if (mode === "bear") {
    impact = assumption.bearImpact;
  } else {
    const magnitude = (Math.abs(assumption.bullImpact) + Math.abs(assumption.bearImpact)) / 2;
    impact = assumption.bullImpact >= 0 ? magnitude : -magnitude;
  }

  const t = Math.min(Math.abs(impact) / 20, 1);
  if (impact > 0) {
    return `hsl(${142 - t * 20} ${50 + t * 20}% ${45 + t * 10}%)`;
  } else {
    return `hsl(${t * 10} ${60 + t * 20}% ${45 + t * 10}%)`;
  }
}
