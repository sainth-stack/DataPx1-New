import { Link } from "react-router-dom";
import { Database, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataset } from "@/contexts/DatasetContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface DatasetSelectorProps {
  className?: string;
  compact?: boolean;
}

export function DatasetSelector({ className, compact = false }: DatasetSelectorProps) {
  const {
    workspaceDatasets,
    activeDatasetId,
    activeDataset,
    loading,
    switching,
    setActiveDataset,
  } = useDataset();

  if (loading && !activeDatasetId && workspaceDatasets.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground",
          compact ? "h-7" : "h-8",
          className,
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span>Loading datasets…</span>
      </div>
    );
  }

  if (!workspaceDatasets.length) {
    return (
      <Button asChild variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs shrink-0", className)}>
        <Link to="/data-ingestion">
          <Database className="h-3.5 w-3.5" />
          Select datasets
        </Link>
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <Database className="h-3.5 w-3.5" />
        <span className="font-medium">Dataset</span>
      </div>
      <Select
        value={activeDatasetId ?? undefined}
        onValueChange={(v) => void setActiveDataset(v)}
        disabled={switching}
      >
        <SelectTrigger
          className={cn(
            "rounded-input bg-background border-border/80 shadow-none",
            compact ? "h-7 w-[160px] sm:w-[200px] text-xs" : "h-8 w-[180px] sm:w-[240px] text-xs sm:text-sm",
          )}
          aria-label="Select active dataset"
        >
          {switching ? (
            <span className="flex items-center gap-2 truncate">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              Switching…
            </span>
          ) : (
            <SelectValue placeholder="Select dataset">
              {activeDataset?.display_name ?? "Select dataset"}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent align="end" className="max-h-72">
          {workspaceDatasets.map((d) => (
            <SelectItem value={d.dataset_id} className="text-sm" key={d.dataset_id}>
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate">{d.display_name}</span>
                {d.is_synthetic && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
                    Synthetic
                  </Badge>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
