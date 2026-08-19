import { ChevronDown, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { VectorDatasetOption } from "@/lib/vectorScope";
import { vectorSelectionLabel } from "@/lib/vectorScope";

interface VectorDatasetMultiSelectProps {
  options: VectorDatasetOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  aggregatedLabel?: string;
  /** Light styling for hero gradient header */
  variant?: "hero" | "default";
  disabled?: boolean;
}

export function VectorDatasetMultiSelect({
  options,
  selectedIds,
  onChange,
  aggregatedLabel,
  variant = "default",
  disabled = false,
}: VectorDatasetMultiSelectProps) {
  const label = vectorSelectionLabel(selectedIds, options, aggregatedLabel);
  const allSelected = options.length > 0 && selectedIds.length >= options.length;

  const toggle = (registryId: number, checked: boolean) => {
    if (checked) {
      if (selectedIds.includes(registryId)) return;
      onChange([...selectedIds, registryId]);
      return;
    }
    const next = selectedIds.filter((id) => id !== registryId);
    if (!next.length) return;
    onChange(next);
  };

  const selectAll = () => onChange(options.map((o) => o.registryId));
  const clearToOne = () => {
    if (options[0]) onChange([options[0].registryId]);
  };

  const triggerClass =
    variant === "hero"
      ? "gap-2 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
      : "gap-2";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !options.length}
          className={cn(
            "h-9 justify-between font-normal",
            variant === "hero" ? "w-[220px]" : "max-w-[240px]",
            triggerClass,
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Database className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="truncate text-xs">{label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-xs font-semibold">Datasets</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-[10px] text-primary hover:underline disabled:opacity-40"
              disabled={allSelected}
              onClick={selectAll}
            >
              All
            </button>
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:underline disabled:opacity-40"
              disabled={selectedIds.length <= 1}
              onClick={clearToOne}
            >
              Clear
            </button>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
          {options.length > 1 && (
            <label className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted/60 cursor-pointer border-b border-border/60 mb-1 pb-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => (v === true ? selectAll() : clearToOne())}
              />
              <span className="text-xs font-semibold leading-snug">
                All datasets ({options.length})
              </span>
            </label>
          )}
          {options.map((opt) => {
            const checked = selectedIds.includes(opt.registryId);
            return (
              <label
                key={opt.registryId}
                className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted/60 cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggle(opt.registryId, v === true)}
                />
                <span className="text-xs leading-snug truncate">{opt.displayName}</span>
              </label>
            );
          })}
          {!options.length && (
            <p className="text-xs text-muted-foreground px-2 py-3">No datasets in workspace.</p>
          )}
        </div>
        <p className="border-t px-3 py-2 text-[10px] text-muted-foreground">
          Selection applies to Vector Agents only (aggregated view).
        </p>
      </PopoverContent>
    </Popover>
  );
}
