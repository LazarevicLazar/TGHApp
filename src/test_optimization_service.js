// Test script for OptimizationService
const fs = require("fs");
const path = require("path");
const optimizationService = require("./services/OptimizationService").default;

console.log("Starting OptimizationService test...");

// Load sample data
async function loadSampleData() {
  try {
    // Read sample CSV data
    const csvPath = path.join(__dirname, "assets/sample_data.csv");
    const csvData = fs.readFileSync(csvPath, "utf8");

    console.log("Loaded sample data from:", csvPath);

    // Parse CSV data
    const lines = csvData
      .split("\n")
      .filter((line) => line.trim() && !isNaN(line.charAt(0)));

    // Parse CSV data
    const sampleMovements = lines.map((line) => {
      const [Device, Location, Status, In, Out] = line.split(",");
      return {
        deviceId: Device,
        Location,
        Status,
        In,
        Out,
        // Add these fields for compatibility with our visualization
        fromLocation: null, // Will be calculated in sequence
        toLocation: Location,
      };
    });

    // Process movements to add fromLocation based on previous movement
    const deviceMovements = {};
    sampleMovements.forEach((movement) => {
      const deviceId = movement.deviceId;
      if (!deviceMovements[deviceId]) {
        deviceMovements[deviceId] = [];
      }
      deviceMovements[deviceId].push(movement);
    });

    // Sort by time and set fromLocation
    Object.values(deviceMovements).forEach((movements) => {
      movements.sort((a, b) => new Date(a.In) - new Date(b.In));

      for (let i = 1; i < movements.length; i++) {
        movements[i].fromLocation = movements[i - 1].Location;
      }
    });

    // Flatten back to array
    const processedMovements = Object.values(deviceMovements).flat();

    console.log(`Processed ${processedMovements.length} sample movements`);
    return processedMovements;
  } catch (error) {
    console.error("Error loading sample data:", error);
    return [];
  }
}

// Load graph data
async function loadGraphData() {
  try {
    const graphPath = path.join(__dirname, "../public/graph_data.json");
    const graphData = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    console.log("Loaded graph data from:", graphPath);
    return graphData;
  } catch (error) {
    console.error("Error loading graph data:", error);
    return null;
  }
}

// Load floor plan data
async function loadFloorPlanData() {
  try {
    const floorPlanPath = path.join(
      __dirname,
      "../public/floor_plan_progress.json"
    );
    const floorPlanData = JSON.parse(fs.readFileSync(floorPlanPath, "utf8"));
    console.log("Loaded floor plan data from:", floorPlanPath);
    return floorPlanData;
  } catch (error) {
    console.error("Error loading floor plan data:", error);
    return null;
  }
}

// Main test function
async function runTest() {
  try {
    // Load data
    const movements = await loadSampleData();
    const graphData = await loadGraphData();
    const floorPlanData = await loadFloorPlanData();

    if (!movements.length) {
      console.error("No movements data available for testing");
      return;
    }

    // Initialize optimization service
    console.log("Initializing OptimizationService...");
    optimizationService.initialize(graphData, floorPlanData);

    // Test walking distance optimization
    console.log("\n--- Testing Walking Distance Optimization ---");
    const walkingRecs = optimizationService.optimizeWalkingDistance(movements);
    console.log(
      `Generated ${walkingRecs.length} walking distance recommendations`
    );
    if (walkingRecs.length > 0) {
      console.log("Sample walking distance recommendation:");
      console.log(JSON.stringify(walkingRecs[0], null, 2));
    }

    // Test utilization analysis
    console.log("\n--- Testing Utilization Analysis ---");
    const utilizationResults =
      optimizationService.analyzeUtilization(movements);
    console.log(
      `Generated ${utilizationResults.recommendations.length} utilization recommendations`
    );
    if (utilizationResults.recommendations.length > 0) {
      console.log("Sample utilization recommendation:");
      console.log(
        JSON.stringify(utilizationResults.recommendations[0], null, 2)
      );
    }

    // Test maintenance prediction
    console.log("\n--- Testing Maintenance Prediction ---");
    const maintenanceRecs = optimizationService.predictMaintenance(movements);
    console.log(
      `Generated ${maintenanceRecs.length} maintenance recommendations`
    );
    if (maintenanceRecs.length > 0) {
      console.log("Sample maintenance recommendation:");
      console.log(JSON.stringify(maintenanceRecs[0], null, 2));
    }

    // Test full recommendation generation
    console.log("\n--- Testing Full Recommendation Generation ---");
    const allRecs = optimizationService.generateRecommendations(movements);
    console.log(`Generated ${allRecs.length} total recommendations`);

    // Count recommendations by type
    const recTypes = {};
    allRecs.forEach((rec) => {
      recTypes[rec.type] = (recTypes[rec.type] || 0) + 1;
    });

    console.log("Recommendations by type:");
    Object.entries(recTypes).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });

    // Check for zero values in placement recommendations
    const placementRecs = allRecs.filter((rec) => rec.type === "placement");
    const zeroValueRecs = placementRecs.filter(
      (rec) =>
        rec.hoursSaved === 0 ||
        rec.distanceSaved === 0 ||
        rec.movementsPerMonth === 0 ||
        rec.currentTotalDistance === 0 ||
        rec.optimalTotalDistance === 0
    );

    console.log(
      `\nFound ${zeroValueRecs.length} placement recommendations with zero values out of ${placementRecs.length} total`
    );

    if (zeroValueRecs.length > 0) {
      console.log("Sample zero-value recommendation:");
      console.log(JSON.stringify(zeroValueRecs[0], null, 2));
    }

    console.log("\nOptimizationService test completed successfully!");
  } catch (error) {
    console.error("Error running OptimizationService test:", error);
  }
}

// Run the test
runTest();
