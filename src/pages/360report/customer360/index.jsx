import React, { useState } from "react";
import { ChartFromConfig } from "../shared/DynamicReportRenderer";
import { generateCustomer360PDF } from "../shared/downloadReport";
import { useCustomer360Report } from "../shared/reportQueries";
import { ReportGenerationLoader, useReportLoader } from "../../../components/ReportGenerationLoader";
import "../reportPage.css";

export default function Customer360() {
  const [downloading, setDownloading] = useState(false);

  const { data: payload, isLoading, isError, isSuccess } = useCustomer360Report();
  const { showLoader, currentStep, steps, overallProgress } = useReportLoader({
    isLoading,
    isSuccess: isSuccess && !!payload,
  });

  const report = payload?.reports?.customer_360 || null;
  const sections = report?.sections || [];
  const firstSection = sections[0];
  const kpis = (firstSection?.kpi_cards || firstSection?.kpis || []).slice(0, 4);
  const allCharts = sections.flatMap((s) => s.charts || []);
  const sixCharts = allCharts.slice(0, 6);

  const handleDownload = async () => {
    if (!payload || downloading) return;
    setDownloading(true);
    try {
      await generateCustomer360PDF(payload);
    } finally {
      setDownloading(false);
    }
  };

  if (showLoader) {
    return (
      <ReportGenerationLoader
        reportTitle="Customer 360"
        showLoader={showLoader}
        currentStep={currentStep}
        steps={steps}
        overallProgress={overallProgress}
      />
    );
  }

  if (isError) {
    return (
      <div className="report-360-wrap">
        <p style={{ color: "#dc2626", margin: 0 }}>Failed to load report. Please try again.</p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="report-360-wrap">
      <div className="report-360-top">
        <h1 className="report-360-title">Customer 360</h1>
        <button
          type="button"
          className="report-360-download"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? "Preparing…" : "Download Report"}
        </button>
      </div>

      {kpis.length > 0 && (
        <div className="report-360-kpis">
          {kpis.map((k, i) => (
            <div key={i} className="report-360-kpi-card">
              <div className="report-kpi-label">{k.label}</div>
              <div
                className="report-kpi-value"
                data-status={k.status || undefined}
                data-highlight={k.highlight ? "true" : undefined}
                style={k.badge_color ? { color: k.badge_color } : undefined}
              >
                {k.value}
              </div>
              {k.sub && <div className="report-kpi-sub">{k.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {sixCharts.length > 0 && (
        <div className="report-360-charts">
          {sixCharts.map((ch, i) => (
            <div key={ch.chart_id || i} className="report-360-chart-cell">
              <ChartFromConfig config={ch} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
