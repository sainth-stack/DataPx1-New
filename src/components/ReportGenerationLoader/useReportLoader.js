import { useState, useEffect } from "react";

const STAGES = [
  "Connecting to data sources",
  "Processing raw data",
  "Generating KPIs",
  "Building performance graphs",
  "Generating insights",
  "Creating summary",
  "Finalizing report",
];

const SIMULATED_STEP_MS = 14000;
const FAST_FORWARD_STEP_MS = 350;

/**
 * Controls staged loader progress.
 * - While isLoading: advance one step every SIMULATED_STEP_MS.
 * - When isSuccess (API done): fast-forward through remaining steps, then set allStepsComplete.
 */
export function useReportLoader({ isLoading, isSuccess }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [allStepsComplete, setAllStepsComplete] = useState(false);
  const totalSteps = STAGES.length;

  const overallProgress = allStepsComplete
    ? 100
    : ((currentStep + (currentStep < totalSteps ? 0.5 : 1)) / totalSteps) * 100;

  // Simulated progress while API is loading
  useEffect(() => {
    if (!isLoading || isSuccess) return;
    const id = setInterval(() => {
      setCurrentStep((s) => (s >= totalSteps - 1 ? totalSteps - 1 : s + 1));
    }, SIMULATED_STEP_MS);
    return () => clearInterval(id);
  }, [isLoading, isSuccess, totalSteps]);

  // When API completes: fast-forward remaining steps then mark done
  useEffect(() => {
    if (!isSuccess) return;
    if (currentStep >= totalSteps - 1) {
      const t = setTimeout(() => setAllStepsComplete(true), FAST_FORWARD_STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setCurrentStep((s) => Math.min(totalSteps - 1, s + 1));
    }, FAST_FORWARD_STEP_MS);
    return () => clearTimeout(t);
  }, [isSuccess, currentStep, totalSteps]);

  const showLoader = isLoading || (isSuccess && !allStepsComplete);

  return {
    showLoader,
    currentStep,
    steps: STAGES,
    overallProgress,
    allStepsComplete,
  };
}

export { STAGES };
