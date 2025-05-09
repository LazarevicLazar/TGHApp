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
  // Get rooms where the equipment is used
  const usageRooms = new Map();

  // Count how many times the equipment is used in each room
  for (let [room, status] of equipment.usageHistory) {
    if (!graph.hasNode(room)) continue;

    if (status.toLowerCase() === "in use") {
      usageRooms.set(room, (usageRooms.get(room) || 0) + 1);
    }
  }

  // Get rooms where the equipment is stored
  const storageRooms = new Map();

  // Count how many times the equipment is stored in each room
  for (let [room, status] of equipment.usageHistory) {
    if (!graph.hasNode(room)) continue;

    if (status.toLowerCase() === "available") {
      storageRooms.set(room, (storageRooms.get(room) || 0) + 1);
    }
  }

  // Get all unique rooms from usage history
  const allRooms = new Map();
  for (let [room, status] of equipment.usageHistory) {
    if (!graph.hasNode(room)) continue;
    allRooms.set(room, (allRooms.get(room) || 0) + 1);
  }

  // Identify potential storage locations with "STOR" or "storage" in the name
  // Use ALL rooms in the graph, not just the ones the device has visited
  let storageTypeRooms = Array.from(graph.nodes).filter(
    (room) => room.includes("STOR") || room.toLowerCase().includes("storage")
  );

  // If no storage-type rooms are in the graph, use rooms that start with "K2" as a fallback
  if (storageTypeRooms.length === 0) {
    storageTypeRooms = Array.from(graph.nodes).filter((room) =>
      room.startsWith("K2")
    );
  }

  // Get current storage location (most frequent storage room)
  const currentLocationEntries = Array.from(storageRooms.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  const currentLocation =
    currentLocationEntries.length > 0 ? currentLocationEntries[0][0] : null;

  // If no usage rooms, return current location with no savings
  if (usageRooms.size === 0) {
    return {
      currentLocation,
      optimalLocation: currentLocation,
      bestOverallLocation: null,
      bestStorageTypeLocation: null,
      distanceSaved: 0,
      percentImprovement: 0,
      hoursSaved: 0,
      movementsPerMonth: 0,
      minDistance: 0,
    };
  }

  // Find the optimal location among storage rooms with "Available" tags
  let bestAvailableLocation = currentLocation;
  let minAvailableDistance = Infinity;

  // Use storage rooms if available, otherwise use all rooms
  const availableLocations =
    storageRooms.size > 0 ? Array.from(storageRooms.keys()) : [];

  for (const location of availableLocations) {
    let totalDistance = 0;

    // Calculate total weighted distance from this location to all usage rooms
    for (const [room, count] of usageRooms.entries()) {
      if (room === location) continue; // Skip if same room

      try {
        const distance =
          graph.edge(location, room) || graph.edge(room, location);
        if (distance !== undefined) {
          totalDistance += distance * count;
        }
      } catch {}
    }

    // Update best location if this one has shorter total distance
    if (totalDistance < minAvailableDistance) {
      minAvailableDistance = totalDistance;
      bestAvailableLocation = location;
    }
  }

  // Find the best location among storage-type rooms (STOR or storage in name)
  let bestStorageTypeLocation = null;
  let minStorageTypeDistance = Infinity;

  for (const location of storageTypeRooms) {
    let totalDistance = 0;

    // Calculate total weighted distance from this location to all usage rooms
    for (const [room, count] of usageRooms.entries()) {
      if (room === location) continue; // Skip if same room

      try {
        const distance =
          graph.edge(location, room) || graph.edge(room, location);
        if (distance !== undefined) {
          totalDistance += distance * count;
        }
      } catch {}
    }

    // Update best location if this one has shorter total distance
    if (totalDistance < minStorageTypeDistance) {
      minStorageTypeDistance = totalDistance;
      bestStorageTypeLocation = location;
    }
  }

  // Find the best location among ALL rooms in the graph
  let bestOverallLocation = null;
  let minOverallDistance = Infinity;

  // Use all rooms in the graph, not just the ones the device has visited
  const allGraphRooms = Array.from(graph.nodes);

  for (const location of allGraphRooms) {
    let totalDistance = 0;

    // Calculate total weighted distance from this location to all usage rooms
    for (const [room, count] of usageRooms.entries()) {
      if (room === location) continue; // Skip if same room

      try {
        const distance =
          graph.edge(location, room) || graph.edge(room, location);
        if (distance !== undefined) {
          totalDistance += distance * count;
        }
      } catch {}
    }

    // Update best location if this one has shorter total distance
    if (totalDistance < minOverallDistance) {
      minOverallDistance = totalDistance;
      bestOverallLocation = location;
    }
  }

  // Calculate total distance from current location to all usage rooms
  let currentTotalDistance = 0;
  if (currentLocation) {
    for (const [room, count] of usageRooms.entries()) {
      if (room === currentLocation) continue; // Skip if same room

      try {
        const distance =
          graph.edge(currentLocation, room) ||
          graph.edge(room, currentLocation);
        if (distance !== undefined) {
          currentTotalDistance += distance * count;
        }
      } catch {}
    }
  }

  // Calculate total distance from optimal location to all usage rooms
  let optimalTotalDistance = 0;
  if (bestAvailableLocation) {
    for (const [room, count] of usageRooms.entries()) {
      if (room === bestAvailableLocation) continue; // Skip if same room

      try {
        const distance =
          graph.edge(bestAvailableLocation, room) ||
          graph.edge(room, bestAvailableLocation);
        if (distance !== undefined) {
          optimalTotalDistance += distance * count;
        }
      } catch {}
    }
  }

  // Calculate total distance from best overall location to all usage rooms
  let overallTotalDistance = 0;
  if (bestOverallLocation) {
    for (const [room, count] of usageRooms.entries()) {
      if (room === bestOverallLocation) continue; // Skip if same room

      try {
        const distance =
          graph.edge(bestOverallLocation, room) ||
          graph.edge(room, bestOverallLocation);
        if (distance !== undefined) {
          overallTotalDistance += distance * count;
        }
      } catch {}
    }
  }

  // Calculate total distance from best storage-type location to all usage rooms
  let storageTypeTotalDistance = 0;
  if (bestStorageTypeLocation) {
    for (const [room, count] of usageRooms.entries()) {
      if (room === bestStorageTypeLocation) continue; // Skip if same room

      try {
        const distance =
          graph.edge(bestStorageTypeLocation, room) ||
          graph.edge(room, bestStorageTypeLocation);
        if (distance !== undefined) {
          storageTypeTotalDistance += distance * count;
        }
      } catch {}
    }
  }

  // Calculate savings from moving to the optimal location
  const savings = calculateDistanceSavings(
    equipment,
    graph,
    bestAvailableLocation
  );

  // Only consider it an improvement if there's significant savings
  // and the optimal location is different from current
  if (savings.percentChange < 5 || bestAvailableLocation === currentLocation) {
    return {
      currentLocation,
      optimalLocation: currentLocation,
      bestOverallLocation,
      bestStorageTypeLocation,
      distanceSaved: 0,
      percentImprovement: 0,
      hoursSaved: 0,
      movementsPerMonth: 0,
      minDistance: 0,
      currentTotalDistance: Math.round(currentTotalDistance),
      optimalTotalDistance: Math.round(currentTotalDistance),
      overallTotalDistance: Math.round(overallTotalDistance),
      storageTypeTotalDistance: Math.round(storageTypeTotalDistance),
    };
  }

  return {
    currentLocation,
    optimalLocation: bestAvailableLocation,
    bestOverallLocation,
    bestStorageTypeLocation,
    distanceSaved: savings.saved,
    percentImprovement: savings.percentChange,
    hoursSaved: savings.hoursSaved,
    movementsPerMonth: savings.movementsPerMonth,
    minDistance: minAvailableDistance,
    currentTotalDistance: Math.round(currentTotalDistance),
    optimalTotalDistance: Math.round(optimalTotalDistance),
    overallTotalDistance: Math.round(overallTotalDistance),
    storageTypeTotalDistance: Math.round(storageTypeTotalDistance),
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
  if (!graph || !sourceRoom || !targets) return 0;

  let total = 0;
  for (let [target, freq] of Object.entries(targets)) {
    // Skip if source and target are the same
    if (target === sourceRoom) continue;

    // Skip if either room is not in the graph
    if (!graph.hasNode(sourceRoom) || !graph.hasNode(target)) continue;

    try {
      // Get the edge weight (distance) between the rooms
      const weight =
        graph.edge(sourceRoom, target) || graph.edge(target, sourceRoom);

      // Add to total if weight exists
      if (weight !== undefined && !isNaN(weight)) {
        total += weight * freq;
      }
    } catch (error) {
      // Silently handle errors
    }
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
  // Get current storage location
  const currentStorage = equipment.getStorageLocation();

  // If no current storage or no change in location, return zeros
  if (!currentStorage || currentStorage === newStorageLocation) {
    return { saved: 0, percentChange: 0, hoursSaved: 0, movementsPerMonth: 0 };
  }

  // Count how many times the equipment moves between each pair of locations
  const movementCounts = {};

  // Process usage history to count movements
  for (let i = 1; i < equipment.usageHistory.length; i++) {
    const prevRoom = equipment.usageHistory[i - 1][0];
    const currentRoom = equipment.usageHistory[i][0];

    // Skip if rooms are the same
    if (prevRoom === currentRoom) continue;

    const key = `${prevRoom}-${currentRoom}`;
    movementCounts[key] = (movementCounts[key] || 0) + 1;
  }

  // Calculate total distance with current storage location
  let originalDistance = 0;
  for (const [routeKey, count] of Object.entries(movementCounts)) {
    const [from, to] = routeKey.split("-");

    // If this route involves the storage location, include it in calculation
    if (from === currentStorage || to === currentStorage) {
      try {
        const weight = graph.edge(from, to) || graph.edge(to, from);
        if (weight !== undefined) {
          originalDistance += weight * count;
        }
      } catch {}
    }
  }

  // Calculate total distance with new storage location
  let modifiedDistance = 0;
  for (const [routeKey, count] of Object.entries(movementCounts)) {
    const [from, to] = routeKey.split("-");

    // If this route involves the storage location, recalculate with new location
    if (from === currentStorage || to === currentStorage) {
      const newFrom = from === currentStorage ? newStorageLocation : from;
      const newTo = to === currentStorage ? newStorageLocation : to;

      try {
        const weight = graph.edge(newFrom, newTo) || graph.edge(newTo, newFrom);
        if (weight !== undefined) {
          modifiedDistance += weight * count;
        }
      } catch {}
    }
  }

  // Calculate distance saved
  const saved = originalDistance - modifiedDistance;

  // Calculate percent change
  const percentChange =
    originalDistance > 0 ? (saved / originalDistance) * 100 : 0;

  // Calculate hours saved (assuming 3 feet per second walking speed)
  const feetPerSecond = 3;
  const hoursSaved = saved / (feetPerSecond * 3600);

  // Calculate movements per month
  const timeSpan = getTimeSpanInMonths(equipment.usageHistory);
  const movementsPerMonth =
    timeSpan > 0
      ? Object.values(movementCounts).reduce((a, b) => a + b, 0) / timeSpan
      : 0;

  return {
    saved,
    percentChange,
    hoursSaved,
    movementsPerMonth,
  };
}

/**
 * Calculate the time span of the usage history in months
 * @param {Array} usageHistory - The usage history array
 * @returns {number} The time span in months
 */
function getTimeSpanInMonths(usageHistory) {
  if (!usageHistory || usageHistory.length < 2) return 1;

  // Find earliest and latest dates
  let earliest = new Date(8640000000000000); // Max date
  let latest = new Date(-8640000000000000); // Min date

  for (const [, , timeIn] of usageHistory) {
    if (!timeIn) continue;

    const date = new Date(timeIn);
    if (date < earliest) earliest = date;
    if (date > latest) latest = date;
  }

  // Calculate difference in months
  const diffTime = Math.abs(latest - earliest);
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const diffMonths = diffDays / 30.44; // Average days per month

  return Math.max(diffMonths, 1); // At least 1 month
}

/**
 * Compute the total distance of a path
 * @param {Object} graph - The graph object with nodes and edges
 * @param {Array} path - Array of room IDs in the path
 * @returns {number} The total distance of the path
 */
function computePathDistance(graph, path) {
  if (!graph || !path || path.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];

    try {
      const weight = graph.edge(from, to) || graph.edge(to, from);
      if (weight !== undefined) {
        totalDistance += weight;
      }
    } catch {}
  }

  return totalDistance;
}

/**
 * Create a graph object from nodes and edges
 * @param {Array} nodes - Array of node IDs
 * @param {Array} edges - Array of edges [from, to, weight]
 * @returns {Object} Graph object with nodes and edges
 */
function createGraph(nodes, edges) {
  const graph = {
    nodes: new Set(nodes),
    edges: new Map(),
    hasNode: function (node) {
      return this.nodes.has(node);
    },
    edge: function (from, to) {
      return this.edges.get(`${from}-${to}`) || this.edges.get(`${to}-${from}`);
    },
  };

  // Add edges to the graph
  for (const [from, to, weight] of edges) {
    graph.edges.set(`${from}-${to}`, weight);
  }

  return graph;
}

// Export the module using ES modules syntax
export {
  Equipment,
  findOptimalStorageLocation,
  calculateDistanceSavings,
  computeTotalDistance,
  computePathDistance,
  createGraph,
};
