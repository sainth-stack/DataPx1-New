import React from "react";
import { Box, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { keyframes } from "@emotion/react";

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const iconSx = {
  width: 24,
  height: 24,
  flexShrink: 0,
};

/**
 * Single pipeline step: pending (gray circle), active (spinner + label), completed (check + label).
 */
export function LoaderStep({ label, status = "pending" }) {
  const isPending = status === "pending";
  const isActive = status === "active";
  const isCompleted = status === "completed";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        py: 1.25,
        px: 0,
        opacity: isPending ? 0.6 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      <Box sx={iconSx}>
        {isPending && (
          <RadioButtonUncheckedIcon sx={{ color: "action.disabled", ...iconSx }} />
        )}
        {isActive && (
          <HourglassEmptyIcon
            sx={{
              color: "primary.main",
              animation: `${pulse} 1.2s ease-in-out infinite`,
              ...iconSx,
            }}
          />
        )}
        {isCompleted && (
          <CheckCircleOutlineIcon sx={{ color: "success.main", ...iconSx }} />
        )}
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: isActive ? 600 : 500,
          color: isPending ? "text.secondary" : "text.primary",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default LoaderStep;
