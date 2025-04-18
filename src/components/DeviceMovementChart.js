import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  TextField,
  Autocomplete,
  Button,
  Grid,
} from "@mui/material";
import {
  calculateDistance,
  findRoomDistance,
  findShortestPath,
} from "../utils/helpers";

/**
 * Component to display the total movement distance for each device and room-to-room distances
 */
const DeviceMovementChart = ({ movements, floorPlan }) => {
  const [movementData, setMovementData] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [fromRoom, setFromRoom] = useState("");
  const [toRoom, setToRoom] = useState("");
  const [pathResult, setPathResult] = useState(null);
  const [roomOptions, setRoomOptions] = useState([]);
  const [deviceMovementDetails, setDeviceMovementDetails] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to force re-render

  // Load graph data
  useEffect(() => {
    const loadGraphData = async () => {
      try {
        // Try both paths to handle different environments
        let response;
        try {
          response = await fetch("/graph_data.json");
          if (!response.ok) {
            throw new Error("Not found at root path");
          }
        } catch (error) {
          // Try alternative path
          console.log("Trying alternative path for graph data");
          response = await fetch("./graph_data.json");
          if (!response.ok) {
            throw new Error(`Failed to load graph data: ${response.status}`);
          }
        }

        const data = await response.json();
        console.log("Graph data loaded successfully");
        setGraphData(data);

        // Set room options for autocomplete
        if (data && data.nodes) {
          setRoomOptions(data.nodes.map((node) => ({ label: node, id: node })));
        }
      } catch (error) {
        console.error("Error loading graph data:", error);
      }
    };

    loadGraphData();

    // Force a refresh when the component mounts
    setRefreshKey((prevKey) => prevKey + 1);
  }, []);

  // Calculate device movement data
  useEffect(() => {
    console.log("DeviceMovementChart received props:", {
      movementsLength: movements?.length,
      hasFloorPlan: !!floorPlan,
      hasRooms: !!floorPlan?.rooms,
      hasGraphData: !!graphData,
    });

    if (!movements || !movements.length) {
      console.log("Missing required data for movement chart");
      setMovementData([]);
      setDeviceMovementDetails([]);
      return;
    }

    // Group movements by device
    const deviceMovements = {};
    const deviceMovementsByTime = {};
    const detailedMovements = [];

    // First, organize movements by device and sort by time
    movements.forEach((movement) => {
      // Extract deviceId from the Device field or use the deviceId field if available
      const deviceId = movement.deviceId || movement.Device || "Unknown";

      if (!deviceMovementsByTime[deviceId]) {
        deviceMovementsByTime[deviceId] = [];
      }

      // Add the movement with its location and time
      deviceMovementsByTime[deviceId].push({
        location: movement.toLocation || movement.Location,
        timeIn: movement.timeIn || movement.In,
        timeOut: movement.timeOut || movement.Out,
      });
    });

    // Sort each device's movements by time
    Object.keys(deviceMovementsByTime).forEach((deviceId) => {
      deviceMovementsByTime[deviceId].sort((a, b) => {
        return new Date(a.timeIn) - new Date(b.timeIn);
      });
    });

    // Now process consecutive movements to calculate distances
    Object.keys(deviceMovementsByTime).forEach((deviceId) => {
      const deviceMoves = deviceMovementsByTime[deviceId];

      if (!deviceMovements[deviceId]) {
        deviceMovements[deviceId] = {
          deviceId,
          deviceType: deviceId.split("-")[0] || "Unknown",
          totalDistance: 0,
          movementCount: 0,
        };
      }

      // Process consecutive movements
      for (let i = 0; i < deviceMoves.length - 1; i++) {
        const fromLocation = deviceMoves[i].location;
        const toLocation = deviceMoves[i + 1].location;
        let distance = null;
        let distanceSource = "Unknown";

        // Try to get distance from graph data first
        if (graphData && fromLocation && toLocation) {
          // Find the direct edge in the graph data
          for (const edge of graphData.edges) {
            if (
              (edge[0] === fromLocation && edge[1] === toLocation) ||
              (edge[0] === toLocation && edge[1] === fromLocation)
            ) {
              // Apply 1.6 multiplier directly here
              distance = edge[2] * 1.6;
              distanceSource = "Graph (Direct)";
              console.log(
                `Direct graph distance from ${fromLocation} to ${toLocation}: ${distance.toFixed(
                  2
                )} feet (raw: ${edge[2].toFixed(2)} * 1.6)`
              );
              break;
            }
          }

          // If no direct edge was found, try the helper function
          if (distance === null) {
            const graphDistance = findRoomDistance(
              fromLocation,
              toLocation,
              graphData
            );
            if (graphDistance !== null) {
              distance = graphDistance;
              distanceSource = "Graph";
              console.log(
                `Graph distance from ${fromLocation} to ${toLocation}: ${distance.toFixed(
                  2
                )} feet`
              );
            }
          }
        }

        // Fall back to coordinate-based distance if graph distance not available
        if (
          distance === null &&
          floorPlan &&
          floorPlan.rooms &&
          fromLocation &&
          toLocation &&
          floorPlan.rooms[fromLocation] &&
          floorPlan.rooms[toLocation]
        ) {
          const [x1, y1] = floorPlan.rooms[fromLocation];
          const [x2, y2] = floorPlan.rooms[toLocation];

          // Apply the calculation directly with the 1.6 multiplier
          const rawDistance = Math.sqrt(
            Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
          );
          distance = rawDistance * 1.6;
          distanceSource = "Coordinates";
          console.log(
            `Coordinate distance from ${fromLocation} to ${toLocation}: ${distance.toFixed(
              2
            )} feet (raw: ${rawDistance.toFixed(2)} * 1.6)`
          );
        }

        if (distance !== null) {
          deviceMovements[deviceId].totalDistance += distance;
          deviceMovements[deviceId].movementCount += 1;

          // Add to detailed movements for the table
          // Note: distance already has 1.6 multiplier applied from the helper functions
          detailedMovements.push({
            deviceId,
            fromLocation,
            toLocation,
            distance: parseFloat(distance.toFixed(2)),
            distanceSource,
            timeIn: deviceMoves[i].timeIn,
            timeOut: deviceMoves[i + 1].timeIn,
          });

          console.log(
            `Device ${deviceId} moved from ${fromLocation} to ${toLocation}, distance: ${distance.toFixed(
              2
            )} (${distanceSource})`
          );
        } else if (fromLocation && toLocation) {
          console.log(
            `Could not calculate distance between: ${fromLocation} and ${toLocation}`
          );

          // Still add to detailed movements but with null distance
          detailedMovements.push({
            deviceId,
            fromLocation,
            toLocation,
            distance: null,
            distanceSource: "None",
            timeIn: deviceMoves[i].timeIn,
            timeOut: deviceMoves[i + 1].timeIn,
          });
        }
      }
    });

    console.log("Processed movement data:", deviceMovements);

    // Convert to array and sort by device type and then by device ID
    const movementDataArray = Object.values(deviceMovements)
      .filter((device) => device.totalDistance > 0) // Only include devices with movement
      .sort((a, b) => {
        // First sort by device type
        if (a.deviceType !== b.deviceType) {
          return a.deviceType.localeCompare(b.deviceType);
        }
        // Then sort by device ID
        return a.deviceId.localeCompare(b.deviceId);
      });

    // Sort detailed movements by device ID and time
    const sortedDetailedMovements = detailedMovements.sort((a, b) => {
      if (a.deviceId !== b.deviceId) {
        return a.deviceId.localeCompare(b.deviceId);
      }
      return new Date(a.timeIn) - new Date(b.timeIn);
    });

    console.log("Final movement data for chart:", movementDataArray);
    setMovementData(movementDataArray);
    setDeviceMovementDetails(sortedDetailedMovements);
  }, [movements, floorPlan, graphData, refreshKey]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Find path between rooms
  const findPath = useCallback(() => {
    if (!graphData || !fromRoom || !toRoom) {
      return;
    }

    const result = findShortestPath(fromRoom, toRoom, graphData);
    setPathResult(result);
  }, [graphData, fromRoom, toRoom]);

  // If no data, show a message
  if (!movements || !movements.length) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No movement data available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Device Movement Chart" />
        <Tab label="Movement Details" />
        <Tab label="Room Distance Calculator" />
      </Tabs>

      {tabValue === 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={movementData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="deviceId" />
            <YAxis
              label={{
                value: "Total Distance (feet)",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip
              formatter={(value) => [
                `${value.toFixed(2)} feet`,
                "Total Distance",
              ]}
              labelFormatter={(value) => `Device: ${value}`}
            />
            <Legend />
            <Bar
              dataKey="totalDistance"
              name="Total Movement Distance (feet)"
              fill="#8884d8"
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table
            stickyHeader
            aria-label="device movement details table"
            size="small"
          >
            <TableHead>
              <TableRow>
                <TableCell>Device ID</TableCell>
                <TableCell>From Location</TableCell>
                <TableCell>To Location</TableCell>
                <TableCell align="right">Distance (feet)</TableCell>
                <TableCell>Source</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deviceMovementDetails.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.deviceId}</TableCell>
                  <TableCell>{row.fromLocation}</TableCell>
                  <TableCell>{row.toLocation}</TableCell>
                  <TableCell align="right">
                    {row.distance !== null ? row.distance.toFixed(2) : "N/A"}
                  </TableCell>
                  <TableCell>{row.distanceSource}</TableCell>
                </TableRow>
              ))}
              {deviceMovementDetails.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No movement details available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabValue === 2 && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={5}>
              <Autocomplete
                options={roomOptions}
                value={
                  roomOptions.find((option) => option.id === fromRoom) || null
                }
                onChange={(event, newValue) => {
                  setFromRoom(newValue ? newValue.id : "");
                  setPathResult(null);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="From Room" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <Autocomplete
                options={roomOptions}
                value={
                  roomOptions.find((option) => option.id === toRoom) || null
                }
                onChange={(event, newValue) => {
                  setToRoom(newValue ? newValue.id : "");
                  setPathResult(null);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="To Room" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                onClick={findPath}
                disabled={!fromRoom || !toRoom}
                fullWidth
                sx={{ height: "100%" }}
              >
                Calculate
              </Button>
            </Grid>
          </Grid>

          {pathResult && (
            <Box
              sx={{ mt: 2, p: 2, border: "1px solid #ddd", borderRadius: 1 }}
            >
              <Typography variant="h6" gutterBottom>
                Path Result
              </Typography>
              {pathResult.distance !== null ? (
                <>
                  <Typography>
                    <strong>Distance:</strong> {pathResult.distance.toFixed(2)}{" "}
                    feet
                  </Typography>
                  <Typography>
                    <strong>Path:</strong> {pathResult.path.join(" → ")}
                  </Typography>
                </>
              ) : (
                <Typography color="error">
                  No path found between {fromRoom} and {toRoom}
                </Typography>
              )}
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This calculator uses the graph data to find the shortest path
            between two rooms.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DeviceMovementChart;
