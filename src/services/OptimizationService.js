/**
 * Optimization Service
 *
 * This service implements the optimization algorithms for:
 * 1. Staff walking distance optimization using Dijkstra's algorithm
 * 2. Equipment utilization optimization using time-series analysis
 * 3. Maintenance scheduling optimization using predictive modeling
 */

import { calculateDistance } from "../utils/helpers";

class OptimizationService {
  constructor() {
    this.graphData = null;
    this.floorPlanData = null;
  }

  /**
   * Initialize the optimization service with graph and floor plan data
   * @param {Object} graphData - The graph data with nodes and edges
   * @param {Object} floorPlanData - The floor plan data with room coordinates
   */
  initialize(graphData, floorPlanData) {
    this.graphData = graphData;
    this.floorPlanData = floorPlanData;
    console.log("Optimization service initialized");
  }

  /**
   * Optimize equipment placement to minimize staff walking distance
   * @param {Array} movements - The movement data to analyze
   * @returns {Array} Optimization recommendations
   */
  optimizeWalkingDistance(movements) {
    if (!this.graphData || !movements || movements.length === 0) {
      return [];
    }

    const recommendations = [];

    try {
      // Group movements by device type
      const deviceTypes = {};

      movements.forEach((movement) => {
        const deviceId = movement.deviceId || "";
        const deviceType = deviceId.split("-")[0] || "Unknown";

        if (!deviceTypes[deviceType]) {
          deviceTypes[deviceType] = [];
        }

        deviceTypes[deviceType].push(movement);
      });

      // Analyze each device type
      Object.entries(deviceTypes).forEach(([deviceType, deviceMovements]) => {
        // Skip if not enough data
        if (deviceMovements.length < 5) return;

        // Build frequency map of location requests
        const locationRequests = {};

        deviceMovements.forEach((movement) => {
          const location = movement.toLocation;

          if (location) {
            if (!locationRequests[location]) {
              locationRequests[location] = 0;
            }
            locationRequests[location]++;
          }
        });

        // Get potential storage locations (rooms with "STOR" in the name)
        const storageLocations = this.graphData.nodes.filter(
          (node) =>
            node.includes("STOR") || node.toLowerCase().includes("storage")
        );

        if (storageLocations.length === 0) {
          // If no storage locations found, use all locations as potential homes
          storageLocations.push(...Object.keys(locationRequests));
        }

        // Calculate total weighted distance for each potential home location
        const locationScores = {};

        storageLocations.forEach((homeLocation) => {
          let totalWeightedDistance = 0;

          Object.entries(locationRequests).forEach(
            ([requestLocation, frequency]) => {
              const distance = this.getShortestPathDistance(
                homeLocation,
                requestLocation
              );
              totalWeightedDistance += distance * frequency;
            }
          );

          locationScores[homeLocation] = totalWeightedDistance;
        });

        // Find the optimal home location
        const sortedLocations = Object.entries(locationScores).sort(
          (a, b) => a[1] - b[1]
        );

        if (sortedLocations.length > 0) {
          const optimalLocation = sortedLocations[0][0];
          const optimalScore = sortedLocations[0][1];

          // Find current home location (most frequent fromLocation)
          const fromLocationCounts = {};

          deviceMovements.forEach((movement) => {
            const from = movement.fromLocation;

            if (from) {
              if (!fromLocationCounts[from]) {
                fromLocationCounts[from] = 0;
              }
              fromLocationCounts[from]++;
            }
          });

          const currentHomeLocation =
            Object.entries(fromLocationCounts).sort(
              (a, b) => b[1] - a[1]
            )[0]?.[0] || "Unknown";

          // Only recommend if different from current and significant improvement
          if (optimalLocation !== currentHomeLocation) {
            const currentScore =
              locationScores[currentHomeLocation] || Infinity;
            const improvement =
              ((currentScore - optimalScore) / currentScore) * 100;

            if (improvement > 10) {
              // Only recommend if >10% improvement
              recommendations.push({
                _id: `walking_${deviceType}_${Date.now()}`,
                type: "placement",
                title: `Optimize ${deviceType} Placement`,
                description: `Moving ${deviceType} equipment from ${currentHomeLocation} to ${optimalLocation} would reduce staff walking distance by approximately ${Math.round(
                  improvement
                )}%.`,
                savings: `~${Math.round(improvement * 2)} hours/month`,
                implemented: false,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      });
    } catch (error) {
      console.error("Error in walking distance optimization:", error);
    }

    return recommendations;
  }

  /**
   * Calculate the shortest path distance between two locations using Dijkstra's algorithm
   * @param {string} start - The starting location
   * @param {string} end - The ending location
   * @returns {number} The shortest path distance
   */
  getShortestPathDistance(start, end) {
    if (!this.graphData || !start || !end || start === end) {
      return 0;
    }

    try {
      // Build adjacency list from graph data
      const graph = {};

      this.graphData.nodes.forEach((node) => {
        graph[node] = {};
      });

      this.graphData.edges.forEach((edge) => {
        const [from, to, distance] = edge;
        graph[from][to] = distance;
        graph[to][from] = distance; // Assuming undirected graph
      });

      // If start or end not in graph, return direct distance or a default
      if (!graph[start] || !graph[end]) {
        // Try to get coordinates from floor plan
        if (this.floorPlanData && this.floorPlanData.rooms) {
          const startCoords = this.floorPlanData.rooms[start];
          const endCoords = this.floorPlanData.rooms[end];

          if (startCoords && endCoords) {
            return calculateDistance(
              startCoords[0],
              startCoords[1],
              endCoords[0],
              endCoords[1]
            );
          }
        }

        return 100; // Default distance if not found
      }

      // Dijkstra's algorithm
      const distances = {};
      const previous = {};
      const nodes = new Set();

      // Initialize
      Object.keys(graph).forEach((node) => {
        distances[node] = node === start ? 0 : Infinity;
        previous[node] = null;
        nodes.add(node);
      });

      // Find shortest path
      while (nodes.size > 0) {
        // Find node with minimum distance
        let minNode = null;
        let minDistance = Infinity;

        nodes.forEach((node) => {
          if (distances[node] < minDistance) {
            minDistance = distances[node];
            minNode = node;
          }
        });

        // If minNode is the end node or no path exists
        if (minNode === end || minDistance === Infinity) {
          break;
        }

        // Remove minNode from unvisited set
        nodes.delete(minNode);

        // Update distances to neighbors
        Object.entries(graph[minNode]).forEach(([neighbor, distance]) => {
          if (nodes.has(neighbor)) {
            const alt = distances[minNode] + distance;

            if (alt < distances[neighbor]) {
              distances[neighbor] = alt;
              previous[neighbor] = minNode;
            }
          }
        });
      }

      return distances[end];
    } catch (error) {
      console.error("Error calculating shortest path:", error);
      return 100; // Default distance on error
    }
  }

  /**
   * Analyze equipment utilization using time-series analysis
   * @param {Array} movements - The movement data to analyze
   * @returns {Object} Utilization analysis results
   */
  analyzeUtilization(movements) {
    if (!movements || movements.length === 0) {
      return {
        deviceTypes: [],
        peakTimes: [],
        recommendations: [],
      };
    }

    try {
      // Group by device type
      const deviceTypes = {};

      movements.forEach((movement) => {
        const deviceId = movement.deviceId || "";
        const deviceType = deviceId.split("-")[0] || "Unknown";

        if (!deviceTypes[deviceType]) {
          deviceTypes[deviceType] = {
            movements: [],
            totalHours: 0,
            inUseHours: 0,
            hourlyUsage: Array(24).fill(0),
          };
        }

        deviceTypes[deviceType].movements.push(movement);

        // Calculate usage hours
        if (movement.timeIn && movement.timeOut) {
          const timeIn = new Date(movement.timeIn);
          const timeOut = new Date(movement.timeOut);

          if (timeIn && timeOut && timeOut > timeIn) {
            const usageHours = (timeOut - timeIn) / (1000 * 60 * 60);
            deviceTypes[deviceType].totalHours += usageHours;

            if (
              movement.status &&
              movement.status.toLowerCase().includes("in use")
            ) {
              deviceTypes[deviceType].inUseHours += usageHours;
            }

            // Track hourly usage for time-series analysis
            const hour = timeIn.getHours();
            deviceTypes[deviceType].hourlyUsage[hour]++;
          }
        }
      });

      // Calculate utilization rates and peak times
      const utilizationRates = {};
      const peakTimes = {};
      const recommendations = [];

      Object.entries(deviceTypes).forEach(([deviceType, stats]) => {
        // Calculate utilization rate
        const utilizationRate =
          stats.totalHours > 0
            ? (stats.inUseHours / stats.totalHours) * 100
            : 0;

        utilizationRates[deviceType] = utilizationRate;

        // Find peak usage times
        const maxUsage = Math.max(...stats.hourlyUsage);
        const peakHours = stats.hourlyUsage
          .map((usage, hour) => ({ hour, usage }))
          .filter((h) => h.usage > maxUsage * 0.8)
          .map((h) => h.hour);

        peakTimes[deviceType] = peakHours;

        // Generate purchase recommendations based on utilization
        if (utilizationRate > 80) {
          const additionalUnits = Math.ceil((utilizationRate - 80) / 10);

          recommendations.push({
            _id: `utilization_${deviceType}_${Date.now()}`,
            type: "purchase",
            title: `Additional ${deviceType} Units Needed`,
            description: `${deviceType} equipment is utilized at ${Math.round(
              utilizationRate
            )}% capacity. Consider purchasing ${additionalUnits} additional unit(s) to reduce wait times during peak hours (${peakHours
              .map((h) => `${h}:00`)
              .join(", ")}).`,
            savings: `Improved patient care and reduced wait times`,
            implemented: false,
            createdAt: new Date().toISOString(),
          });
        }
      });

      return {
        utilizationRates,
        peakTimes,
        recommendations,
      };
    } catch (error) {
      console.error("Error in utilization analysis:", error);
      return {
        deviceTypes: [],
        peakTimes: [],
        recommendations: [],
      };
    }
  }

  /**
   * Predict maintenance needs based on usage patterns
   * @param {Array} movements - The movement data to analyze
   * @returns {Array} Maintenance recommendations
   */
  predictMaintenance(movements) {
    if (!movements || movements.length === 0) {
      return [];
    }

    const recommendations = [];

    try {
      // Group by device ID
      const devices = {};

      movements.forEach((movement) => {
        const deviceId = movement.deviceId;

        if (!deviceId) return;

        if (!devices[deviceId]) {
          devices[deviceId] = {
            movements: [],
            totalUsageHours: 0,
            movementCount: 0,
            lastMaintenance: null,
          };
        }

        devices[deviceId].movements.push(movement);
        devices[deviceId].movementCount++;

        // Calculate usage hours
        if (movement.timeIn && movement.timeOut) {
          const timeIn = new Date(movement.timeIn);
          const timeOut = new Date(movement.timeOut);

          if (timeIn && timeOut && timeOut > timeIn) {
            const usageHours = (timeOut - timeIn) / (1000 * 60 * 60);
            devices[deviceId].totalUsageHours += usageHours;
          }
        }
      });

      // Define maintenance thresholds by device type
      const maintenanceThresholds = {
        Ventilator: { hours: 500, movements: 100 },
        Ultrasound: { hours: 300, movements: 50 },
        Defibrillator: { hours: 200, movements: 30 },
        "IV-Pump": { hours: 1000, movements: 200 },
        Monitor: { hours: 800, movements: 150 },
        default: { hours: 500, movements: 100 },
      };

      // Generate maintenance recommendations
      Object.entries(devices).forEach(([deviceId, stats]) => {
        const deviceType = deviceId.split("-")[0] || "Unknown";
        const threshold =
          maintenanceThresholds[deviceType] || maintenanceThresholds.default;

        // Calculate maintenance score based on usage hours and movement count
        const hoursScore = stats.totalUsageHours / threshold.hours;
        const movementScore = stats.movementCount / threshold.movements;
        const maintenanceScore = hoursScore * 0.7 + movementScore * 0.3;

        // Recommend maintenance if score is high
        if (maintenanceScore > 0.8) {
          const urgency = maintenanceScore >= 1 ? "urgent" : "upcoming";
          const timeframe =
            maintenanceScore >= 1 ? "immediately" : "within the next month";

          recommendations.push({
            _id: `maintenance_${deviceId}_${Date.now()}`,
            type: "maintenance",
            title: `${
              urgency === "urgent" ? "Urgent" : "Scheduled"
            } Maintenance for ${deviceId}`,
            description: `Based on usage patterns (${Math.round(
              stats.totalUsageHours
            )} hours, ${
              stats.movementCount
            } movements), ${deviceId} requires ${urgency} maintenance ${timeframe}.`,
            savings:
              "Preventative maintenance reduces downtime and extends equipment lifespan",
            implemented: false,
            createdAt: new Date().toISOString(),
          });
        }
      });
    } catch (error) {
      console.error("Error in maintenance prediction:", error);
    }

    return recommendations;
  }

  /**
   * Generate comprehensive optimization recommendations
   * @param {Array} movements - The movement data to analyze
   * @returns {Array} Combined optimization recommendations
   */
  generateRecommendations(movements) {
    if (!movements || movements.length === 0) {
      return [];
    }

    const recommendations = [];

    try {
      // Walking distance optimization
      const walkingRecs = this.optimizeWalkingDistance(movements);
      recommendations.push(...walkingRecs);

      // Utilization analysis
      const utilizationResults = this.analyzeUtilization(movements);
      recommendations.push(...utilizationResults.recommendations);

      // Maintenance prediction
      const maintenanceRecs = this.predictMaintenance(movements);
      recommendations.push(...maintenanceRecs);

      // Sort by type and creation date
      return recommendations.sort((a, b) => {
        if (a.type !== b.type) {
          const typeOrder = { placement: 1, purchase: 2, maintenance: 3 };
          return typeOrder[a.type] - typeOrder[b.type];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return [];
    }
  }
}

// Create and export a singleton instance
const optimizationService = new OptimizationService();
export default optimizationService;
