import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { LoaderProgressBar } from "./LoaderProgressBar";
import { LoaderStep } from "./LoaderStep";
import { SkeletonKpiCards, SkeletonCharts } from "./SkeletonPlaceholders";
import { useReportLoader } from "./useReportLoader";

/**
 * Reusable staged report generation loader for Customer 360 / Machine 360.
 * Use with useReportLoader in the parent so showLoader stays true until
 * the pipeline animation completes (including fast-forward when API finishes).
 */
export function ReportGenerationLoader({
  reportTitle = "Report",
  showLoader,
  currentStep = 0,
  steps = [],
  overallProgress = 0,
  isLoading,
  isSuccess,
}) {
  const hookState = useReportLoader(
    showLoader === undefined ? { isLoading: isLoading ?? false, isSuccess: isSuccess ?? false } : { isLoading: false, isSuccess: false }
  );

  const useControlled = showLoader !== undefined;
  const visible = useControlled ? showLoader : hookState.showLoader;
  const step = useControlled ? currentStep : hookState.currentStep;
  const stepLabels = useControlled ? steps : hookState.steps;
  const progress = useControlled ? overallProgress : hookState.overallProgress;

  if (!visible) return null;

  return (
    <Box
      sx={{
        bgcolor: "#f1f5f9",
        minHeight: "100%",
        p: 3,
        color: "text.primary",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b", mb: 2 }}>
        {reportTitle}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 2 }}>
          Generating your report…
        </Typography>
        <LoaderProgressBar value={progress} sx={{ mb: 2.5 }} />
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {stepLabels.map((label, index) => (
            <LoaderStep
              key={label}
              label={label}
              status={
                index < step ? "completed" : index === step ? "active" : "pending"
              }
            />
          ))}
        </Box>
      </Paper>

      <Box sx={{ mt: 2 }}>
        <SkeletonKpiCards />
        <SkeletonCharts />
      </Box>
    </Box>
  );
}

export { LoaderProgressBar, LoaderStep, useReportLoader };
export { SkeletonKpiCards, SkeletonCharts } from "./SkeletonPlaceholders";
