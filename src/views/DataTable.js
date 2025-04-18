import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  ArrowDropDown as ArrowDropDownIcon,
  SortByAlpha as SortByAlphaIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from "@mui/icons-material";
import { useDataContext } from "../context/DataContext";
import {
  formatDate,
  downloadCSV,
  convertToCSV,
  getStatusColor,
} from "../utils/helpers";

function DataTable() {
  const { movements, loading } = useDataContext();
  const [tableData, setTableData] = useState([]);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("deviceId");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);
  const exportMenuOpen = Boolean(exportMenuAnchorEl);

  useEffect(() => {
    if (movements && movements.length > 0) {
      setTableData(movements);
    }
  }, [movements]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Helper function to get value from row considering both lowercase and uppercase field names
  const getRowValue = (row, field) => {
    // Map lowercase field names to their uppercase equivalents
    const fieldMap = {
      deviceId: ["deviceId", "device", "Device", "deviceid", "devId", "devid"],
      fromLocation: ["fromLocation", "from", "From", "fromlocation", "fromLoc"],
      toLocation: [
        "toLocation",
        "to",
        "To",
        "location",
        "Location",
        "tolocation",
      ],
      status: ["status", "Status"],
      timeIn: ["timeIn", "in", "In", "time_in", "timeIn", "timein", "timeIN"],
      timeOut: ["timeOut", "out", "Out", "time_out", "timeout", "timeOUT"],
      distanceTraveled: [
        "distanceTraveled",
        "distance",
        "distanceTraveled",
        "distancetraveled",
        "distanceTravel",
        "distanceT",
      ],
    };

    // If the field is in our map, try all possible field names
    if (fieldMap[field]) {
      for (const altField of fieldMap[field]) {
        if (row[altField] !== undefined) {
          return row[altField];
        }
      }
      return null;
    }

    // Otherwise just return the field directly
    return row[field];
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleOpenExportMenu = (event) => {
    setExportMenuAnchorEl(event.currentTarget);
  };

  const handleCloseExportMenu = () => {
    setExportMenuAnchorEl(null);
  };

  // Calculate device usage frequency
  const calculateDeviceUsage = () => {
    // Create a map to track device usage
    const deviceUsageMap = new Map();

    // Process all movements to count usage by device
    filteredData.forEach((row) => {
      const deviceId = getRowValue(row, "deviceId") || "";
      if (!deviceId) return;

      // Count only "In Use" status for usage frequency
      const status = getRowValue(row, "status") || "";
      const isInUse = status.toLowerCase().includes("in use");

      // Get existing entry or create a new one
      if (!deviceUsageMap.has(deviceId)) {
        deviceUsageMap.set(deviceId, {
          deviceId,
          totalMovements: 0,
          inUseCount: 0,
          movements: [],
        });
      }

      const deviceData = deviceUsageMap.get(deviceId);
      deviceData.totalMovements++;
      if (isInUse) deviceData.inUseCount++;
      deviceData.movements.push(row);
    });

    // Convert map to array and calculate usage percentage
    return Array.from(deviceUsageMap.values()).map((device) => ({
      ...device,
      usagePercentage:
        device.totalMovements > 0
          ? Math.round((device.inUseCount / device.totalMovements) * 100)
          : 0,
    }));
  };

  const handleExportCSV = (sortOption = "default") => {
    // Use headers that match the example format
    const headers = [
      "deviceId",
      "fromLocation",
      "toLocation",
      "status",
      "timeIn",
      "timeOut",
      "distanceTraveled",
    ];

    let dataToExport = [...filteredData];
    let filename = "equipment_movements.csv";

    // If sorting by usage frequency is requested
    if (sortOption === "most-to-least" || sortOption === "least-to-most") {
      // Get device usage data
      const deviceUsage = calculateDeviceUsage();

      // Sort by usage percentage
      deviceUsage.sort((a, b) => {
        return sortOption === "most-to-least"
          ? b.usagePercentage - a.usagePercentage
          : a.usagePercentage - b.usagePercentage;
      });

      // Flatten the movements from sorted devices
      dataToExport = deviceUsage.flatMap((device) => device.movements);

      // Update filename to reflect sorting
      filename =
        sortOption === "most-to-least"
          ? "equipment_most_to_least_used.csv"
          : "equipment_least_to_most_used.csv";
    }
    // If filtering for unknown locations is requested
    else if (sortOption === "unknown-locations") {
      // Filter movements with unknown locations
      dataToExport = filteredData.filter((row) => {
        // Check if this row has unknown locations flag
        const hasUnknownLocation =
          getRowValue(row, "hasUnknownLocation") || false;

        if (hasUnknownLocation) {
          return true;
        }

        // Also check if fromLocation or toLocation is marked as unknown
        const unknownLocations = getRowValue(row, "unknownLocations") || [];
        const fromLocation = getRowValue(row, "fromLocation") || "";
        const toLocation = getRowValue(row, "toLocation") || "";

        return (
          unknownLocations.includes(fromLocation) ||
          unknownLocations.includes(toLocation)
        );
      });

      // Update filename to reflect filtering
      filename = "equipment_unknown_locations.csv";
    }

    // Map the data to match the headers
    const csvData = dataToExport.map((row) => {
      // Extract device type and ID
      const deviceId = getRowValue(row, "deviceId") || "";

      return {
        deviceId: deviceId,
        fromLocation: getRowValue(row, "fromLocation") || "Unknown",
        toLocation:
          getRowValue(row, "toLocation") ||
          getRowValue(row, "location") ||
          "Unknown",
        status: getRowValue(row, "status") || "Unknown",
        timeIn: getRowValue(row, "timeIn") || getRowValue(row, "in") || "",
        timeOut: getRowValue(row, "timeOut") || getRowValue(row, "out") || "",
        distanceTraveled:
          getRowValue(row, "distanceTraveled") ||
          getRowValue(row, "distance") ||
          "0",
      };
    });

    const csvContent = convertToCSV(csvData, headers);
    downloadCSV(csvContent, filename);
    handleCloseExportMenu();
  };

  const getComparator = (order, orderBy) => {
    return order === "desc"
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const descendingComparator = (a, b, orderBy) => {
    const aValue = getRowValue(a, orderBy);
    const bValue = getRowValue(b, orderBy);

    if (bValue < aValue) {
      return -1;
    }
    if (bValue > aValue) {
      return 1;
    }
    return 0;
  };

  // Make sure tableData is an array before filtering
  const filteredData = Array.isArray(tableData)
    ? tableData.filter((row) => {
        if (!row) return false;

        try {
          // Check all possible field names
          const fieldsToCheck = [
            getRowValue(row, "deviceId"),
            getRowValue(row, "fromLocation"),
            getRowValue(row, "toLocation"),
            getRowValue(row, "status"),
            getRowValue(row, "timeIn"),
            getRowValue(row, "timeOut"),
          ];

          return fieldsToCheck.some(
            (value) =>
              value !== null &&
              value !== undefined &&
              String(value).toLowerCase().includes(searchTerm.toLowerCase())
          );
        } catch (error) {
          console.error("Error filtering row:", error, row);
          return false;
        }
      })
    : [];

  const sortedData = filteredData.sort(getComparator(order, orderBy));

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading && tableData.length === 0) {
    return (
      <Box className="centered-container">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="content-container">
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TextField
          sx={{ flex: 1, mr: 2 }}
          variant="outlined"
          placeholder="Search equipment data..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          endIcon={<ArrowDropDownIcon />}
          onClick={handleOpenExportMenu}
          disabled={filteredData.length === 0}
          aria-haspopup="true"
          aria-expanded={exportMenuOpen ? "true" : undefined}
          aria-controls={exportMenuOpen ? "export-menu" : undefined}
        >
          Export CSV
        </Button>
        <Menu
          id="export-menu"
          anchorEl={exportMenuAnchorEl}
          open={exportMenuOpen}
          onClose={handleCloseExportMenu}
          MenuListProps={{
            "aria-labelledby": "export-button",
          }}
        >
          <MenuItem onClick={() => handleExportCSV("default")}>
            <ListItemIcon>
              <FileDownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Standard Export</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleExportCSV("most-to-least")}>
            <ListItemIcon>
              <TrendingDownIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Most to Least Used</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleExportCSV("least-to-most")}>
            <ListItemIcon>
              <TrendingUpIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Least to Most Used</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleExportCSV("unknown-locations")}>
            <ListItemIcon>
              <SortByAlphaIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Rooms Not in Floor Plan</ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="equipment data table">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "deviceId"}
                  direction={orderBy === "deviceId" ? order : "asc"}
                  onClick={() => handleRequestSort("deviceId")}
                >
                  Device ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "fromLocation"}
                  direction={orderBy === "fromLocation" ? order : "asc"}
                  onClick={() => handleRequestSort("fromLocation")}
                >
                  From Location
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "toLocation"}
                  direction={orderBy === "toLocation" ? order : "asc"}
                  onClick={() => handleRequestSort("toLocation")}
                >
                  To Location
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "status"}
                  direction={orderBy === "status" ? order : "asc"}
                  onClick={() => handleRequestSort("status")}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "timeIn"}
                  direction={orderBy === "timeIn" ? order : "asc"}
                  onClick={() => handleRequestSort("timeIn")}
                >
                  Time In
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "timeOut"}
                  direction={orderBy === "timeOut" ? order : "asc"}
                  onClick={() => handleRequestSort("timeOut")}
                >
                  Time Out
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "distanceTraveled"}
                  direction={orderBy === "distanceTraveled" ? order : "asc"}
                  onClick={() => handleRequestSort("distanceTraveled")}
                >
                  Distance (feet)
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => {
                if (!row) return null;

                try {
                  // Extract device type and ID
                  const deviceId = getRowValue(row, "deviceId") || "";
                  let deviceType = "Unknown";
                  let deviceNumber = deviceId;

                  // Try to parse device type from the device ID
                  if (deviceId && typeof deviceId === "string") {
                    const parts = deviceId.split(/[-_\s]/);
                    if (parts.length > 1) {
                      deviceType = parts[0];
                      deviceNumber = parts.slice(1).join("-");
                    } else if (deviceId.match(/^[a-zA-Z]+\d+$/)) {
                      // Handle case like "Defibrillator123"
                      const match = deviceId.match(/^([a-zA-Z]+)(\d+)$/);
                      if (match) {
                        deviceType = match[1];
                        deviceNumber = match[2];
                      }
                    }
                  }

                  // Check if this row has unknown locations
                  const hasUnknownLocation =
                    getRowValue(row, "hasUnknownLocation") || false;
                  const unknownLocations =
                    getRowValue(row, "unknownLocations") || [];

                  return (
                    <TableRow
                      key={row._id || index}
                      hover
                      sx={{
                        backgroundColor: hasUnknownLocation
                          ? "rgba(255, 0, 0, 0.05)"
                          : "inherit",
                        "&:hover": {
                          backgroundColor: hasUnknownLocation
                            ? "rgba(255, 0, 0, 0.1)"
                            : undefined,
                        },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography variant="body2" fontWeight="bold">
                            {deviceType}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {deviceNumber}
                          </Typography>
                          {hasUnknownLocation && (
                            <Typography variant="caption" color="error">
                              Unknown location detected
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            color:
                              hasUnknownLocation &&
                              unknownLocations.includes(
                                getRowValue(row, "fromLocation")
                              )
                                ? "error.main"
                                : "inherit",
                          }}
                        >
                          {getRowValue(row, "fromLocation") || "Unknown"}
                          {hasUnknownLocation &&
                            unknownLocations.includes(
                              getRowValue(row, "fromLocation")
                            ) && (
                              <Typography
                                variant="caption"
                                color="error"
                                display="block"
                              >
                                (Not in floor plan)
                              </Typography>
                            )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            color:
                              hasUnknownLocation &&
                              unknownLocations.includes(
                                getRowValue(row, "toLocation")
                              )
                                ? "error.main"
                                : "inherit",
                          }}
                        >
                          {getRowValue(row, "toLocation") ||
                            getRowValue(row, "location") ||
                            "Unknown"}
                          {hasUnknownLocation &&
                            unknownLocations.includes(
                              getRowValue(row, "toLocation")
                            ) && (
                              <Typography
                                variant="caption"
                                color="error"
                                display="block"
                              >
                                (Not in floor plan)
                              </Typography>
                            )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            bgcolor: getStatusColor(getRowValue(row, "status")),
                            color: "white",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            display: "inline-block",
                          }}
                        >
                          {getRowValue(row, "status") || "Unknown"}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {formatDate(
                          getRowValue(row, "timeIn") || getRowValue(row, "in")
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(
                          getRowValue(row, "timeOut") || getRowValue(row, "out")
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const distance =
                            getRowValue(row, "distanceTraveled") ||
                            getRowValue(row, "distance") ||
                            "0";
                          // Apply 1.6 multiplier if it's a number
                          if (!isNaN(parseFloat(distance))) {
                            const distanceValue = parseFloat(distance) * 1.6;
                            return distanceValue.toFixed(2);
                          }
                          return distance;
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                } catch (error) {
                  console.error("Error rendering row:", error, row);
                  return null;
                }
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1">
                    {searchTerm
                      ? "No matching records found"
                      : "No data available"}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
}

export default DataTable;
