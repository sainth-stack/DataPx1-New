import React, { useEffect, useState, useRef } from "react";
import { Box, LinearProgress } from "@mui/material";

const ANIMATION_MS = 400;

/**
 * Animated progress bar that smoothly interpolates to the target value.
 * Used for overall pipeline progress in ReportGenerationLoader.
 */
export function LoaderProgressBar({ value, sx = {} }) {
  const [displayValue, setDisplayValue] = useState(0);
  const displayRef = useRef(0);
  displayRef.current = displayValue;

  useEffect(() => {
    const target = Math.min(100, Math.max(0, Number(value) || 0));
    const start = displayRef.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    let rafId;

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / ANIMATION_MS);
      const eased = 1 - (1 - t) * (1 - t);
      const next = start + diff * eased;
      displayRef.current = next;
      setDisplayValue(next);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <Box sx={{ width: "100%", ...sx }}>
      <LinearProgress
        variant="determinate"
        value={displayValue}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          "& .MuiLinearProgress-bar": {
            borderRadius: 4,
            backgroundColor: "#2563eb",
            transition: "none",
          },
        }}
      />
    </Box>
  );
}

export default LoaderProgressBar;
