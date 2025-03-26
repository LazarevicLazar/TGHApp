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
} from "@mui/material";
import {
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
} from "@mui/icons-material";
import { useDataContext } from "../context/DataContext";
import { formatDate, downloadCSV, convertToCSV } from "../utils/helpers";

function DataTable() {
  const { movements, loading } = useDataContext();
  const [tableData, setTableData] = useState([]);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("deviceId");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

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
      deviceId: ["deviceId", "device", "Device"],
      fromLocation: ["fromLocation", "from", "From"],
      toLocation: ["toLocation", "to", "To", "location", "Location"],
      status: ["status", "Status"],
      timeIn: ["timeIn", "in", "In", "time_in"],
      timeOut: ["timeOut", "out", "Out", "time_out"],
      distanceTraveled: ["distanceTraveled", "distance"],
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

  const handleExportCSV = () => {
    const headers = [
      "deviceId",
      "fromLocation",
      "toLocation",
      "status",
      "timeIn",
      "timeOut",
      "distanceTraveled",
    ];
    const csvData = filteredData.map((row) => ({
      deviceId: getRowValue(row, "deviceId"),
      fromLocation: getRowValue(row, "fromLocation"),
      toLocation: getRowValue(row, "toLocation"),
      status: getRowValue(row, "status"),
      timeIn: getRowValue(row, "timeIn"),
      timeOut: getRowValue(row, "timeOut"),
      distanceTraveled: getRowValue(row, "distanceTraveled"),
    }));

    const csvContent = convertToCSV(csvData, headers);
    downloadCSV(csvContent, "equipment_movements.csv");
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
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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
          onClick={handleExportCSV}
          disabled={filteredData.length === 0}
        >
          Export CSV
        </Button>
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
                  Device
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
                  Distance (m)
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <TableRow key={row._id} hover>
                  <TableCell>{getRowValue(row, "deviceId")}</TableCell>
                  <TableCell>{getRowValue(row, "fromLocation")}</TableCell>
                  <TableCell>{getRowValue(row, "toLocation")}</TableCell>
                  <TableCell>{getRowValue(row, "status")}</TableCell>
                  <TableCell>
                    {formatDate(getRowValue(row, "timeIn"))}
                  </TableCell>
                  <TableCell>
                    {formatDate(getRowValue(row, "timeOut"))}
                  </TableCell>
                  <TableCell>
                    {getRowValue(row, "distanceTraveled") || 0}
                  </TableCell>
                </TableRow>
              ))
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
