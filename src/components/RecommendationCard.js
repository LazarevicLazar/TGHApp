import React from "react";
import {
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  Divider,
  useTheme,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
  Build as BuildIcon,
  Assessment as AssessmentIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";

/**
 * An enhanced component for displaying optimization recommendations
 *
 * @param {Object} props - Component props
 * @param {Object} props.recommendation - The recommendation data
 * @param {Function} [props.onImplement] - Callback when implement button is clicked
 * @returns {React.ReactElement} The RecommendationCard component
 */
function RecommendationCard({ recommendation, onImplement }) {
  const theme = useTheme();

  // Get the appropriate icon based on recommendation type
  const getIcon = () => {
    switch (recommendation.type) {
      case "placement":
        return <TrendingUpIcon />;
      case "purchase":
        return <ShoppingCartIcon />;
      case "maintenance":
        return <BuildIcon />;
      case "evaluation":
        return <AssessmentIcon />;
      default:
        return <TrendingUpIcon />;
    }
  };

  // Get the appropriate color based on recommendation type
  const getColor = () => {
    switch (recommendation.type) {
      case "placement":
        return theme.palette.primary.main;
      case "purchase":
        return theme.palette.success.main;
      case "maintenance":
        return theme.palette.warning.main;
      case "evaluation":
        return theme.palette.secondary.main;
      default:
        return theme.palette.primary.main;
    }
  };

  // Get the type label
  const getTypeLabel = () => {
    switch (recommendation.type) {
      case "placement":
        return "Placement";
      case "purchase":
        return "Purchase";
      case "maintenance":
        return "Maintenance";
      case "evaluation":
        return "Evaluation";
      default:
        return "Optimization";
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        overflow: "hidden",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          backgroundColor: `${getColor()}15`, // 15% opacity
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              color: "white",
              backgroundColor: getColor(),
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {getIcon()}
          </Box>
          <Typography variant="h6" color="primary.main" fontWeight="medium">
            {recommendation.title}
          </Typography>
        </Box>
        <Chip
          label={getTypeLabel()}
          size="small"
          sx={{
            backgroundColor: `${getColor()}20`, // 20% opacity
            color: getColor(),
            borderColor: getColor(),
            fontWeight: "medium",
          }}
          variant="outlined"
        />
      </Box>

      <Divider />

      <Box sx={{ p: 2, flex: 1 }}>
        <Typography
          variant="body2"
          paragraph
          sx={{
            color: "text.primary",
            lineHeight: 1.6,
          }}
        >
          {recommendation.description}
        </Typography>
      </Box>

      <Divider />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          backgroundColor:
            theme.palette.mode === "light"
              ? "rgba(0, 0, 0, 0.02)"
              : "rgba(255, 255, 255, 0.05)",
        }}
      >
        <Box sx={{ flex: 1, mr: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: getColor(),
              fontWeight: "medium",
            }}
          >
            Potential Savings: {recommendation.savings}
          </Typography>
        </Box>

        {onImplement && (
          <Button
            size="small"
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={(e) => {
              e.preventDefault(); // Prevent default behavior that causes scrolling
              onImplement(recommendation);
            }}
            sx={{
              backgroundColor: getColor(),
              minWidth: 110, // Fixed minimum width
              "&:hover": {
                backgroundColor: getColor(),
                opacity: 0.9,
              },
            }}
          >
            Implement
          </Button>
        )}
      </Box>
    </Paper>
  );
}

export default RecommendationCard;
