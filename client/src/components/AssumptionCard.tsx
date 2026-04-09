import { useState } from "react";
import { useNexusStore, getHeatmapClass, Assumption } from "@/lib/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RotateCcw, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  assumption: Assumption;
  compact?: boolean;
}

export function AssumptionCard({ assumption, compact = false }: Props) {
  const { heatmapMode, updateAssumption, addPulse } = useNexusStore();
  const [localValue, setLocalValue] = useState(assumption.value);
  const qc = useQueryClient();

  const heatClass = getHeatmapClass(assumption, heatmapMode);

  const mutation = useMutation({
    mutationFn: async (value: number) => {
      const res = await apiRequest("PATCH", `/api/assumptions/${assumption.id}`, { value });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/valuation"] });
      qc.invalidateQueries({ queryKey: ["/api/assumptions"] });
      addPulse(assumption.category);
      addPulse("assumptions");
      addPulse("executive");
    },
  });

  const handleChange = (value: number) => {
    setLocalValue(value);
    updateAssumption(assumption.id, value);
    mutation.mutate(value);
  };

  const handleReset = () => handleChange(assumption.defaultValue);

  const impactLabel = () => {
    const b = assumption.bullImpact.toFixed(1);
    const bear = assumption.bearImpact.toFixed(1);
    return `Bull: +${b}% | Bear: ${bear}%`;
  };

  const fillPct = ((localValue - assumption.min) / (assumption.max - assumption.min)) * 100;

  if (compact) {
    return (
      <div className={`flex items-center justify-between gap-3 p-2 rounded-lg border transition-all ${heatClass || "border-border"}`}>
        <span className="text-xs text-muted-foreground truncate">{assumption.label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground">
            {localValue.toFixed(1)}{assumption.unit !== "days" && assumption.unit !== "$B" ? assumption.unit : ""}
          </span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`p-3 rounded-lg border transition-all space-y-2 ${heatClass || "border-border bg-card"}`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground leading-tight">{assumption.label}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info size={10} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="nexus-tooltip max-w-[200px]">
                <p className="text-[10px]">{assumption.description}</p>
                <p className="text-[10px] mt-1 text-primary">{impactLabel()}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-foreground tabular-nums">
              {localValue % 1 === 0 ? localValue.toFixed(0) : localValue.toFixed(1)}
              <span className="text-[10px] text-muted-foreground ml-0.5">{assumption.unit}</span>
            </span>
            {localValue !== assumption.defaultValue && (
              <button
                onClick={handleReset}
                title="Reset to default"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            className="nexus-slider w-full"
            min={assumption.min}
            max={assumption.max}
            step={(assumption.max - assumption.min) / 100}
            value={localValue}
            onChange={(e) => handleChange(parseFloat(e.target.value))}
            data-testid={`slider-${assumption.key}`}
            style={{
              background: `linear-gradient(to right, hsl(196 100% 50%) 0%, hsl(196 100% 50%) ${fillPct}%, hsl(220 20% 18%) ${fillPct}%, hsl(220 20% 18%) 100%)`,
            }}
          />
          <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-0.5">
            <span>{assumption.min}{assumption.unit === "%" ? "%" : ""}</span>
            <span className="text-[9px] text-muted-foreground/50">default: {assumption.defaultValue}</span>
            <span>{assumption.max}{assumption.unit === "%" ? "%" : ""}</span>
          </div>
        </div>

        {/* Impact bar */}
        {heatmapMode !== "off" && (
          <div className="flex items-center gap-1.5 text-[9px] font-mono">
            <span className="text-green-400">▲ {assumption.bullImpact.toFixed(1)}%</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-muted to-green-500"
                style={{ width: "100%" }}
              />
            </div>
            <span className="text-red-400">▼ {Math.abs(assumption.bearImpact).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
