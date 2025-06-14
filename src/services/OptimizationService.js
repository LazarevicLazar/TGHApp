/**
 * Optimization Service
 *
 * This service implements the optimization algorithms for:
 * 1. Staff walking distance optimization using Dijkstra's algorithm
 * 2. Equipment utilization optimization using time-series analysis
 * 3. Maintenance scheduling optimization using predictive modeling
 */

import { calculateDistance } from "../utils/helpers.js";
import {
  Equipment,
  findOptimalStorageLocation,
  createGraph,
} from "../algorithms/equipment_optimizer.js";

class OptimizationService {
  constructor() {
    this.graphData = null;
    this.floorPlanData = null;
    this.graph = null;
  }

  /**
   * Initialize the optimization service with graph and floor plan data
   * @param {Object} graphData - The graph data with nodes and edges
   * @param {Object} floorPlanData - The floor plan data with room coordinates
   */
  initialize(graphData, floorPlanData) {
    this.graphData = graphData;
    this.floorPlanData = floorPlanData;

    // Create a graph object for the equipment optimizer
    if (graphData && graphData.nodes && graphData.edges) {
      this.graph = createGraph(graphData.nodes, graphData.edges);
    }

    console.log("Optimization service initialized");
  }

  /**
   * Optimize equipment placement to minimize staff walking distance
   * @param {Array} movements - The movement data to analyze
   * @returns {Array} Optimization recommendations
   */
  optimizeWalkingDistance(movements) {
    console.log(
      "optimizeWalkingDistance called with",
      movements.length,
      "movements"
    );
    console.log("Graph data available:", !!this.graphData);
    console.log("Graph object available:", !!this.graph);

    if (
      !this.graphData ||
      !this.graph ||
      !movements ||
      movements.length === 0
    ) {
      console.log("Missing required data, returning empty recommendations");
      return [];
    }

    const recommendations = [];

    try {
      // Group movements by device ID
      const deviceMap = {};

      movements.forEach((movement) => {
        const deviceId = movement.deviceId || "";

        if (!deviceId) return;

        if (!deviceMap[deviceId]) {
          deviceMap[deviceId] = new Equipment(deviceId);
        }

        // Add usage data to the equipment object
        if (
          movement.fromLocation &&
          movement.toLocation &&
          movement.timeIn &&
          movement.timeOut
        ) {
          deviceMap[deviceId].addUsage(
            movement.toLocation,
            movement.status || "Unknown",
            movement.timeIn,
            movement.timeOut
          );
        }
      });

      console.log("Processed", Object.keys(deviceMap).length, "unique devices");

      // Analyze each device
      Object.entries(deviceMap).forEach(([deviceId, equipment]) => {
        console.log(
          "Analyzing device:",
          deviceId,
          "with",
          equipment.usageHistory.length,
          "usage records"
        );

        // Skip if not enough usage history
        if (equipment.usageHistory.length < 3) {
          console.log(
            "Skipping device with insufficient usage history:",
            deviceId
          );
          return;
        }

        // Find optimal storage location
        const result = findOptimalStorageLocation(equipment, this.graph);
        console.log("Optimization result for", deviceId, ":", result);

        // Only recommend if there's a significant improvement
        if (
          result.percentImprovement > 10 &&
          result.currentLocation !== result.optimalLocation &&
          result.hoursSaved > 0
        ) {
          console.log("Creating recommendation for", deviceId);
          const deviceType = deviceId.split("-")[0] || "Unknown";

          const recommendation = {
            _id: `walking_${deviceId}_${Date.now()}`,
            type: "placement",
            title: `Optimize ${deviceType} Placement`,
            description: `Moving ${deviceId} from ${
              result.currentLocation
            } to ${
              result.optimalLocation
            } would reduce staff walking distance by approximately ${Math.round(
              result.percentImprovement
            )}% (${Math.round(
              result.distanceSaved
            )} feet) and save ~${parseFloat(result.hoursSaved || 0).toFixed(
              1
            )} hours/month.`,
            savings: `~${parseFloat(result.hoursSaved || 0).toFixed(
              1
            )} hours/month based on ${Math.round(
              result.movementsPerMonth || 0
            )} movements/month`,
            implemented: false,
            createdAt: new Date().toISOString(),
            deviceId: deviceId,
            currentLocation: result.currentLocation,
            optimalLocation: result.optimalLocation,
            bestOverallLocation: result.bestOverallLocation,
            bestStorageTypeLocation: result.bestStorageTypeLocation,
            distanceSaved: Math.round(result.distanceSaved || 0),
            hoursSaved: parseFloat(result.hoursSaved || 0),
            movementsPerMonth: parseFloat(result.movementsPerMonth || 0),
            currentTotalDistance: Math.round(result.currentTotalDistance || 0),
            optimalTotalDistance: Math.round(result.optimalTotalDistance || 0),
            overallTotalDistance: Math.round(result.overallTotalDistance || 0),
            storageTypeTotalDistance: Math.round(
              result.storageTypeTotalDistance || 0
            ),
            percentImprovement: Math.round(result.percentImprovement || 0),
          };

          console.log("Created recommendation:", recommendation);
          recommendations.push(recommendation);
        } else {
          console.log(
            "No significant improvement for",
            deviceId,
            "- not creating recommendation"
          );
        }
      });

      console.log(
        "Generated",
        recommendations.length,
        "walking distance recommendations"
      );
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

        return null; // Default distance if not found
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
    if (!movements || movements.length === 0 || !this.graph) {
      return {
        deviceTypes: [],
        peakTimes: [],
        recommendations: [],
      };
    }

    try {
      // Group by device ID
      const deviceMap = {};

      movements.forEach((movement) => {
        const deviceId = movement.deviceId || "";

        if (!deviceId) return;

        if (!deviceMap[deviceId]) {
          deviceMap[deviceId] = new Equipment(deviceId);
        }

        // Add usage data to the equipment object
        if (
          movement.fromLocation &&
          movement.toLocation &&
          movement.timeIn &&
          movement.timeOut
        ) {
          deviceMap[deviceId].addUsage(
            movement.toLocation,
            movement.status || "Unknown",
            movement.timeIn,
            movement.timeOut
          );
        }
      });

      // Calculate utilization rates and peak times
      const utilizationRates = {};
      const peakTimes = {};
      const recommendations = [];

      // Group devices by type for aggregate analysis
      const deviceTypeMap = {};

      Object.entries(deviceMap).forEach(([deviceId, equipment]) => {
        const deviceType = deviceId.split("-")[0] || "Unknown";

        if (!deviceTypeMap[deviceType]) {
          deviceTypeMap[deviceType] = {
            devices: [],
            totalHours: 0,
            inUseHours: 0,
            hourlyUsage: Array(24).fill(0),
          };
        }

        deviceTypeMap[deviceType].devices.push(equipment);

        // Analyze individual device for purchase recommendations
        const purchaseAnalysis = equipment.shouldPurchaseMore(this.graph);

        if (purchaseAnalysis.needsMore) {
          const metrics = purchaseAnalysis.metrics;
          const additionalUnits = Math.ceil((metrics.avgUsageRatio - 0.8) * 10);

          // Calculate peak hours from usage history
          const hourCounts = Array(24).fill(0);
          equipment.usageHistory.forEach(([room, status, timeIn]) => {
            if (timeIn) {
              const hour = new Date(timeIn).getHours();
              hourCounts[hour]++;
            }
          });

          const maxUsage = Math.max(...hourCounts);
          const peakHours = hourCounts
            .map((usage, hour) => ({ hour, usage }))
            .filter((h) => h.usage > maxUsage * 0.7)
            .map((h) => h.hour);

          recommendations.push({
            _id: `utilization_${deviceId}_${Date.now()}`,
            type: "purchase",
            title: `Additional ${deviceType} Units Needed`,
            description: `${deviceType} equipment (${deviceId}) is utilized at ${Math.round(
              metrics.avgUsageRatio * 100
            )}% capacity. Consider purchasing ${
              additionalUnits > 0 ? additionalUnits : 1
            } additional unit(s) to reduce wait times during peak hours (${peakHours
              .map((h) => `${h}:00`)
              .join(", ")}).`,
            savings: `Improved patient care and reduced wait times`,
            implemented: false,
            createdAt: new Date().toISOString(),
            deviceId: deviceId,
            metrics: metrics,
            hoursSaved: 0,
            distanceSaved: 0,
            movementsPerMonth: 0,
          });
        }

        // Aggregate data for device type analysis
        equipment.usageHistory.forEach(([room, status, timeIn, timeOut]) => {
          if (timeIn && timeOut) {
            const start = new Date(timeIn);
            const end = new Date(timeOut);

            if (start && end && end > start) {
              const usageHours = (end - start) / (1000 * 60 * 60);
              deviceTypeMap[deviceType].totalHours += usageHours;

              if (status.toLowerCase().includes("in use")) {
                deviceTypeMap[deviceType].inUseHours += usageHours;
              }

              // Track hourly usage
              const hour = start.getHours();
              deviceTypeMap[deviceType].hourlyUsage[hour]++;
            }
          }
        });
      });

      // Calculate aggregate metrics by device type
      Object.entries(deviceTypeMap).forEach(([deviceType, stats]) => {
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
      // Group by device ID - reuse the same equipment objects if we already have them
      const deviceMap = {};

      movements.forEach((movement) => {
        const deviceId = movement.deviceId || "";

        if (!deviceId) return;

        if (!deviceMap[deviceId]) {
          deviceMap[deviceId] = new Equipment(deviceId);
        }

        // Add usage data to the equipment object
        if (
          movement.fromLocation &&
          movement.toLocation &&
          movement.timeIn &&
          movement.timeOut
        ) {
          deviceMap[deviceId].addUsage(
            movement.toLocation,
            movement.status || "Unknown",
            movement.timeIn,
            movement.timeOut
          );
        }
      });

      // Generate maintenance recommendations
      Object.entries(deviceMap).forEach(([deviceId, equipment]) => {
        // Skip if not enough usage history
        if (equipment.usageHistory.length < 3) return;

        // Analyze maintenance needs
        const maintenanceNeeded = equipment.needsMaintenance();

        if (maintenanceNeeded.needed) {
          const deviceType = deviceId.split("-")[0] || "Unknown";
          const metrics = maintenanceNeeded.metrics;

          recommendations.push({
            _id: `maintenance_${deviceId}_${Date.now()}`,
            type: "maintenance",
            title: `Schedule ${deviceType} Maintenance`,
            description: `${deviceId} has been in use for ${Math.round(
              metrics.totalUsageHours
            )} hours across ${
              metrics.totalMovements
            } movements. Recommend scheduling maintenance within the next ${Math.round(
              metrics.daysUntilMaintenance
            )} days.`,
            savings: `Prevent downtime and extend equipment lifespan`,
            implemented: false,
            createdAt: new Date().toISOString(),
            deviceId: deviceId,
            metrics: metrics,
            hoursSaved: 0,
            distanceSaved: 0,
            movementsPerMonth: 0,
          });
        }
      });
    } catch (error) {
      console.error("Error in maintenance prediction:", error);
    }

    return recommendations;
  }

  /**
   * Generate all recommendations for the given movement data
   * @param {Array} movements - The movement data to analyze
   * @returns {Array} All recommendations
   */
  generateRecommendations(movements) {
    if (!movements || movements.length === 0) {
      return [];
    }

    try {
      // Generate all types of recommendations
      const walkingRecs = this.optimizeWalkingDistance(movements);
      const utilizationResults = this.analyzeUtilization(movements);
      const maintenanceRecs = this.predictMaintenance(movements);

      // Combine all recommendations
      const allRecommendations = [
        ...walkingRecs,
        ...utilizationResults.recommendations,
        ...maintenanceRecs,
      ];

      // Sort by potential savings (hours saved)
      allRecommendations.sort((a, b) => {
        return (b.hoursSaved || 0) - (a.hoursSaved || 0);
      });

      return allRecommendations;
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return [];
    }
  }
}

export default OptimizationService;
