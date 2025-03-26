import React, { useState, useEffect } from "react";
import { Grid, Box, CircularProgress } from "@mui/material";
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
    recommendations,
    loading,
    generateRecommendations,
    implementRecommendation,
  } = useDataContext();
  const [equipmentStats, setEquipmentStats] = useState(emptyEquipmentData);
  const [locationStats, setLocationStats] = useState(emptyDepartmentData);
  const [displayedRecommendations, setDisplayedRecommendations] = useState([]);

  useEffect(() => {
    if (devices && devices.length > 0) {
      // Process data to generate equipment stats
      const deviceTypes = {};
      devices.forEach((device) => {
        const deviceType = device.deviceType || "Unknown";

        if (!deviceTypes[deviceType]) {
          deviceTypes[deviceType] = { name: deviceType, count: 0, usage: 0 };
        }
        deviceTypes[deviceType].count++;

        // Calculate usage based on status
        if (device.status && device.status.toLowerCase().includes("in use")) {
          deviceTypes[deviceType].usage += 1;
        }
      });

      // Convert to percentage
      Object.values(deviceTypes).forEach((type) => {
        type.usage = Math.round((type.usage / type.count) * 100);
      });

      // Convert to array and sort
      const equipmentStatsData = Object.values(deviceTypes).sort(
        (a, b) => b.count - a.count
      );
      setEquipmentStats(equipmentStatsData);

      // Process data to generate location stats
      const locations = {};
      movements.forEach((movement) => {
        const location = movement.toLocation || "Unknown";

        if (!locations[location]) {
          locations[location] = { name: location, value: 0 };
        }
        locations[location].value++;
      });

      // Convert to array and sort
      const locationStatsData = Object.values(locations)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Take top 5 locations

      setLocationStats(locationStatsData);
    }

    // Set recommendations
    if (recommendations && recommendations.length > 0) {
      setDisplayedRecommendations(recommendations);
    }
  }, [devices, movements, recommendations]);

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

  const handleGenerateRecommendations = async () => {
    try {
      const result = await generateRecommendations();

      if (result && !result.success) {
        // Show error message
        console.error("Failed to generate recommendations:", result.message);
        // You could add a snackbar or other UI element to show the error message
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

        {/* Recommendations */}
        <Grid item xs={12}>
          <DashboardCard
            title="Optimization Recommendations"
            subheader="Based on equipment usage and movement patterns"
            loading={loading}
            action={
              <Box sx={{ display: "flex", alignItems: "center" }}>
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
                  Generate Recommendations
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
