import { useEffect } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

import { NeuralBackground } from "@/components/NeuralBackground";
import { NexusOverlay } from "@/components/NexusOverlay";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { useNexusStore } from "@/lib/store";
import type { Assumption, Valuation } from "@/lib/store";

import { Landing } from "@/pages/Landing";
import { KeyAssumptions } from "@/pages/KeyAssumptions";
import { Firm } from "@/pages/Firm";
import { Ecosystem } from "@/pages/Ecosystem";
import { Historical } from "@/pages/Historical";
import { Consumer } from "@/pages/Consumer";
import { Global } from "@/pages/Global";
import { Academia } from "@/pages/Academia";
import { Government } from "@/pages/Government";
import { Derivatives } from "@/pages/Derivatives";
import { ExecutiveSummary } from "@/pages/ExecutiveSummary";
import { Appendix } from "@/pages/Appendix";

// ── Inner app that uses the store and queries ──────────────────────────────
function AppInner() {
  const { currentPage, setAssumptions, setValuation, nexusOpen } = useNexusStore();
  const qc = useQueryClient();

  // Fetch assumptions and push to store
  const { data: assumptions } = useQuery<Assumption[]>({
    queryKey: ["/api/assumptions"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (assumptions) setAssumptions(assumptions);
  }, [assumptions, setAssumptions]);

  // Fetch valuation and push to store
  const { data: valuation } = useQuery<Valuation>({
    queryKey: ["/api/valuation"],
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (valuation) setValuation(valuation);
  }, [valuation, setValuation]);

  // Page content map
  const PAGE_MAP: Record<string, React.ReactNode> = {
    landing: <Landing />,
    assumptions: <KeyAssumptions />,
    firm: <Firm />,
    ecosystem: <Ecosystem />,
    historical: <Historical />,
    consumer: <Consumer />,
    global: <Global />,
    academia: <Academia />,
    government: <Government />,
    derivatives: <Derivatives />,
    executive: <ExecutiveSummary />,
    appendix: <Appendix />,
  };

  const leftOffset = nexusOpen ? 420 + 180 : 0;
  const topOffset = 52;

  return (
    <div className="relative h-screen overflow-hidden dark">
      {/* Scan lines overlay */}
      <div className="scan-overlay" />

      {/* Neural particle background */}
      <NeuralBackground />

      {/* Top bar */}
      <TopBar />

      {/* Nexus graph sidebar */}
      <NexusOverlay />

      {/* Navigation sidebar */}
      <Sidebar />

      {/* Main content */}
      <main
        className="fixed bottom-0 right-0 overflow-hidden transition-all duration-300"
        style={{ left: leftOffset, top: topOffset }}
      >
        <div key={currentPage} className="h-full">
          {PAGE_MAP[currentPage] ?? <Landing />}
        </div>
      </main>
    </div>
  );
}

// ── Root app with providers ────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={AppInner} />
          <Route component={AppInner} />
        </Switch>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
