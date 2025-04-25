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
      if (window.electron) {
        console.log("Database service initialized");
        return true;
      } else {
        console.error(
          "Electron bridge not available. Database operations will not work."
        );
        return false;
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
        console.error("Electron bridge not available. Cannot import CSV data.");
        return {
          success: false,
          message: "Electron bridge not available. Cannot import CSV data.",
        };
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
        console.error("Electron bridge not available. Cannot get devices.");
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
        console.error("Electron bridge not available. Cannot get locations.");
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
        console.error("Electron bridge not available. Cannot get movements.");
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
        console.error(
          "Electron bridge not available. Cannot get recommendations."
        );
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
        console.error(
          "Electron bridge not available. Cannot generate recommendations."
        );
        return {
          success: false,
          message:
            "Electron bridge not available. Cannot generate recommendations.",
        };
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
        console.error(
          "Electron bridge not available. Cannot implement recommendation."
        );
        return {
          success: false,
          message:
            "Electron bridge not available. Cannot implement recommendation.",
        };
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
        console.error("Electron bridge not available. Cannot reset database.");
        return {
          success: false,
          message: "Electron bridge not available. Cannot reset database.",
        };
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
        console.error(
          "Electron bridge not available. Cannot get usage statistics."
        );
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
