import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sigma, Database, BarChart3, GitBranch, AlertCircle, CheckCircle2, Lightbulb, Info, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartInfo } from "@/components/ChartInfo";
import { useDataset } from "@/contexts/DatasetContext";
import { dataProcessingApi } from "@/lib/api/dataProcessing";
import { cn } from "@/lib/utils";
import {
  getCorrelationColor,
  getCorrelationStrength,
  getCorrelationBadgeClasses,
  correlationThresholds,
} from "@/lib/colorThresholds";

interface OverviewData {
  total_rows: number;
  features: number;
  missing_pct: number;
  display_name?: string;
  active_dataset?: string;
}

interface StatColumn {
  feature: string;
  dtype: string;
  missing_pct: number;
}

interface DescriptiveStat {
  feature: string;
  mean: number | null;
  median: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  missing_pct: number;
}

interface StatisticalSummaryData {
  descriptive_statistics: DescriptiveStat[];
  dataset_summary?: { columns?: StatColumn[] };
  numeric_feature_count?: number;
}

interface FeaturesData {
  default_feature: string;
  default_target: string;
  numeric_features: string[];
}

interface RawPreviewData {
  columns: Record<string, string>;
  rows: unknown[][];
  totalRows: number;
  is_synthetic?: boolean;
}

interface DistributionData {
  feature_label?: string;
  description?: string;
  plot?: {
    x_axis_label?: string;
    y_axis_label?: string;
    bins?: { label: string; count: number }[];
  };
}

interface FeatureAnalysisItem {
  feature: string;
  importance: number;
  correlation: number;
}

interface FeatureAnalysisData {
  target_column: string;
  features: FeatureAnalysisItem[];
  description?: string;
}

function formatStat(value: number | null | undefined, digits = 2): string {
  if (value == null) return "—";
  return value.toFixed(digits);
}

function formatCell(value: unknown, columnType?: string): ReactNode {
  if (value == null) {
    return <span className="text-muted-foreground/50 italic text-xs">null</span>;
  }
  if (typeof value === "number") {
    return (
      <span className="font-mono text-xs">
        {Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)}
      </span>
    );
  }
  if (columnType === "datetime") {
    return <span className="font-mono text-xs">{String(value)}</span>;
  }
  if (typeof value === "object") {
    return <span className="font-mono text-xs text-muted-foreground">{JSON.stringify(value)}</span>;
  }
  return <span className="text-xs font-mono">{String(value)}</span>;
}

export default function DataProcessing() {
  const { activeDatasetId, activeDataset, loading: datasetLoading } = useDataset();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [statisticalSummary, setStatisticalSummary] = useState<StatisticalSummaryData | null>(null);
  const [features, setFeatures] = useState<FeaturesData | null>(null);
  const [rawPreview, setRawPreview] = useState<RawPreviewData | null>(null);
  const [selectedFeature, setSelectedFeature] = useState("");
  const [distribution, setDistribution] = useState<DistributionData | null>(null);
  const [featureAnalysis, setFeatureAnalysis] = useState<FeatureAnalysisData | null>(null);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [featureAnalysisLoading, setFeatureAnalysisLoading] = useState(false);

  useEffect(() => {
    if (datasetLoading) return;

    void (async () => {
      if (!activeDatasetId) {
        setError("No datasets available. Please select a dataset in Data Ingestion first.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        void dataProcessingApi.refreshDataset(activeDatasetId).catch((refreshErr) => {
          console.warn("Dataset refresh warning:", refreshErr);
        });

        const [overviewRes, statsRes, featuresRes, rawRes] = await Promise.all([
          dataProcessingApi.getOverview(activeDatasetId),
          dataProcessingApi.getStatisticalSummary(activeDatasetId),
          dataProcessingApi.getFeatures(activeDatasetId),
          dataProcessingApi.getRawDataPreview(activeDatasetId, 50, 0),
        ]);

        setOverview(overviewRes);
        setStatisticalSummary(statsRes);
        setFeatures(featuresRes);
        setRawPreview(rawRes);
        setSelectedFeature(featuresRes.default_feature);
        void loadFeatureAnalysis(activeDatasetId, featuresRes.default_target);
      } catch (err) {
        console.error("Error initializing data processing:", err);
        setError(dataProcessingApi.extractMessage(err, "Failed to load data processing"));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeDatasetId, datasetLoading]);

  useEffect(() => {
    if (activeDatasetId && selectedFeature && features) {
      void loadDistribution(activeDatasetId, selectedFeature);
    }
  }, [selectedFeature, activeDatasetId, features]);

  const loadDistribution = async (datasetId: string, feature: string) => {
    try {
      setDistributionLoading(true);
      const data = await dataProcessingApi.getDistribution(datasetId, feature);
      setDistribution(data);
    } catch (err) {
      console.error("Error loading distribution:", err);
      setDistribution(null);
    } finally {
      setDistributionLoading(false);
    }
  };

  const loadFeatureAnalysis = async (datasetId: string, targetColumn?: string) => {
    try {
      setFeatureAnalysisLoading(true);
      const data = await dataProcessingApi.getFeatureAnalysis(datasetId, targetColumn || undefined);
      setFeatureAnalysis(data);
    } catch (err) {
      console.error("Error loading feature analysis:", err);
      setFeatureAnalysis(null);
    } finally {
      setFeatureAnalysisLoading(false);
    }
  };

  if (loading || (datasetLoading && !overview)) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-sm text-muted-foreground">Loading data processing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Alert className="max-w-md">
          <AlertCircle className="h-5 w-5 text-warning" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!overview || !statisticalSummary || !features) {
    return null;
  }

  const totalRows = overview.total_rows;
  const totalCols = overview.features;
  const missingPct = overview.missing_pct.toFixed(2);
  const displayName =
    overview.display_name ?? overview.active_dataset ?? activeDataset?.display_name ?? "—";
  const descriptiveStats = statisticalSummary.descriptive_statistics ?? [];
  const schemaColumns =
    statisticalSummary.dataset_summary?.columns ??
    Object.entries(rawPreview?.columns ?? {}).map(([feature, dtype]) => ({
      feature,
      dtype,
      missing_pct: 0,
    }));
  const rawColumns = rawPreview ? Object.keys(rawPreview.columns) : [];
  const rawRows = rawPreview?.rows ?? [];
  const distributionChartData =
    distribution?.plot?.bins?.map((bin) => ({ bucket: bin.label, count: bin.count })) ?? [];
  const importanceData = featureAnalysis?.features.slice(0, 12) ?? [];
  const targetColumn = featureAnalysis?.target_column ?? features.default_target;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Processing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Initial raw data preview, statistical summary and feature analysis on the active dataset.
        </p>
      </div>

      {/* Dataset info */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Dataset", value: displayName, icon: Database, color: "text-accent", isText: true },
          { label: "Total Rows", value: totalRows.toLocaleString(), icon: Sigma, color: "text-purple" },
          { label: "Features", value: totalCols, icon: GitBranch, color: "text-teal" },
          { label: "Missing %", value: `${missingPct}%`, icon: AlertCircle, color: "text-warning" },
        ].map((s) => (
          <Card key={s.label} className="rounded-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`mt-2 font-semibold ${s.isText ? "text-sm truncate" : "text-2xl"}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="raw" className="w-full">
        <TabsList>
          <TabsTrigger value="raw" className="gap-2"><Database className="h-4 w-4" /> Raw Data</TabsTrigger>
          <TabsTrigger value="stats" className="gap-2"><Sigma className="h-4 w-4" /> Statistical Analysis</TabsTrigger>
          <TabsTrigger value="features" className="gap-2"><BarChart3 className="h-4 w-4" /> Feature Analysis</TabsTrigger>
        </TabsList>

        {/* RAW DATA */}
        <TabsContent value="raw" className="space-y-4 mt-4">
          <Card className="rounded-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">
                Raw Data Preview (first {rawRows.length} rows)
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{totalRows.toLocaleString()} total rows</Badge>
                {rawPreview?.is_synthetic && (
                  <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">Synthetic</Badge>
                )}
              </div>
            </div>
            {rawRows.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {rawColumns.map((col) => (
                        <TableHead key={col} className="text-[11px] uppercase tracking-wide">
                          <div className="flex flex-col gap-1">
                            <span>{col}</span>
                            {rawPreview?.columns[col] && (
                              <Badge variant="outline" className="text-[10px] w-fit font-normal">
                                {rawPreview.columns[col]}
                              </Badge>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawRows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j}>
                            {formatCell(cell, rawPreview?.columns[rawColumns[j]])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No raw data available
              </div>
            )}
          </Card>

          <Card className="rounded-card p-5">
            <h3 className="text-sm font-semibold mb-3">Schema & Column Types</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {schemaColumns.map((col) => (
                <div key={col.feature} className="rounded-lg border p-3">
                  <p className="text-xs font-medium truncate">{col.feature}</p>
                  <Badge variant="outline" className="mt-1 text-[10px] bg-muted">{col.dtype}</Badge>
                  {col.missing_pct > 0 && (
                    <p className="text-[10px] text-warning mt-1">{col.missing_pct.toFixed(1)}% missing</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* STATISTICAL */}
        <TabsContent value="stats" className="space-y-4 mt-4">
          <Card className="rounded-card p-5">
            <h2 className="text-sm font-semibold mb-3">Descriptive Statistics</h2>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Mean</TableHead>
                  <TableHead className="text-right">Median</TableHead>
                  <TableHead className="text-right">Std Dev</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead className="text-right">Missing %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {descriptiveStats.map((s) => (
                  <TableRow key={s.feature}>
                    <TableCell className="font-medium font-mono text-xs">{s.feature}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatStat(s.mean)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatStat(s.median)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatStat(s.std)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatStat(s.min)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatStat(s.max)}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${s.missing_pct > 1 ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20"}`}
                      >
                        {s.missing_pct.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {features.numeric_features.length > 0 && (
            <Card className="rounded-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold">Distribution:</h3>
                  <select
                    value={selectedFeature}
                    onChange={(e) => setSelectedFeature(e.target.value)}
                    className="text-xs border rounded px-2 py-1 bg-background"
                  >
                    {features.numeric_features.map((f) => (
                      <option value={f} key={f}>{f}</option>
                    ))}
                  </select>
                </div>
                {distribution && (
                  <ChartInfo
                    xAxis={distribution.plot?.x_axis_label ?? "Feature value buckets"}
                    yAxis={distribution.plot?.y_axis_label ?? "Frequency count"}
                    note={distribution.description ?? "Distribution of selected feature values across the dataset."}
                  />
                )}
              </div>
              {distributionLoading ? (
                <div className="h-[260px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : distributionChartData.length > 0 ? (
                <>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="bucket"
                          tick={{ fontSize: 11 }}
                          stroke="hsl(var(--muted-foreground))"
                          label={{
                            value: distribution.feature_label ?? selectedFeature,
                            position: "insideBottom",
                            offset: -5,
                            style: { fontSize: 11 },
                          }}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          stroke="hsl(var(--muted-foreground))"
                          label={{ value: "Count", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {distribution.description && (
                    <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-medium text-foreground">What this distribution represents:</p>
                          <p className="text-muted-foreground mt-1 leading-relaxed">{distribution.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                  Select a feature to view distribution
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* FEATURE */}
        <TabsContent value="features" className="space-y-4 mt-4">
          <Card className="rounded-card p-5 border-l-4 border-l-success">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">Algorithm Selection — Why Random Forest?</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  <strong>Random Forest was automatically selected</strong> as the baseline algorithm because it:
                  <ul className="mt-1 ml-4 space-y-0.5 list-disc">
                    <li>Handles mixed data types (numerical + categorical) without preprocessing</li>
                    <li>Provides feature importance rankings out-of-the-box</li>
                    <li>Resistant to overfitting due to ensemble averaging</li>
                    <li>Works well with moderate-sized datasets (10K-1M rows)</li>
                    <li>Requires minimal hyperparameter tuning for baseline performance</li>
                  </ul>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This analysis helps identify which machine parameters have the strongest influence on your target variable.
                </p>
              </div>
            </div>
          </Card>

          {featureAnalysisLoading ? (
            <Card className="rounded-card p-5">
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
                  <p className="text-sm text-muted-foreground">Computing feature importance...</p>
                </div>
              </div>
            </Card>
          ) : featureAnalysis ? (
            <>
              <Card className="rounded-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold">
                    Feature Importance vs {targetColumn.replace(/_/g, " ")}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                      <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Random Forest baseline
                    </Badge>
                    <ChartInfo
                      xAxis="Feature importance score (0-1 scale)"
                      yAxis="Feature/sensor name"
                      note="Higher importance = stronger predictive power for output. Random Forest calculates this by measuring how much each feature reduces prediction error."
                    />
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={importanceData} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        label={{ value: "Importance", position: "insideBottom", offset: -5, style: { fontSize: 11 } }}
                      />
                      <YAxis
                        dataKey="feature"
                        type="category"
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                        {importanceData.map((f, i) => (
                          <Cell key={i} fill={getCorrelationColor(f.correlation)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="rounded-card p-5">
                <TooltipProvider delayDuration={0}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Correlation with Target ({targetColumn})</h3>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label="About correlation strength"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs z-[100]">
                        <p className="text-xs font-semibold">Understanding Correlation Strength</p>
                        <div className="mt-2 space-y-1">
                          {correlationThresholds.map((t) => (
                            <div key={t.label} className="flex items-start gap-2 text-[11px]">
                              <span className="h-2 w-2 rounded-sm shrink-0 mt-0.5" style={{ background: t.color }} />
                              <div>
                                <p className="font-medium">{t.label}</p>
                                <p className="text-muted-foreground">{t.meaning}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Feature</TableHead>
                        <TableHead className="text-right">Importance</TableHead>
                        <TableHead className="text-right">Pearson Correlation</TableHead>
                        <TableHead>Strength & Impact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featureAnalysis.features.map((f) => {
                        const negative = f.correlation < 0;
                        const strengthLabel = getCorrelationStrength(f.correlation);
                        return (
                          <TableRow key={f.feature}>
                            <TableCell className="font-medium font-mono text-xs">{f.feature}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{f.importance.toFixed(4)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{f.correlation.toFixed(4)}</TableCell>
                            <TableCell className="relative">
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    tabIndex={0}
                                    className="inline-flex cursor-help rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  >
                                    <Badge
                                      variant="outline"
                                      className={cn("text-[10px] font-semibold", getCorrelationBadgeClasses(f.correlation))}
                                    >
                                      {strengthLabel} {negative ? "▼" : "▲"}
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs z-[100]">
                                  <p className="text-xs font-semibold">
                                    {strengthLabel} {negative ? "Negative" : "Positive"} Correlation
                                  </p>
                                  <p className="text-[11px] text-muted-foreground mt-1">
                                    {f.feature} has a {strengthLabel.toLowerCase()} {negative ? "negative" : "positive"} relationship with the target.
                                    {negative
                                      ? " When this feature increases, the target tends to decrease."
                                      : " When this feature increases, the target tends to increase."}
                                  </p>
                                </TooltipContent>
                              </UITooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {featureAnalysis.description && (
                    <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-medium text-foreground">Key insight:</span> {featureAnalysis.description}
                        </p>
                      </div>
                    </div>
                  )}
                </TooltipProvider>
              </Card>
            </>
          ) : (
            <Card className="rounded-card p-5">
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No feature analysis data available
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
