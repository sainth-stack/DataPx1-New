import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Send, Sparkles, X, Wand2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rawQualityKpis, syntheticQualityKpis } from "@/data/machineData";
import { useDataset } from "@/contexts/DatasetContext";
import { dataProcessingApi } from "@/lib/api/dataProcessing";
import { genaiApi } from "@/lib/api/genai";

interface Msg {
  role: "user" | "ai";
  content: string;
  cta?: { label: string; to: string };
}

function mapQualityMetrics(metrics: Record<string, unknown> | undefined, enrichedColumns = 0) {
  if (!metrics) return null;
  return {
    qualityScore: Math.round(Number(metrics.quality_score ?? 0)),
    missingCells: Number(metrics.missing_cells ?? 0),
    outliers: Number(metrics.outliers ?? 0),
    enrichedColumns,
  };
}

/**
 * Floating, always-available Vector AI assistant.
 * Loads live quality scores when a dataset is active; falls back to static demo KPIs.
 */
export function VectorAIAssistant() {
  const { activeDatasetId, loading: datasetLoading } = useDataset();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [rawQuality, setRawQuality] = useState<{ qualityScore: number; missingCells: number; outliers: number } | null>(null);
  const [syntheticQuality, setSyntheticQuality] = useState<{ qualityScore: number } | null>(null);

  useEffect(() => {
    if (datasetLoading || !activeDatasetId) {
      setRawQuality(null);
      setSyntheticQuality(null);
      return;
    }

    void (async () => {
      try {
        const raw = await dataProcessingApi.getRawQuality(activeDatasetId);
        const mapped = mapQualityMetrics(raw?.metrics as Record<string, unknown> | undefined);
        if (mapped) setRawQuality(mapped);
      } catch {
        setRawQuality(null);
      }

      try {
        const syn = await dataProcessingApi.getSyntheticQuality(activeDatasetId);
        const mapped = mapQualityMetrics(
          syn?.metrics as Record<string, unknown> | undefined,
          Array.isArray(syn?.new_columns) ? syn.new_columns.length : 0,
        );
        if (mapped) setSyntheticQuality({ qualityScore: mapped.qualityScore });
      } catch {
        setSyntheticQuality(null);
      }
    })();
  }, [activeDatasetId, datasetLoading]);

  const dataQualityPct = rawQuality?.qualityScore ?? rawQualityKpis.qualityScore;
  const syntheticPct = syntheticQuality?.qualityScore ?? syntheticQualityKpis.qualityScore;
  const needsEnrichment = dataQualityPct < 100;

  const greeting = useMemo<Msg[]>(
    () => [
      {
        role: "ai",
        content: `Hi! I'm Vector AI — your machine-intelligence copilot. I've scanned your raw telemetry and the current data quality score is ${dataQualityPct}/100.`,
      },
      needsEnrichment
        ? {
            role: "ai",
            content: `That's below the 100% production threshold. Want me to run cleaning + enrichment to lift it to ~${syntheticPct}/100? This fixes missing cells, caps outliers, and engineers predictive features.`,
            cta: { label: "Open Data Quality", to: "/data-quality" },
          }
        : {
            role: "ai",
            content: `Your dataset is production-ready. Ask me about machine health, OEE, predictive maintenance or energy optimisation.`,
          },
    ],
    [dataQualityPct, syntheticPct, needsEnrichment],
  );

  const [messages, setMessages] = useState<Msg[]>(greeting);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setMessages(greeting);
    }
  }, [open, greeting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const reply = (text: string): Msg => {
    const t = text.toLowerCase();
    const missing = rawQuality?.missingCells ?? rawQualityKpis.missingCells;
    const outliers = rawQuality?.outliers ?? rawQualityKpis.outliers;
    if (t.includes("enrich") || t.includes("clean") || t.includes("quality")) {
      return {
        role: "ai",
        content: `I'll enrich the raw dataset: impute ${missing.toLocaleString()} missing cells, cap ${outliers} outliers, remove duplicates and engineer predictive features. Projected uplift: ${dataQualityPct} → ${syntheticPct}/100.`,
        cta: { label: "Go to Data Quality", to: "/data-quality" },
      };
    }
    if (t.includes("oee") || t.includes("performance")) {
      return {
        role: "ai",
        content: `Current avg machine OEE is 58%. M-106 (Lathe Zeta) is the main drag — availability 18% due to an overdue PM. Want me to open the dashboard?`,
        cta: { label: "Open Dashboard", to: "/dashboard" },
      };
    }
    if (t.includes("maintenance") || t.includes("pm") || t.includes("predict")) {
      return {
        role: "ai",
        content: `2 machines are at elevated risk: M-106 (risk 88, OVERDUE) and M-103 (risk 65). I recommend scheduling bearing & hydraulic inspections in the next 48h.`,
        cta: { label: "View Reports", to: "/reports" },
      };
    }
    if (t.includes("energy")) {
      return {
        role: "ai",
        content: `Energy Optimizer saved ~1,820 kWh this week. Compressor 3 is drawing 14% above baseline at idle — adjusting unloader timing typically recovers 6% per hour.`,
      };
    }
    return {
      role: "ai",
      content: `Got it. I can help with predictive maintenance, OEE, energy optimisation, data quality and reports. What would you like to dive into?`,
    };
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const parsed = await genaiApi.chat(text);
      setMessages((m) => [...m, { role: "ai", content: parsed.text }]);
    } catch (err) {
      const fallback = reply(text);
      setMessages((m) => [...m, {
        role: "ai",
        content: err instanceof Error ? err.message : fallback.content,
        cta: fallback.cta,
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full pl-3 pr-4 py-2.5",
            "bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all",
            "hover:-translate-y-0.5",
          )}
          aria-label="Open Vector AI assistant"
        >
          <div className="relative">
            <Bot className="h-5 w-5" />
            {needsEnrichment && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-primary animate-pulse" />
            )}
          </div>
          <span className="text-sm font-medium">Vector AI</span>
        </button>
      )}

      {open && (
        <Card className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-2rem)] rounded-card shadow-2xl flex flex-col overflow-hidden border">
          <div className="px-4 py-3 bg-gradient-to-br from-primary to-sidebar-deep text-primary-foreground flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-white/15 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Vector AI</p>
                <p className="text-[10px] opacity-80">Machine-intelligence copilot</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-md hover:bg-white/15 flex items-center justify-center"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {needsEnrichment && (
            <div className="px-3 py-2 bg-warning/10 border-b border-warning/30 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-warning shrink-0" />
              <p className="text-[11px] text-warning-foreground/90">
                Data quality <span className="font-semibold text-warning">{dataQualityPct}%</span> — enrichment recommended to reach {syntheticPct}%.
              </p>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-muted/20">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border",
                  )}
                >
                  <p>{m.content}</p>
                  {m.cta && (
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className="mt-2 h-7 text-[11px] gap-1.5"
                      onClick={() => setOpen(false)}
                    >
                      <Link to={m.cta.to}>
                        <Wand2 className="h-3 w-3" />
                        {m.cta.label}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 bg-card border-t">
            {["Enrich my data", "Show OEE", "Predictive maintenance", "Energy savings"].map((q) => (
              <Badge
                key={q}
                variant="outline"
                className="text-[10px] cursor-pointer hover:bg-accent hover:text-accent-foreground"
                onClick={() => setInput(q)}
              >
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                {q}
              </Badge>
            ))}
          </div>

          <div className="p-2 bg-card border-t flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask Vector AI…"
              className="h-9 text-xs"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={!input.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

export default VectorAIAssistant;
