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

    // Create the main SVG element
    const svg = d3
      .select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "600px") // Fixed height for better control
      .attr("viewBox", `0 0 ${floorPlan.width} ${floorPlan.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Create a group for all content that will be zoomed
    const mainGroup = svg.append("g").attr("class", "main-group");

    // Add zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 5]) // Allow zoom from half size to 5x
      .on("zoom", (event) => {
        mainGroup.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Add a border to the SVG for better visibility
    svg
      .append("rect")
      .attr("width", floorPlan.width)
      .attr("height", floorPlan.height)
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-width", 2);

    // Add floor plan image as background with adjusted aspect ratio to match room overlay
    // First, calculate the bounds of the rooms to determine the correct scaling
    const roomBounds = {
      minX: d3.min(floorPlan.rooms, (d) => d.x),
      minY: d3.min(floorPlan.rooms, (d) => d.y),
      maxX: d3.max(floorPlan.rooms, (d) => d.x + d.width),
      maxY: d3.max(floorPlan.rooms, (d) => d.y + d.height),
    };

    // Create a clip path to ensure the image doesn't overflow
    const defs = svg.append("defs");
    defs
      .append("clipPath")
      .attr("id", "floor-plan-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", floorPlan.width)
      .attr("height", floorPlan.height);

    // Add floor plan image as background with precise positioning
    mainGroup
      .append("image")
      .attr("href", "./floor_plan.png")
      .attr("width", floorPlan.width)
      .attr("height", floorPlan.height)
      .attr("preserveAspectRatio", "none") // Use 'none' to stretch the image to match exactly
      .attr("clip-path", "url(#floor-plan-clip)");

    // Create a group for the heat visualization
    const heatGroup = mainGroup.append("g").attr("class", "heat-group");

    if (visualizationType === "heatmap" && movements && movements.length > 0) {
      // Generate heat map data points based on actual movement data
      const heatData = [];
      const movementCounts = {};
      let maxMovementCount = 0;

      // Count movements per location
      movements.forEach((movement) => {
        const location = movement.toLocation;
        if (location) {
          movementCounts[location] = (movementCounts[location] || 0) + 1;
          maxMovementCount = Math.max(
            maxMovementCount,
            movementCounts[location]
          );
        }
      });

      console.log("Movement counts:", movementCounts);
      console.log("Max movement count:", maxMovementCount);

      // Convert movement counts to heat points
      floorPlan.rooms.forEach((room) => {
        // Get the center of the room
        const centerX = room.x + room.width / 2;
        const centerY = room.y + room.height / 2;

        // Get movement count for this room (if any)
        const movementCount = movementCounts[room.id] || 0;

        // Skip rooms with no movement if we have data
        if (maxMovementCount > 0 && movementCount === 0) {
          return;
        }

        // Scale the heat value based on movement count relative to max count
        // This ensures the heat intensity is proportional to actual usage
        const heatIntensity =
          maxMovementCount > 0 ? movementCount / maxMovementCount : 0.2; // Default low intensity if no data

        // More movements = more heat points and more concentrated
        const pointCount = Math.max(5, Math.round(heatIntensity * 50));
        const spreadFactor = 1 - heatIntensity * 0.7; // Less spread for high intensity

        for (let i = 0; i < pointCount; i++) {
          // Add some randomness to spread points within the room
          // Higher intensity = less spread (more concentrated heat)
          const offsetX = (Math.random() - 0.5) * room.width * spreadFactor;
          const offsetY = (Math.random() - 0.5) * room.height * spreadFactor;

          heatData.push([centerX + offsetX, centerY + offsetY]);
        }
      });

      // Only create heat map if we have data points
      if (heatData.length > 0) {
        // Create a density estimation function with appropriate bandwidth
        const densityData = d3
          .contourDensity()
          .x((d) => d[0])
          .y((d) => d[1])
          .size([floorPlan.width, floorPlan.height])
          .bandwidth(30) // Reduced bandwidth for more defined heat areas
          .thresholds(12)(heatData); // More thresholds for better granularity

        // Color scale for the heat map - using a more vibrant color scheme
        const colorScale = d3
          .scaleSequential(d3.interpolateYlOrRd)
          .domain([0, d3.max(densityData, (d) => d.value) || 1]);

        // Create a filter for blur effect
        const defs = svg.append("defs");

        // Add a blur filter
        const filter = defs
          .append("filter")
          .attr("id", "blur")
          .attr("x", "-50%")
          .attr("y", "-50%")
          .attr("width", "200%")
          .attr("height", "200%");

        filter.append("feGaussianBlur").attr("stdDeviation", "10"); // Original blur value

        // Draw the heat map contours with original opacity
        heatGroup
          .selectAll("path")
          .data(densityData)
          .enter()
          .append("path")
          .attr("d", d3.geoPath())
          .attr("fill", (d) => colorScale(d.value))
          .attr("opacity", 0.1) // Original opacity
          .attr("filter", "url(#blur)"); // Apply blur filter

        // No additional effects for high-density areas
      }
    }

    // We're removing the room squares as requested by the user
    // If we're not in heatmap mode, we'll show very light outlines
    if (visualizationType !== "heatmap") {
      mainGroup
        .selectAll(".room-outline")
        .data(floorPlan.rooms)
        .enter()
        .append("rect")
        .attr("class", "room-outline")
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .attr("width", (d) => d.width)
        .attr("height", (d) => d.height)
        .attr("stroke", "#ccc")
        .attr("stroke-width", 0.5)
        .attr("fill", "none");
    }

    // Add room labels
    mainGroup
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
      .attr("pointer-events", "none") // Prevent labels from interfering with mouse events
      .text((d) => d.name);

    // Add zoom controls
    const zoomControls = svg
      .append("g")
      .attr("class", "zoom-controls")
      .attr("transform", "translate(20, 20)");

    // Zoom in button
    zoomControls
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#000")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.3);
      });

    zoomControls
      .append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "20px")
      .attr("pointer-events", "none")
      .text("+");

    // Zoom out button
    zoomControls
      .append("rect")
      .attr("x", 0)
      .attr("y", 40)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#000")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.7);
      });

    zoomControls
      .append("text")
      .attr("x", 15)
      .attr("y", 60)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "20px")
      .attr("pointer-events", "none")
      .text("−");

    // Reset zoom button
    zoomControls
      .append("rect")
      .attr("x", 0)
      .attr("y", 80)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#000")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      });

    zoomControls
      .append("text")
      .attr("x", 15)
      .attr("y", 100)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "10px")
      .attr("pointer-events", "none")
      .text("Reset");

    if (visualizationType === "movement") {
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
