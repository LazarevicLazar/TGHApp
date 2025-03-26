const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { parse } = require("csv-parse/sync");
const Datastore = require("nedb-promises");

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

// Database instances
let db = {
  devices: null,
  locations: null,
  movements: null,
  recommendations: null,
};

// Initialize databases
async function initializeDatabase() {
  const dbPath = path.join(app.getPath("userData"), "databases");

  // Ensure the database directory exists
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  // Initialize database collections
  db.devices = Datastore.create({
    filename: path.join(dbPath, "devices.db"),
    autoload: true,
  });

  db.locations = Datastore.create({
    filename: path.join(dbPath, "locations.db"),
    autoload: true,
  });

  db.movements = Datastore.create({
    filename: path.join(dbPath, "movements.db"),
    autoload: true,
  });

  db.recommendations = Datastore.create({
    filename: path.join(dbPath, "recommendations.db"),
    autoload: true,
  });

  // Create indexes for faster queries
  db.devices.ensureIndex({ fieldName: "deviceId", unique: true });
  db.locations.ensureIndex({ fieldName: "locationId", unique: true });

  // Clear recommendations database on startup
  await db.recommendations.remove({}, { multi: true });

  console.log("Databases initialized at:", dbPath);
}

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the app
  const startUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:5000"
      : `file://${path.join(__dirname, "../build/index.html")}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development mode
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// App lifecycle events
app.on("ready", () => {
  initializeDatabase();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for communication with renderer process

// Open file dialog to select CSV files
ipcMain.handle("open-file-dialog", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
  });

  if (canceled) {
    return null;
  }

  return filePaths[0];
});

// Read CSV file
ipcMain.handle("read-csv-file", async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content;
  } catch (error) {
    console.error("Error reading CSV file:", error);
    throw error;
  }
});

// Import data from CSV
ipcMain.handle("import-csv-data", async (event, csvData) => {
  try {
    // Parse CSV data
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
    });

    // Process and store the data
    const processedRecords = await processImportedData(records);

    return {
      success: true,
      count: processedRecords.length,
      data: processedRecords,
    };
  } catch (error) {
    console.error("Error importing CSV data:", error);
    throw error;
  }
});

// Process imported data
async function processImportedData(records) {
  const processedRecords = [];

  for (const record of records) {
    // Extract device type from device name
    const deviceId = record.device || record.Device || "";
    const deviceType = deviceId.split("-")[0] || "Unknown";

    // Create or update device
    const device = {
      deviceId,
      deviceType,
      status: record.status || record.Status || "Unknown",
      lastMaintenance: null,
      totalUsageHours: 0,
      currentLocation: record.location || record.Location || "Unknown",
      metadata: {},
    };

    // Upsert device (insert if not exists, update if exists)
    await db.devices.update(
      { deviceId: device.deviceId },
      { $set: device },
      { upsert: true }
    );

    // Create or update location
    const locationId = record.location || record.Location || "Unknown";
    const location = {
      locationId,
      name: locationId,
      coordinates: [0, 0], // Will be updated from floor plan data
      metadata: {},
    };

    // Upsert location
    await db.locations.update(
      { locationId: location.locationId },
      { $set: location },
      { upsert: true }
    );

    // Create movement record
    const movement = {
      deviceId,
      fromLocation: record.fromLocation || "Unknown",
      toLocation: locationId,
      timeIn: record.in || record.In || new Date().toISOString(),
      timeOut: record.out || record.Out || new Date().toISOString(),
      status: record.status || record.Status || "Unknown",
      distanceTraveled: 0, // Will be calculated from graph data
      createdAt: new Date(),
    };

    // Insert movement
    await db.movements.insert(movement);

    processedRecords.push({
      ...record,
      deviceType,
      processed: true,
    });
  }

  return processedRecords;
}

// Get all devices
ipcMain.handle("get-devices", async () => {
  try {
    const devices = await db.devices.find({});
    return devices;
  } catch (error) {
    console.error("Error getting devices:", error);
    throw error;
  }
});

// Get all locations
ipcMain.handle("get-locations", async () => {
  try {
    const locations = await db.locations.find({});
    return locations;
  } catch (error) {
    console.error("Error getting locations:", error);
    throw error;
  }
});

// Get all movements
ipcMain.handle("get-movements", async () => {
  try {
    const movements = await db.movements.find({}).sort({ timeIn: -1 });
    return movements;
  } catch (error) {
    console.error("Error getting movements:", error);
    throw error;
  }
});

// Get all recommendations
ipcMain.handle("get-recommendations", async () => {
  try {
    const recommendations = await db.recommendations
      .find({})
      .sort({ createdAt: -1 });
    return recommendations;
  } catch (error) {
    console.error("Error getting recommendations:", error);
    throw error;
  }
});

// Generate recommendations
ipcMain.handle("generate-recommendations", async () => {
  try {
    // Check if there's any data in the database
    const devicesCount = await db.devices.count({});
    const movementsCount = await db.movements.count({});

    if (devicesCount === 0 || movementsCount === 0) {
      // No data imported yet
      return {
        success: false,
        message: "No data imported yet. Please import data first.",
      };
    }

    // Clear existing recommendations before generating new ones
    await db.recommendations.remove({}, { multi: true });

    // This would call the optimization algorithms
    // For now, we'll just return some sample recommendations
    const recommendationsData = [
      {
        type: "placement",
        title: "Optimize Ventilator Placement",
        description:
          "Moving ventilators from ICU storage to Emergency Department would reduce staff walking distance by approximately 15%.",
        savings: "~120 hours/month",
        implemented: false,
        createdAt: new Date(),
      },
      {
        type: "purchase",
        title: "Additional IV Pumps Needed",
        description:
          "Current IV pumps are utilized at 90% capacity. Adding 5 more units would reduce wait times and improve patient care.",
        savings: "~$15,000/year",
        implemented: false,
        createdAt: new Date(),
      },
      {
        type: "maintenance",
        title: "Maintenance Schedule Optimization",
        description:
          "Ultrasound machines in Radiology are approaching maintenance thresholds based on usage patterns.",
        savings: "Preventative maintenance",
        implemented: false,
        createdAt: new Date(),
      },
    ];

    // Clear existing recommendations
    await db.recommendations.remove({}, { multi: true });

    // Store recommendations in database and collect inserted docs with IDs
    const recommendations = [];
    for (const rec of recommendationsData) {
      const insertedRec = await db.recommendations.insert(rec);
      recommendations.push(insertedRec);
    }

    return { success: true, recommendations };
  } catch (error) {
    console.error("Error generating recommendations:", error);
    throw error;
  }
});

// Implement recommendation
ipcMain.handle("implement-recommendation", async (event, recommendationId) => {
  try {
    // Remove the recommendation from the database
    const numRemoved = await db.recommendations.remove(
      { _id: recommendationId },
      {}
    );
    return { success: true, numRemoved };
  } catch (error) {
    console.error("Error implementing recommendation:", error);
    throw error;
  }
});

// Reset database
ipcMain.handle("reset-database", async () => {
  try {
    // Clear all databases
    await db.devices.remove({}, { multi: true });
    await db.locations.remove({}, { multi: true });
    await db.movements.remove({}, { multi: true });
    await db.recommendations.remove({}, { multi: true });

    console.log("All databases cleared successfully");
    return { success: true, message: "All databases cleared successfully" };
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
});
