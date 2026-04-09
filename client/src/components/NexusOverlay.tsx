import { useEffect, useCallback } from "react";
import ReactFlow, {
  Node, Edge, Background, Controls,
  useNodesState, useEdgesState,
  MarkerType, Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { useNexusStore, getHeatmapColor } from "@/lib/store";
import { X, GitBranch } from "lucide-react";

const PAGE_NODES: { id: string; label: string; x: number; y: number; category: string }[] = [
  { id: "assumptions", label: "KEY\nASSUMPTIONS", x: 200, y: 200, category: "core" },
  { id: "firm", label: "FIRM", x: 80, y: 340, category: "page" },
  { id: "ecosystem", label: "ECOSYSTEM", x: 200, y: 420, category: "page" },
  { id: "historical", label: "HISTORICAL", x: 320, y: 340, category: "page" },
  { id: "consumer", label: "CONSUMER", x: 60, y: 180, category: "page" },
  { id: "global", label: "GLOBAL", x: 340, y: 130, category: "page" },
  { id: "academia", label: "ACADEMIA", x: 110, y: 80, category: "page" },
  { id: "government", label: "GOVERNMENT", x: 290, y: 60, category: "page" },
  { id: "derivatives", label: "DERIVATIVES", x: 370, y: 200, category: "page" },
  { id: "executive", label: "EXECUTIVE\nSUMMARY", x: 200, y: 510, category: "output" },
];

const EDGES: Edge[] = [
  { id: "a-firm", source: "assumptions", target: "firm", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "a-eco", source: "assumptions", target: "ecosystem", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "a-hist", source: "assumptions", target: "historical", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "a-cons", source: "assumptions", target: "consumer", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "a-glob", source: "assumptions", target: "global", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "a-acad", source: "assumptions", target: "academia", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "a-gov", source: "assumptions", target: "government", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "a-deriv", source: "assumptions", target: "derivatives", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "firm-exec", source: "firm", target: "executive", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "eco-exec", source: "ecosystem", target: "executive", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "hist-exec", source: "historical", target: "executive", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "cons-exec", source: "consumer", target: "executive", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "glob-exec", source: "global", target: "executive", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "acad-exec", source: "academia", target: "executive", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "gov-exec",  source: "government",  target: "executive", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "deriv-exec",source: "derivatives", target: "executive", markerEnd: { type: MarkerType.ArrowClosed } },
];

export function NexusOverlay() {
  const { nexusOpen, setNexusOpen, currentPage, setCurrentPage, assumptions, heatmapMode, pulses, pageToggles } = useNexusStore();

  const buildNodes = useCallback((): Node[] => {
    return PAGE_NODES.map((n) => {
      const isActive = currentPage === n.id;
      const isDisabled = n.category === "page" && !pageToggles[n.id as keyof typeof pageToggles];

      // Find the top assumption for this category
      const catAssumptions = assumptions.filter((a) => a.category === n.id);
      const topImpact = catAssumptions.reduce((max, a) => Math.max(max, Math.abs(a.bullImpact)), 0);
      const nodeColor = catAssumptions.length > 0
        ? getHeatmapColor({ bullImpact: topImpact, bearImpact: -topImpact / 1.5, ...catAssumptions[0] }, heatmapMode)
        : "hsl(196 100% 50%)";

      const isPulsing = pulses.some((p) => p.nodeId === n.id && Date.now() - p.timestamp < 3000);

      return {
        id: n.id,
        position: { x: n.x, y: n.y },
        data: { label: n.label },
        style: {
          background: isActive
            ? `${nodeColor}22`
            : n.category === "core"
            ? "hsl(196 100% 50% / 0.15)"
            : n.category === "output"
            ? "hsl(262 83% 65% / 0.15)"
            : "hsl(220 20% 8%)",
          border: isActive
            ? `2px solid ${nodeColor}`
            : n.category === "core"
            ? "1px solid hsl(196 100% 50% / 0.6)"
            : n.category === "output"
            ? "1px solid hsl(262 83% 65% / 0.6)"
            : `1px solid ${nodeColor}60`,
          borderRadius: "8px",
          padding: "6px 10px",
          fontSize: "9px",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: isActive ? 700 : 500,
          color: isActive ? nodeColor : isDisabled ? "#444" : "#aaa",
          opacity: isDisabled ? 0.4 : 1,
          cursor: "pointer",
          textAlign: "center" as const,
          lineHeight: "1.4",
          boxShadow: isPulsing ? `0 0 20px ${nodeColor}` : isActive ? `0 0 12px ${nodeColor}60` : "none",
          transition: "all 0.4s ease",
          whiteSpace: "pre-wrap" as const,
          width: 88,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    });
  }, [currentPage, assumptions, heatmapMode, pulses, pageToggles]);

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes());
  const [edges, , onEdgesChange] = useEdgesState(
    EDGES.map((e) => ({
      ...e,
      style: { stroke: "hsl(196 100% 50% / 0.3)", strokeWidth: 1 },
    }))
  );

  useEffect(() => {
    setNodes(buildNodes());
  }, [currentPage, assumptions, heatmapMode, pulses, pageToggles, buildNodes, setNodes]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setCurrentPage(node.id as any);
  }, [setCurrentPage]);

  if (!nexusOpen) {
    return (
      <button
        onClick={() => setNexusOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-primary/30 rounded-r-lg px-2 py-4 text-primary hover:bg-primary/10 transition-colors"
        title="Open Nexus"
      >
        <GitBranch size={14} />
      </button>
    );
  }

  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col"
      style={{ width: 420, background: "hsl(222 24% 5%)", borderRight: "1px solid hsl(196 100% 50% / 0.2)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid hsl(196 100% 50% / 0.2)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-nexus-pulse" />
          <span className="text-xs font-mono font-semibold text-primary tracking-widest">NEXUS OVERLAY</span>
        </div>
        <button onClick={() => setNexusOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* React Flow graph */}
      <div style={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="hsl(196 100% 50% / 0.03)" gap={20} />
        </ReactFlow>
      </div>

      {/* Valuation summary */}
      <ValuationSummary />
    </div>
  );
}

function ValuationSummary() {
  const { valuation } = useNexusStore();
  if (!valuation) return null;

  return (
    <div className="p-4 space-y-2" style={{ borderTop: "1px solid hsl(196 100% 50% / 0.2)" }}>
      <div className="text-[9px] font-mono text-muted-foreground tracking-widest mb-2">ENSEMBLE TARGET</div>
      <div className="flex items-end justify-between">
        <div className="price-target" style={{ fontSize: "1.8rem" }}>
          ${valuation.ensemble.toFixed(2)}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-green-400">▲ ${valuation.bull.toFixed(2)}</div>
          <div className="text-[10px] font-mono text-red-400">▼ ${valuation.bear.toFixed(2)}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: "DCF", value: valuation.dcf },
          { label: "REV", value: valuation.compsRev },
          { label: "EBITDA", value: valuation.compsEbitda },
        ].map((m) => (
          <div key={m.label} className="bg-muted/30 rounded p-1.5 text-center">
            <div className="text-[9px] text-muted-foreground font-mono">{m.label}</div>
            <div className="text-[11px] font-mono font-semibold text-foreground">${m.value.toFixed(0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
