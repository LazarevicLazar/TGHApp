import React, { createContext, useContext, useState, useEffect } from "react";

// Helper function to handle standard time periods (today, this month, last 3 months, last year)
const handleStandardTimePeriod = (mode, movements, setFilteredMovements) => {
  const now = new Date();
  let startDate = new Date(0); // Default to epoch start (all data)

  // Calculate start date based on selected time filter mode
  if (mode === "day") {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0); // Start of today
  } else if (mode === "month") {
    startDate = new Date(now);
    startDate.setDate(1); // Start of current month
    startDate.setHours(0, 0, 0, 0);
  } else if (mode === "3months" || mode === "quarter") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 3); // 3 months ago
    startDate.setHours(0, 0, 0, 0);
  } else if (mode === "year") {
    startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 1); // 1 year ago
    startDate.setHours(0, 0, 0, 0);
  }

  // Filter movements by date
  const filtered = movements.filter((movement) => {
    const movementDate = new Date(movement.timeIn || movement.In || 0);
    return movementDate >= startDate;
  });

  setFilteredMovements(filtered);
};

// Create context
const DataContext = createContext();

// Helper function to parse hours saved from savings string
const parseHoursSaved = (savingsString) => {
  if (!savingsString) return 0;

  // Try to extract hours from strings like "~5.2 hours/month based on 15 movements/month"
  const hoursMatch = savingsString.match(/~?(\d+\.?\d*)\s*hours/i);
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
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [optimizationHistory, setOptimizationHistory] = useState([]);
  const [filteredOptimizationHistory, setFilteredOptimizationHistory] =
    useState([]);
  const [totalSavings, setTotalSavings] = useState({ hours: 0, money: 0 });
  const [filteredTotalSavings, setFilteredTotalSavings] = useState({
    hours: 0,
    money: 0,
  });
  const [timeFilter, setTimeFilter] = useState("all");
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
              totalHours += parseFloat(item.hoursSaved || 0);
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
          // For development without Electron, load sample data from CSV
          console.log("Running in development mode, loading sample data");

          try {
            // Load sample data from CSV file
            const loadSampleData = async () => {
              try {
                const response = await fetch("/sample_data.csv");
                if (!response.ok) {
                  throw new Error(
                    `Failed to load sample data: ${response.status}`
                  );
                }

                const csvText = await response.text();
                const lines = csvText
                  .split("\n")
                  .filter((line) => line.trim() && !isNaN(line.charAt(0)));

                // Parse CSV data
                const sampleMovements = lines.map((line) => {
                  const [Device, Location, Status, In, Out] = line.split(",");
                  return {
                    deviceId: Device,
                    Location,
                    Status,
                    In,
                    Out,
                    // Add these fields for compatibility with our visualization
                    fromLocation: null, // Will be calculated in sequence
                    toLocation: Location,
                  };
                });

                // Process movements to add fromLocation based on previous movement
                const deviceMovements = {};
                sampleMovements.forEach((movement) => {
                  const deviceId = movement.deviceId;
                  if (!deviceMovements[deviceId]) {
                    deviceMovements[deviceId] = [];
                  }
                  deviceMovements[deviceId].push(movement);
                });

                // Sort by time and set fromLocation
                Object.values(deviceMovements).forEach((movements) => {
                  movements.sort((a, b) => new Date(a.In) - new Date(b.In));

                  for (let i = 1; i < movements.length; i++) {
                    movements[i].fromLocation = movements[i - 1].Location;
                  }
                });

                // Flatten back to array
                const processedMovements =
                  Object.values(deviceMovements).flat();

                console.log(
                  `Loaded ${processedMovements.length} sample movements`
                );
                setMovements(processedMovements);
                setData(processedMovements);

                // Extract unique devices
                const uniqueDevices = [
                  ...new Set(processedMovements.map((m) => m.deviceId)),
                ];
                const devicesData = uniqueDevices.map((deviceId) => ({
                  deviceId,
                  deviceType: deviceId.split("-")[0],
                  status: "Available",
                }));

                setDevices(devicesData);

                // Extract unique locations
                const uniqueLocations = [
                  ...new Set(processedMovements.map((m) => m.Location)),
                ];
                const locationsData = uniqueLocations.map((name) => ({ name }));

                setLocations(locationsData);
                setRecommendations([]);
              } catch (error) {
                console.error("Error loading sample data:", error);
                // Fallback to empty arrays
                setDevices([]);
                setLocations([]);
                setMovements([]);
                setRecommendations([]);
                setData([]);
              }
            };

            loadSampleData();
          } catch (error) {
            console.error("Error in sample data loading:", error);
            // Fallback to empty arrays
            setDevices([]);
            setLocations([]);
            setMovements([]);
            setRecommendations([]);
            setData([]);
          }
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

  // Filter data based on selected time period
  useEffect(() => {
    // Extract mode from timeFilter (handle both string and object formats)
    const mode =
      typeof timeFilter === "string" ? timeFilter : timeFilter.mode || "all";

    // Filter movements based on time period
    if (movements && movements.length > 0) {
      const now = new Date();
      let startDate = new Date(0); // Default to epoch start (all data)

      // Handle specific date selections if timeFilter is an object
      if (typeof timeFilter === "object") {
        if (mode === "day" && timeFilter.day) {
          // If a specific day is selected, use that day
          startDate = new Date(timeFilter.day);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1); // End of the selected day

          // Filter movements for the specific day
          const filtered = movements.filter((movement) => {
            const movementDate = new Date(movement.timeIn || movement.In || 0);
            return movementDate >= startDate && movementDate < endDate;
          });

          setFilteredMovements(filtered);
        } else if (mode === "month" && timeFilter.month) {
          // If a specific month is selected, use that month
          const [year, month] = timeFilter.month.split("-");
          startDate = new Date(parseInt(year), parseInt(month) - 1, 1); // Start of the selected month
          const endDate = new Date(parseInt(year), parseInt(month), 0); // End of the selected month
          endDate.setHours(23, 59, 59, 999);

          // Filter movements for the specific month
          const filtered = movements.filter((movement) => {
            const movementDate = new Date(movement.timeIn || movement.In || 0);
            return movementDate >= startDate && movementDate <= endDate;
          });

          setFilteredMovements(filtered);
        } else if (mode === "quarter" && timeFilter.quarter) {
          // If a specific quarter is selected, use that quarter
          const [year, quarterStr] = timeFilter.quarter.split("-");
          const quarter = parseInt(quarterStr.substring(1));
          const startMonth = (quarter - 1) * 3;
          startDate = new Date(parseInt(year), startMonth, 1); // Start of the selected quarter
          const endDate = new Date(parseInt(year), startMonth + 3, 0); // End of the selected quarter
          endDate.setHours(23, 59, 59, 999);

          // Filter movements for the specific quarter
          const filtered = movements.filter((movement) => {
            const movementDate = new Date(movement.timeIn || movement.In || 0);
            return movementDate >= startDate && movementDate <= endDate;
          });

          setFilteredMovements(filtered);
        } else if (mode === "year" && timeFilter.year) {
          // If a specific year is selected, use that year
          startDate = new Date(timeFilter.year, 0, 1); // Start of the selected year
          const endDate = new Date(timeFilter.year, 11, 31, 23, 59, 59, 999); // End of the selected year

          // Filter movements for the specific year
          const filtered = movements.filter((movement) => {
            const movementDate = new Date(movement.timeIn || movement.In || 0);
            return movementDate >= startDate && movementDate <= endDate;
          });

          setFilteredMovements(filtered);
        } else {
          // Handle standard time periods
          handleStandardTimePeriod(mode, movements, setFilteredMovements);
        }
      } else {
        // Handle standard time periods for string-based timeFilter
        handleStandardTimePeriod(mode, movements, setFilteredMovements);
      }
    } else {
      setFilteredMovements([]);
    }

    // Filter optimization history based on time period
    if (optimizationHistory && optimizationHistory.length > 0) {
      const now = new Date();
      let startDate = new Date(0); // Default to epoch start (all data)

      // Extract mode from timeFilter
      const mode =
        typeof timeFilter === "string" ? timeFilter : timeFilter.mode || "all";

      // Handle specific date selections for optimization history if timeFilter is an object
      if (typeof timeFilter === "object") {
        if (mode === "day" && timeFilter.day) {
          // If a specific day is selected, use that day
          startDate = new Date(timeFilter.day);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1); // End of the selected day

          // Filter history for the specific day
          const filtered = optimizationHistory.filter((item) => {
            const itemDate = new Date(item.date || 0);
            return itemDate >= startDate && itemDate < endDate;
          });

          setFilteredOptimizationHistory(filtered);
          calculateFilteredSavings(filtered);
          return;
        } else if (mode === "month" && timeFilter.month) {
          // If a specific month is selected, use that month
          const [year, month] = timeFilter.month.split("-");
          startDate = new Date(parseInt(year), parseInt(month) - 1, 1); // Start of the selected month
          const endDate = new Date(parseInt(year), parseInt(month), 0); // End of the selected month
          endDate.setHours(23, 59, 59, 999);

          // Filter history for the specific month
          const filtered = optimizationHistory.filter((item) => {
            const itemDate = new Date(item.date || 0);
            return itemDate >= startDate && itemDate <= endDate;
          });

          setFilteredOptimizationHistory(filtered);
          calculateFilteredSavings(filtered);
          return;
        } else if (mode === "quarter" && timeFilter.quarter) {
          // If a specific quarter is selected, use that quarter
          const [year, quarterStr] = timeFilter.quarter.split("-");
          const quarter = parseInt(quarterStr.substring(1));
          const startMonth = (quarter - 1) * 3;
          startDate = new Date(parseInt(year), startMonth, 1); // Start of the selected quarter
          const endDate = new Date(parseInt(year), startMonth + 3, 0); // End of the selected quarter
          endDate.setHours(23, 59, 59, 999);

          // Filter history for the specific quarter
          const filtered = optimizationHistory.filter((item) => {
            const itemDate = new Date(item.date || 0);
            return itemDate >= startDate && itemDate <= endDate;
          });

          setFilteredOptimizationHistory(filtered);
          calculateFilteredSavings(filtered);
          return;
        } else if (mode === "year" && timeFilter.year) {
          // If a specific year is selected, use that year
          startDate = new Date(timeFilter.year, 0, 1); // Start of the selected year
          const endDate = new Date(timeFilter.year, 11, 31, 23, 59, 59, 999); // End of the selected year

          // Filter history for the specific year
          const filtered = optimizationHistory.filter((item) => {
            const itemDate = new Date(item.date || 0);
            return itemDate >= startDate && itemDate <= endDate;
          });

          setFilteredOptimizationHistory(filtered);
          calculateFilteredSavings(filtered);
          return;
        }
      }

      // Handle standard time periods for optimization history
      if (mode === "day") {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0); // Start of today
      } else if (mode === "month") {
        startDate = new Date(now);
        startDate.setDate(1); // Start of current month
        startDate.setHours(0, 0, 0, 0);
      } else if (mode === "3months" || mode === "quarter") {
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3); // 3 months ago
        startDate.setHours(0, 0, 0, 0);
      } else if (mode === "year") {
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1); // 1 year ago
        startDate.setHours(0, 0, 0, 0);
      }

      // Filter history by date
      const filtered = optimizationHistory.filter((item) => {
        const itemDate = new Date(item.date || 0);
        return itemDate >= startDate;
      });

      setFilteredOptimizationHistory(filtered);
      calculateFilteredSavings(filtered);
    } else {
      setFilteredOptimizationHistory([]);
      setFilteredTotalSavings({ hours: 0, money: 0 });
    }
  }, [movements, optimizationHistory, timeFilter]);

  // Helper function to calculate filtered total savings
  const calculateFilteredSavings = (filtered) => {
    let totalHours = 0;
    filtered.forEach((item) => {
      // Ensure we're using hoursSaved if available, or parse it from savings string
      const hours =
        item.hoursSaved !== undefined
          ? parseFloat(item.hoursSaved || 0)
          : parseHoursSaved(item.impact || item.savings || "");

      totalHours += hours;
    });

    // Convert hours to money (assuming $50/hour labor cost)
    const totalMoney = totalHours * 50;

    setFilteredTotalSavings({
      hours: parseFloat(totalHours.toFixed(2)),
      money: parseFloat(totalMoney.toFixed(2)),
    });
  };

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
        console.log("Generating recommendations using OptimizationService");

        // Check if there's any data
        if (devices.length === 0 || movements.length === 0) {
          setError("No data imported yet. Please import data first.");
          return {
            success: false,
            message: "No data imported yet. Please import data first.",
          };
        }

        // Important: We're not using DatabaseService's mock implementation anymore
        // We're only using OptimizationService for generating recommendations

        try {
          // Import OptimizationService - use dynamic import to avoid caching issues
          const OptimizationServiceModule = await import(
            "../services/OptimizationService"
          );

          // Check if the imported module is valid and has the default export
          if (
            !OptimizationServiceModule ||
            !OptimizationServiceModule.default
          ) {
            console.error("OptimizationService module is invalid or empty");
            setError(
              "Failed to load optimization service. Please check the console for details."
            );
            return {
              success: false,
              message: "Failed to load optimization service",
            };
          }

          const optimizationService = OptimizationServiceModule.default;

          // Load graph data
          let graphData = null;
          try {
            const response = await fetch("/graph_data.json");
            if (response.ok) {
              graphData = await response.json();
              console.log("Graph data loaded successfully for recommendations");
            }
          } catch (error) {
            console.error("Error loading graph data:", error);
          }

          // Load floor plan data
          let floorPlanData = null;
          try {
            const response = await fetch("/floor_plan_progress.json");
            if (response.ok) {
              floorPlanData = await response.json();
              console.log(
                "Floor plan data loaded successfully for recommendations"
              );
            }
          } catch (error) {
            console.error("Error loading floor plan data:", error);
          }

          // Check if the optimization service has the required methods
          if (
            !optimizationService.initialize ||
            !optimizationService.generateRecommendations
          ) {
            console.error("OptimizationService is missing required methods");
            setError(
              "Optimization service is invalid. Please check the console for details."
            );
            return {
              success: false,
              message: "Optimization service is invalid",
            };
          }

          // Initialize the optimization service with the graph and floor plan data
          optimizationService.initialize(graphData, floorPlanData);

          // Generate recommendations using the optimization service
          const generatedRecommendations =
            optimizationService.generateRecommendations(movements);

          if (generatedRecommendations && generatedRecommendations.length > 0) {
            console.log(
              `Generated ${generatedRecommendations.length} recommendations with updated calculation method`
            );
            console.log(
              "Generated recommendations details:",
              JSON.stringify(generatedRecommendations, null, 2)
            );

            // Log each recommendation's hoursSaved, distanceSaved, and movementsPerMonth
            generatedRecommendations.forEach((rec, index) => {
              console.log(`Recommendation ${index + 1} - ${rec.title}:`);
              console.log(
                `  hoursSaved: ${
                  rec.hoursSaved
                } (type: ${typeof rec.hoursSaved})`
              );
              console.log(
                `  distanceSaved: ${
                  rec.distanceSaved
                } (type: ${typeof rec.distanceSaved})`
              );
              console.log(
                `  movementsPerMonth: ${
                  rec.movementsPerMonth
                } (type: ${typeof rec.movementsPerMonth})`
              );
            });

            // Ensure all recommendations have the required properties
            const enhancedRecommendations = generatedRecommendations.map(
              (rec) => {
                const enhanced = {
                  ...rec,
                  hoursSaved:
                    rec.hoursSaved !== undefined
                      ? parseFloat(rec.hoursSaved || 0)
                      : 0,
                  distanceSaved:
                    rec.distanceSaved !== undefined
                      ? parseFloat(rec.distanceSaved || 0)
                      : 0,
                  movementsPerMonth:
                    rec.movementsPerMonth !== undefined
                      ? parseFloat(rec.movementsPerMonth || 0)
                      : 0,
                  // Preserve our new distance metrics
                  currentTotalDistance:
                    rec.currentTotalDistance !== undefined
                      ? Math.round(rec.currentTotalDistance || 0)
                      : 0,
                  optimalTotalDistance:
                    rec.optimalTotalDistance !== undefined
                      ? Math.round(rec.optimalTotalDistance || 0)
                      : 0,
                  overallTotalDistance:
                    rec.overallTotalDistance !== undefined
                      ? Math.round(rec.overallTotalDistance || 0)
                      : 0,
                  storageTypeTotalDistance:
                    rec.storageTypeTotalDistance !== undefined
                      ? Math.round(rec.storageTypeTotalDistance || 0)
                      : 0,
                  percentImprovement:
                    rec.percentImprovement !== undefined
                      ? Math.round(rec.percentImprovement || 0)
                      : 0,
                  bestOverallLocation: rec.bestOverallLocation || null,
                  bestStorageTypeLocation: rec.bestStorageTypeLocation || null,
                };

                console.log(`Enhanced recommendation ${rec.title}:`);
                console.log(
                  `  hoursSaved: ${
                    enhanced.hoursSaved
                  } (type: ${typeof enhanced.hoursSaved})`
                );
                console.log(
                  `  distanceSaved: ${
                    enhanced.distanceSaved
                  } (type: ${typeof enhanced.distanceSaved})`
                );
                console.log(
                  `  movementsPerMonth: ${
                    enhanced.movementsPerMonth
                  } (type: ${typeof enhanced.movementsPerMonth})`
                );
                console.log(
                  `  currentTotalDistance: ${
                    enhanced.currentTotalDistance
                  } (type: ${typeof enhanced.currentTotalDistance})`
                );
                console.log(
                  `  optimalTotalDistance: ${
                    enhanced.optimalTotalDistance
                  } (type: ${typeof enhanced.optimalTotalDistance})`
                );
                console.log(
                  `  overallTotalDistance: ${
                    enhanced.overallTotalDistance
                  } (type: ${typeof enhanced.overallTotalDistance})`
                );
                console.log(
                  `  bestOverallLocation: ${enhanced.bestOverallLocation}`
                );

                return enhanced;
              }
            );

            console.log(
              "Enhanced recommendations:",
              JSON.stringify(enhancedRecommendations, null, 2)
            );
            setRecommendations(enhancedRecommendations);
            return { success: true };
          } else {
            // No recommendations were generated, show an error
            console.error("No recommendations could be generated");
            setError(
              "No recommendations could be generated. Please check your data and try again."
            );
            return {
              success: false,
              message: "No recommendations could be generated",
            };
          }
        } catch (error) {
          console.error("Error generating recommendations:", error);
          setError("Failed to generate recommendations: " + error.message);

          // Don't silently fall back to DatabaseService's mock implementation
          // Return an error instead
          return {
            success: false,
            message: "Failed to generate recommendations: " + error.message,
          };
        }
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
            hoursSaved:
              recommendation.hoursSaved !== undefined
                ? parseFloat(recommendation.hoursSaved || 0)
                : parseHoursSaved(recommendation.savings),
            distanceSaved: recommendation.distanceSaved || 0,
            movementsPerMonth: recommendation.movementsPerMonth || 0,
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
          const hoursSaved = parseFloat(
            recommendation.hoursSaved ||
              parseHoursSaved(recommendation.savings) ||
              0
          );
          setTotalSavings((prev) => ({
            hours: parseFloat(prev.hours || 0) + hoursSaved,
            money: parseFloat(prev.money || 0) + hoursSaved * 50, // $50 per hour
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
          hoursSaved:
            recommendation.hoursSaved !== undefined
              ? parseFloat(recommendation.hoursSaved || 0)
              : parseHoursSaved(recommendation.savings),
          distanceSaved: recommendation.distanceSaved || 0,
          movementsPerMonth: recommendation.movementsPerMonth || 0,
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
        const hoursSaved = parseFloat(
          recommendation.hoursSaved ||
            parseHoursSaved(recommendation.savings) ||
            0
        );
        setTotalSavings((prev) => ({
          hours: parseFloat(prev.hours || 0) + hoursSaved,
          money: parseFloat(prev.money || 0) + hoursSaved * 50, // $50 per hour
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
            hoursSaved: parseFloat(
              recommendation.hoursSaved !== undefined
                ? recommendation.hoursSaved || 0
                : parseHoursSaved(recommendation.savings) || 0
            ),
            distanceSaved: recommendation.distanceSaved || 0,
            movementsPerMonth: recommendation.movementsPerMonth || 0,
            deviceId: recommendation.deviceId,
            implemented: true,
          }));

          // Calculate total hours saved
          let totalHoursSaved = 0;
          newOptimizations.forEach((opt) => {
            totalHoursSaved += parseFloat(opt.hoursSaved || 0);
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
            hours: parseFloat(prev.hours || 0) + totalHoursSaved,
            money: parseFloat(prev.money || 0) + totalHoursSaved * 50, // $50 per hour
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
          hoursSaved: parseFloat(
            recommendation.hoursSaved !== undefined
              ? recommendation.hoursSaved || 0
              : parseHoursSaved(recommendation.savings) || 0
          ),
          distanceSaved: recommendation.distanceSaved || 0,
          movementsPerMonth: recommendation.movementsPerMonth || 0,
          deviceId: recommendation.deviceId,
          implemented: true,
        }));

        // Calculate total hours saved
        let totalHoursSaved = 0;
        newOptimizations.forEach((opt) => {
          totalHoursSaved += parseFloat(opt.hoursSaved || 0);
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
          hours: parseFloat(prev.hours || 0) + totalHoursSaved,
          money: parseFloat(prev.money || 0) + totalHoursSaved * 50, // $50 per hour
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
    filteredMovements,
    recommendations,
    setRecommendations,
    optimizationHistory,
    setOptimizationHistory,
    filteredOptimizationHistory,
    totalSavings,
    setTotalSavings,
    filteredTotalSavings,
    timeFilter,
    setTimeFilter,
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
