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

  try {
    // Load graph data for distance calculations
    let graphData = null;
    try {
      const graphDataPath = path.join(__dirname, "../public/graph_data.json");
      const graphDataContent = fs.readFileSync(graphDataPath, "utf8");
      graphData = JSON.parse(graphDataContent);
      console.log("Graph data loaded successfully");
    } catch (error) {
      console.error("Error loading graph data:", error);
      // Continue without graph data
    }

    // Group records by device ID
    const deviceRecords = {};

    for (const record of records) {
      const deviceId = record.device || record.Device || "";
      if (!deviceId) continue;

      if (!deviceRecords[deviceId]) {
        deviceRecords[deviceId] = [];
      }

      deviceRecords[deviceId].push(record);
    }

    // Process each device's records
    for (const [deviceId, deviceRecs] of Object.entries(deviceRecords)) {
      const deviceType = deviceId.split("-")[0] || "Unknown";

      // Count how many records have "In Use" status
      const inUseCount = deviceRecs.filter((rec) =>
        (rec.status || rec.Status || "").toLowerCase().includes("in use")
      ).length;

      // Calculate the percentage of time the device is in use
      const inUsePercentage = Math.round(
        (inUseCount / deviceRecs.length) * 100
      );

      // Get the latest status
      const latestStatus =
        deviceRecs[deviceRecs.length - 1]?.status ||
        deviceRecs[deviceRecs.length - 1]?.Status ||
        "Unknown";

      // Create or update device
      const device = {
        deviceId,
        deviceType,
        status: latestStatus,
        lastMaintenance: null,
        totalUsageHours: 0,
        currentLocation:
          deviceRecs[deviceRecs.length - 1]?.location ||
          deviceRecs[deviceRecs.length - 1]?.Location ||
          "Unknown",
        inUseCount,
        totalCount: deviceRecs.length,
        usagePercentage: inUsePercentage,
        metadata: {},
      };

      // Upsert device
      await db.devices.update(
        { deviceId: device.deviceId },
        { $set: device },
        { upsert: true }
      );

      console.log(
        `Updated device: ${deviceId} with usage: ${inUsePercentage}%`
      );

      // Sort records by time (if available)
      deviceRecs.sort((a, b) => {
        const timeA = a.in || a.In || a.timeIn || "";
        const timeB = b.in || b.In || b.timeIn || "";
        return timeA.localeCompare(timeB);
      });

      // Create movement records by pairing consecutive locations
      for (let i = 0; i < deviceRecs.length - 1; i++) {
        const currentRecord = deviceRecs[i];
        const nextRecord = deviceRecs[i + 1];

        // Get locations
        const fromLocation =
          currentRecord.location || currentRecord.Location || "Unknown";
        const toLocation =
          nextRecord.location || nextRecord.Location || "Unknown";

        // Skip movements where the device moves from the same room to the same room
        if (fromLocation === toLocation) {
          console.log(
            `Skipping movement for ${deviceId} from ${fromLocation} to ${toLocation} (same location)`
          );
          continue;
        }

        // Ensure both locations exist in the database
        for (const loc of [fromLocation, toLocation]) {
          if (loc !== "Unknown") {
            const location = {
              locationId: loc,
              name: loc,
              coordinates: [0, 0], // Will be updated from floor plan data
              metadata: {},
            };

            await db.locations.update(
              { locationId: location.locationId },
              { $set: location },
              { upsert: true }
            );
          }
        }

        // Calculate distance if graph data is available
        let distance = 0;
        if (
          graphData &&
          fromLocation !== "Unknown" &&
          toLocation !== "Unknown"
        ) {
          // Look for direct edge
          const directEdge = graphData.edges.find(
            (edge) =>
              (edge[0] === fromLocation && edge[1] === toLocation) ||
              (edge[0] === toLocation && edge[1] === fromLocation)
          );

          if (directEdge) {
            // Round distance to 1 decimal point
            distance = Math.round(directEdge[2] * 10) / 10;
          }
        }

        // Create movement record
        const movement = {
          deviceId,
          fromLocation,
          toLocation,
          timeIn:
            currentRecord.in ||
            currentRecord.In ||
            currentRecord.timeIn ||
            new Date().toISOString(),
          timeOut:
            nextRecord.in ||
            nextRecord.In ||
            nextRecord.timeIn ||
            new Date().toISOString(),
          status: currentRecord.status || currentRecord.Status || "Unknown",
          distanceTraveled: distance,
          createdAt: new Date(),
        };

        // Insert movement
        await db.movements.insert(movement);

        processedRecords.push({
          ...currentRecord,
          deviceType,
          fromLocation,
          toLocation,
          distanceTraveled: distance,
          processed: true,
        });
      }
    }

    return processedRecords;
  } catch (error) {
    console.error("Error processing imported data:", error);
    throw error;
  }
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
