import React from "react";
import { Box, Skeleton } from "@mui/material";

export function SkeletonKpiCards() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 2.5,
        mb: 3.5,
        "@media (max-width: 900px)": { gridTemplateColumns: "repeat(2, 1fr)" },
      }}
    >
      {[1, 2, 3, 4].map((i) => (
        <Box
          key={i}
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <Skeleton variant="text" width="60%" height={16} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="45%" height={32} />
          <Skeleton variant="text" width="30%" height={14} sx={{ mt: 0.5 }} />
        </Box>
      ))}
    </Box>
  );
}

export function SkeletonCharts() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 2.5,
        "@media (max-width: 900px)": { gridTemplateColumns: "1fr" },
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Box
          key={i}
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            minHeight: 320,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <Skeleton variant="text" width="70%" height={20} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
        </Box>
      ))}
    </Box>
  );
}
