/**
 * Database Service
 *
 * This service provides an interface to interact with the NeDB database
 * through the Electron IPC bridge.
 */

class DatabaseService {
  /**
   * Initialize the database service
   */
  async initialize() {
    try {
      // In Electron, this would initialize the database
      // Here we're just checking if the electron bridge is available
      if (window.electron) {
        console.log("Database service initialized");
        return true;
      } else {
        console.log("Running in development mode, using mock database");
        return true;
      }
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }

  /**
   * Import data from CSV
   * @param {Array} data - The data to import
   * @returns {Promise<Object>} Result of the import operation
   */
  async importFromCsv(data) {
    try {
      if (window.electron) {
        return await window.electron.importCsvData(data);
      } else {
        // Mock implementation for development
        console.log("Would import", data.length, "records in Electron");
        return { success: true, count: data.length };
      }
    } catch (error) {
      console.error("Error importing from CSV:", error);
      throw error;
    }
  }

  /**
   * Get all devices
   * @returns {Promise<Array>} Array of devices
   */
  async getDevices() {
    try {
      if (window.electron) {
        return await window.electron.getDevices();
      } else {
        // Mock implementation for development
        return [];
      }
    } catch (error) {
      console.error("Error getting devices:", error);
      throw error;
    }
  }

  /**
   * Get all locations
   * @returns {Promise<Array>} Array of locations
   */
  async getLocations() {
    try {
      if (window.electron) {
        return await window.electron.getLocations();
      } else {
        // Mock implementation for development
        return [];
      }
    } catch (error) {
      console.error("Error getting locations:", error);
      throw error;
    }
  }

  /**
   * Get all movements
   * @returns {Promise<Array>} Array of movements
   */
  async getMovements() {
    try {
      if (window.electron) {
        return await window.electron.getMovements();
      } else {
        // Mock implementation for development
        return [];
      }
    } catch (error) {
      console.error("Error getting movements:", error);
      throw error;
    }
  }

  /**
   * Get all recommendations
   * @returns {Promise<Array>} Array of recommendations
   */
  async getRecommendations() {
    try {
      if (window.electron) {
        return await window.electron.getRecommendations();
      } else {
        // Mock implementation for development
        return [];
      }
    } catch (error) {
      console.error("Error getting recommendations:", error);
      throw error;
    }
  }

  /**
   * Generate recommendations
   * @returns {Promise<Array>} Array of generated recommendations
   */
  async generateRecommendations() {
    try {
      if (window.electron) {
        return await window.electron.generateRecommendations();
      } else {
        // Mock implementation for development
        return [
          {
            _id: `rec_${Date.now()}`,
            type: "placement",
            title: "Optimize Ventilator Placement",
            description:
              "Moving ventilators from ICU storage to Emergency Department would reduce staff walking distance by approximately 15%.",
            savings: "~120 hours/month",
            implemented: false,
            createdAt: new Date().toISOString(),
          },
        ];
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      throw error;
    }
  }

  /**
   * Implement recommendation (removes it from the database)
   * @param {string} recommendationId - The ID of the recommendation to implement
   * @returns {Promise<Object>} Result of the implementation
   */
  async implementRecommendation(recommendationId) {
    try {
      if (window.electron) {
        return await window.electron.implementRecommendation(recommendationId);
      } else {
        // Mock implementation for development
        console.log("Would implement recommendation:", recommendationId);
        return { success: true, numRemoved: 1 };
      }
    } catch (error) {
      console.error("Error implementing recommendation:", error);
      throw error;
    }
  }

  /**
   * Reset database (removes all records from all collections)
   * @returns {Promise<Object>} Result of the reset operation
   */
  async resetDatabase() {
    try {
      if (window.electron) {
        return await window.electron.resetDatabase();
      } else {
        // Mock implementation for development
        console.log("Would reset database in Electron");
        return { success: true, message: "Database reset (mock)" };
      }
    } catch (error) {
      console.error("Error resetting database:", error);
      throw error;
    }
  }

  /**
   * Get usage statistics
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsage() {
    try {
      if (window.electron) {
        const movements = await window.electron.getMovements();
        return movements;
      } else {
        // Mock implementation for development
        return [];
      }
    } catch (error) {
      console.error("Error getting usage statistics:", error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const databaseService = new DatabaseService();
export default databaseService;
