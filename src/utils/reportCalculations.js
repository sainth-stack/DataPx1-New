/**
 * Report calculation utilities for Machine 360 Report
 */

const HOURS_PER_MONTH = 720; // 24 * 30

/** Format a value to one decimal for display everywhere in reports and graphs. Leaves non-numeric strings unchanged. */
export function formatOneDecimal(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isNaN(v) ? "" : Number(v).toFixed(1);
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ""));
    if (!Number.isNaN(n)) return n.toFixed(1);
    return v;
  }
  return String(v);
}

function getPerformanceMetrics(data) {
  return data?.performance?.performanceMetrics ?? data?.performanceMetrics ?? [];
}

function getReliability(data) {
  return data?.reliability ?? {};
}

function getQuality(data) {
  return data?.quality ?? {};
}

function getFinancial(data) {
  return data?.financial ?? {};
}

/**
 * Compute all KPIs from report data
 */
export function computeAllKPIs(data) {
  const metrics = getPerformanceMetrics(data);
  const rel = getReliability(data);
  const quality = getQuality(data);
  const financial = getFinancial(data);

  const downtime = rel.downtime ?? {};
  const totalDowntime = (downtime.total ?? ((downtime.planned ?? 0) + (downtime.unplanned ?? 0))) || 12;
  const mtbf = rel.mtbf ?? 250;
  const mttr = rel.mttr ?? 1.5;

  // Availability: (total hours - downtime) / total hours * 100
  const availability = Math.min(100, Math.max(0, ((HOURS_PER_MONTH - totalDowntime) / HOURS_PER_MONTH) * 100));

  // Performance: from Utilization Rate or average of metrics vs benchmark
  const utilMetric = metrics.find((m) => m.metric?.toLowerCase().includes("utilization"));
  const performance = utilMetric ? utilMetric.value : (() => {
    if (metrics.length === 0) return 85;
    const scores = metrics.map((m) => {
      const isLowerBetter = ["Cycle Time", "Energy Consumption"].some((k) => m.metric?.includes(k));
      if (isLowerBetter) return m.value <= m.benchmark ? 100 : Math.max(0, 100 - ((m.value - m.benchmark) / m.benchmark) * 50);
      return m.value >= m.benchmark ? 100 : Math.max(0, (m.value / m.benchmark) * 100);
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  })();

  // Quality: 100 - defectRate - reworkRate
  const defectRate = quality.defectRate ?? 1.2;
  const reworkRate = quality.reworkRate ?? 0.8;
  const qualityScore = Math.max(0, Math.min(100, 100 - defectRate - reworkRate));

  // OEE = Availability * Performance * Quality / 10000
  const oee = Math.round((availability * performance * qualityScore) / 10000);

  // Energy efficiency from Energy Consumption metric
  const energyMetric = metrics.find((m) => m.metric?.toLowerCase().includes("energy"));
  const energyEfficiency = energyMetric
    ? Math.min(100, Math.round((energyMetric.benchmark / energyMetric.value) * 100))
    : 80;

  // Health score: weighted average
  const healthScore = Math.round(
    (availability * 0.2 + performance * 0.25 + qualityScore * 0.2 + (mtbf > 200 ? 90 : mtbf > 100 ? 75 : 60) * 0.15 + (mttr < 2 ? 90 : mttr < 4 ? 70 : 50) * 0.2)
  );

  const costPerHour = financial.costPerDowntimeHour ?? 2500;
  const totalDowntimeLoss = Math.round(totalDowntime * costPerHour);

  return {
    healthScore: Math.min(100, Math.max(0, healthScore)),
    availability: Math.round(availability * 10) / 10,
    performance,
    quality: Math.round(qualityScore),
    oee,
    mtbf,
    mttr,
    downtime30d: totalDowntime,
    energyEfficiency,
    totalDowntimeLoss,
    riskLevel: getRiskLevel(healthScore).level,
  };
}

/**
 * Get risk level from health score
 */
export function getRiskLevel(healthScore) {
  if (healthScore >= 80) return { level: "Low" };
  if (healthScore >= 60) return { level: "Medium" };
  return { level: "High" };
}

/**
 * Generate recommendations based on data and KPIs
 */
export function getRecommendations(data, kpis) {
  const recommendations = [];
  const metrics = getPerformanceMetrics(data);
  const rel = getReliability(data);
  const predictive = data?.predictive ?? {};

  if (kpis?.healthScore < 70) {
    recommendations.push("Schedule a comprehensive machine health review to address below-target metrics.");
  }

  const energyMetric = metrics.find((m) => m.metric?.toLowerCase().includes("energy"));
  if (energyMetric && energyMetric.value > energyMetric.benchmark) {
    recommendations.push("Optimize energy consumption; current usage exceeds benchmark.");
  }

  if (kpis?.mttr > 3) {
    recommendations.push("Improve maintenance response time to reduce MTTR and minimize production impact.");
  }

  if (kpis?.downtime30d > 15) {
    recommendations.push("Investigate root causes of unplanned downtime and implement preventive measures.");
  }

  const alerts = predictive.alerts ?? [];
  if (alerts.length > 0) {
    recommendations.push(...alerts.slice(0, 2));
  }

  if (rel.recentIssues?.length > 0) {
    recommendations.push("Address recent issues and verify corrective actions are in place.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Continue monitoring key metrics and maintain current maintenance schedule.");
  }

  return recommendations;
}
