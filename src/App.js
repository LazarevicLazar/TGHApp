import React, { useState, useEffect } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  TableChart as TableChartIcon,
  Map as MapIcon,
  CloudUpload as CloudUploadIcon,
  Menu as MenuIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon,
  LocationOn as LocationOnIcon,
} from "@mui/icons-material";
import { useDataContext } from "./context/DataContext";

// Import views
import Dashboard from "./views/Dashboard";
import DataTable from "./views/DataTable";
import HeatMap from "./views/HeatMap";
import ImportData from "./views/ImportData";
import OptimizationAnalysis from "./views/OptimizationAnalysis";

// Define views
const views = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <DashboardIcon />,
    component: Dashboard,
  },
  {
    id: "data-table",
    label: "Data Table",
    icon: <TableChartIcon />,
    component: DataTable,
  },
  { id: "heat-map", label: "Heat Map", icon: <MapIcon />, component: HeatMap },
  {
    id: "optimization",
    label: "Optimization Analysis",
    icon: <AnalyticsIcon />,
    component: OptimizationAnalysis,
  },
  {
    id: "import-data",
    label: "Import Data",
    icon: <CloudUploadIcon />,
    component: ImportData,
  },
];

const drawerWidth = 240;

function App() {
  const { movements } = useDataContext();
  const [currentView, setCurrentView] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [deviceLocations, setDeviceLocations] = useState([]);

  // Process device locations when movements change
  useEffect(() => {
    if (movements && movements.length > 0) {
      // Create a map to track the latest movement for each device
      const deviceMap = new Map();

      // Process all movements to find the latest one for each device
      movements.forEach((movement) => {
        const deviceId = movement.deviceId;
        if (!deviceId) return;

        // Get existing entry or create a new one
        const existing = deviceMap.get(deviceId);

        // Check if this movement is newer than the existing one
        if (
          !existing ||
          (movement.timeIn &&
            existing.timeIn &&
            new Date(movement.timeIn) > new Date(existing.timeIn))
        ) {
          deviceMap.set(deviceId, {
            deviceId,
            location: movement.toLocation || "Unknown",
            timeIn: movement.timeIn,
            status: movement.status || "Unknown",
          });
        }
      });

      // Convert map to array and sort by device ID
      const locations = Array.from(deviceMap.values()).sort((a, b) =>
        a.deviceId.localeCompare(b.deviceId)
      );

      setDeviceLocations(locations);
    }
  }, [movements]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    setMobileOpen(false);
  };

  const handleEmergencyClick = () => {
    setEmergencyDialogOpen(true);
  };

  const handleCloseEmergencyDialog = () => {
    setEmergencyDialogOpen(false);
  };

  // Get current view component
  const CurrentViewComponent =
    views.find((view) => view.id === currentView)?.component || Dashboard;

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          RTLS Equipment Tracker
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {views.map((view) => (
          <ListItem
            button
            key={view.id}
            onClick={() => handleViewChange(view.id)}
            selected={currentView === view.id}
          >
            <ListItemIcon>{view.icon}</ListItemIcon>
            <ListItemText primary={view.label} />
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          color="error"
          fullWidth
          startIcon={<WarningIcon />}
          onClick={handleEmergencyClick}
          sx={{
            py: 1.5,
            fontWeight: "bold",
            boxShadow: 3,
            "&:hover": {
              boxShadow: 5,
              transform: "scale(1.02)",
            },
          }}
        >
          EMERGENCY
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {views.find((view) => view.id === currentView)?.label ||
              "Dashboard"}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginTop: "64px", // AppBar height
          overflow: "auto", // Enable scrolling in the main content area
          height: "calc(100vh - 64px)", // Full height minus AppBar
        }}
      >
        <CurrentViewComponent />
      </Box>

      {/* Emergency Dialog */}
      <Dialog
        open={emergencyDialogOpen}
        onClose={handleCloseEmergencyDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: "error.main",
            color: "white",
            display: "flex",
            alignItems: "center",
          }}
        >
          <WarningIcon sx={{ mr: 1 }} />
          Emergency: Last Known Device Locations
        </DialogTitle>
        <DialogContent dividers>
          {deviceLocations.length > 0 ? (
            <TableContainer component={Paper}>
              <Table aria-label="device locations table">
                <TableHead>
                  <TableRow>
                    <TableCell>Device ID</TableCell>
                    <TableCell>Last Location</TableCell>
                    <TableCell>Last Seen</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deviceLocations.map((device) => (
                    <TableRow key={device.deviceId}>
                      <TableCell component="th" scope="row">
                        {device.deviceId}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <LocationOnIcon
                            sx={{ mr: 1, color: "primary.main" }}
                          />
                          {device.location}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {device.timeIn
                          ? new Date(device.timeIn).toLocaleString()
                          : "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "inline-block",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            bgcolor: device.status
                              .toLowerCase()
                              .includes("in use")
                              ? "success.light"
                              : "info.light",
                            color: device.status
                              .toLowerCase()
                              .includes("in use")
                              ? "success.dark"
                              : "info.dark",
                          }}
                        >
                          {device.status}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No device location data available.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseEmergencyDialog}
            color="primary"
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
