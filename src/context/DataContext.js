import React, { createContext, useContext, useState, useEffect } from "react";

// Create context
const DataContext = createContext();

// Helper function to parse hours saved from savings string
const parseHoursSaved = (savingsString) => {
  if (!savingsString) return 0;

  // Try to extract hours from strings like "~120 hours/month"
  const hoursMatch = savingsString.match(/(\d+)\s*hours/i);
  if (hoursMatch && hoursMatch[1]) {
    return parseFloat(hoursMatch[1]);
  }

  // Try to extract dollar amount and convert to hours (assuming $50/hour)
  const moneyMatch = savingsString.match(/\$(\d+),?(\d*)/);
  if (moneyMatch) {
    const amount = parseFloat(moneyMatch[1] + (moneyMatch[2] || ""));
    return amount / 50; // Convert dollars to hours
  }

  return 0;
};

// Custom hook to use the data context
export const useDataContext = () => useContext(DataContext);

// Provider component
export const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [movements, setMovements] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [optimizationHistory, setOptimizationHistory] = useState([]);
  const [totalSavings, setTotalSavings] = useState({ hours: 0, money: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load optimization history from localStorage
        try {
          const savedHistory = localStorage.getItem("optimizationHistory");
          if (savedHistory) {
            const history = JSON.parse(savedHistory);
            setOptimizationHistory(history);

            // Calculate total savings
            let totalHours = 0;
            history.forEach((item) => {
              totalHours += item.hoursSaved || 0;
            });

            // Convert hours to money (assuming $50/hour labor cost)
            const totalMoney = totalHours * 50;

            setTotalSavings({ hours: totalHours, money: totalMoney });
          }
        } catch (err) {
          console.error("Error loading optimization history:", err);
        }

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

      // Find the recommendation to implement
      const recommendation = recommendations.find(
        (rec) => rec._id === recommendationId
      );

      if (!recommendation) {
        return { success: false, message: "Recommendation not found" };
      }

      if (window.electron) {
        const result = await window.electron.implementRecommendation(
          recommendationId
        );

        if (result.success) {
          // Track the optimization in history
          const newOptimization = {
            date: new Date().toISOString(),
            type: recommendation.type,
            description: recommendation.description,
            impact: recommendation.savings,
            hoursSaved: parseHoursSaved(recommendation.savings),
            deviceId: recommendation.deviceId,
            implemented: true,
          };

          // Update optimization history
          const updatedHistory = [...optimizationHistory, newOptimization];
          setOptimizationHistory(updatedHistory);

          // Save to localStorage
          localStorage.setItem(
            "optimizationHistory",
            JSON.stringify(updatedHistory)
          );

          // Update total savings
          const hoursSaved = parseHoursSaved(recommendation.savings);
          setTotalSavings((prev) => ({
            hours: prev.hours + hoursSaved,
            money: prev.money + hoursSaved * 50, // $50 per hour
          }));

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

        // Track the optimization in history
        const newOptimization = {
          date: new Date().toISOString(),
          type: recommendation.type,
          description: recommendation.description,
          impact: recommendation.savings,
          hoursSaved: parseHoursSaved(recommendation.savings),
          deviceId: recommendation.deviceId,
          implemented: true,
        };

        // Update optimization history
        const updatedHistory = [...optimizationHistory, newOptimization];
        setOptimizationHistory(updatedHistory);

        // Save to localStorage
        localStorage.setItem(
          "optimizationHistory",
          JSON.stringify(updatedHistory)
        );

        // Update total savings
        const hoursSaved = parseHoursSaved(recommendation.savings);
        setTotalSavings((prev) => ({
          hours: prev.hours + hoursSaved,
          money: prev.money + hoursSaved * 50, // $50 per hour
        }));

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

          // Log information about duplicates and errors
          if (result.duplicates && result.duplicates.length > 0) {
            console.log(`Found ${result.duplicates.length} duplicate records`);
          }

          if (result.errors && result.errors.length > 0) {
            console.log(`Found ${result.errors.length} records with errors`);
            console.log("Errors:", result.errors);
          }
        }

        return result;
      } else {
        // For development without Electron
        console.log("Would import CSV data in Electron");
        return {
          success: true,
          count: 10,
          data: [],
          duplicates: [],
          errors: [],
          errorCount: 0,
        };
      }
    } catch (err) {
      console.error("Error importing CSV data:", err);
      setError(err.message);
      return {
        success: false,
        error: err.message,
        count: 0,
        data: [],
        duplicates: [],
        errors: [{ error: err.message }],
        errorCount: 1,
      };
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

          // Clear optimization history
          setOptimizationHistory([]);
          localStorage.removeItem("optimizationHistory");

          // Reset total savings
          setTotalSavings({ hours: 0, money: 0 });

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

        // Clear optimization history
        setOptimizationHistory([]);
        localStorage.removeItem("optimizationHistory");

        // Reset total savings
        setTotalSavings({ hours: 0, money: 0 });

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

  // Implement all recommendations at once
  const implementAllRecommendations = async () => {
    try {
      setLoading(true);

      if (window.electron) {
        const result = await window.electron.implementAllRecommendations();

        if (result.success) {
          // Create optimization history entries for all implemented recommendations
          const newOptimizations = recommendations.map((recommendation) => ({
            date: new Date().toISOString(),
            type: recommendation.type,
            description: recommendation.description,
            impact: recommendation.savings,
            hoursSaved: parseHoursSaved(recommendation.savings),
            deviceId: recommendation.deviceId,
            implemented: true,
          }));

          // Calculate total hours saved
          let totalHoursSaved = 0;
          newOptimizations.forEach((opt) => {
            totalHoursSaved += opt.hoursSaved || 0;
          });

          // Update optimization history
          const updatedHistory = [...optimizationHistory, ...newOptimizations];
          setOptimizationHistory(updatedHistory);

          // Save to localStorage
          localStorage.setItem(
            "optimizationHistory",
            JSON.stringify(updatedHistory)
          );

          // Update total savings
          setTotalSavings((prev) => ({
            hours: prev.hours + totalHoursSaved,
            money: prev.money + totalHoursSaved * 50, // $50 per hour
          }));

          // Clear all recommendations
          setRecommendations([]);
        }

        return result;
      } else {
        // For development without Electron
        console.log("Would implement all recommendations in Electron");

        // Create optimization history entries for all implemented recommendations
        const newOptimizations = recommendations.map((recommendation) => ({
          date: new Date().toISOString(),
          type: recommendation.type,
          description: recommendation.description,
          impact: recommendation.savings,
          hoursSaved: parseHoursSaved(recommendation.savings),
          deviceId: recommendation.deviceId,
          implemented: true,
        }));

        // Calculate total hours saved
        let totalHoursSaved = 0;
        newOptimizations.forEach((opt) => {
          totalHoursSaved += opt.hoursSaved || 0;
        });

        // Update optimization history
        const updatedHistory = [...optimizationHistory, ...newOptimizations];
        setOptimizationHistory(updatedHistory);

        // Save to localStorage
        localStorage.setItem(
          "optimizationHistory",
          JSON.stringify(updatedHistory)
        );

        // Update total savings
        setTotalSavings((prev) => ({
          hours: prev.hours + totalHoursSaved,
          money: prev.money + totalHoursSaved * 50, // $50 per hour
        }));

        // Clear all recommendations
        setRecommendations([]);

        return {
          success: true,
          numRemoved: recommendations.length,
          implementedCount: recommendations.length,
          message: `Successfully implemented ${recommendations.length} recommendations`,
        };
      }
    } catch (err) {
      console.error("Error implementing all recommendations:", err);
      setError(err.message);
      return { success: false };
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
    optimizationHistory,
    setOptimizationHistory,
    totalSavings,
    setTotalSavings,
    loading,
    setLoading,
    error,
    setError,
    generateRecommendations,
    implementRecommendation,
    implementAllRecommendations,
    resetDatabase,
    importFromCsv,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
