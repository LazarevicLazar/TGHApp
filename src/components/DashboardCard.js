import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  Info as InfoIcon,
  Fullscreen as FullscreenIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";

/**
 * An enhanced reusable card component for the dashboard
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string} [props.subheader] - Optional card subheader
 * @param {boolean} [props.loading] - Whether the card is in loading state
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.infoTooltip] - Optional tooltip text for info icon
 * @param {Function} [props.onExpand] - Optional callback when expand button is clicked
 * @param {React.ReactNode} [props.action] - Optional custom action component
 * @param {Object} [props.sx] - Additional styles for the card
 * @returns {React.ReactElement} The DashboardCard component
 */
function DashboardCard({
  title,
  subheader,
  loading,
  children,
  infoTooltip,
  onExpand,
  action,
  sx = {},
}) {
  const theme = useTheme();

  return (
    <Card
      className="dashboard-card"
      elevation={2}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
        borderRadius: 2,
        overflow: "hidden",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
          transform: "translateY(-2px)",
        },
        ...sx,
      }}
    >
      <CardHeader
        title={title}
        subheader={subheader}
        titleTypographyProps={{
          variant: "h6",
          fontWeight: "medium",
          color: "primary.main",
        }}
        subheaderTypographyProps={{
          variant: "body2",
          color: "text.secondary",
        }}
        action={
          action || infoTooltip || onExpand ? (
            <Box sx={{ display: "flex" }}>
              {infoTooltip && (
                <Tooltip title={infoTooltip} arrow>
                  <IconButton size="small" color="primary">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onExpand && (
                <Tooltip title="Expand" arrow>
                  <IconButton size="small" onClick={onExpand} color="primary">
                    <FullscreenIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {action}
            </Box>
          ) : null
        }
        sx={{
          backgroundColor:
            theme.palette.mode === "light"
              ? "rgba(0, 0, 0, 0.02)"
              : "rgba(255, 255, 255, 0.05)",
          borderBottom: `1px solid ${
            theme.palette.mode === "light"
              ? "rgba(0, 0, 0, 0.06)"
              : "rgba(255, 255, 255, 0.1)"
          }`,
          padding: 2,
        }}
      />
      <Divider />
      <CardContent
        className="dashboard-card-content"
        sx={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: loading ? "center" : "flex-start",
          alignItems: loading ? "center" : "stretch",
          padding: 3,
          "&:last-child": {
            paddingBottom: 3, // Override Material UI's default paddingBottom: 24px
          },
        }}
      >
        {loading ? (
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress size={40} color="primary" thickness={4} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading data...
            </Typography>
          </Box>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export default DashboardCard;
