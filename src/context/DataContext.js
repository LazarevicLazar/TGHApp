import React, { createContext, useContext, useState, useEffect } from "react";

// Create context
const DataContext = createContext();

// Custom hook to use the data context
export const useDataContext = () => useContext(DataContext);

// Provider component
export const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [movements, setMovements] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Check if we're running in Electron
        if (window.electron) {
          // Load data from database
          const devicesData = await window.electron.getDevices();
          const locationsData = await window.electron.getLocations();
          const movementsData = await window.electron.getMovements();
          const recommendationsData =
            await window.electron.getRecommendations();

          setDevices(devicesData);
          setLocations(locationsData);
          setMovements(movementsData);
          setRecommendations(recommendationsData);

          // Set combined data for backward compatibility
          setData([...movementsData]);
        } else {
          // For development without Electron, use empty arrays
          console.log("Running in development mode, using empty data");

          setDevices([]);
          setLocations([]);
          setMovements([]);
          setRecommendations([]);
          setData([]);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Generate recommendations
  const generateRecommendations = async () => {
    try {
      setLoading(true);

      if (window.electron) {
        const result = await window.electron.generateRecommendations();

        if (result.success) {
          // Set the new recommendations (replacing any existing ones)
          setRecommendations(result.recommendations);
          return { success: true };
        } else {
          // Show error message
          setError(result.message || "Failed to generate recommendations");
          return { success: false, message: result.message };
        }
      } else {
        // For development without Electron
        console.log("Would generate recommendations in Electron");

        // Check if there's any data
        if (devices.length === 0 || movements.length === 0) {
          setError("No data imported yet. Please import data first.");
          return {
            success: false,
            message: "No data imported yet. Please import data first.",
          };
        }

        // Create sample recommendations
        const newRecommendations = [
          {
            _id: `rec_${Date.now()}_1`,
            type: "placement",
            title: "New Ventilator Placement",
            description:
              "Moving ventilators from ICU storage to Emergency Department would reduce staff walking distance by approximately 15%.",
            savings: "~120 hours/month",
            implemented: false,
            createdAt: new Date().toISOString(),
          },
          {
            _id: `rec_${Date.now()}_2`,
            type: "purchase",
            title: "New IV Pumps Needed",
            description:
              "Current IV pumps are utilized at 90% capacity. Adding 5 more units would reduce wait times and improve patient care.",
            savings: "~$15,000/year",
            implemented: false,
            createdAt: new Date().toISOString(),
          },
          {
            _id: `rec_${Date.now()}_3`,
            type: "maintenance",
            title: "New Maintenance Schedule",
            description:
              "Ultrasound machines in Radiology are approaching maintenance thresholds based on usage patterns.",
            savings: "Preventative maintenance",
            implemented: false,
            createdAt: new Date().toISOString(),
          },
        ];

        // Set the new recommendations (replacing any existing ones)
        setRecommendations(newRecommendations);
        return { success: true };
      }
    } catch (err) {
      console.error("Error generating recommendations:", err);
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Implement recommendation
  const implementRecommendation = async (recommendationId) => {
    try {
      setLoading(true);

      if (window.electron) {
        const result = await window.electron.implementRecommendation(
          recommendationId
        );
        if (result.success) {
          // Remove the recommendation from the state
          setRecommendations((prevRecommendations) =>
            prevRecommendations.filter((rec) => rec._id !== recommendationId)
          );
        }
        return result;
      } else {
        // For development without Electron
        console.log(
          "Would implement recommendation in Electron:",
          recommendationId
        );

        // Remove the recommendation from the state
        setRecommendations((prevRecommendations) =>
          prevRecommendations.filter((rec) => rec._id !== recommendationId)
        );

        return { success: true, numRemoved: 1 };
      }
    } catch (err) {
      console.error("Error implementing recommendation:", err);
      setError(err.message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Import data from CSV
  const importFromCsv = async (csvData) => {
    try {
      setLoading(true);

      if (window.electron) {
        const result = await window.electron.importCsvData(csvData);

        if (result.success) {
          // Reload data after import
          const devicesData = await window.electron.getDevices();
          const locationsData = await window.electron.getLocations();
          const movementsData = await window.electron.getMovements();

          setDevices(devicesData);
          setLocations(locationsData);
          setMovements(movementsData);
          setData([...movementsData]);
        }

        return result;
      } else {
        // For development without Electron
        console.log("Would import CSV data in Electron");
        return { success: true, count: 10, data: [] };
      }
    } catch (err) {
      console.error("Error importing CSV data:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset database
  const resetDatabase = async () => {
    try {
      setLoading(true);

      if (window.electron) {
        const result = await window.electron.resetDatabase();

        if (result.success) {
          // Clear all data in the state
          setDevices([]);
          setLocations([]);
          setMovements([]);
          setRecommendations([]);
          setData([]);

          return { success: true, message: result.message };
        } else {
          setError("Failed to reset database");
          return { success: false, message: "Failed to reset database" };
        }
      } else {
        // For development without Electron
        console.log("Would reset database in Electron");

        // Clear all data in the state
        setDevices([]);
        setLocations([]);
        setMovements([]);
        setRecommendations([]);
        setData([]);

        return { success: true, message: "Database reset (mock)" };
      }
    } catch (err) {
      console.error("Error resetting database:", err);
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    data,
    setData,
    devices,
    setDevices,
    locations,
    setLocations,
    movements,
    setMovements,
    recommendations,
    setRecommendations,
    loading,
    setLoading,
    error,
    setError,
    generateRecommendations,
    implementRecommendation,
    resetDatabase,
    importFromCsv,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
