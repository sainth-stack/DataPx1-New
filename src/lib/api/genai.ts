import { apiClient } from "./client";
import { extractApiMessage } from "./scope";

export interface GenAiParsedReply {
  text: string;
  tableHeaders?: string[];
  tableRows?: string[][];
  chartData?: { name: string; value: number }[];
  chartTitle?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function plotlyToChartPoints(plotlyJson: string): { title?: string; points: { name: string; value: number }[] } {
  try {
    const fig = JSON.parse(plotlyJson) as {
      data?: Array<{ x?: unknown[]; y?: unknown[]; name?: string }>;
      layout?: { title?: string | { text?: string } };
    };
    const trace = fig.data?.[0];
    if (!trace?.x || !trace?.y) return { points: [] };
    const xs = Array.isArray(trace.x) ? trace.x : [];
    const ys = Array.isArray(trace.y) ? trace.y : [];
    const points: { name: string; value: number }[] = [];
    for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
      const y = ys[i];
      if (typeof y === "number" && Number.isFinite(y)) {
        points.push({ name: String(xs[i] ?? i), value: y });
      }
    }
    const title =
      typeof fig.layout?.title === "string"
        ? fig.layout.title
        : fig.layout?.title?.text;
    return { title, points };
  } catch {
    return { points: [] };
  }
}

export function parseGenAiResponse(data: Record<string, unknown>): GenAiParsedReply {
  const parts: string[] = [];

  if (typeof data.error === "string") {
    return { text: data.error };
  }
  if (typeof data.message === "string" && data.success === false) {
    return { text: data.message };
  }

  if (typeof data.text_pre_code_response === "string" && data.text_pre_code_response.trim()) {
    parts.push(data.text_pre_code_response.trim());
  }
  if (typeof data.text_post_code_response === "string" && data.text_post_code_response.trim()) {
    parts.push(stripHtml(data.text_post_code_response));
  }

  let tableHeaders: string[] | undefined;
  let tableRows: string[][] | undefined;
  const textOutput = data.text_output;
  if (textOutput && typeof textOutput === "object" && !Array.isArray(textOutput)) {
    const out = textOutput as { format?: string; data?: Record<string, unknown>[]; columns?: string[] };
    if (out.format === "table" && Array.isArray(out.data) && out.data.length) {
      tableHeaders = out.columns ?? Object.keys(out.data[0]);
      tableRows = out.data.map((row) => tableHeaders!.map((col) => String(row[col] ?? "")));
    } else if (out.format === "text" && typeof (out as { data?: unknown }).data === "string") {
      parts.push(String((out as { data: string }).data));
    }
  } else if (typeof textOutput === "string" && textOutput.trim()) {
    parts.push(textOutput.trim());
  }

  let chartData: GenAiParsedReply["chartData"];
  let chartTitle: string | undefined;

  if (typeof data.chart_response === "string") {
    const { title, points } = plotlyToChartPoints(data.chart_response);
    if (points.length) {
      chartData = points;
      chartTitle = title ?? "Chart";
    }
  }

  if (!chartData && data.plot != null) {
    parts.push("Forecast chart generated — open Data Modelling for full forecast view.");
  }

  if (!parts.length && !tableRows?.length && !chartData?.length) {
    if (typeof data.text_pre_code_response === "string") {
      parts.push(data.text_pre_code_response);
    } else {
      parts.push("No response from Vector AI. Ensure datasets are selected in Data Ingestion.");
    }
  }

  return {
    text: parts.join("\n\n"),
    tableHeaders,
    tableRows,
    chartData,
    chartTitle,
  };
}

export const genaiApi = {
  async chat(prompt: string): Promise<GenAiParsedReply> {
    const { data } = await apiClient.post("/api/genai_bot", { prompt }, { timeout: 0 });
    if (data && typeof data === "object") {
      return parseGenAiResponse(data as Record<string, unknown>);
    }
    throw new Error("Invalid response from Vector AI");
  },

  extractMessage: extractApiMessage,
};
