import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Divider,
  useTheme,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
} from "@mui/icons-material";

/**
 * A card component for displaying metric values
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - The metric value to display
 * @param {string} props.description - Description of the metric
 * @param {string} props.icon - Icon name to display (AccessTime, AttachMoney, CheckCircle, Pending)
 * @returns {React.ReactElement} The MetricCard component
 */
function MetricCard({ title, value, description, icon }) {
  const theme = useTheme();

  // Get the appropriate icon
  const getIcon = () => {
    switch (icon) {
      case "AccessTime":
        return <AccessTimeIcon fontSize="large" />;
      case "AttachMoney":
        return <AttachMoneyIcon fontSize="large" />;
      case "CheckCircle":
        return <CheckCircleIcon fontSize="large" />;
      case "Pending":
        return <PendingIcon fontSize="large" />;
      default:
        return <AccessTimeIcon fontSize="large" />;
    }
  };

  // Get the appropriate color
  const getColor = () => {
    switch (icon) {
      case "AccessTime":
        return theme.palette.primary.main;
      case "AttachMoney":
        return theme.palette.success.main;
      case "CheckCircle":
        return theme.palette.info.main;
      case "Pending":
        return theme.palette.warning.main;
      default:
        return theme.palette.primary.main;
    }
  };

  return (
    <Card
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
      }}
    >
      <CardHeader
        title={title}
        titleTypographyProps={{
          variant: "h6",
          fontWeight: "medium",
          color: "primary.main",
        }}
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
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: 3,
          "&:last-child": {
            paddingBottom: 3,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: `${getColor()}15`,
            color: getColor(),
            borderRadius: "50%",
            width: 60,
            height: 60,
            marginRight: 2,
          }}
        >
          {getIcon()}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h4"
            component="div"
            sx={{ fontWeight: "bold", color: getColor() }}
          >
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default MetricCard;
