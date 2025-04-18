/**
 * Equipment Optimizer Module
 *
 * This module provides algorithms for:
 * 1. Finding optimal storage locations for equipment to minimize travel distance
 * 2. Determining if additional equipment purchases are needed
 * 3. Predicting maintenance needs based on usage patterns
 */

class Equipment {
  constructor(name) {
    this.name = name;
    this.deviceId = name;
    this.storageLocation = null;
    this.usageHistory = []; // [room, status, inTime, outTime]
    this.totalUsageHours = 0; // Total hours the device has been in use
    this.lastMaintenance = null; // Date of last maintenance
  }

  addUsage(room, status, timeIn, timeOut) {
    this.usageHistory.push([room, status, timeIn, timeOut]);

    // Calculate and add usage hours if status is "in use"
    if (status.toLowerCase() === "in use") {
      const start = new Date(timeIn);
      const end = new Date(timeOut);
      if (start && end && end > start) {
        const usageHours = (end - start) / (1000 * 60 * 60);
        this.totalUsageHours += usageHours;
      }
    }
  }

  getStorageLocation() {
    const counts = {};
    for (let [room, status] of this.usageHistory) {
      if (status.toLowerCase() === "available") {
        counts[room] = (counts[room] || 0) + 1;
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : null;
  }

  shouldPurchaseMore(graph) {
    const usageByDay = {};

    for (let [room, status, timeIn, timeOut] of this.usageHistory) {
      const date = new Date(timeIn).toISOString().split("T")[0];
      if (!usageByDay[date]) {
        usageByDay[date] = {
          inUse: 0,
          available: 0,
          rooms: new Set(),
          path: [],
        };
      }

      const duration = (new Date(timeOut) - new Date(timeIn)) / (1000 * 60);
      usageByDay[date].rooms.add(room);
      usageByDay[date].path.push(room);

      if (status.toLowerCase() === "in use") {
        usageByDay[date].inUse += duration;
      } else if (status.toLowerCase() === "available") {
        usageByDay[date].available += duration;
      }
    }

    const days = Object.values(usageByDay);
    if (!days.length) return false;

    let totalDistance = 0;
    let totalRooms = 0;
    const usageRatios = [];

    for (let day of days) {
      const total = day.inUse + day.available;
      totalRooms += day.rooms.size;
      if (total > 0) usageRatios.push(day.inUse / total);

      const path = Array.from(day.path);
      for (let i = 1; i < path.length; i++) {
        const r1 = path[i - 1];
        const r2 = path[i];
        if (graph.hasNode(r1) && graph.hasNode(r2)) {
          try {
            const weight = graph.edge(r1, r2) || graph.edge(r2, r1);
            if (weight) totalDistance += weight;
          } catch {}
        }
      }
    }

    const avgUsageRatio =
      usageRatios.reduce((a, b) => a + b, 0) / usageRatios.length;
    const avgRoomsPerDay = totalRooms / days.length;
    const avgDistancePerDay = totalDistance / days.length;

    return {
      needsMore:
        avgUsageRatio > 0.8 || avgRoomsPerDay > 12 || avgDistancePerDay > 250,
      metrics: {
        avgUsageRatio,
        avgRoomsPerDay,
        avgDistancePerDay,
      },
    };
  }

  needsMaintenance() {
    // Define maintenance thresholds by device type
    const maintenanceThresholds = {
      Ventilator: 500,
      Ultrasound: 300,
      Defibrillator: 200,
      "IV-Pump": 1000,
      Monitor: 800,
      default: 500,
    };

    // Extract device type from device ID
    const deviceType = this.deviceId.split("-")[0];
    const threshold =
      maintenanceThresholds[deviceType] || maintenanceThresholds.default;

    // Check if total usage hours exceed the threshold
    const needsMaintenance = this.totalUsageHours >= threshold;

    // Calculate urgency level (0-1)
    const urgencyLevel = this.totalUsageHours / threshold;

    return {
      needsMaintenance,
      urgencyLevel,
      hoursUsed: this.totalUsageHours,
      threshold,
      deviceType,
    };
  }
}

/**
 * Find the optimal storage location for a piece of equipment
 * @param {Equipment} equipment - The equipment object
 * @param {Object} graph - The graph object with nodes and edges
 * @returns {Object} The optimal location and distance savings
 */
function findOptimalStorageLocation(equipment, graph) {
  const useCounts = {},
    availableCounts = {};

  for (let [room, status] of equipment.usageHistory) {
    if (!graph.hasNode(room)) continue;

    if (status.toLowerCase() === "in use") {
      useCounts[room] = (useCounts[room] || 0) + 1;
    } else if (status.toLowerCase() === "available") {
      availableCounts[room] = (availableCounts[room] || 0) + 1;
    }
  }

  // Get storage locations (rooms with "STOR" in the name)
  const storageLocations = Object.keys(availableCounts).filter(
    (room) => room.includes("STOR") || room.toLowerCase().includes("storage")
  );

  // If no storage locations found, use all available locations
  const potentialLocations =
    storageLocations.length > 0
      ? storageLocations
      : Object.keys(availableCounts);

  let bestRoom =
    equipment.getStorageLocation() || Object.keys(availableCounts)[0];
  let minDistance = computeTotalDistance(graph, bestRoom, useCounts);

  for (let room of potentialLocations) {
    if (room === bestRoom) continue;
    let dist = computeTotalDistance(graph, room, useCounts);
    if (dist < minDistance) {
      bestRoom = room;
      minDistance = dist;
    }
  }

  const currentLocation = equipment.getStorageLocation();
  const savings = calculateDistanceSavings(equipment, graph, bestRoom);

  return {
    currentLocation,
    optimalLocation: bestRoom,
    distanceSaved: savings.saved,
    percentImprovement: savings.percentChange,
    hoursSaved: savings.hoursSaved,
    movementsPerMonth: savings.movementsPerMonth,
    minDistance,
  };
}

/**
 * Compute the total distance from a source room to all target rooms
 * @param {Object} graph - The graph object with nodes and edges
 * @param {string} sourceRoom - The source room
 * @param {Object} targets - Object mapping target rooms to frequency
 * @returns {number} The total distance
 */
function computeTotalDistance(graph, sourceRoom, targets) {
  let total = 0;
  for (let [target, freq] of Object.entries(targets)) {
    if (target === sourceRoom) continue;
    try {
      const weight =
        graph.edge(sourceRoom, target) || graph.edge(target, sourceRoom);
      if (weight !== undefined) total += weight * freq;
    } catch {}
  }
  return total;
}

/**
 * Calculate the distance savings from moving equipment to a new storage location
 * @param {Equipment} equipment - The equipment object
 * @param {Object} graph - The graph object with nodes and edges
 * @param {string} newStorageLocation - The new storage location
 * @returns {Object} The distance saved and percent change
 */
function calculateDistanceSavings(equipment, graph, newStorageLocation) {
  const currentStorage = equipment.getStorageLocation();
  if (!currentStorage || currentStorage === newStorageLocation)
    return { saved: 0, percentChange: 0, hoursSaved: 0, movementsPerMonth: 0 };

  const originalPath = [];
  const modifiedPath = [];

  equipment.usageHistory.sort((a, b) => new Date(a[2]) - new Date(b[2]));

  for (let [room] of equipment.usageHistory) {
    originalPath.push(room);
    modifiedPath.push(room === currentStorage ? newStorageLocation : room);
  }

  const originalDistance = computePathDistance(graph, originalPath);
  const modifiedDistance = computePathDistance(graph, modifiedPath);

  const saved = originalDistance - modifiedDistance;
  const percentChange =
    originalDistance > 0 ? (saved / originalDistance) * 100 : 0;

  // Calculate time saved based on walking speed
  const AVERAGE_WALKING_SPEED_FPS = 3.5; // feet per second
  const SECONDS_TO_HOURS = 1 / 3600; // conversion factor

  // Calculate time saved per movement in hours
  const timeSavedPerMovement =
    (saved / AVERAGE_WALKING_SPEED_FPS) * SECONDS_TO_HOURS;

  // Estimate movements per month based on usage history
  const usageDates = equipment.usageHistory.map(
    (entry) => new Date(entry[2]).toISOString().split("T")[0]
  );
  const uniqueDates = new Set(usageDates);
  const dateRange =
    usageDates.length > 0
      ? (new Date(Math.max(...usageDates.map((d) => new Date(d)))) -
          new Date(Math.min(...usageDates.map((d) => new Date(d))))) /
        (1000 * 60 * 60 * 24)
      : 1;

  // Calculate movements per day, then scale to month
  const movementsPerDay =
    uniqueDates.size > 0
      ? equipment.usageHistory.length / Math.max(dateRange, 1)
      : 0;
  const movementsPerMonth = movementsPerDay * 30;

  // Total hours saved per month
  const hoursSaved = timeSavedPerMovement * movementsPerMonth;

  return { saved, percentChange, hoursSaved, movementsPerMonth };
}

/**
 * Compute the total distance along a path
 * @param {Object} graph - The graph object with nodes and edges
 * @param {Array} path - Array of room names representing a path
 * @returns {number} The total distance
 */
function computePathDistance(graph, path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const r1 = path[i - 1];
    const r2 = path[i];
    if (!graph.hasNode(r1) || !graph.hasNode(r2)) continue;
    const weight = graph.edge(r1, r2) || graph.edge(r2, r1);
    if (weight) total += weight;
  }
  return total;
}

/**
 * Create a graph from nodes and edges
 * @param {Array} nodes - Array of node names
 * @param {Array} edges - Array of [from, to, weight] edges
 * @returns {Object} A graph object
 */
function createGraph(nodes, edges) {
  const graph = {
    nodes: new Set(nodes),
    hasNode: function (node) {
      return this.nodes.has(node);
    },
    edge: function (from, to) {
      for (const [f, t, weight] of edges) {
        if ((f === from && t === to) || (f === to && t === from)) {
          return weight;
        }
      }
      return undefined;
    },
  };
  return graph;
}

// Export the module
module.exports = {
  Equipment,
  findOptimalStorageLocation,
  calculateDistanceSavings,
  createGraph,
};
