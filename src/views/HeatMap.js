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
import optimizationService from "../services/OptimizationService";

function HeatMap() {
  const { devices, locations, movements, loading } = useDataContext();
  const [floorPlan, setFloorPlan] = useState(null);
  const [visualizationType, setVisualizationType] = useState("heatmap");
  const [selectedDevice, setSelectedDevice] = useState("All");
  const [deviceOptions, setDeviceOptions] = useState(["All"]);
  const svgRef = useRef(null);

  // Load floor plan data
  useEffect(() => {
    const loadFloorPlanData = async () => {
      try {
        // In a real app, this would load from the assets directory
        // For now, we'll use a simplified version

        // Try to load from window.electron if available
        let roomsData = {};
        let wallsData = [];

        try {
          // Load floor plan data from the provided JSON files
          const floorPlanResponse = await fetch("./floor_plan_progress.json");
          const graphDataResponse = await fetch("./graph_data.json");

          if (floorPlanResponse.ok && graphDataResponse.ok) {
            const floorPlanData = await floorPlanResponse.json();
            const graphData = await graphDataResponse.json();

            roomsData = floorPlanData.rooms || {};
            wallsData = floorPlanData.walls || [];

            // Initialize the optimization service with the graph data
            optimizationService.initialize(graphData, floorPlanData);
          }
        } catch (error) {
          console.error("Error loading floor plan data:", error);
          // Use sample data if loading fails
          roomsData = {
            "ER-A": [50, 50],
            "ER-B": [50, 170],
            "ER-C": [50, 290],
            "ICU-A": [250, 50],
            "ICU-B": [250, 220],
            "RAD-A": [500, 50],
            "SUR-A": [500, 270],
            "STOR-1": [250, 390],
            "STOR-2": [370, 390],
          };

          wallsData = [
            [220, 50],
            [220, 470], // Vertical wall
            [50, 410],
            [750, 410], // Horizontal wall
            [470, 50],
            [470, 410], // Vertical wall
          ];
        }

        // Convert room data to the format needed for visualization
        const rooms = Object.entries(roomsData).map(([id, coords]) => {
          return {
            id,
            x: coords[0] * 8,
            y: coords[1] * 4,
            width: 80,
            height: 60,
            name: id,
          };
        });

        // Create walls from wall data
        const walls = wallsData.map((coords) => ({
          x1: coords[0] * 8,
          y1: coords[1] * 4,
          x2: coords[0] * 8,
          y2: coords[1] * 4,
        }));

        // Generate heatmap data based on movements
        const heatmapData = [];
        const locationCounts = {};

        if (movements && movements.length > 0) {
          movements.forEach((movement) => {
            const location = movement.toLocation;
            if (location) {
              if (!locationCounts[location]) {
                locationCounts[location] = 0;
              }
              locationCounts[location]++;
            }
          });

          // Normalize counts to intensities between 0 and 1
          const maxCount = Math.max(...Object.values(locationCounts));

          Object.entries(locationCounts).forEach(([location, count]) => {
            heatmapData.push({
              location,
              intensity: maxCount > 0 ? count / maxCount : 0,
            });
          });
        }

        // Generate movement data based on movements
        const movementLines = [];

        if (movements && movements.length > 0) {
          // Group movements by from/to pairs
          const movementCounts = {};

          movements.forEach((movement) => {
            const from = movement.fromLocation;
            const to = movement.toLocation;
            const device = movement.deviceId;

            if (from && to && from !== to) {
              const key = `${from}-${to}-${device}`;
              if (!movementCounts[key]) {
                movementCounts[key] = {
                  device,
                  from,
                  to,
                  count: 0,
                };
              }
              movementCounts[key].count++;
            }
          });

          Object.values(movementCounts).forEach((movement) => {
            movementLines.push(movement);
          });
        }

        setFloorPlan({
          width: 800,
          height: 600,
          rooms,
          walls,
          heatmap: heatmapData,
          movements: movementLines,
        });
      } catch (error) {
        console.error("Error setting up floor plan:", error);
      }
    };

    loadFloorPlanData();
  }, [movements]);

  // Extract device options from devices
  useEffect(() => {
    if (devices && devices.length > 0) {
      const types = [
        "All",
        ...new Set(devices.map((device) => device.deviceType)),
      ];
      setDeviceOptions(types);
    }
  }, [devices]);

  // Render visualization when data changes
  useEffect(() => {
    if (!floorPlan || !svgRef.current) return;

    renderVisualization();
  }, [floorPlan, visualizationType, selectedDevice]);

  const renderVisualization = () => {
    if (!svgRef.current || !floorPlan) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", floorPlan.width)
      .attr("height", floorPlan.height)
      .attr("viewBox", `0 0 ${floorPlan.width} ${floorPlan.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Draw walls
    svg
      .selectAll(".wall")
      .data(floorPlan.walls)
      .enter()
      .append("line")
      .attr("class", "wall")
      .attr("x1", (d) => d.x1)
      .attr("y1", (d) => d.y1)
      .attr("x2", (d) => d.x2)
      .attr("y2", (d) => d.y2)
      .attr("stroke", "#000")
      .attr("stroke-width", 3);

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
          : floorPlan.movements.filter((m) => {
              const deviceType = m.device.split("-")[0];
              return deviceType === selectedDevice;
            });

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

  if (loading || !floorPlan) {
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
