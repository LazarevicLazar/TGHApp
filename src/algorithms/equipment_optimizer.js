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
  
  // Identify potential storage locations
  // First, look for rooms with "STOR" or "storage" in the name
  let potentialLocations = Array.from(storageRooms.keys()).filter(
    room => room.includes("STOR") || room.toLowerCase().includes("storage")
  );
  
  // If no storage locations found, use all available locations
  if (potentialLocations.length === 0) {
    potentialLocations = Array.from(storageRooms.keys());
  }
  
  // If still no potential locations, use the most frequent usage rooms
  if (potentialLocations.length === 0) {
    potentialLocations = Array.from(usageRooms.keys());
  }
  
  // Get current storage location (most frequent storage room)
  const currentLocationEntries = Array.from(storageRooms.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const currentLocation = currentLocationEntries.length > 0
    ? currentLocationEntries[0][0]
    : null;
  
  // If no potential locations or no usage rooms, return current location with no savings
  if (potentialLocations.length === 0 || usageRooms.size === 0) {
    return {
      currentLocation,
      optimalLocation: currentLocation,
      distanceSaved: 0,
      percentImprovement: 0,
      hoursSaved: 0,
      movementsPerMonth: 0,
      minDistance: 0
    };
  }
  
  // Find the optimal location that minimizes total distance to usage rooms
  let bestLocation = currentLocation;
  let minTotalDistance = Infinity;
  
  for (const location of potentialLocations) {
    let totalDistance = 0;
    
    // Calculate total weighted distance from this location to all usage rooms
    for (const [room, count] of usageRooms.entries()) {
      if (room === location) continue; // Skip if same room
      
      try {
        const distance = graph.edge(location, room) || graph.edge(room, location);
        if (distance !== undefined) {
          totalDistance += distance * count;
        }
      } catch {}
    }
    
    // Update best location if this one has shorter total distance
    if (totalDistance < minTotalDistance) {
      minTotalDistance = totalDistance;
      bestLocation = location;
    }
  }
  
  // Calculate savings from moving to the optimal location
  const savings = calculateDistanceSavings(equipment, graph, bestLocation);
  
  // Only consider it an improvement if there's significant savings
  // and the optimal location is different from current
  if (savings.percentChange < 5 || bestLocation === currentLocation) {
    return {
      currentLocation,
      optimalLocation: currentLocation,
      distanceSaved: 0,
      percentImprovement: 0,
      hoursSaved: 0,
      movementsPerMonth: 0,
      minDistance: 0
    };
  }
  
  return {
    currentLocation,
    optimalLocation: bestLocation,
    distanceSaved: savings.saved,
    percentImprovement: savings.percentChange,
    hoursSaved: savings.hoursSaved,
    movementsPerMonth: savings.movementsPerMonth,
    minDistance: minTotalDistance
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
      const weight = graph.edge(sourceRoom, target) || graph.edge(target, sourceRoom);
      
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
    const prevRoom = equipment.usageHistory[i-1][0];
    const currentRoom = equipment.usageHistory[i][0];
    
    // Skip if rooms are the same
    if (prevRoom === currentRoom) continue;
    
    const key = `${prevRoom}-${currentRoom}`;
    movementCounts[key] = (movementCounts[key] || 0) + 1;
  }
  
  // Calculate total distance with current storage location
  let originalDistance = 0;
  for (const [routeKey, count] of Object.entries(movementCounts)) {
    const [from, to] = routeKey.split('-');
    
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
    const [from, to] = routeKey.split('-');
    
    // Replace current storage with new storage in the route
    const modifiedFrom = from === currentStorage ? newStorageLocation : from;
    const modifiedTo = to === currentStorage ? newStorageLocation : to;
    
    // If this route involves the storage location, include it in calculation
    if (modifiedFrom === newStorageLocation || modifiedTo === newStorageLocation) {
      try {
        const weight = graph.edge(modifiedFrom, modifiedTo) || graph.edge(modifiedTo, modifiedFrom);
        if (weight !== undefined) {
          modifiedDistance += weight * count;
        }
      } catch {}
    }
  }
  
  // Calculate distance saved and percent improvement
  const saved = Math.max(0, originalDistance - modifiedDistance);
  const percentChange = originalDistance > 0 ? (saved / originalDistance) * 100 : 0;
  
  // Calculate movements per month
  // Count unique days in usage history
  const usageDates = equipment.usageHistory.map(
    (entry) => new Date(entry[2]).toISOString().split("T")[0]
  );
  const uniqueDates = new Set(usageDates);
  
  // Calculate date range in days
  const dateRange = usageDates.length > 0
    ? (new Date(Math.max(...usageDates.map((d) => new Date(d)))) -
       new Date(Math.min(...usageDates.map((d) => new Date(d))))) /
      (1000 * 60 * 60 * 24)
    : 30; // Default to 30 days if no date range
  
  // Calculate movements per day, then scale to month
  const totalMovements = Object.values(movementCounts).reduce((sum, count) => sum + count, 0);
  const movementsPerDay = uniqueDates.size > 0
    ? totalMovements / Math.max(dateRange, 1)
    : totalMovements / 30; // Default to 30 days if no unique dates
  
  const movementsPerMonth = movementsPerDay * 30;
  
  // Calculate hours saved based on walking speed and distance
  // Average walking speed: 3.5 feet per second = 210 feet per minute = 12,600 feet per hour
  const FEET_PER_HOUR = 12600;
  
  // Calculate hours saved per month
  // For each movement, we save (distance saved / walking speed) hours
  const hoursSaved = (saved / FEET_PER_HOUR) * movementsPerMonth;
  
  return {
    saved: Math.round(saved),
    percentChange: Math.round(percentChange),
    hoursSaved: parseFloat(hoursSaved.toFixed(1)),
    movementsPerMonth: Math.round(movementsPerMonth)
  };
}

/**
 * Compute the total distance along a path
 * @param {Object} graph - The graph object with nodes and edges
 * @param {Array} path - Array of room names representing a path
 * @returns {number} The total distance
 */
function computePathDistance(graph, path) {
  if (!graph || !path || path.length < 2) return 0;
  
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const r1 = path[i - 1];
    const r2 = path[i];
    
    // Skip if rooms are the same
    if (r1 === r2) continue;
    
    // Skip if either room is not in the graph
    if (!graph.hasNode(r1) || !graph.hasNode(r2)) continue;
    
    try {
      // Get the edge weight (distance) between the rooms
      const weight = graph.edge(r1, r2) || graph.edge(r2, r1);
      
      // Add to total if weight exists
      if (weight !== undefined && !isNaN(weight)) {
        total += weight;
      }
    } catch (error) {
      // Silently handle errors
    }
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
