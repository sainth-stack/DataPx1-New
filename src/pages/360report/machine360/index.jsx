import React, { useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { ChartFromConfig } from "../shared/DynamicReportRenderer";
import { generateMachine360PDF } from "../shared/downloadReport";
import { useMachine360Report } from "../shared/reportQueries";
import { ReportGenerationLoader, useReportLoader } from "../../../components/ReportGenerationLoader";
import "../reportPage.css";

function hasIpr(ch) {
  return ch?.iprInsights && (
    (ch.iprInsights.Inferences?.length) ||
    (ch.iprInsights.Issues?.length) ||
    (ch.iprInsights.Recommendations?.length)
  );
}

export default function Machine360() {
  const [downloading, setDownloading] = useState(false);
  const [iprModalChart, setIprModalChart] = useState(null);

  const { data: payload, isLoading, isError, isSuccess } = useMachine360Report();
  const { showLoader, currentStep, steps, overallProgress } = useReportLoader({
    isLoading,
    isSuccess: isSuccess && !!payload,
  });

  const report = payload?.reports?.fleet_manager_360 || null;
  const sections = report?.sections || [];
  const firstSection = sections[0];
  const kpis = firstSection?.kpi_cards?.slice(0, 4) || [];
  const overviewSection = sections.find(
    (s, i) => i > 0 && (s.description || (s.title && /overview/i.test(s.title)))
  );
  const allCharts = sections.flatMap((s) => s.charts || []);
  const sixCharts = allCharts.slice(0, 6);

  const handleDownload = async () => {
    if (downloading || !payload) return;
    setDownloading(true);
    try {
      await generateMachine360PDF(payload);
    } finally {
      setDownloading(false);
    }
  };

  if (showLoader) {
    return (
      <ReportGenerationLoader
        reportTitle="Machine 360"
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
        <h1 className="report-360-title">Machine 360</h1>
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

      {overviewSection && (overviewSection.description || overviewSection.title) && (
        <section className="report-360-overview">
          <h3 className="report-360-overview-subtitle">Machine Overview</h3>
          {overviewSection.description && (
            <p className="report-360-overview-desc">{overviewSection.description}</p>
          )}
        </section>
      )}

      {sixCharts.length > 0 && (
        <div className="report-360-charts">
          {sixCharts.map((ch, i) => (
            <div key={ch.chart_id || i} className="report-360-chart-cell">
              {hasIpr(ch) && (
                <button
                  type="button"
                  className="report-360-chart-ipr-btn"
                  onClick={() => setIprModalChart(ch)}
                  aria-label="View insights"
                >
                  <InfoOutlinedIcon fontSize="small" />
                </button>
              )}
              <ChartFromConfig config={ch} />
            </div>
          ))}
        </div>
      )}

      {iprModalChart && (
        <div
          className="report-360-ipr-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-360-ipr-modal-title"
          onClick={() => setIprModalChart(null)}
        >
          <div className="report-360-ipr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-360-ipr-modal-head">
              <h2 id="report-360-ipr-modal-title" className="report-360-ipr-modal-title">
                Insights, Issues &amp; Recommendations
              </h2>
              <button
                type="button"
                className="report-360-ipr-modal-close"
                onClick={() => setIprModalChart(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="report-360-ipr-modal-body">
              <h3 className="report-360-ipr-popup-chart-title">{iprModalChart.title}</h3>
              <div className="report-360-ipr-rows">
                {(iprModalChart.iprInsights.Inferences || []).length > 0 && (
                  <div className="report-360-ipr-row">
                    <span className="report-360-ipr-label">Inferences</span>
                    <ul className="report-360-ipr-ul">
                      {(iprModalChart.iprInsights.Inferences || []).map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(iprModalChart.iprInsights.Issues || []).length > 0 && (
                  <div className="report-360-ipr-row">
                    <span className="report-360-ipr-label report-360-ipr-label-issues">Issues</span>
                    <ul className="report-360-ipr-ul">
                      {(iprModalChart.iprInsights.Issues || []).map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(iprModalChart.iprInsights.Recommendations || []).length > 0 && (
                  <div className="report-360-ipr-row">
                    <span className="report-360-ipr-label report-360-ipr-label-rec">Recommendations</span>
                    <ul className="report-360-ipr-ul">
                      {(iprModalChart.iprInsights.Recommendations || []).map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
