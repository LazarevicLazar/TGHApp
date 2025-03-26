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
import dataProcessingService from "../services/DataProcessingService";

// Sample data for initial rendering
const sampleEquipmentData = [
  { name: "Ventilators", count: 12, usage: 75 },
  { name: "Ultrasound", count: 8, usage: 60 },
  { name: "Defibrillators", count: 15, usage: 45 },
  { name: "IV Pumps", count: 30, usage: 90 },
  { name: "Monitors", count: 25, usage: 85 },
];

const sampleDepartmentData = [
  { name: "Emergency", value: 35 },
  { name: "ICU", value: 25 },
  { name: "Surgery", value: 20 },
  { name: "Radiology", value: 10 },
  { name: "Other", value: 10 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

function Dashboard() {
  const { data, loading } = useDataContext();
  const [equipmentStats, setEquipmentStats] = useState(sampleEquipmentData);
  const [departmentStats, setDepartmentStats] = useState(sampleDepartmentData);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (data && data.length > 0) {
      // Process data to generate equipment stats
      const deviceTypes = {};
      data.forEach((item) => {
        const deviceType =
          item.device_type ||
          (item.device ? item.device.split("-")[0] : null) ||
          (item.Device ? item.Device.split("-")[0] : null) ||
          (item.device_id ? item.device_id.split("-")[0] : null) ||
          "Unknown";
        if (!deviceTypes[deviceType]) {
          deviceTypes[deviceType] = { name: deviceType, count: 0, usage: 0 };
        }
        deviceTypes[deviceType].count++;

        // Calculate usage based on status
        if (item.status.toLowerCase().includes("in use")) {
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

      // Process data to generate department stats
      const departments = {};
      data.forEach((item) => {
        const department =
          item.department ||
          (item.location ? item.location.split("-")[0] : null) ||
          (item.Location ? item.Location.split("-")[0] : null) ||
          (item.location_id ? item.location_id.split("-")[0] : null) ||
          "Unknown";
        if (!departments[department]) {
          departments[department] = { name: department, value: 0 };
        }
        departments[department].value++;
      });

      // Convert to array and sort
      const departmentStatsData = Object.values(departments).sort(
        (a, b) => b.value - a.value
      );
      setDepartmentStats(departmentStatsData);

      // Generate recommendations using the data processing service
      const generatedRecommendations =
        dataProcessingService.generateRecommendations(data);
      setRecommendations(generatedRecommendations);
    } else {
      // For demo purposes, we'll set some sample recommendations
      setRecommendations([
        {
          id: 1,
          title: "Optimize Ventilator Placement",
          description:
            "Moving ventilators from ICU storage to Emergency Department would reduce staff walking distance by approximately 15%.",
          savings: "~120 hours/month",
          type: "placement",
        },
        {
          id: 2,
          title: "Additional IV Pumps Needed",
          description:
            "Current IV pumps are utilized at 90% capacity. Adding 5 more units would reduce wait times and improve patient care.",
          savings: "~$15,000/year",
          type: "purchase",
        },
        {
          id: 3,
          title: "Maintenance Schedule Optimization",
          description:
            "Ultrasound machines in Radiology are approaching maintenance thresholds based on usage patterns.",
          savings: "Preventative maintenance",
          type: "maintenance",
        },
      ]);
    }
  }, [data]);

  if (loading) {
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
            loading={loading && data.length === 0}
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

        {/* Department Distribution Chart */}
        <Grid item xs={12} md={6}>
          <DashboardCard
            title="Equipment by Department"
            loading={loading && data.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentStats}
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
                  {departmentStats.map((entry, index) => (
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
            loading={loading && data.length === 0}
          >
            <Grid container spacing={2}>
              {recommendations.map((recommendation) => (
                <Grid item xs={12} md={4} key={recommendation.id}>
                  <RecommendationCard
                    recommendation={recommendation}
                    onImplement={(rec) =>
                      console.log("Implement recommendation:", rec)
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </DashboardCard>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
