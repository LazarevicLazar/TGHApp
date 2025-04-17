/**
 * Data Processing Service
 *
 * This service provides methods for processing and analyzing RTLS data,
 * including generating recommendations based on equipment usage patterns.
 */

import { calculateDistance, groupBy } from "../utils/helpers";

class DataProcessingService {
  /**
   * Generate recommendations based on equipment usage and movement patterns
   * @param {Array} data - The movement data to analyze
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(data) {
    if (!data || data.length === 0) {
      return [];
    }

    const recommendations = [];

    // Add placement optimization recommendations
    const placementRecs = this.generatePlacementRecommendations(data);
    recommendations.push(...placementRecs);

    // Add purchase recommendations
    const purchaseRecs = this.generatePurchaseRecommendations(data);
    recommendations.push(...purchaseRecs);

    // Add maintenance recommendations
    const maintenanceRecs = this.generateMaintenanceRecommendations(data);
    recommendations.push(...maintenanceRecs);

    return recommendations;
  }

  /**
   * Generate recommendations for optimizing equipment placement
   * @param {Array} data - The movement data to analyze
   * @returns {Array} Array of placement recommendations
   */
  generatePlacementRecommendations(data) {
    // Group movements by device type
    const deviceTypes = {};

    data.forEach((movement) => {
      const deviceId = movement.deviceId || "";
      const deviceType = deviceId.split("-")[0] || "Unknown";

      if (!deviceTypes[deviceType]) {
        deviceTypes[deviceType] = [];
      }

      deviceTypes[deviceType].push(movement);
    });

    const recommendations = [];

    // Analyze each device type
    Object.entries(deviceTypes).forEach(([deviceType, movements]) => {
      // Skip if not enough data
      if (movements.length < 5) return;

      // Count movements between locations
      const locationPairs = {};

      movements.forEach((movement) => {
        const from = movement.fromLocation;
        const to = movement.toLocation;

        if (from && to && from !== to) {
          const key = `${from}-${to}`;
          if (!locationPairs[key]) {
            locationPairs[key] = { from, to, count: 0 };
          }
          locationPairs[key].count++;
        }
      });

      // Find the most frequent movement pair
      const sortedPairs = Object.values(locationPairs).sort(
        (a, b) => b.count - a.count
      );

      if (sortedPairs.length > 0) {
        const topPair = sortedPairs[0];

        // Only recommend if there's a significant pattern
        if (topPair.count >= 3) {
          recommendations.push({
            _id: `placement_${deviceType}_${Date.now()}`,
            type: "placement",
            title: `Optimize ${deviceType} Placement`,
            description: `Consider relocating ${deviceType} equipment closer to ${topPair.to} to reduce staff walking distance. This location has the highest usage frequency.`,
            savings: `~${Math.round(topPair.count * 5)} minutes/day`,
            implemented: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    return recommendations;
  }

  /**
   * Generate recommendations for equipment purchases
   * @param {Array} data - The movement data to analyze
   * @returns {Array} Array of purchase recommendations
   */
  generatePurchaseRecommendations(data) {
    // Group by device type
    const deviceTypes = {};

    data.forEach((movement) => {
      const deviceId = movement.deviceId || "";
      const deviceType = deviceId.split("-")[0] || "Unknown";

      if (!deviceTypes[deviceType]) {
        deviceTypes[deviceType] = { count: 0, inUse: 0 };
      }

      deviceTypes[deviceType].count++;

      // Count "in use" status
      if (movement.status && movement.status.toLowerCase().includes("in use")) {
        deviceTypes[deviceType].inUse++;
      }
    });

    const recommendations = [];

    // Analyze utilization rates
    Object.entries(deviceTypes).forEach(([deviceType, stats]) => {
      // Calculate utilization rate
      const utilizationRate =
        stats.count > 0 ? (stats.inUse / stats.count) * 100 : 0;

      // Recommend purchase if utilization is high
      if (utilizationRate > 80) {
        recommendations.push({
          _id: `purchase_${deviceType}_${Date.now()}`,
          type: "purchase",
          title: `Additional ${deviceType} Units Needed`,
          description: `${deviceType} equipment is utilized at ${Math.round(
            utilizationRate
          )}% capacity. Consider purchasing additional units to reduce wait times and improve patient care.`,
          savings: `Improved patient care and staff efficiency`,
          implemented: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate recommendations for maintenance scheduling
   * @param {Array} data - The movement data to analyze
   * @returns {Array} Array of maintenance recommendations
   */
  generateMaintenanceRecommendations(data) {
    // Group by device ID
    const devices = groupBy(data, "deviceId");
    const recommendations = [];

    // Analyze each device
    Object.entries(devices).forEach(([deviceId, movements]) => {
      if (!deviceId || movements.length < 3) return;

      const deviceType = deviceId.split("-")[0] || "Unknown";

      // Calculate total usage time
      let totalUsageHours = 0;

      movements.forEach((movement) => {
        if (movement.timeIn && movement.timeOut) {
          const timeIn = new Date(movement.timeIn);
          const timeOut = new Date(movement.timeOut);

          if (timeIn && timeOut && timeOut > timeIn) {
            // Calculate the exact time difference in milliseconds
            const timeDiffMs = timeOut.getTime() - timeIn.getTime();

            // Convert to hours with precision to avoid rounding errors
            const usageHours = timeDiffMs / (1000 * 60 * 60);

            // Round to 2 decimal places to avoid floating point precision issues
            const roundedHours = Math.round(usageHours * 100) / 100;

            totalUsageHours += roundedHours;
          }
        }
      });

      // Round the final total to avoid floating point precision issues
      totalUsageHours = Math.round(totalUsageHours * 100) / 100;

      // Recommend maintenance based on usage thresholds
      // These thresholds would be different for each device type in a real system
      const maintenanceThresholds = {
        Ventilator: 500,
        Ultrasound: 300,
        Defibrillator: 200,
        "IV-Pump": 1000,
        Monitor: 800,
        default: 500,
      };

      const threshold =
        maintenanceThresholds[deviceType] || maintenanceThresholds.default;

      if (totalUsageHours > threshold * 0.8) {
        recommendations.push({
          _id: `maintenance_${deviceId}_${Date.now()}`,
          type: "maintenance",
          title: `${deviceId} Maintenance Required Soon`,
          description: `${deviceId} has accumulated ${Math.round(
            totalUsageHours
          )} hours of usage, approaching the recommended maintenance threshold of ${threshold} hours.`,
          savings: "Preventative maintenance reduces downtime",
          implemented: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

    return recommendations;
  }

  /**
   * Analyze equipment usage patterns
   * @param {Array} data - The movement data to analyze
   * @returns {Object} Usage statistics
   */
  analyzeUsagePatterns(data) {
    if (!data || data.length === 0) {
      return {
        deviceTypes: [],
        locations: [],
        utilizationRates: {},
      };
    }

    // Group by device type
    const deviceTypeGroups = {};
    const locationGroups = {};

    data.forEach((movement) => {
      const deviceId = movement.deviceId || "";
      const deviceType = deviceId.split("-")[0] || "Unknown";
      const location = movement.toLocation || "Unknown";

      // Count by device type
      if (!deviceTypeGroups[deviceType]) {
        deviceTypeGroups[deviceType] = { count: 0, inUse: 0 };
      }
      deviceTypeGroups[deviceType].count++;

      if (movement.status && movement.status.toLowerCase().includes("in use")) {
        deviceTypeGroups[deviceType].inUse++;
      }

      // Count by location
      if (!locationGroups[location]) {
        locationGroups[location] = { count: 0 };
      }
      locationGroups[location].count++;
    });

    // Calculate utilization rates
    const utilizationRates = {};
    Object.entries(deviceTypeGroups).forEach(([deviceType, stats]) => {
      utilizationRates[deviceType] =
        stats.count > 0 ? (stats.inUse / stats.count) * 100 : 0;
    });

    // Format for charts
    const deviceTypes = Object.entries(deviceTypeGroups).map(
      ([name, stats]) => ({
        name,
        count: stats.count,
        usage: Math.round(utilizationRates[name] || 0),
      })
    );

    const locations = Object.entries(locationGroups).map(([name, stats]) => ({
      name,
      value: stats.count,
    }));

    return {
      deviceTypes: deviceTypes.sort((a, b) => b.count - a.count),
      locations: locations.sort((a, b) => b.value - a.value),
      utilizationRates,
    };
  }
}

// Create and export a singleton instance
const dataProcessingService = new DataProcessingService();
export default dataProcessingService;
