import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Chip,
  LinearProgress,
  Alert,
} from "@mui/material";
import { useDataContext } from "../context/DataContext";
import MetricCard from "../components/MetricCard";

function OptimizationAnalysis() {
  const {
    devices,
    locations,
    movements,
    recommendations,
    optimizationHistory,
    totalSavings,
    setOptimizationHistory,
    setTotalSavings,
  } = useDataContext();

  // Initialize with default values if not available in context
  useEffect(() => {
    if (!optimizationHistory || optimizationHistory.length === 0) {
      // Create an empty array for optimization history if none exists
      setOptimizationHistory([]);
    }

    if (!totalSavings) {
      // Initialize total savings if not available
      setTotalSavings({ hours: 0, money: 0 });
    }
  }, [
    optimizationHistory,
    totalSavings,
    setOptimizationHistory,
    setTotalSavings,
  ]);

  const [savingsSummary, setSavingsSummary] = useState({
    totalHoursSaved: totalSavings?.hours || 0,
    totalMoneySaved: totalSavings?.money || 0,
    implementedOptimizations: optimizationHistory?.length || 0,
    pendingOptimizations: recommendations?.length || 0,
  });
  const [historyData, setHistoryData] = useState([]);
  const [deviceEfficiency, setDeviceEfficiency] = useState([]);
  const [maintenanceProgress, setMaintenanceProgress] = useState([]);
  const [expandedDeviceType, setExpandedDeviceType] = useState(null);
  const [individualDeviceProgress, setIndividualDeviceProgress] = useState({});

  // Define maintenance thresholds (same as in electron/main.js)
  const maintenanceThresholds = {
    Ventilator: 500, // Hours of usage before maintenance is required
    Ultrasound: 300,
    Defibrillator: 200,
    "IV-Pump": 1000,
    Monitor: 800,
    default: 500,
  };

  // No initialization with sample data - we'll only use real data from the database

  // Update savings summary when data changes
  useEffect(() => {
    console.log("Optimization data:", {
      totalSavings,
      optimizationHistory,
      recommendations,
    });

    // Update the savings summary from context data
    setSavingsSummary({
      totalHoursSaved: totalSavings?.hours || 0,
      totalMoneySaved: totalSavings?.money || 0,
      implementedOptimizations: optimizationHistory?.length || 0,
      pendingOptimizations: recommendations?.length || 0,
    });

    // Set history data from context
    setHistoryData(optimizationHistory || []);

    // Reset individual device progress and device type usage hours
    // This prevents accumulation of hours across multiple renders
    setIndividualDeviceProgress({});

    // Create some initial data if none exists
    if (
      (!optimizationHistory || optimizationHistory.length === 0) &&
      (!totalSavings || (totalSavings.hours === 0 && totalSavings.money === 0))
    ) {
      // Initialize with some default values for display purposes
      setSavingsSummary({
        totalHoursSaved: 0,
        totalMoneySaved: 0,
        implementedOptimizations: 0,
        pendingOptimizations: recommendations?.length || 0,
      });
    }

    // Calculate device efficiency and maintenance progress
    const efficiency = [];
    const maintenance = [];

    // Track total usage hours by device and device type
    const deviceUsageHours = {};
    const deviceTypeUsageHours = {};

    if (devices && devices.length > 0) {
      // Group devices by type
      const deviceTypes = {};
      devices.forEach((device) => {
        const type = device.deviceId.split("-")[0];
        if (!deviceTypes[type]) {
          deviceTypes[type] = {
            type,
            count: 0,
            utilization: 0,
            travelDistance: 0,
            maintenanceStatus: "Good",
          };
        }
        deviceTypes[type].count++;

        // Initialize usage hours tracking
        deviceUsageHours[device.deviceId] = 0;
        if (!deviceTypeUsageHours[type]) {
          deviceTypeUsageHours[type] = {
            totalHours: 0,
            deviceCount: 0,
            threshold:
              maintenanceThresholds[type] || maintenanceThresholds.default,
          };
        }
        deviceTypeUsageHours[type].deviceCount++;

        // Check maintenance status based on lastMaintenance field
        if (device.lastMaintenance) {
          const lastMaintDate = new Date(device.lastMaintenance);
          const now = new Date();
          const daysSinceLastMaint = Math.floor(
            (now - lastMaintDate) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastMaint > 90) {
            deviceTypes[type].maintenanceStatus = "Needs Maintenance";
          } else if (daysSinceLastMaint > 60) {
            deviceTypes[type].maintenanceStatus = "Upcoming Maintenance";
          }
        }
      });

      // Calculate utilization and travel distance
      if (movements && movements.length > 0) {
        // Track by individual device first
        const deviceUtilizationByDevice = {};
        const deviceTravel = {};

        movements.forEach((movement) => {
          if (!movement.deviceId) return;

          const deviceId = movement.deviceId;
          const type = deviceId.split("-")[0];

          // Initialize device tracking if not exists
          if (!deviceUtilizationByDevice[deviceId]) {
            deviceUtilizationByDevice[deviceId] = {
              type,
              inUse: 0,
              total: 0,
              utilizationPct: 0,
            };
          }

          // Track utilization for this specific device
          if (movement.timeIn && movement.timeOut) {
            const duration =
              (new Date(movement.timeOut) - new Date(movement.timeIn)) /
              (1000 * 60 * 60);
            deviceUtilizationByDevice[deviceId].total += duration;

            if (
              movement.status &&
              movement.status.toLowerCase().includes("in use")
            ) {
              deviceUtilizationByDevice[deviceId].inUse += duration;

              // Track usage hours for maintenance calculation
              // Using a realistic scaling factor
              const scalingFactor = 1.0; // 100% of the actual duration - no scaling
              deviceUsageHours[deviceId] =
                (deviceUsageHours[deviceId] || 0) + duration * scalingFactor;
              if (deviceTypeUsageHours[type]) {
                deviceTypeUsageHours[type].totalHours +=
                  duration * scalingFactor;
              }

              // Track individual device progress
              if (!individualDeviceProgress[type]) {
                individualDeviceProgress[type] = {};
              }
              if (!individualDeviceProgress[type][deviceId]) {
                individualDeviceProgress[type][deviceId] = {
                  deviceId,
                  type,
                  usageHours: 0,
                  threshold:
                    maintenanceThresholds[type] ||
                    maintenanceThresholds.default,
                  progressPercentage: 0,
                  status: "Good",
                };
              }

              // Use the same scaling factor defined above
              individualDeviceProgress[type][deviceId].usageHours +=
                duration * scalingFactor;
            }
          }

          // Track travel (simplified - just count movements)
          if (!deviceTravel[type]) {
            deviceTravel[type] = 0;
          }
          deviceTravel[type]++;
        });

        // Calculate utilization percentage for each individual device
        Object.values(deviceUtilizationByDevice).forEach((device) => {
          if (device.total > 0) {
            device.utilizationPct = (device.inUse / device.total) * 100;
          }
        });

        // Group by device type and calculate average utilization
        const deviceTypeUtilization = {};
        Object.values(deviceUtilizationByDevice).forEach((device) => {
          const type = device.type;

          if (!deviceTypeUtilization[type]) {
            deviceTypeUtilization[type] = {
              deviceCount: 0,
              totalUtilizationPct: 0,
            };
          }

          deviceTypeUtilization[type].deviceCount++;
          deviceTypeUtilization[type].totalUtilizationPct +=
            device.utilizationPct;
        });

        // Update device types with average utilization and travel data
        Object.keys(deviceTypes).forEach((type) => {
          if (deviceTypeUtilization[type]) {
            const { deviceCount, totalUtilizationPct } =
              deviceTypeUtilization[type];
            // Calculate average utilization across all devices of this type
            deviceTypes[type].utilization =
              deviceCount > 0 ? totalUtilizationPct / deviceCount : 0;
          }

          if (deviceTravel[type]) {
            deviceTypes[type].travelDistance = deviceTravel[type];
          }
        });
      }

      // Process individual device progress data
      Object.entries(individualDeviceProgress).forEach(([type, devices]) => {
        Object.values(devices).forEach((device) => {
          // Calculate progress percentage
          device.progressPercentage = Math.min(
            100,
            (device.usageHours / device.threshold) * 100
          );

          // Update status based on progress
          if (device.progressPercentage >= 100) {
            device.status = "Maintenance Required";
          } else if (device.progressPercentage >= 80) {
            device.status = "Maintenance Soon";
          } else {
            device.status = "Good";
          }

          // Round usage hours to 1 decimal
          device.usageHours = Math.round(device.usageHours * 10) / 10;
        });
      });

      // Create maintenance progress data for device types
      Object.entries(deviceTypeUsageHours).forEach(([type, data]) => {
        const { totalHours, deviceCount, threshold } = data;

        // Calculate average hours per device
        const avgHoursPerDevice =
          deviceCount > 0 ? totalHours / deviceCount : 0;

        // Calculate progress percentage (how close to maintenance threshold)
        const progressPercentage = Math.min(
          100,
          (avgHoursPerDevice / threshold) * 100
        );

        // Determine status based on progress
        let status = "Good";
        if (progressPercentage >= 100) {
          status = "Maintenance Required";
        } else if (progressPercentage >= 80) {
          status = "Maintenance Soon";
        }

        // Get individual devices of this type
        const devices = individualDeviceProgress[type]
          ? Object.values(individualDeviceProgress[type])
          : [];

        maintenance.push({
          type,
          deviceCount,
          totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
          avgHoursPerDevice: Math.round(avgHoursPerDevice * 10) / 10, // Round to 1 decimal
          threshold,
          progressPercentage,
          status,
          devices, // Add individual devices to the type data
        });
      });

      // Sort by progress percentage (highest first)
      maintenance.sort((a, b) => b.progressPercentage - a.progressPercentage);

      // Convert to array for display
      Object.values(deviceTypes).forEach((deviceType) => {
        efficiency.push(deviceType);
      });

      setDeviceEfficiency(efficiency);
      setMaintenanceProgress(maintenance);
    }
  }, [
    devices,
    movements,
    recommendations,
    optimizationHistory,
    totalSavings,
    setIndividualDeviceProgress,
  ]);

  return (
    <Box className="content-container">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info">
            This dashboard shows the impact of implemented optimizations and
            potential future savings.
          </Alert>
        </Grid>

        {/* Savings Summary Cards */}
        <Grid item xs={12} md={6}>
          <MetricCard
            title="Total Staff Hours Saved"
            value={`${savingsSummary.totalHoursSaved.toFixed(1)} hours`}
            description="Cumulative time saved through optimizations"
            icon="AccessTime"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MetricCard
            title="Total Cost Savings"
            value={`$${savingsSummary.totalMoneySaved.toLocaleString()}`}
            description="Estimated financial impact of optimizations"
            icon="AttachMoney"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MetricCard
            title="Implemented Optimizations"
            value={savingsSummary.implementedOptimizations}
            description="Number of optimizations applied"
            icon="CheckCircle"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MetricCard
            title="Pending Optimizations"
            value={savingsSummary.pendingOptimizations}
            description="Recommendations waiting to be implemented"
            icon="Pending"
          />
        </Grid>

        {/* Maintenance Progress Card */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Equipment Maintenance Progress" />
            <CardContent>
              {maintenanceProgress.length > 0 ? (
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Shows progress towards maintenance threshold based on usage
                    hours
                  </Typography>
                  <Grid container spacing={2}>
                    {maintenanceProgress.map((device) => (
                      <Grid item xs={12} md={6} key={device.type}>
                        <Box
                          sx={{
                            mb: 2,
                            p: 2,
                            border: "1px solid #eee",
                            borderRadius: 2,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            "&:hover": {
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                              borderColor: "#ccc",
                            },
                          }}
                          onClick={() =>
                            setExpandedDeviceType(
                              expandedDeviceType === device.type
                                ? null
                                : device.type
                            )
                          }
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <Typography variant="subtitle1" fontWeight="medium">
                              {device.type} ({device.deviceCount} devices)
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Chip
                                label={device.status}
                                size="small"
                                color={
                                  device.status === "Good"
                                    ? "success"
                                    : device.status === "Maintenance Soon"
                                    ? "warning"
                                    : "error"
                                }
                                sx={{ mr: 1 }}
                              />
                              {expandedDeviceType === device.type ? (
                                <Box
                                  sx={{
                                    color: "text.secondary",
                                    fontSize: "1.2rem",
                                  }}
                                >
                                  ▼
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    color: "text.secondary",
                                    fontSize: "1.2rem",
                                  }}
                                >
                                  ▶
                                </Box>
                              )}
                            </Box>
                          </Box>
                          {/* Device bubbles */}
                          <Box sx={{ mb: 2, mt: 1 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1 }}
                            >
                              Device status overview:
                            </Typography>
                            <Box
                              sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                            >
                              {device.devices &&
                                device.devices.map(
                                  (individualDevice, index) => (
                                    <Box
                                      key={individualDevice.deviceId}
                                      sx={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: "50%",
                                        backgroundColor:
                                          individualDevice.progressPercentage >=
                                          100
                                            ? "#f44336"
                                            : individualDevice.progressPercentage >=
                                              80
                                            ? "#ff9800"
                                            : "#4caf50",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        fontSize: "10px",
                                        color: "white",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        transition: "transform 0.2s",
                                        "&:hover": {
                                          transform: "scale(1.2)",
                                        },
                                        position: "relative",
                                      }}
                                      title={`${
                                        individualDevice.deviceId
                                      }: ${Math.round(
                                        individualDevice.progressPercentage
                                      )}%`}
                                    >
                                      {index + 1}
                                    </Box>
                                  )
                                )}
                            </Box>
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              {`Avg: ${device.avgHoursPerDevice} hours / ${device.threshold} hour threshold`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {`${Math.round(
                                device.progressPercentage
                              )}% of threshold`}
                            </Typography>
                          </Box>

                          {/* Individual device progress bars */}
                          {expandedDeviceType === device.type &&
                            device.devices &&
                            device.devices.length > 0 && (
                              <Box
                                sx={{
                                  mt: 2,
                                  pt: 2,
                                  borderTop: "1px dashed #eee",
                                }}
                              >
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                  Individual Device Status
                                </Typography>
                                {device.devices.map((individualDevice) => (
                                  <Box
                                    key={individualDevice.deviceId}
                                    sx={{ mb: 2 }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        mb: 0.5,
                                      }}
                                    >
                                      <Typography variant="body2">
                                        {individualDevice.deviceId}
                                      </Typography>
                                      <Chip
                                        label={individualDevice.status}
                                        size="small"
                                        color={
                                          individualDevice.status === "Good"
                                            ? "success"
                                            : individualDevice.status ===
                                              "Maintenance Soon"
                                            ? "warning"
                                            : "error"
                                        }
                                        sx={{ height: 20, fontSize: "0.7rem" }}
                                      />
                                    </Box>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Box sx={{ width: "100%", mr: 1 }}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={
                                            individualDevice.progressPercentage
                                          }
                                          sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: "#e0e0e0",
                                            "& .MuiLinearProgress-bar": {
                                              backgroundColor:
                                                individualDevice.progressPercentage >=
                                                100
                                                  ? "#f44336"
                                                  : individualDevice.progressPercentage >=
                                                    80
                                                  ? "#ff9800"
                                                  : "#4caf50",
                                              borderRadius: 3,
                                            },
                                          }}
                                        />
                                      </Box>
                                      <Box sx={{ minWidth: 35 }}>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {`${Math.round(
                                            individualDevice.progressPercentage
                                          )}%`}
                                        </Typography>
                                      </Box>
                                    </Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {`${individualDevice.usageHours} hours / ${individualDevice.threshold} hour threshold`}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : (
                <Typography variant="body1" sx={{ textAlign: "center", py: 4 }}>
                  No maintenance data available. Import movement data to see
                  maintenance progress.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Device Efficiency Table */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Equipment Efficiency Analysis" />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Device Type</TableCell>
                      <TableCell>Count</TableCell>
                      <TableCell>Utilization</TableCell>
                      <TableCell>Travel Score</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deviceEfficiency.map((device) => (
                      <TableRow key={device.type}>
                        <TableCell>{device.type}</TableCell>
                        <TableCell>{device.count}</TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Box sx={{ width: "100%", mr: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={device.utilization}
                                sx={{
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: "#e0e0e0",
                                  "& .MuiLinearProgress-bar": {
                                    backgroundColor:
                                      device.utilization > 80
                                        ? "#f44336"
                                        : device.utilization > 60
                                        ? "#ff9800"
                                        : "#4caf50",
                                    borderRadius: 5,
                                  },
                                }}
                              />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {`${Math.round(device.utilization)}%`}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{device.travelDistance} moves</TableCell>
                        <TableCell>
                          <Chip
                            label={device.maintenanceStatus}
                            color={
                              device.maintenanceStatus === "Good"
                                ? "success"
                                : device.maintenanceStatus ===
                                  "Needs Maintenance"
                                ? "warning"
                                : "error"
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Optimization History */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Optimization History" />
            <CardContent>
              {historyData.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Impact</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(item.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.type}
                              color={
                                item.type === "placement"
                                  ? "primary"
                                  : item.type === "purchase"
                                  ? "secondary"
                                  : "default"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.impact}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography
                  variant="body1"
                  color="textSecondary"
                  align="center"
                >
                  No optimizations have been implemented yet. Implement
                  recommendations to see their impact here.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default OptimizationAnalysis;
