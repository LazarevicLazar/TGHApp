import React, { useState, useEffect } from "react";
import { Grid, Box, CircularProgress, Alert, AlertTitle } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useDataContext } from "../context/DataContext";
import DashboardCard from "../components/DashboardCard";
import RecommendationCard from "../components/RecommendationCard";
import DeviceMovementChart from "../components/DeviceMovementChart";
import TimeFilterSelector from "../components/TimeFilterSelector";
import { getStatusColor } from "../utils/helpers";

// Empty arrays for initial rendering
const emptyEquipmentData = [];
const emptyDepartmentData = [];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

function Dashboard() {
  const {
    data,
    devices,
    movements,
    filteredMovements,
    recommendations,
    setRecommendations,
    loading,
    timeFilter,
    setTimeFilter,
    generateRecommendations,
    implementRecommendation,
    implementAllRecommendations,
  } = useDataContext();
  const [equipmentStats, setEquipmentStats] = useState(emptyEquipmentData);
  const [locationStats, setLocationStats] = useState(emptyDepartmentData);
  const [displayedRecommendations, setDisplayedRecommendations] = useState([]);
  const [unknownLocations, setUnknownLocations] = useState([]);
  const [floorPlan, setFloorPlan] = useState(null);

  // Load floor plan data
  useEffect(() => {
    const loadFloorPlan = async () => {
      try {
        // Try both paths to handle different environments
        let response;
        try {
          response = await fetch("/floor_plan_progress.json");
          if (!response.ok) {
            throw new Error("Not found at root path");
          }
        } catch (error) {
          // Try alternative path
          console.log("Trying alternative path for floor plan");
          response = await fetch("./floor_plan_progress.json");
          if (!response.ok) {
            throw new Error(`Failed to load floor plan: ${response.status}`);
          }
        }

        const data = await response.json();
        console.log("Floor plan loaded successfully:", data);
        setFloorPlan(data);
      } catch (error) {
        console.error("Error loading floor plan:", error);
      }
    };

    loadFloorPlan();
  }, []);

  useEffect(() => {
    // Check if we have any data to process
    const hasDevices = devices && devices.length > 0;
    const hasMovements = filteredMovements && filteredMovements.length > 0;

    if (hasDevices || hasMovements) {
      // Process data to generate equipment stats for individual devices
      const deviceMap = {};

      // First, process each device individually
      if (devices && devices.length > 0) {
        devices.forEach((device) => {
          const deviceId = device.deviceId || "Unknown";
          const deviceType = device.deviceType || "Unknown";
          const displayName = deviceId; // Use deviceId as the display name

          if (!deviceMap[deviceId]) {
            deviceMap[deviceId] = {
              name: displayName,
              deviceType: deviceType,
              count: 1,
              usage: 0,
              inUseCount: 0,
            };
          }

          // Use the usagePercentage field if available, otherwise calculate based on status
          if (device.usagePercentage !== undefined) {
            deviceMap[deviceId].usage = device.usagePercentage;
          } else if (
            device.status &&
            device.status.toLowerCase().includes("in use")
          ) {
            deviceMap[deviceId].inUseCount += 1;
          }
        });
      }

      // If we don't have device data, extract it from movements
      if (
        (!devices || devices.length === 0) &&
        filteredMovements &&
        filteredMovements.length > 0
      ) {
        // Create a map to track unique devices
        const uniqueDevices = new Map();

        filteredMovements.forEach((movement) => {
          const deviceId = movement.deviceId || "";
          const deviceType = deviceId.split("-")[0] || "Unknown";
          const status = movement.status || "Unknown";

          // Only process each device once
          if (!uniqueDevices.has(deviceId)) {
            uniqueDevices.set(deviceId, { deviceType, status });

            if (!deviceMap[deviceId]) {
              deviceMap[deviceId] = {
                name: deviceId,
                deviceType: deviceType,
                count: 1,
                usage: 0,
                inUseCount: 0,
              };
            }

            // Use the usagePercentage field if available, otherwise calculate based on status
            if (movement.usagePercentage !== undefined) {
              deviceMap[deviceId].usage = movement.usagePercentage;
            } else if (status && status.toLowerCase().includes("in use")) {
              deviceMap[deviceId].inUseCount += 1;
            }
          }
        });
      }

      // Convert to percentage if not already set
      Object.values(deviceMap).forEach((device) => {
        // Only calculate if usage is not already set
        if (device.usage === 0 && device.count > 0) {
          device.usage = Math.round((device.inUseCount / device.count) * 100);
        }
      });

      // Convert to array and sort by device type and then by name
      const equipmentStatsData = Object.values(deviceMap)
        .filter((device) => device.count > 0) // Only include devices with count
        .sort((a, b) => {
          // First sort by device type
          if (a.deviceType !== b.deviceType) {
            return a.deviceType.localeCompare(b.deviceType);
          }
          // Then sort by name
          return a.name.localeCompare(b.name);
        });

      // Use the calculated data if we have any, otherwise use empty array
      setEquipmentStats(
        equipmentStatsData.length > 0 ? equipmentStatsData : []
      );

      // Process data to generate location stats and detect unknown locations
      if (filteredMovements && filteredMovements.length > 0) {
        const locations = {};
        const unknownLocationSet = new Set();

        filteredMovements.forEach((movement) => {
          const location = movement.toLocation || "Unknown";

          // Check for unknown locations
          if (movement.hasUnknownLocation && movement.unknownLocations) {
            movement.unknownLocations.forEach((loc) =>
              unknownLocationSet.add(loc)
            );
          }

          if (!locations[location]) {
            locations[location] = { name: location, value: 0 };
          }
          locations[location].value++;
        });

        // Update unknown locations state
        setUnknownLocations(Array.from(unknownLocationSet));

        // Convert to array and sort
        const locationStatsData = Object.values(locations)
          .filter((loc) => loc.name !== "Unknown") // Filter out Unknown locations
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Take top 5 locations

        setLocationStats(
          locationStatsData.length > 0 ? locationStatsData : emptyDepartmentData
        );
      } else {
        setLocationStats(emptyDepartmentData);
      }
    } else {
      // No data, use sample data
      setEquipmentStats(emptyEquipmentData);
      setLocationStats(emptyDepartmentData);
    }

    // Set recommendations
    if (recommendations && recommendations.length > 0) {
      console.log("Recommendations received:", recommendations);
      setDisplayedRecommendations(recommendations);
    }
  }, [devices, filteredMovements, recommendations, timeFilter]);

  // Handle time filter change
  const handleTimeFilterChange = (newTimeFilter) => {
    setTimeFilter(newTimeFilter);
  };

  const handleImplementRecommendation = async (recommendation) => {
    try {
      // Call the implementRecommendation function from the DataContext
      const result = await implementRecommendation(recommendation._id);

      if (result.success) {
        // Remove the recommendation from the displayed recommendations
        setDisplayedRecommendations((prevRecommendations) =>
          prevRecommendations.filter((rec) => rec._id !== recommendation._id)
        );
      }
    } catch (error) {
      console.error("Error implementing recommendation:", error);
    }
  };

  const handleImplementAllRecommendations = async () => {
    try {
      // Call the implementAllRecommendations function from the DataContext
      const result = await implementAllRecommendations();

      if (result.success) {
        // Clear all displayed recommendations
        setDisplayedRecommendations([]);
        console.log(
          `Successfully implemented ${result.implementedCount} recommendations`
        );
      }
    } catch (error) {
      console.error("Error implementing all recommendations:", error);
    }
  };

  const handleGenerateRecommendations = async () => {
    try {
      // Clear existing recommendations first to ensure we get fresh ones with the new calculation
      setRecommendations([]);

      const result = await generateRecommendations();

      if (result && !result.success) {
        // Show error message
        console.error("Failed to generate recommendations:", result.message);
        // You could add a snackbar or other UI element to show the error message
      } else {
        console.log(
          "Successfully generated new recommendations with updated calculation method"
        );
        // Log the recommendations to see if they have the correct properties
        console.log("New recommendations:", recommendations);
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
    }
  };

  if (loading && (!devices.length || !movements.length)) {
    return (
      <Box className="centered-container">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="content-container">
      <Box sx={{ mb: 3 }}>
        <TimeFilterSelector
          value={timeFilter}
          onChange={handleTimeFilterChange}
          label="Time Period"
        />
      </Box>
      {unknownLocations.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Unknown Locations Detected</AlertTitle>
          The following locations are not found in the floor plan:
          <strong>{unknownLocations.join(", ")}</strong>. Please check the data
          table for more details.
        </Alert>
      )}
      <Grid container spacing={3}>
        {/* Equipment Usage Chart */}
        <Grid item xs={12} md={6}>
          <DashboardCard
            title="Equipment Usage"
            loading={loading}
            infoTooltip="Shows the usage percentage for each equipment type"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={equipmentStats}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="usage" fill="#8884d8" name="Usage %" />
              </BarChart>
            </ResponsiveContainer>
          </DashboardCard>
        </Grid>

        {/* Location Distribution Chart */}
        <Grid item xs={12} md={6}>
          <DashboardCard
            title="Equipment by Location"
            loading={loading}
            infoTooltip="Shows the distribution of equipment across different locations"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={locationStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {locationStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </DashboardCard>
        </Grid>

        {/* Device Movement Chart */}
        <Grid item xs={12}>
          <DashboardCard
            title="Device Movement Distance"
            loading={loading || !floorPlan}
            infoTooltip="Shows the total distance each device has moved (multiplied by 1.6)"
          >
            <DeviceMovementChart movements={filteredMovements} floorPlan={floorPlan} />
          </DashboardCard>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <DashboardCard
            title="Optimization Recommendations"
            subheader="Based on equipment usage and movement patterns"
            loading={loading}
            action={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {displayedRecommendations.length > 0 && (
                  <Box
                    component="button"
                    onClick={handleImplementAllRecommendations}
                    sx={{
                      backgroundColor: "success.main",
                      color: "white",
                      border: "none",
                      borderRadius: 1,
                      px: 2,
                      py: 1,
                      fontSize: "0.875rem",
                      fontWeight: "medium",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "success.dark",
                      },
                    }}
                  >
                    Implement All
                  </Box>
                )}
                <Box
                  component="button"
                  onClick={handleGenerateRecommendations}
                  sx={{
                    backgroundColor: "primary.main",
                    color: "white",
                    border: "none",
                    borderRadius: 1,
                    px: 2,
                    py: 1,
                    fontSize: "0.875rem",
                    fontWeight: "medium",
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "primary.dark",
                    },
                  }}
                >
                  Regenerate Recommendations
                </Box>
              </Box>
            }
          >
            <Grid container spacing={2}>
              {displayedRecommendations.length > 0 ? (
                displayedRecommendations.map((recommendation) => (
                  <Grid item xs={12} md={4} key={recommendation._id}>
                    <RecommendationCard
                      recommendation={recommendation}
                      onImplement={handleImplementRecommendation}
                    />
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Box sx={{ color: "text.secondary", mb: 2 }}>
                      No recommendations available yet.
                    </Box>
                    <Box
                      component="button"
                      onClick={handleGenerateRecommendations}
                      sx={{
                        backgroundColor: "primary.main",
                        color: "white",
                        border: "none",
                        borderRadius: 1,
                        px: 3,
                        py: 1.5,
                        fontSize: "1rem",
                        fontWeight: "medium",
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "primary.dark",
                        },
                      }}
                    >
                      Generate Recommendations
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          </DashboardCard>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
