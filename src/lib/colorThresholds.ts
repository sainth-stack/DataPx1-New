/**
 * Global color logic and thresholds for consistent UX across the application
 * These definitions ensure every colored indicator has clear meaning
 */

export interface ThresholdDefinition {
  color: string;
  label: string;
  range: string;
  meaning: string;
}

/**
 * Standard color thresholds for percentage-based metrics (0-100%)
 * Green = Normal/Good (0-30% for risk, 70-100% for performance)
 * Amber = Warning/Moderate (30-60% for risk, 40-70% for performance)
 * Red = Critical/Poor (>60% for risk, <40% for performance)
 */
export const riskThresholds: ThresholdDefinition[] = [
  {
    color: "hsl(var(--success))",
    label: "Normal (Low Risk)",
    range: "0-30%",
    meaning: "Machine operating within normal parameters. No immediate action required.",
  },
  {
    color: "hsl(var(--warning))",
    label: "Warning (Medium Risk)",
    range: "30-60%",
    meaning: "Elevated risk detected. Monitor closely and schedule preventive maintenance.",
  },
  {
    color: "hsl(var(--destructive))",
    label: "Critical (High Risk)",
    range: ">60%",
    meaning: "High probability of failure. Immediate maintenance required to prevent downtime.",
  },
];

export const performanceThresholds: ThresholdDefinition[] = [
  {
    color: "hsl(var(--success))",
    label: "Excellent",
    range: "≥80%",
    meaning: "Operating at or above target performance levels.",
  },
  {
    color: "hsl(var(--warning))",
    label: "Moderate",
    range: "60-79%",
    meaning: "Below target. Investigation recommended to identify bottlenecks.",
  },
  {
    color: "hsl(var(--destructive))",
    label: "Poor",
    range: "<60%",
    meaning: "Significantly below target. Immediate intervention required.",
  },
];

export const correlationThresholds: ThresholdDefinition[] = [
  {
    color: "hsl(var(--success))",
    label: "Strong Correlation",
    range: ">0.5 or <-0.5",
    meaning: "Feature has strong predictive power for the target variable.",
  },
  {
    color: "hsl(var(--warning))",
    label: "Moderate Correlation",
    range: "0.3-0.5 or -0.3 to -0.5",
    meaning: "Feature has moderate influence on the target variable.",
  },
  {
    color: "hsl(var(--accent))",
    label: "Weak Correlation",
    range: "-0.3 to 0.3",
    meaning: "Feature has minimal linear impact on predictions; may still help via interactions.",
  },
];

/**
 * Get color based on risk score (0-100)
 */
export function getRiskColor(score: number): string {
  if (score >= 60) return "hsl(var(--destructive))";
  if (score >= 30) return "hsl(var(--warning))";
  return "hsl(var(--success))";
}

/**
 * Get color based on performance metric (0-100)
 */
export function getPerformanceColor(value: number): string {
  if (value >= 80) return "hsl(var(--success))";
  if (value >= 60) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

/**
 * Get color based on correlation strength
 * For feature analysis: strong correlation (regardless of direction) is GOOD
 */
export function getCorrelationColor(correlation: number): string {
  const absCorr = Math.abs(correlation);
  if (absCorr > 0.5) return "hsl(var(--success))";
  if (absCorr > 0.3) return "hsl(var(--warning))";
  return "hsl(var(--accent))";
}

/** Tailwind classes for correlation badges (avoid invalid hsl(var)+hex concatenation in inline styles). */
export function getCorrelationBadgeClasses(correlation: number): string {
  const absCorr = Math.abs(correlation);
  if (absCorr > 0.5) {
    return "border-emerald-600/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100";
  }
  if (absCorr > 0.3) {
    return "border-amber-600/40 bg-amber-500/15 text-amber-950 dark:text-amber-100";
  }
  return "border-slate-500/50 bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-500/60";
}

/**
 * Get correlation strength label
 */
export function getCorrelationStrength(correlation: number): string {
  const absCorr = Math.abs(correlation);
  if (absCorr > 0.5) return "Strong";
  if (absCorr > 0.3) return "Moderate";
  return "Weak";
}

/**
 * Get risk level label
 */
export function getRiskLevel(score: number): string {
  if (score >= 60) return "Critical";
  if (score >= 30) return "Warning";
  return "Normal";
}

/**
 * Get detailed risk explanation
 */
export function getRiskExplanation(score: number): string {
  if (score >= 60) {
    return `Risk score of ${score}% indicates high probability of failure. This machine requires immediate maintenance attention to prevent unplanned downtime.`;
  }
  if (score >= 30) {
    return `Risk score of ${score}% indicates elevated risk levels. Schedule preventive maintenance and monitor closely for deteriorating conditions.`;
  }
  return `Risk score of ${score}% indicates normal operating conditions. Continue regular monitoring and scheduled maintenance.`;
}

/**
 * Calculate remaining useful time based on risk score and maintenance history
 */
export interface RemainingUsefulTime {
  hours: number;
  days: number;
  urgency: "safe" | "monitor" | "urgent";
  message: string;
  recommendations: {
    immediate: string;
    fiveDays: string;
    tenDays: string;
    thirtyDays: string;
  };
}

export function calculateRemainingUsefulTime(
  riskScore: number,
  uptimeHours: number,
  lastMaintenance: string
): RemainingUsefulTime {
  // Simplified algorithm: higher risk = less remaining time
  // In production, this would use ML models and historical failure data
  let remainingHours: number;
  let urgency: "safe" | "monitor" | "urgent";
  let message: string;

  if (riskScore >= 70) {
    remainingHours = Math.max(12, 72 - riskScore);
    urgency = "urgent";
    message = `Critical: Estimated ${Math.floor(remainingHours / 24)} days before maintenance required`;
  } else if (riskScore >= 50) {
    remainingHours = Math.max(72, 240 - riskScore * 2);
    urgency = "monitor";
    message = `Monitor closely: Estimated ${Math.floor(remainingHours / 24)} days before maintenance required`;
  } else {
    remainingHours = Math.max(240, 720 - riskScore * 8);
    urgency = "safe";
    message = `Safe operation: Estimated ${Math.floor(remainingHours / 24)} days before next scheduled maintenance`;
  }

  const days = Math.floor(remainingHours / 24);

  const recommendations = {
    immediate:
      riskScore >= 70
        ? "Immediate inspection required. Reduce load and prepare for maintenance window."
        : riskScore >= 50
        ? "Schedule maintenance window within next 5 days."
        : "Continue normal operations with standard monitoring.",
    fiveDays:
      riskScore >= 60
        ? "Complete critical maintenance and replace high-wear components."
        : riskScore >= 40
        ? "Perform detailed inspection and address any detected anomalies."
        : "No immediate action required. Continue monitoring.",
    tenDays:
      riskScore >= 50
        ? "Ensure all maintenance tasks are completed and system is validated."
        : "Review maintenance history and update predictive model.",
    thirtyDays: "Schedule next preventive maintenance window and order spare parts inventory.",
  };

  return {
    hours: remainingHours,
    days,
    urgency,
    message,
    recommendations,
  };
}
