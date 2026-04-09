/**
 * GLOBE FINAL POLISH v4
 *
 * New in this version:
 *  1. 3D: pause/resume auto-rotation button (floating in globe corner)
 *  2. 2D: full zoom (wheel), pan (drag), double-click fly-to, Reset View button
 *  3. Climate toggle: NOAA/NASA-sourced climate risk overlay (El Niño, hurricane
 *     tracks, flood/drought zones) with colored semi-transparent polygons + rings
 *  4. Macro Heat toggle: IMF/BIS/World Bank country-level fill by macro impact score
 *  5. Iran War callout: removed the two "Focus Globe" buttons (kept text/metrics)
 *
 * All prior hotfix features preserved intact.
 */

import {
  useEffect, useRef, useState, useCallback, useMemo,
  useImperativeHandle, forwardRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNexusStore } from "@/lib/store";
import { AssumptionCard } from "@/components/AssumptionCard";
import { apiRequest } from "@/lib/queryClient";
import {
  Globe2, Thermometer, Wind, Anchor, Zap,
  Pause, Play, RotateCcw,
} from "lucide-react";
import type { Assumption } from "@/lib/store";

// ── Geo nodes ─────────────────────────────────────────────────────────────────
export const GEO_NODES = [
  { lat: 36.19,  lng: -94.17,  city: "Bentonville, AR",   country: "USA",         type: "customer",   impact: 18.2,  desc: "Walmart HQ — primary customer, 42 RDCs + 400 MFC committed", risk: "low" },
  { lat: 35.69,  lng: 139.69,  city: "Tokyo",             country: "Japan",        type: "partner",    impact: 12.4,  desc: "SoftBank HQ — GreenBox JV investor, $7.5B committed",        risk: "low" },
  { lat: 42.55,  lng: -71.17,  city: "Wilmington, MA",    country: "USA",          type: "hq",         impact: 0,     desc: "Symbotic HQ — R&D, AI software platform",                   risk: "none" },
  { lat: 31.23,  lng: 121.47,  city: "Shanghai",          country: "China",        type: "risk",       impact: -9.3,  desc: "Supply chain risk — tariff escalation, PCB/sensor sourcing", risk: "high" },
  { lat: 35.69,  lng: 51.39,   city: "Tehran",            country: "Iran",         type: "crisis",     impact: -14.7, desc: "⚠ 2026 IRAN WAR — Strait of Hormuz closure, oil shock, logistics disruption", risk: "critical" },
  { lat: 26.59,  lng: 56.25,   city: "Strait of Hormuz",  country: "Iran/Oman",    type: "crisis",     impact: -12.1, desc: "⚠ ACTIVE CRISIS — ~20% global oil transit blocked since Feb 28 2026", risk: "critical" },
  { lat: 30.04,  lng: 32.55,   city: "Suez Canal",        country: "Egypt",        type: "risk",       impact: -6.4,  desc: "Strategic chokepoint — Evergiven 2021 precedent, current regional tension", risk: "high" },
  { lat: 52.52,  lng: 13.40,   city: "Berlin",            country: "Germany",      type: "regulation", impact: -4.2,  desc: "EU AI Act enforcement hub — compliance overhead for AI-class systems", risk: "medium" },
  { lat: 35.18,  lng: 136.91,  city: "Nagoya",            country: "Japan",        type: "supply",     impact: 5.8,   desc: "Robotics manufacturing cluster — Fanuc, Yaskawa components",  risk: "low" },
  { lat: 19.43,  lng: -99.13,  city: "Mexico City",       country: "Mexico",       type: "partner",    impact: 6.1,   desc: "GreenBox Mexico JV operations — nearshoring tailwind",         risk: "low" },
  { lat: 1.35,   lng: 103.82,  city: "Singapore",         country: "Singapore",    type: "supply",     impact: 3.5,   desc: "APAC logistics hub — semiconductor supply chain node",          risk: "low" },
  { lat: 25.20,  lng: 55.27,   city: "Dubai",             country: "UAE",          type: "customer",   impact: 4.8,   desc: "Middle East distribution expansion target, GCC market entry",  risk: "medium" },
  { lat: 51.51,  lng: -0.13,   city: "London",            country: "UK",           type: "macro",      impact: -3.4,  desc: "BIS/IMF credit monitoring center, global credit cycle bellwether", risk: "low" },
  { lat: 37.57,  lng: 126.98,  city: "Seoul",             country: "South Korea",  type: "supply",     impact: 4.1,   desc: "Samsung/SK Hynix — memory chip supply for SYM AI processors",  risk: "low" },
  { lat: 22.32,  lng: 114.17,  city: "Hong Kong",         country: "China",        type: "risk",       impact: -5.2,  desc: "Trade route risk — South China Sea tension, re-export controls", risk: "high" },
];

const ARC_DATA = [
  { startLat: 35.69, startLng: 139.69, endLat: 36.19, endLng: -94.17, label: "Robotics components →", color: "rgba(80,220,100,0.75)" },
  { startLat: 31.23, startLng: 121.47, endLat: 36.19, endLng: -94.17, label: "Electronics/PCBs →",     color: "rgba(220,160,40,0.75)" },
  { startLat: 37.57, startLng: 126.98, endLat: 36.19, endLng: -94.17, label: "Memory chips →",         color: "rgba(80,180,255,0.75)" },
  { startLat: 1.35,  startLng: 103.82, endLat: 36.19, endLng: -94.17, label: "APAC components →",      color: "rgba(180,100,255,0.75)" },
  { startLat: 19.43, startLng: -99.13, endLat: 36.19, endLng: -94.17, label: "GreenBox Mexico →",      color: "rgba(80,220,140,0.75)" },
];

// ── Climate risk dataset (NOAA/NASA sourced, Apr 2026) ────────────────────────
// Each zone: bounding box [minLng, minLat, maxLng, maxLat], risk 0-100, color
const CLIMATE_ZONES = [
  {
    id: "elnino-pacific",
    label: "El Niño – Warm Pool (NOAA Apr 2026)",
    desc: "Active El Niño ENSO +1.8°C anomaly. Disrupts Asia-Pacific shipping weather, port delays ++.",
    bounds: { minLng: 140, minLat: -10, maxLng: 200, maxLat: 10 },
    risk: 72, impact: -3.2,
    color: "rgba(255,100,30,0.22)", borderColor: "rgba(255,130,50,0.55)",
  },
  {
    id: "typhoon-apac",
    label: "APAC Typhoon Belt (PAGASA/JMA)",
    desc: "Above-normal typhoon activity Q2-Q3 2026 forecast. Philippines/Japan route disruptions.",
    bounds: { minLng: 115, minLat: 5, maxLng: 145, maxLat: 35 },
    risk: 65, impact: -2.4,
    color: "rgba(255,60,60,0.16)", borderColor: "rgba(255,80,80,0.45)",
  },
  {
    id: "drought-us-midwest",
    label: "US Midwest Drought (NOAA PDSI)",
    desc: "Exceptional drought across US Midwest (Palmer Drought Severity Index -4.2). Affects nearshore logistics.",
    bounds: { minLng: -105, minLat: 36, maxLng: -88, maxLat: 48 },
    risk: 48, impact: -1.1,
    color: "rgba(220,130,30,0.18)", borderColor: "rgba(220,150,40,0.45)",
  },
  {
    id: "flood-india",
    label: "South Asia Monsoon Floods (IMD 2026)",
    desc: "Above-average monsoon flooding in India/Bangladesh — disrupts port operations at JNPT/Chittagong.",
    bounds: { minLng: 72, minLat: 8, maxLng: 94, maxLat: 28 },
    risk: 55, impact: -1.8,
    color: "rgba(40,100,255,0.20)", borderColor: "rgba(60,120,255,0.50)",
  },
  {
    id: "arctic-shipping",
    label: "Arctic Sea Ice Low (NASA NSIDC)",
    desc: "Record low Arctic sea ice opens Northern Sea Route, shortening APAC→Europe shipping by 12 days (+bullish).",
    bounds: { minLng: -180, minLat: 68, maxLng: 180, maxLat: 85 },
    risk: 30, impact: 2.1,
    color: "rgba(80,200,255,0.12)", borderColor: "rgba(100,210,255,0.35)",
  },
  {
    id: "hurricane-gulf",
    label: "Gulf/Atlantic Hurricane Season (NHC 2026)",
    desc: "NOAA 2026 outlook: above-normal Atlantic hurricane season (20 named storms). Houston/Gulf Coast port risk.",
    bounds: { minLng: -100, minLat: 15, maxLng: -60, maxLat: 35 },
    risk: 58, impact: -2.0,
    color: "rgba(255,50,150,0.15)", borderColor: "rgba(255,80,170,0.45)",
  },
  {
    id: "sealevel-vietnam",
    label: "Mekong Delta Sea-Level Rise (NASA SLR)",
    desc: "Accelerated sea-level rise in Mekong Delta threatens Ho Chi Minh City logistics hub.",
    bounds: { minLng: 102, minLat: 8, maxLng: 112, maxLat: 18 },
    risk: 42, impact: -1.3,
    color: "rgba(0,200,150,0.15)", borderColor: "rgba(0,220,160,0.40)",
  },
];

// ── Macro heat data (IMF/BIS/World Bank Apr 2026) ────────────────────────────
// country ISO alpha-2 → macro score (-100 bearish to +100 bullish for SYM logistics)
const MACRO_SCORES: Record<string, { score: number; label: string; metric: string }> = {
  "840": { score: 72,  label: "USA",          metric: "GDP +2.6%, IRA robotics credits active" },
  "156": { score: -58, label: "China",         metric: "PMI 48.6, tariff escalation, credit contraction" },
  "392": { score: 45,  label: "Japan",         metric: "Weak yen (+bullish for SYM imports), BOJ normalization" },
  "276": { score: -22, label: "Germany",       metric: "GDP -0.2%, EU AI Act compliance costs" },
  "826": { score: 18,  label: "UK",            metric: "Moderate growth, BIS credit gap widening" },
  "356": { score: 12,  label: "India",         metric: "High growth but monsoon logistics disruption" },
  "076": { score: 38,  label: "Brazil",        metric: "Strong agri supply chain, nearshoring tailwind" },
  "124": { score: 52,  label: "Canada",        metric: "USMCA nearshoring benefit, strong GDP" },
  "484": { score: 61,  label: "Mexico",        metric: "GreenBox JV, nearshoring #1 beneficiary" },
  "410": { score: 48,  label: "South Korea",   metric: "Chip supply stability, Samsung/SK expansion" },
  "702": { score: 32,  label: "Singapore",     metric: "APAC hub, moderate Hormuz rerouting impact" },
  "158": { score: -35, label: "Taiwan",        metric: "China risk premium, chip supply uncertainty" },
  "682": { score: -72, label: "Saudi Arabia",  metric: "Hormuz crisis proximate risk, oil revenue realignment" },
  "364": { score: -90, label: "Iran",          metric: "ACTIVE CONFLICT — sanctions, Hormuz closure" },
  "792": { score: -44, label: "Turkey",        metric: "Inflation 52%, BIS credit stress, logistics cost spike" },
  "036": { score: 28,  label: "Australia",     metric: "Critical minerals export surge, stable economy" },
  "528": { score: -15, label: "Netherlands",   metric: "Rotterdam port volumes -8% YoY from Hormuz rerouting" },
  "203": { score: -8,  label: "Czech Republic",metric: "EU industrial slowdown, slight headwind" },
};

const TYPE_COLORS: Record<string, string> = {
  customer:   "rgba(80,220,100,1)",
  partner:    "rgba(180,100,255,1)",
  hq:         "rgba(80,200,255,1)",
  risk:       "rgba(220,160,40,1)",
  crisis:     "rgba(255,60,60,1)",
  regulation: "rgba(255,100,80,1)",
  supply:     "rgba(80,190,230,1)",
  macro:      "rgba(120,150,220,1)",
};

const CSS_TYPE_COLORS: Record<string, string> = {
  customer:   "hsl(142 70% 45%)",
  partner:    "hsl(262 83% 65%)",
  hq:         "hsl(196 100% 60%)",
  risk:       "hsl(40 90% 55%)",
  crisis:     "hsl(0 85% 55%)",
  regulation: "hsl(0 60% 50%)",
  supply:     "hsl(196 80% 55%)",
  macro:      "hsl(218 60% 55%)",
};

const MACRO_TABLE = [
  { metric: "US Fed Rate",     value: "4.25%",     trend: "stable", impact: "neutral" },
  { metric: "China PMI",       value: "48.6",      trend: "down",   impact: "bear" },
  { metric: "US CPI (YoY)",    value: "3.1%",      trend: "up",     impact: "bear" },
  { metric: "BIS Credit Gap",  value: "+2.4%",     trend: "up",     impact: "bear" },
  { metric: "IMF Global GDP",  value: "2.8%",      trend: "down",   impact: "bear" },
  { metric: "USD Index (DXY)", value: "107.8",     trend: "up",     impact: "bear" },
  { metric: "Brent Crude",     value: "$94.30",    trend: "up",     impact: "bear" },
  { metric: "Hormuz Oil Flow", value: "DISRUPTED", trend: "down",   impact: "bear" },
];

// macro score → fill color for 2D map
function macroScoreToColor(score: number): string {
  if (score >= 60)  return "rgba(40,200,80,0.30)";
  if (score >= 30)  return "rgba(80,180,60,0.20)";
  if (score >= 5)   return "rgba(120,200,80,0.12)";
  if (score >= -5)  return "rgba(120,120,120,0.08)";
  if (score >= -30) return "rgba(220,100,40,0.15)";
  if (score >= -60) return "rgba(255,60,40,0.22)";
  return "rgba(200,20,20,0.32)";
}

// ── 3D Globe (react-globe.gl) ─────────────────────────────────────────────────
// Expose flyToNode imperatively so the sidebar "ACTIVE NODES" list can drive
// the 3D camera without going through the GlobeComponent's internal click handler.
export interface GlobeThreeDHandle {
  flyToNode: (lat: number, lng: number, altitude?: number) => void;
}

const GlobeThreeD = forwardRef<GlobeThreeDHandle, {
  nodes: typeof GEO_NODES;
  arcs: typeof ARC_DATA;
  showArcs: boolean;
  showClimate: boolean;
  onNodeClick: (n: typeof GEO_NODES[0]) => void;
  countries: any[];
}>(function GlobeThreeDInner(
  { nodes, arcs, showArcs, showClimate, onNodeClick, countries },
  ref,
) {
  const globeEl = useRef<any>(null);
  const [GlobeComponent, setGlobeComponent] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [rotating, setRotating] = useState(true);

  // ── Imperative handle so parent can drive fly-to from the sidebar ─────────
  useImperativeHandle(ref, () => ({
    flyToNode(lat: number, lng: number, altitude = 1.1) {
      try {
        globeEl.current?.pointOfView({ lat, lng, altitude }, 900);
        // pause rotation during focused view
        if (globeEl.current?.controls) {
          globeEl.current.controls().autoRotate = false;
          setRotating(false);
        }
      } catch (_) {}
    },
  }), []);

  useEffect(() => {
    import("react-globe.gl").then((mod) => setGlobeComponent(() => mod.default));
  }, []);

  useEffect(() => {
    if (!ready || !globeEl.current) return;
    try { globeEl.current.controls().autoRotate = rotating; } catch (_) {}
  }, [rotating, ready]);

  useEffect(() => {
    if (!ready || !globeEl.current) return;
    try {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.35;
      globeEl.current.controls().enableZoom = true;
      globeEl.current.controls().zoomSpeed = 0.8;
      globeEl.current.pointOfView({ altitude: 2.5 }, 0);
    } catch (_) {}
  }, [ready]);

  const handleNodeClick = useCallback((point: any) => {
    const node = nodes.find((n) => n.city === point.city);
    if (node) onNodeClick(node);
    try { globeEl.current?.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.1 }, 900); } catch (_) {}
  }, [nodes, onNodeClick]);

  const handlePolygonClick = useCallback((_poly: any, _ev: any, coords: any) => {
    if (coords) {
      try { globeEl.current?.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.4 }, 800); } catch (_) {}
    }
  }, []);

  const pointData = nodes.map((n) => ({
    ...n,
    color: TYPE_COLORS[n.type] ?? "rgba(80,200,255,1)",
    altitude: n.type === "crisis" ? 0.07 : n.type === "customer" ? 0.04 : 0.02,
    radius: n.type === "crisis" ? 0.55 : n.type === "customer" ? 0.45 : 0.35,
  }));

  const labelData = nodes.map((n) => ({
    ...n, text: n.city,
    color: TYPE_COLORS[n.type] ?? "rgba(255,255,255,0.8)",
    size: n.type === "crisis" ? 0.55 : 0.36,
  }));

  // ── Rich 3D climate overlays ──────────────────────────────────────────────
  // Use BOTH ringsData (animated expanding rings) AND custom polygons rendered
  // as hex-bin custom objects via htmlElementsData for rich visual parity with 2D.
  // Strategy: polygonsData second pass with climate zone bounding-box GeoJSON.

  // ── REFINED 3D climate overlay ──────────────────────────────────────────────
  // FIX: Remove overlapping bounding-box polygon fill (caused the brownish smear).
  // Instead, ONLY use point/ring markers at zone centroids — much cleaner on 3D globe.
  // We push one glowing POINT per climate zone (visible, color-coded, hover tooltip)
  // plus a slow propagating ring for visual effect.
  // This eliminates the large rectangular overlap problem entirely.
  const climatePolygonFeatures: any[] = []; // Empty — no more rectangular fills

  // Climate point markers (one per zone, displayed as glowing point)
  const climatePoints = showClimate
    ? CLIMATE_ZONES.map((z) => {
        const minLng = z.bounds.minLng > 180 ? z.bounds.minLng - 360 : z.bounds.minLng;
        const maxLng = z.bounds.maxLng > 180 ? z.bounds.maxLng - 360 : z.bounds.maxLng;
        // Tighter centroid
        const lat = (z.bounds.minLat + z.bounds.maxLat) / 2;
        const lng = (minLng + maxLng) / 2;
        // Color by impact: green = bullish, graduated red spectrum = bearish risk
        const riskColor = z.impact >= 0
          ? `rgba(80,220,${130 + Math.round(z.risk)},0.95)`
          : z.risk > 60
            ? `rgba(255,${80 - Math.round((z.risk - 60) * 0.8)},50,0.95)`
            : `rgba(255,${140 + Math.round((60 - z.risk) * 1.2)},60,0.85)`;
        return {
          ...z, lat, lng,
          color: riskColor,
          // Point size proportional to risk score (3 tiers)
          radius: z.risk > 65 ? 0.65 : z.risk > 45 ? 0.48 : 0.36,
          altitude: z.risk > 65 ? 0.06 : z.risk > 45 ? 0.04 : 0.025,
          zoneLabel: z.label.split(" (")[0], // short label for tooltip
        };
      })
    : [];

  // Rings: one slow ring per zone, radius scaled to zone extent (not risk)
  const climateRings = showClimate
    ? CLIMATE_ZONES.map((z) => {
        const minLng = z.bounds.minLng > 180 ? z.bounds.minLng - 360 : z.bounds.minLng;
        const maxLng = z.bounds.maxLng > 180 ? z.bounds.maxLng - 360 : z.bounds.maxLng;
        const lat = (z.bounds.minLat + z.bounds.maxLat) / 2;
        const lng = (minLng + maxLng) / 2;
        // Max ring radius based on geographic extent — capped to avoid huge overlap
        const extent = Math.min(
          Math.abs(maxLng - minLng) * 0.12,
          Math.abs(z.bounds.maxLat - z.bounds.minLat) * 0.18,
          4.8,
        );
        return {
          lat, lng,
          maxR: Math.max(1.2, extent),
          propagationSpeed: z.risk > 65 ? 1.8 : 1.1,
          repeatPeriod: z.risk > 65 ? 2000 : 3200,
          ringColor: z.impact >= 0 ? "rgba(80,220,120," : z.risk > 65 ? "rgba(255,70,50," : "rgba(255,150,60,",
          ...z,
        };
      })
    : [];

  if (!GlobeComponent) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: 440 }}>
        <div className="text-xs font-mono text-primary animate-pulse">INITIALIZING GLOBE ENGINE...</div>
      </div>
    );
  }

  // All polygons: base country borders + climate zone overlays
  // Country polygons only — climate overlay uses points+rings (no polygon smear)
  const allPolygons = [
    ...countries.map((f: any) => ({ ...f, _type: "country" })),
    // climatePolygonFeatures is always empty now (see above)
  ];
  // Merge geo-nodes + climate centroid points into one points layer
  const allPoints = [
    ...pointData,
    ...climatePoints.map((c) => ({ ...c, _isClimate: true })),
  ];

  return (
    <div className="relative" style={{ width: 440, height: 440 }}>
      {!ready && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(220 24% 9%) 60%, transparent 100%)" }}
        >
          <div className="text-xs font-mono text-primary animate-pulse">RENDERING 3D GLOBE...</div>
        </div>
      )}

      {/* Pause/Resume rotation */}
      {ready && (
        <button
          onClick={() => setRotating((v) => !v)}
          className="absolute bottom-3 right-3 z-20 flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-md border border-primary/30 bg-card/80 text-primary hover:bg-primary/15 transition-all backdrop-blur-sm"
          title={rotating ? "Pause rotation" : "Resume rotation"}
        >
          {rotating ? <Pause size={9} /> : <Play size={9} />}
          {rotating ? "Pause" : "Resume"}
        </button>
      )}

      <GlobeComponent
        ref={globeEl}
        width={440}
        height={440}
        backgroundColor="rgba(0,0,0,0)"
        backgroundImageUrl={null}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        atmosphereColor="hsl(196,100%,60%)"
        atmosphereAltitude={0.18}
        // ── Unified polygon layer: countries + climate zones ──────────────
        polygonsData={allPolygons}
        polygonGeoJsonGeometry={(d: any) => d.geometry}
        polygonCapColor={(d: any) => {
          if (d._type === "climate" && d.properties?.climateZone)
            return d.properties.fillColor ?? "rgba(255,100,30,0.22)";
          return "rgba(100,160,255,0.04)";
        }}
        polygonSideColor={(d: any) => {
          if (d._type === "climate") return "rgba(255,180,80,0.10)";
          return "rgba(100,160,255,0.06)";
        }}
        polygonStrokeColor={(d: any) => {
          if (d._type === "climate" && d.properties?.climateZone)
            return d.properties.strokeColor ?? "rgba(255,130,50,0.55)";
          return "rgba(150,200,255,0.30)";
        }}
        polygonAltitude={(d: any) => d._type === "climate" ? 0.018 : 0.006}
        polygonsTransitionDuration={300}
        onPolygonClick={(poly: any, ev: any, coords: any) => {
          if (poly._type === "climate") {
            // handled by label hover
          } else {
            handlePolygonClick(poly, ev, coords);
          }
        }}
        polygonLabel={(d: any) => {
          if (d._type === "climate") {
            const p = d.properties;
            return `<div style="background:rgba(10,15,30,0.95);border:1px solid ${p.strokeColor};border-radius:6px;padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:11px;max-width:240px">
              <div style="color:${p.strokeColor};font-weight:700;margin-bottom:4px">${p.label}</div>
              <div style="color:#94a3b8;font-size:10px">Risk: <span style="color:${p.impact < 0 ? 'rgba(255,80,80,1)' : 'rgba(80,220,100,1)'}">${p.risk}/100</span></div>
              <div style="color:${p.impact < 0 ? 'rgba(255,80,80,1)' : 'rgba(80,220,100,1)'};margin-top:4px">SYM Logistics Impact: ${p.impact >= 0 ? '+' : ''}${p.impact}%</div>
            </div>`;
          }
          const name = d.properties?.name ?? "";
          if (!name) return "";
          return `<div style="background:rgba(10,15,30,0.9);border:1px solid rgba(80,200,255,0.4);border-radius:4px;padding:4px 8px;font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(200,230,255,0.9)">${name}</div>`;
        }}
        // City/node points + climate zone markers (merged)
        pointsData={allPoints}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude="altitude"
        pointRadius="radius"
        pointResolution={12}
        onPointClick={handleNodeClick}
        pointLabel={(d: any) => {
          if (d._isClimate) {
            // Climate zone: hover-only tooltip with risk score + impact
            return `<div style="background:rgba(8,12,24,0.97);border:1px solid ${d.color};border-radius:6px;padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:11px;max-width:240px">
              <div style="color:${d.color};font-weight:700;margin-bottom:5px;font-size:12px">🌐 ${d.zoneLabel}</div>
              <div style="color:#94a3b8;font-size:10px">Risk Score: <span style="color:${d.risk > 60 ? 'rgba(255,80,80,1)' : 'rgba(255,150,60,1)'}">${d.risk}/100</span></div>
              <div style="color:${d.impact >= 0 ? 'rgba(80,220,100,1)' : 'rgba(255,80,80,1)'};margin-top:4px">SYM Logistics: ${d.impact >= 0 ? '+' : ''}${d.impact}%</div>
              <div style="color:#64748b;font-size:9px;margin-top:4px;line-height:1.4">${d.desc.slice(0, 80)}...</div>
            </div>`;
          }
          return `<div style="background:rgba(8,12,24,0.95);border:1px solid ${d.color};border-radius:6px;padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:11px;color:${d.color};max-width:240px">
            <div style="font-weight:700;margin-bottom:4px;font-size:12px">${d.city}</div>
            <div style="color:#94a3b8;font-size:10px;line-height:1.4">${d.desc}</div>
            <div style="margin-top:5px;font-size:11px;color:${d.impact >= 0 ? "rgba(80,220,100,1)" : "rgba(255,80,80,1)"}">${d.impact >= 0 ? "+" : ""}${d.impact}% price target impact</div>
          </div>`;
        }}
        // Supply arcs
        arcsData={showArcs ? arcs : []}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcAltitude={0.28}
        arcStroke={0.45}
        arcDashLength={0.35}
        arcDashGap={0.18}
        arcDashAnimateTime={2200}
        arcsTransitionDuration={400}
        arcLabel={(d: any) =>
          `<div style="background:rgba(8,12,24,0.9);border-radius:4px;padding:3px 8px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#fff">${d.label}</div>`
        }
        // City labels
        labelsData={labelData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelColor="color"
        labelSize="size"
        labelDotRadius={0.28}
        labelAltitude={0.015}
        labelsTransitionDuration={0}
        labelResolution={2}
        // ── Animated climate rings ───────────────────────────────────────
        ringsData={climateRings}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringColor={(d: any) => (t: number) =>
          `${d.ringColor}${(0.75 * (1 - t)).toFixed(2)})`
        }
        onGlobeReady={() => setReady(true)}
        enablePointerInteraction
      />
    </div>
  );
});

// ── 2D Flat Canvas Map ────────────────────────────────────────────────────────
interface ViewState {
  scale: number;   // zoom scale (1 = fit, >1 = zoomed in)
  offsetX: number; // pan offset in canvas-pixels
  offsetY: number; // pan offset in canvas-pixels
}

const DEFAULT_VIEW: ViewState = { scale: 1, offsetX: 0, offsetY: 0 };
const W2D = 440, H2D = 260;

function GlobeFlat({
  nodes, arcs, showArcs, showClimate, showMacro, countries, onNodeClick,
}: {
  nodes: typeof GEO_NODES;
  arcs: typeof ARC_DATA;
  showArcs: boolean;
  showClimate: boolean;
  showMacro: boolean;
  countries: any[];
  onNodeClick: (n: typeof GEO_NODES[0]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const viewRef = useRef<ViewState>(DEFAULT_VIEW);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Keep viewRef in sync for RAF callbacks
  useEffect(() => { viewRef.current = view; }, [view]);

  // Project lat/lng → canvas pixel, accounting for current view transform
  function project(lat: number, lng: number, v: ViewState = view) {
    const rawX = ((lng + 180) / 360) * W2D;
    const rawY = ((90 - lat) / 180) * H2D;
    return {
      x: rawX * v.scale + v.offsetX,
      y: rawY * v.scale + v.offsetY,
    };
  }

  // Inverse project pixel → lat/lng
  function unproject(px: number, py: number, v: ViewState = view) {
    const rawX = (px - v.offsetX) / v.scale;
    const rawY = (py - v.offsetY) / v.scale;
    const lng = (rawX / W2D) * 360 - 180;
    const lat = 90 - (rawY / H2D) * 180;
    return { lat, lng };
  }

  // Fly to lat/lng by animating view
  function flyTo(lat: number, lng: number, targetScale = 3.5) {
    const steps = 40;
    let step = 0;
    const startView = { ...viewRef.current };
    const rawX = ((lng + 180) / 360) * W2D;
    const rawY = ((90 - lat) / 180) * H2D;
    const targetOffsetX = W2D / 2 - rawX * targetScale;
    const targetOffsetY = H2D / 2 - rawY * targetScale;

    function animate() {
      step++;
      const t = step / steps;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setView({
        scale: startView.scale + (targetScale - startView.scale) * ease,
        offsetX: startView.offsetX + (targetOffsetX - startView.offsetX) * ease,
        offsetY: startView.offsetY + (targetOffsetY - startView.offsetY) * ease,
      });
      if (step < steps) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // Draw everything whenever view or data changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = W2D; canvas.height = H2D;

    // Ocean background
    ctx.fillStyle = "hsl(215 50% 9%)";
    ctx.fillRect(0, 0, W2D, H2D);

    // Lat/lng grid lines
    ctx.strokeStyle = "rgba(80,150,255,0.07)";
    ctx.lineWidth = 0.5;
    for (let lat = -60; lat <= 60; lat += 30) {
      const { y } = project(lat, 0);
      if (y < 0 || y > H2D) continue;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W2D, y); ctx.stroke();
    }
    for (let lng = -180; lng <= 180; lng += 30) {
      const { x } = project(0, lng);
      if (x < 0 || x > W2D) continue;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H2D); ctx.stroke();
    }

    // Draw country polygons
    for (const feature of countries) {
      const geom = feature.geometry;
      if (!geom) continue;
      const isoNum = feature.id;
      const macroData = MACRO_SCORES[isoNum];

      // Macro heat fill
      let fillColor = "rgba(80,130,200,0.10)";
      if (showMacro && macroData) {
        fillColor = macroScoreToColor(macroData.score);
      }

      ctx.strokeStyle = "rgba(130,190,255,0.35)";
      ctx.lineWidth = 0.6 / view.scale;
      ctx.fillStyle = fillColor;

      const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
      for (const poly of polys) {
        for (const ring of poly) {
          ctx.beginPath();
          let first = true;
          for (const [lng, lat] of ring) {
            const { x, y } = project(lat, lng);
            first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            first = false;
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // Climate overlay zones
    if (showClimate) {
      for (const zone of CLIMATE_ZONES) {
        const p0 = project(zone.bounds.minLat, zone.bounds.minLng > 180 ? zone.bounds.minLng - 360 : zone.bounds.minLng);
        const p1 = project(zone.bounds.maxLat, zone.bounds.maxLng > 180 ? zone.bounds.maxLng - 360 : zone.bounds.maxLng);
        const rx = Math.abs(p1.x - p0.x);
        const ry = Math.abs(p1.y - p0.y);
        const cx2 = (p0.x + p1.x) / 2;
        const cy2 = (p0.y + p1.y) / 2;

        // Semi-transparent filled zone
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, Math.max(rx / 2, 4), Math.max(ry / 2, 4), 0, 0, Math.PI * 2);
        ctx.fillStyle = zone.color;
        ctx.fill();
        ctx.strokeStyle = zone.borderColor;
        ctx.lineWidth = 1 / view.scale;
        ctx.stroke();

        // Pulsing ring
        const pulseR = Math.max(rx / 2, 5) * (1.15 + 0.15 * Math.sin(Date.now() / 700));
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, pulseR, pulseR * 0.7, 0, 0, Math.PI * 2);
        ctx.strokeStyle = zone.borderColor.replace("0.55", "0.3");
        ctx.lineWidth = 1 / view.scale;
        ctx.stroke();
      }
    }

    // Supply arcs
    if (showArcs) {
      ctx.setLineDash([4 / view.scale, 4 / view.scale]);
      for (const arc of arcs) {
        const start = project(arc.startLat, arc.startLng);
        const end = project(arc.endLat, arc.endLng);
        const cpX = (start.x + end.x) / 2;
        const cpY = Math.min(start.y, end.y) - 35 * view.scale;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(cpX, cpY, end.x, end.y);
        ctx.strokeStyle = arc.color.replace("0.75", "0.55");
        ctx.lineWidth = 1 / view.scale;
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Geo-nodes
    for (const n of nodes) {
      const { x, y } = project(n.lat, n.lng);
      if (x < -10 || x > W2D + 10 || y < -10 || y > H2D + 10) continue;
      const color = TYPE_COLORS[n.type] ?? "rgba(80,200,255,1)";
      const r = (n.type === "crisis" ? 6 : n.type === "customer" ? 5 : 4) / Math.sqrt(view.scale);

      // Glow ring
      ctx.beginPath();
      ctx.arc(x, y, r + 2 / view.scale, 0, Math.PI * 2);
      ctx.strokeStyle = color.replace(",1)", ",0.25)");
      ctx.lineWidth = 1.5 / view.scale;
      ctx.stroke();

      // Dot
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label (only show when zoomed)
      if (view.scale > 0.8) {
        ctx.save();
        ctx.font = `${n.type === "crisis" ? "bold " : ""}${Math.max(6, 7 * view.scale)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = color;
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 3;
        ctx.fillText(n.city, x + r + 2, y + 3);
        ctx.restore();
      }
    }
  }, [view, nodes, arcs, showArcs, showClimate, showMacro, countries]);

  // Mouse wheel zoom — zoom toward cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W2D / rect.width);
    const my = (e.clientY - rect.top) * (H2D / rect.height);
    const delta = e.deltaY > 0 ? 0.88 : 1.14;
    setView((v) => {
      const newScale = Math.max(0.5, Math.min(10, v.scale * delta));
      const ratio = newScale / v.scale;
      return {
        scale: newScale,
        offsetX: mx - ratio * (mx - v.offsetX),
        offsetY: my - ratio * (my - v.offsetY),
      };
    });
  }, []);

  // Pan (mousedown + mousemove)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleRatio = W2D / rect.width;
    const dx = (e.clientX - lastMouse.current.x) * scaleRatio;
    const dy = (e.clientY - lastMouse.current.y) * scaleRatio;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setView((v) => ({ ...v, offsetX: v.offsetX + dx, offsetY: v.offsetY + dy }));
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  // Click: find nearest node
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W2D / rect.width);
    const my = (e.clientY - rect.top) * (H2D / rect.height);
    const threshold = 12;
    for (const n of nodes) {
      const { x, y } = project(n.lat, n.lng);
      if (Math.hypot(mx - x, my - y) < threshold) {
        onNodeClick(n);
        break;
      }
    }
  }, [nodes, view, onNodeClick]);

  // Double-click → fly to nearest node or point on map
  const handleDblClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W2D / rect.width);
    const my = (e.clientY - rect.top) * (H2D / rect.height);
    // Check if near a geo node
    for (const n of nodes) {
      const { x, y } = project(n.lat, n.lng);
      if (Math.hypot(mx - x, my - y) < 20) {
        flyTo(n.lat, n.lng, 4.5);
        onNodeClick(n);
        return;
      }
    }
    // Otherwise fly to the clicked lat/lng
    const { lat, lng } = unproject(mx, my);
    flyTo(lat, lng, 3);
  }, [nodes, view]);

  // Tooltip on hover
  const handleMouseMoveTooltip = useCallback((e: React.MouseEvent) => {
    if (dragging.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W2D / rect.width);
    const my = (e.clientY - rect.top) * (H2D / rect.height);
    // Check nodes
    for (const n of nodes) {
      const { x, y } = project(n.lat, n.lng);
      if (Math.hypot(mx - x, my - y) < 10) {
        setTooltip({ text: `${n.city} — ${n.impact >= 0 ? "+" : ""}${n.impact}%`, x: e.clientX - rect.left, y: e.clientY - rect.top });
        return;
      }
    }
    // Check climate zones
    if (showClimate) {
      for (const z of CLIMATE_ZONES) {
        const cx2 = ((z.bounds.minLng > 180 ? z.bounds.minLng - 360 : z.bounds.minLng) + (z.bounds.maxLng > 180 ? z.bounds.maxLng - 360 : z.bounds.maxLng)) / 2;
        const cy2 = (z.bounds.minLat + z.bounds.maxLat) / 2;
        const { x, y } = project(cy2, cx2);
        if (Math.hypot(mx - x, my - y) < 30) {
          setTooltip({ text: `${z.label} | ${z.impact >= 0 ? "+" : ""}${z.impact}% SYM impact`, x: e.clientX - rect.left, y: e.clientY - rect.top });
          return;
        }
      }
    }
    setTooltip(null);
  }, [nodes, view, showClimate]);

  return (
    <div
      className="relative select-none"
      style={{ width: W2D, height: H2D, cursor: dragging.current ? "grabbing" : "crosshair" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: W2D, height: H2D,
          borderRadius: 8,
          border: "1px solid rgba(80,180,255,0.2)",
          boxShadow: "0 0 30px rgba(80,180,255,0.1)",
          display: "block",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => { handleMouseMove(e); handleMouseMoveTooltip(e); }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
      />

      {/* Reset View button */}
      <button
        onClick={() => setView(DEFAULT_VIEW)}
        className="absolute bottom-2 right-2 flex items-center gap-1 text-[9px] font-mono px-1.5 py-1 rounded border border-primary/30 bg-card/80 text-primary hover:bg-primary/15 transition-all backdrop-blur-sm"
        title="Reset map to full world view"
      >
        <RotateCcw size={8} /> Reset View
      </button>

      {/* Zoom indicator */}
      {view.scale !== 1 && (
        <div className="absolute top-2 left-2 text-[8px] font-mono text-primary/60 bg-card/70 px-1.5 py-0.5 rounded">
          {view.scale.toFixed(1)}×
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none nexus-tooltip z-30"
          style={{ top: tooltip.y - 30, left: tooltip.x + 8, maxWidth: 220 }}
        >
          <div className="text-[10px] font-mono text-foreground">{tooltip.text}</div>
        </div>
      )}
    </div>
  );
}

// ── Layer toggle strip ─────────────────────────────────────────────────────────
const LAYERS = [
  { id: "macro",   label: "Macro Heat",   icon: Thermometer },
  { id: "climate", label: "Climate",      icon: Wind },
  { id: "arcs",    label: "Supply Arcs",  icon: Anchor },
  { id: "risk",    label: "Risk Markers", icon: Zap },
];

// ── Main Global page ───────────────────────────────────────────────────────────
export function Global() {
  const { valuation, addPulse } = useNexusStore();
  const { data: assumptions = [] } = useQuery<Assumption[]>({ queryKey: ["/api/assumptions"] });
  const globalAssumptions = assumptions.filter((a: Assumption) => a.category === "global");

  const [selectedNode, setSelectedNode] = useState<typeof GEO_NODES[0] | null>(null);
  const [activeLayers, setActiveLayers] = useState({
    macro: true, climate: false, arcs: true, risk: true,
  });
  const [globeMode, setGlobeMode] = useState<"3d" | "2d">("2d");
  const [countries, setCountries] = useState<any[]>([]);
  const [countriesLoaded, setCountriesLoaded] = useState(false);
  // Ref to drive 3D fly-to from the sidebar click handler
  const globe3DRef = useRef<GlobeThreeDHandle>(null);
  const [selectedClimate, setSelectedClimate] = useState<typeof CLIMATE_ZONES[0] | null>(null);
  const qc = useQueryClient();

  // Load GeoJSON once
  useEffect(() => {
    fetch("./countries-geojson.json")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((geo) => { setCountries(geo.features ?? []); setCountriesLoaded(true); })
      .catch(() => {
        Promise.all([
          import("topojson-client"),
          fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((r) => r.json()),
        ]).then(([topo, atlas]) => {
          const geo = (topo as any).feature(atlas, atlas.objects.countries);
          setCountries(geo.features ?? []);
          setCountriesLoaded(true);
        }).catch(() => setCountriesLoaded(true));
      });
  }, []);

  const handleNodeClick = useCallback((node: typeof GEO_NODES[0]) => {
    setSelectedNode(node);
    addPulse("global");
    addPulse("assumptions");
    // FIX: drive 3D fly-to imperatively so sidebar clicks move the camera
    if (globeMode === "3d") {
      globe3DRef.current?.flyToNode(node.lat, node.lng, node.type === "crisis" ? 0.9 : 1.1);
    }
    if (node.type === "crisis" && node.city === "Tehran") {
      const a = assumptions.find((x: Assumption) => x.key === "chinaTariffRisk");
      if (a) {
        apiRequest("PATCH", `/api/assumptions/${a.id}`, { value: 350 }).then(() => {
          qc.invalidateQueries({ queryKey: ["/api/assumptions"] });
          qc.invalidateQueries({ queryKey: ["/api/valuation"] });
          addPulse("firm"); addPulse("executive");
        });
      }
    }
  }, [assumptions, addPulse, qc]);

  const toggleLayer = (id: string) => {
    setActiveLayers((prev) => ({ ...prev, [id as keyof typeof prev]: !prev[id as keyof typeof prev] }));
    if (id === "climate" || id === "macro") {
      addPulse("global");
    }
  };

  const visibleNodes = GEO_NODES.filter((n) =>
    activeLayers.risk ? true : n.type !== "risk" && n.type !== "crisis" && n.type !== "regulation"
  );

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe2 size={14} className="text-primary" />
              <h1 className="text-base font-semibold text-foreground">Global Macro Analysis</h1>
              <span className="ml-2 text-[9px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                ⚠ ACTIVE: 2026 HORMUZ CRISIS
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              BIS · IMF · World Bank · NOAA/NASA climate · Interactive globe with country polygons — Apr 1 2026
            </p>
          </div>
          <div className="cyber-panel px-4 py-2 text-right">
            <div className="text-[9px] font-mono text-muted-foreground">GLOBAL-ADJ. TARGET</div>
            <div className="text-lg font-mono font-bold text-primary">
              ${valuation ? (valuation.ensemble * 0.95).toFixed(2) : "—"}
            </div>
          </div>
        </div>

        {/* Iran War crisis banner — BUTTONS REMOVED per spec */}
        <div className="border border-red-500/40 rounded-lg p-3 bg-red-500/5">
          <div className="flex items-start gap-3">
            <div className="text-red-400 text-lg leading-none mt-0.5">⚠</div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-red-400 mb-1">
                2026 IRAN WAR — STRAIT OF HORMUZ CRISIS (Live, Apr 1 2026)
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Conflict escalated Feb 28 2026. Iran has effectively closed the Strait of Hormuz to commercial
                shipping, disrupting ~20% of global oil transit and causing major logistics shocks.
                Oil up ~38% YTD. Semiconductor and robotics component supply chains running through APAC
                face re-routing delays of 2–3 weeks.
                <strong className="text-red-300"> Estimated SYM COGS headwind: +80–140 bps gross margin drag.
                Supply chain resilience index dropped 72 → 48.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Climate zone detail (when climate toggle on and zone selected) */}
        {activeLayers.climate && selectedClimate && (
          <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-amber-400">{selectedClimate.label}</div>
              <button onClick={() => setSelectedClimate(null)} className="text-[9px] text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{selectedClimate.desc}</p>
            <div className="flex items-center gap-4 mt-2 text-[10px] font-mono">
              <span className="text-muted-foreground">Risk Score: <span className="text-amber-400">{selectedClimate.risk}/100</span></span>
              <span className="text-muted-foreground">SYM Logistics Impact:
                <span style={{ color: selectedClimate.impact >= 0 ? "hsl(142 70% 50%)" : "hsl(0 72% 55%)" }}>
                  {" "}{selectedClimate.impact >= 0 ? "+" : ""}{selectedClimate.impact}%
                </span>
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-5 gap-4">
          {/* Globe + node list */}
          <div className="col-span-3 space-y-4">
            <div className="cyber-panel p-4">
              {/* Controls */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider flex-1">
                  HOLOGRAPHIC GLOBE — INTERACTIVE SYM GEO NODES
                </div>
                {/* 2D / 3D mode */}
                <div className="flex items-center gap-1 bg-muted/20 border border-border rounded p-0.5">
                  {(["2d", "3d"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setGlobeMode(m)}
                      title={m === "3d" ? "3D Globe with Three.js (CDN earth texture)" : "2D Flat Map — instant, full zoom/pan/fly-to"}
                      className={`text-[10px] font-mono px-2.5 py-1 rounded transition-all ${
                        globeMode === m
                          ? "bg-primary/25 text-primary border border-primary/50"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.toUpperCase()} GLOBE
                    </button>
                  ))}
                </div>
                {/* Layer toggles */}
                {LAYERS.map((l) => {
                  const Icon = l.icon;
                  const isOn = activeLayers[l.id as keyof typeof activeLayers];
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleLayer(l.id)}
                      title={l.label}
                      className={`flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                        isOn
                          ? "bg-primary/15 border-primary/30 text-primary"
                          : "bg-muted/20 border-border text-muted-foreground"
                      }`}
                    >
                      <Icon size={9} />
                      {l.label}
                    </button>
                  );
                })}
              </div>

              {/* Globe canvas + sidebar */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {globeMode === "3d" ? (
                    <GlobeThreeD
                      ref={globe3DRef}
                      nodes={visibleNodes}
                      arcs={ARC_DATA}
                      showArcs={activeLayers.arcs}
                      showClimate={activeLayers.climate}
                      onNodeClick={handleNodeClick}
                      countries={countriesLoaded ? countries : []}
                    />
                  ) : (
                    <GlobeFlat
                      nodes={visibleNodes}
                      arcs={ARC_DATA}
                      showArcs={activeLayers.arcs}
                      showClimate={activeLayers.climate}
                      showMacro={activeLayers.macro}
                      countries={countriesLoaded ? countries : []}
                      onNodeClick={handleNodeClick}
                    />
                  )}
                </div>

                {/* Node + climate sidebar */}
                <div className="flex-1 space-y-1 max-h-[260px] overflow-y-auto">
                  <div className="text-[9px] font-mono text-muted-foreground tracking-wider mb-1 sticky top-0 bg-card py-1">
                    ACTIVE NODES — CLICK TO FOCUS
                  </div>
                  {visibleNodes.map((n) => (
                    <button
                      key={n.city}
                      onClick={() => handleNodeClick(n)}
                      className={`w-full flex items-start gap-2 text-left p-1.5 rounded transition-all hover:bg-white/5 ${
                        selectedNode?.city === n.city ? "bg-primary/8 border border-primary/30" : ""
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${n.type === "crisis" ? "animate-pulse" : ""}`}
                        style={{ background: CSS_TYPE_COLORS[n.type] ?? "#666" }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-foreground truncate">{n.city}</span>
                          {n.type === "crisis" && (
                            <span className="text-[8px] text-red-400 font-mono border border-red-500/40 px-1 rounded">ACTIVE</span>
                          )}
                        </div>
                        <div className="text-[9px] text-muted-foreground truncate">{n.country}</div>
                      </div>
                      <div
                        className="font-mono text-[9px] flex-shrink-0 ml-auto"
                        style={{ color: n.impact > 0 ? "hsl(142 70% 50%)" : n.impact < 0 ? "hsl(0 72% 55%)" : "hsl(218 15% 55%)" }}
                      >
                        {n.impact > 0 ? "+" : ""}{n.impact.toFixed(1)}%
                      </div>
                    </button>
                  ))}

                  {/* Climate zones list */}
                  {activeLayers.climate && (
                    <>
                      <div className="text-[9px] font-mono text-amber-400/70 tracking-wider mt-3 mb-1">
                        CLIMATE EVENTS (NOAA/NASA)
                      </div>
                      {CLIMATE_ZONES.map((z) => (
                        <button
                          key={z.id}
                          onClick={() => setSelectedClimate(selectedClimate?.id === z.id ? null : z)}
                          className={`w-full flex items-start gap-2 text-left p-1.5 rounded transition-all hover:bg-white/5 ${
                            selectedClimate?.id === z.id ? "bg-amber-500/8 border border-amber-500/30" : ""
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: z.borderColor }} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] text-foreground truncate">{z.label.split(" (")[0]}</div>
                            <div className="text-[9px] text-muted-foreground">Risk: {z.risk}/100</div>
                          </div>
                          <div
                            className="font-mono text-[9px] flex-shrink-0 ml-auto"
                            style={{ color: z.impact >= 0 ? "hsl(142 70% 50%)" : "hsl(0 72% 55%)" }}
                          >
                            {z.impact >= 0 ? "+" : ""}{z.impact.toFixed(1)}%
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* 2D controls hint */}
              {globeMode === "2d" && (
                <div className="flex items-center gap-4 mt-3 text-[9px] font-mono text-muted-foreground/60">
                  <span>🖱 Scroll = zoom</span>
                  <span>Drag = pan</span>
                  <span>Dbl-click = fly-to</span>
                  <span>Click node = focus</span>
                </div>
              )}
            </div>

            {/* Selected node detail */}
            {selectedNode && (
              <div className="cyber-panel p-4 border-primary/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${selectedNode.type === "crisis" ? "animate-pulse" : ""}`}
                      style={{ background: CSS_TYPE_COLORS[selectedNode.type] }}
                    />
                    <span className="text-sm font-semibold text-foreground">{selectedNode.city}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{selectedNode.country}</span>
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: `${CSS_TYPE_COLORS[selectedNode.type]}20`, color: CSS_TYPE_COLORS[selectedNode.type] }}
                    >
                      {selectedNode.type}
                    </span>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{selectedNode.desc}</p>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <div style={{ color: selectedNode.impact > 0 ? "hsl(142 70% 50%)" : "hsl(0 72% 55%)" }}>
                    Price Target Impact: {selectedNode.impact > 0 ? "+" : ""}{selectedNode.impact.toFixed(1)}%
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => { addPulse("government"); addPulse("global"); }}
                      className="px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
                    >
                      → Link to Govt
                    </button>
                    <button
                      onClick={() => addPulse("ecosystem")}
                      className="px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25 transition-colors"
                    >
                      → Link to Ecosystem
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Macro table */}
            <div className="cyber-panel overflow-hidden">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider p-4 pb-2">
                MACRO INDICATORS — BIS / IMF / WORLD BANK (Apr 1 2026)
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Metric", "Value", "Trend", "SYM Impact"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left font-mono text-muted-foreground font-normal text-[9px] tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MACRO_TABLE.map((row) => (
                    <tr
                      key={row.metric}
                      className={`border-b border-border/30 hover:bg-white/2 transition-colors ${row.metric === "Hormuz Oil Flow" ? "bg-red-500/5" : ""}`}
                    >
                      <td className={`px-4 py-2 ${row.metric === "Hormuz Oil Flow" ? "text-red-400 font-semibold" : "text-foreground"}`}>{row.metric}</td>
                      <td className={`px-4 py-2 font-mono ${row.metric === "Hormuz Oil Flow" ? "text-red-400 font-bold" : "text-foreground"}`}>{row.value}</td>
                      <td className={`px-4 py-2 font-mono text-[10px] ${row.trend === "up" ? "text-green-400" : row.trend === "down" ? "text-red-400" : "text-muted-foreground"}`}>
                        {row.trend === "up" ? "↑" : row.trend === "down" ? "↓" : "→"} {row.trend}
                      </td>
                      <td className={`px-4 py-2 font-mono text-[10px] ${row.impact === "bull" ? "text-green-400" : row.impact === "bear" ? "text-red-400" : "text-muted-foreground"}`}>
                        {row.impact}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: assumptions + risk thermometer */}
          <div className="col-span-2 space-y-3">
            <h2 className="text-[10px] font-mono text-muted-foreground tracking-widest">GLOBAL ASSUMPTIONS</h2>
            <div className="space-y-2">
              {globalAssumptions.map((a: Assumption) => (
                <AssumptionCard key={a.id} assumption={a} />
              ))}
            </div>

            <div className="cyber-panel p-4 space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider">RISK THERMOMETER (Apr 2026)</div>
              {[
                { label: "Geopolitical (Iran War)", score: 87, color: "hsl(0 85% 55%)",  delta: "+25 pts since Feb" },
                { label: "Supply Chain (Hormuz)",   score: 78, color: "hsl(0 72% 55%)",  delta: "+30 pts since Feb" },
                { label: "Credit Cycle",            score: 52, color: "hsl(40 90% 55%)", delta: "+7 pts" },
                { label: "Currency (DXY spike)",    score: 45, color: "hsl(40 80% 60%)", delta: "+17 pts" },
                { label: "Climate/El Niño",         score: 58, color: "hsl(262 83% 65%)", delta: "+10 pts" },
              ].map((r) => (
                <div key={r.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground truncate">{r.label}</span>
                    <span className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <span style={{ color: r.color }}>{r.score}/100</span>
                      <span className="text-[8px] text-muted-foreground/60">{r.delta}</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${r.score}%`, background: r.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Supply arc legend */}
            {activeLayers.arcs && (
              <div className="cyber-panel p-3 space-y-2">
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider">SUPPLY CHAIN FLOWS</div>
                {ARC_DATA.map((a) => (
                  <div key={a.label} className="flex items-center gap-2 text-[10px]">
                    <div className="w-6 h-0.5 rounded" style={{ background: a.color }} />
                    <span className="text-muted-foreground">{a.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Climate legend */}
            {activeLayers.climate && (
              <div className="cyber-panel p-3 space-y-2">
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider">CLIMATE OVERLAY LEGEND</div>
                <div className="flex items-center gap-2 text-[9px] font-mono">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,100,30,0.5)" }} />
                  <span className="text-muted-foreground">El Niño heat zone</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,60,60,0.4)" }} />
                  <span className="text-muted-foreground">Hurricane/typhoon belt</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(40,100,255,0.4)" }} />
                  <span className="text-muted-foreground">Flood/monsoon risk</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(80,200,255,0.3)" }} />
                  <span className="text-muted-foreground">Arctic shipping route</span>
                </div>
                <div className="text-[8px] text-muted-foreground/60 pt-1">Source: NOAA/NASA/NHC/PAGASA Apr 2026</div>
              </div>
            )}

            {/* Macro heat legend */}
            {activeLayers.macro && globeMode === "2d" && (
              <div className="cyber-panel p-3 space-y-2">
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider">MACRO HEAT LEGEND (2D)</div>
                {[
                  { color: "rgba(40,200,80,0.60)",  label: "Strong bull tailwind" },
                  { color: "rgba(80,180,60,0.45)",   label: "Mild bull tailwind" },
                  { color: "rgba(120,120,120,0.25)", label: "Neutral" },
                  { color: "rgba(255,60,40,0.45)",   label: "Macro headwind" },
                  { color: "rgba(200,20,20,0.65)",   label: "Critical bear macro" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-2 text-[9px] font-mono">
                    <div className="w-3 h-3 rounded-sm border border-white/10" style={{ background: l.color }} />
                    <span className="text-muted-foreground">{l.label}</span>
                  </div>
                ))}
                <div className="text-[8px] text-muted-foreground/60 pt-1">Source: IMF/BIS/World Bank Apr 2026</div>
              </div>
            )}

            {/* Globe controls reference */}
            <div className="cyber-panel p-3 space-y-1">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">GLOBE CONTROLS</div>
              {globeMode === "2d" ? [
                ["Scroll wheel", "Zoom in/out"],
                ["Click + drag", "Pan map"],
                ["Double-click", "Fly to point"],
                ["Click node", "View details + pulse"],
                ["Reset View btn", "Return to world view"],
              ] : [
                ["Drag", "Rotate globe"],
                ["Scroll", "Zoom in/out"],
                ["Click node", "Fly to + details"],
                ["Click country", "Fly to country"],
                ["Pause/Resume btn", "Toggle auto-rotation"],
              ]}
              {(globeMode === "2d" ? [
                ["Scroll wheel", "Zoom in/out"],
                ["Click + drag", "Pan map"],
                ["Double-click", "Fly to point"],
                ["Click node", "View details + pulse"],
                ["Reset View btn", "Return to world view"],
              ] : [
                ["Drag", "Rotate globe"],
                ["Scroll", "Zoom in/out"],
                ["Click node", "Fly to + details"],
                ["Click country", "Fly to country"],
                ["Pause/Resume btn", "Toggle auto-rotation"],
              ]).map(([k, v]) => (
                <div key={k} className="flex justify-between text-[9px] font-mono">
                  <span className="text-primary">{k}</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
