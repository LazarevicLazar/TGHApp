import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import * as d3 from "d3";
import { useDataContext } from "../context/DataContext";

// Sample floor plan data
const sampleFloorPlan = {
  width: 800,
  height: 600,
  rooms: [
    {
      id: "ER-A",
      x: 50,
      y: 50,
      width: 150,
      height: 100,
      name: "Emergency Room A",
    },
    {
      id: "ER-B",
      x: 50,
      y: 170,
      width: 150,
      height: 100,
      name: "Emergency Room B",
    },
    {
      id: "ER-C",
      x: 50,
      y: 290,
      width: 150,
      height: 100,
      name: "Emergency Room C",
    },
    { id: "ICU-A", x: 250, y: 50, width: 200, height: 150, name: "ICU A" },
    { id: "ICU-B", x: 250, y: 220, width: 200, height: 150, name: "ICU B" },
    {
      id: "RAD-A",
      x: 500,
      y: 50,
      width: 250,
      height: 200,
      name: "Radiology A",
    },
    { id: "SUR-A", x: 500, y: 270, width: 250, height: 180, name: "Surgery A" },
    { id: "STOR-1", x: 250, y: 390, width: 100, height: 80, name: "Storage 1" },
    { id: "STOR-2", x: 370, y: 390, width: 100, height: 80, name: "Storage 2" },
    { id: "HALL-1", x: 220, y: 50, width: 20, height: 420, name: "Hallway 1" },
    { id: "HALL-2", x: 50, y: 410, width: 700, height: 20, name: "Hallway 2" },
    { id: "HALL-3", x: 470, y: 50, width: 20, height: 360, name: "Hallway 3" },
  ],
  // Sample movement data points (device, from, to, count)
  movements: [
    { device: "Ventilator", from: "STOR-1", to: "ER-A", count: 15 },
    { device: "Ventilator", from: "STOR-1", to: "ICU-A", count: 12 },
    { device: "Ultrasound", from: "RAD-A", to: "ER-B", count: 8 },
    { device: "Defibrillator", from: "STOR-2", to: "ER-C", count: 5 },
    { device: "IV-Pump", from: "STOR-2", to: "ICU-B", count: 20 },
    { device: "Monitor", from: "STOR-1", to: "SUR-A", count: 10 },
  ],
  // Sample heatmap data (location, intensity)
  heatmap: [
    { location: "ER-A", intensity: 0.8 },
    { location: "ER-B", intensity: 0.6 },
    { location: "ER-C", intensity: 0.4 },
    { location: "ICU-A", intensity: 0.9 },
    { location: "ICU-B", intensity: 0.7 },
    { location: "RAD-A", intensity: 0.5 },
    { location: "SUR-A", intensity: 0.6 },
    { location: "STOR-1", intensity: 0.3 },
    { location: "STOR-2", intensity: 0.2 },
  ],
};

function HeatMap() {
  const { data, loading } = useDataContext();
  const [floorPlan, setFloorPlan] = useState(sampleFloorPlan);
  const [visualizationType, setVisualizationType] = useState("heatmap");
  const [selectedDevice, setSelectedDevice] = useState("All");
  const svgRef = useRef(null);

  // List of available devices
  const deviceOptions = [
    "All",
    "Ventilator",
    "Ultrasound",
    "Defibrillator",
    "IV-Pump",
    "Monitor",
  ];

  useEffect(() => {
    // In a real implementation, this would process the actual data
    // and generate the floor plan with real movement data
    if (data && data.length > 0) {
      // Process data to generate floor plan and movement data
    }

    renderVisualization();
  }, [floorPlan, visualizationType, selectedDevice]);

  const renderVisualization = () => {
    if (!svgRef.current) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", floorPlan.width)
      .attr("height", floorPlan.height)
      .attr("viewBox", `0 0 ${floorPlan.width} ${floorPlan.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Draw rooms
    svg
      .selectAll(".room")
      .data(floorPlan.rooms)
      .enter()
      .append("rect")
      .attr("class", "room")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .attr("fill", "#fff");

    // Add room labels
    svg
      .selectAll(".room-label")
      .data(floorPlan.rooms)
      .enter()
      .append("text")
      .attr("class", "room-label")
      .attr("x", (d) => d.x + d.width / 2)
      .attr("y", (d) => d.y + d.height / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "12px")
      .text((d) => d.name);

    if (visualizationType === "heatmap") {
      // Draw heatmap
      const colorScale = d3
        .scaleSequential(d3.interpolateYlOrRd)
        .domain([0, 1]);

      svg
        .selectAll(".heatmap")
        .data(floorPlan.heatmap)
        .enter()
        .append("rect")
        .attr("class", "heatmap")
        .attr("x", (d) => {
          const room = floorPlan.rooms.find((r) => r.id === d.location);
          return room ? room.x : 0;
        })
        .attr("y", (d) => {
          const room = floorPlan.rooms.find((r) => r.id === d.location);
          return room ? room.y : 0;
        })
        .attr("width", (d) => {
          const room = floorPlan.rooms.find((r) => r.id === d.location);
          return room ? room.width : 0;
        })
        .attr("height", (d) => {
          const room = floorPlan.rooms.find((r) => r.id === d.location);
          return room ? room.height : 0;
        })
        .attr("fill", (d) => colorScale(d.intensity))
        .attr("opacity", 0.7)
        .attr("stroke", "none");
    } else if (visualizationType === "movement") {
      // Filter movements based on selected device
      const filteredMovements =
        selectedDevice === "All"
          ? floorPlan.movements
          : floorPlan.movements.filter((m) => m.device === selectedDevice);

      // Draw movement lines
      filteredMovements.forEach((movement) => {
        const fromRoom = floorPlan.rooms.find((r) => r.id === movement.from);
        const toRoom = floorPlan.rooms.find((r) => r.id === movement.to);

        if (fromRoom && toRoom) {
          const fromX = fromRoom.x + fromRoom.width / 2;
          const fromY = fromRoom.y + fromRoom.height / 2;
          const toX = toRoom.x + toRoom.width / 2;
          const toY = toRoom.y + toRoom.height / 2;

          // Line width based on movement count
          const lineWidth = Math.max(1, Math.min(10, movement.count / 2));

          svg
            .append("line")
            .attr("x1", fromX)
            .attr("y1", fromY)
            .attr("x2", toX)
            .attr("y2", toY)
            .attr("stroke", "#0066cc")
            .attr("stroke-width", lineWidth)
            .attr("opacity", 0.7);

          // Add arrow at the end
          const angle = Math.atan2(toY - fromY, toX - fromX);
          const arrowSize = lineWidth * 2;

          svg
            .append("polygon")
            .attr(
              "points",
              `0,0 -${arrowSize},-${arrowSize / 2} -${arrowSize},${
                arrowSize / 2
              }`
            )
            .attr(
              "transform",
              `translate(${toX},${toY}) rotate(${(angle * 180) / Math.PI})`
            )
            .attr("fill", "#0066cc");
        }
      });
    }
  };

  const handleVisualizationChange = (event) => {
    setVisualizationType(event.target.value);
  };

  const handleDeviceChange = (event) => {
    setSelectedDevice(event.target.value);
  };

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
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: "flex", gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Visualization Type</InputLabel>
              <Select
                value={visualizationType}
                label="Visualization Type"
                onChange={handleVisualizationChange}
              >
                <MenuItem value="heatmap">Usage Heatmap</MenuItem>
                <MenuItem value="movement">Movement Patterns</MenuItem>
              </Select>
            </FormControl>

            {visualizationType === "movement" && (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Device Type</InputLabel>
                <Select
                  value={selectedDevice}
                  label="Device Type"
                  onChange={handleDeviceChange}
                >
                  {deviceOptions.map((device) => (
                    <MenuItem key={device} value={device}>
                      {device}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Card className="dashboard-card">
            <CardHeader
              title={
                visualizationType === "heatmap"
                  ? "Equipment Usage Heatmap"
                  : "Equipment Movement Patterns"
              }
              subheader={
                visualizationType === "movement" && selectedDevice !== "All"
                  ? `Showing movements for: ${selectedDevice}`
                  : null
              }
            />
            <CardContent
              className="dashboard-card-content"
              sx={{ display: "flex", justifyContent: "center" }}
            >
              <svg ref={svgRef}></svg>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Legend
            </Typography>
            {visualizationType === "heatmap" ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ display: "flex", width: 300 }}>
                  <Box
                    sx={{
                      background:
                        "linear-gradient(to right, #ffffcc, #ffeda0, #fed976, #feb24c, #fd8d3c, #fc4e2a, #e31a1c, #b10026)",
                      height: 20,
                      width: "100%",
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: 300,
                  }}
                >
                  <Typography variant="caption">Low Usage</Typography>
                  <Typography variant="caption">High Usage</Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{ width: 50, height: 2, backgroundColor: "#0066cc" }}
                  />
                  <Typography variant="caption">
                    Low Movement Frequency
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{ width: 50, height: 5, backgroundColor: "#0066cc" }}
                  />
                  <Typography variant="caption">
                    Medium Movement Frequency
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{ width: 50, height: 10, backgroundColor: "#0066cc" }}
                  />
                  <Typography variant="caption">
                    High Movement Frequency
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default HeatMap;
