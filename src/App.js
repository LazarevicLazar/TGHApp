import React, { useState } from "react";
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
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  TableChart as TableChartIcon,
  Map as MapIcon,
  CloudUpload as CloudUploadIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";

// Import views
import Dashboard from "./views/Dashboard";
import DataTable from "./views/DataTable";
import HeatMap from "./views/HeatMap";
import ImportData from "./views/ImportData";

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
    id: "import-data",
    label: "Import Data",
    icon: <CloudUploadIcon />,
    component: ImportData,
  },
];

const drawerWidth = 240;

function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    setMobileOpen(false);
  };

  // Get current view component
  const CurrentViewComponent =
    views.find((view) => view.id === currentView)?.component || Dashboard;

  const drawer = (
    <div>
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
    </div>
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
    </Box>
  );
}

export default App;
