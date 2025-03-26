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
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useDataContext } from "../context/DataContext";

// Sample data for initial rendering
const sampleData = [
  {
    id: 1,
    device: "Ventilator-001",
    location: "Emergency-A",
    status: "In Use",
    timeIn: "2025-03-05 08:30:00",
    timeOut: "2025-03-05 14:45:00",
    distanceTraveled: 120,
  },
  {
    id: 2,
    device: "Ultrasound-003",
    location: "Radiology-B",
    status: "Available",
    timeIn: "2025-03-05 09:15:00",
    timeOut: "2025-03-05 11:30:00",
    distanceTraveled: 85,
  },
  {
    id: 3,
    device: "Defibrillator-007",
    location: "ICU-C",
    status: "In Use",
    timeIn: "2025-03-05 07:45:00",
    timeOut: "2025-03-05 16:20:00",
    distanceTraveled: 0,
  },
  {
    id: 4,
    device: "IV-Pump-012",
    location: "Surgery-A",
    status: "Maintenance",
    timeIn: "2025-03-04 14:30:00",
    timeOut: "2025-03-05 10:15:00",
    distanceTraveled: 210,
  },
  {
    id: 5,
    device: "Monitor-023",
    location: "Emergency-B",
    status: "In Use",
    timeIn: "2025-03-05 06:00:00",
    timeOut: "2025-03-05 18:00:00",
    distanceTraveled: 45,
  },
  {
    id: 6,
    device: "Ventilator-002",
    location: "ICU-A",
    status: "Available",
    timeIn: "2025-03-05 10:30:00",
    timeOut: "2025-03-05 13:45:00",
    distanceTraveled: 75,
  },
  {
    id: 7,
    device: "Ultrasound-005",
    location: "Emergency-C",
    status: "In Use",
    timeIn: "2025-03-05 11:15:00",
    timeOut: "2025-03-05 15:30:00",
    distanceTraveled: 130,
  },
  {
    id: 8,
    device: "Defibrillator-003",
    location: "Surgery-B",
    status: "Available",
    timeIn: "2025-03-05 08:45:00",
    timeOut: "2025-03-05 12:20:00",
    distanceTraveled: 95,
  },
  {
    id: 9,
    device: "IV-Pump-008",
    location: "ICU-B",
    status: "In Use",
    timeIn: "2025-03-05 09:30:00",
    timeOut: "2025-03-05 17:15:00",
    distanceTraveled: 180,
  },
  {
    id: 10,
    device: "Monitor-015",
    location: "Radiology-A",
    status: "Maintenance",
    timeIn: "2025-03-04 16:00:00",
    timeOut: "2025-03-05 11:00:00",
    distanceTraveled: 60,
  },
];

function DataTable() {
  const { data, loading } = useDataContext();
  const [tableData, setTableData] = useState(sampleData);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("device");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // In a real implementation, this would use the actual data from context
    if (data && data.length > 0) {
      setTableData(data);
    }
  }, [data]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Helper function to get value from row considering both lowercase and uppercase field names
  const getRowValue = (row, field) => {
    // Map lowercase field names to their uppercase equivalents
    const fieldMap = {
      device: ["Device", "device_id"],
      location: ["Location", "location_id"],
      status: ["Status", "status"],
      timeIn: ["In", "time_in"],
      timeOut: ["Out", "time_out"],
      distanceTraveled: ["distanceTraveled"],
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

  const filteredData = tableData.filter((row) => {
    // Check all possible field names
    const fieldsToCheck = [
      getRowValue(row, "device"),
      getRowValue(row, "location"),
      getRowValue(row, "status"),
      getRowValue(row, "timeIn"),
      getRowValue(row, "timeOut"),
    ];

    return fieldsToCheck.some(
      (value) =>
        value !== null &&
        value !== undefined &&
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const sortedData = filteredData.sort(getComparator(order, orderBy));

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box className="centered-container">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="content-container">
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
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
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="equipment data table">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "device"}
                  direction={orderBy === "device" ? order : "asc"}
                  onClick={() => handleRequestSort("device")}
                >
                  Device
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "location"}
                  direction={orderBy === "location" ? order : "asc"}
                  onClick={() => handleRequestSort("location")}
                >
                  Location
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
                  Distance Traveled (m)
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.Device || row.device_id}</TableCell>
                  <TableCell>{row.Location || row.location_id}</TableCell>
                  <TableCell>{row.Status || row.status}</TableCell>
                  <TableCell>{row.In || row.time_in}</TableCell>
                  <TableCell>{row.Out || row.time_out}</TableCell>
                  <TableCell>{row.distanceTraveled || 0}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
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
        rowsPerPageOptions={[5, 10, 25]}
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
