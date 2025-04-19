import React, { useState, useEffect } from "react";
import { useDataContext } from "../context/DataContext";
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@mui/material";

/**
 * A component for selecting specific time periods for data filtering
 *
 * @param {Object} props - Component props
 * @param {Object} props.value - The currently selected time period object
 * @param {Function} props.onChange - Callback when time period changes
 * @param {string} [props.label] - Optional label for the selector
 * @param {Array} [props.availableDates] - Array of available dates in the data
 * @returns {React.ReactElement} The TimeFilterSelector component
 */
function TimeFilterSelector({ value, onChange, label, availableDates = [] }) {
  // Handle both string-based and object-based timeFilter values
  const [mode, setMode] = useState(
    typeof value === "string" ? value : value.mode || "all"
  );
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableQuarters, setAvailableQuarters] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);

  // Use DataContext to access movements data if availableDates is not provided
  const { movements = [] } = useDataContext() || {};

  // Process available dates to extract years, months, quarters, and days
  useEffect(() => {
    // If availableDates is provided, use it; otherwise, extract dates from movements
    const datesToProcess =
      availableDates && availableDates.length > 0
        ? availableDates
        : movements.map((m) => m.timeIn || m.In || m.date).filter(Boolean);

    if (datesToProcess && datesToProcess.length > 0) {
      // Extract unique years
      const years = [
        ...new Set(
          datesToProcess.map((date) => {
            if (!date) return null;
            try {
              const d = new Date(date);
              if (isNaN(d.getTime())) return null;
              return d.getFullYear();
            } catch (e) {
              console.warn("Invalid date encountered:", date);
              return null;
            }
          })
        ),
      ].filter(Boolean); // Remove null values
      years.sort((a, b) => a - b);
      setAvailableYears(years);

      // Extract unique months (in format YYYY-MM)
      const months = [
        ...new Set(
          datesToProcess.map((date) => {
            if (!date) return null;
            try {
              const d = new Date(date);
              if (isNaN(d.getTime())) return null;
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
                2,
                "0"
              )}`;
            } catch (e) {
              console.warn("Invalid date encountered:", date);
              return null;
            }
          })
        ),
      ].filter(Boolean); // Remove null values
      months.sort();
      setAvailableMonths(months);

      // Extract unique quarters (in format YYYY-Q#)
      const quarters = [
        ...new Set(
          datesToProcess.map((date) => {
            if (!date) return null;
            try {
              const d = new Date(date);
              if (isNaN(d.getTime())) return null;
              const quarter = Math.floor(d.getMonth() / 3) + 1;
              return `${d.getFullYear()}-Q${quarter}`;
            } catch (e) {
              console.warn("Invalid date encountered:", date);
              return null;
            }
          })
        ),
      ].filter(Boolean); // Remove null values
      quarters.sort();
      setAvailableQuarters(quarters);

      // Extract unique days (in format YYYY-MM-DD)
      const days = [
        ...new Set(
          datesToProcess.map((date) => {
            // Skip invalid dates
            if (!date) return null;
            try {
              const d = new Date(date);
              // Check if date is valid
              if (isNaN(d.getTime())) return null;
              return d.toISOString().split("T")[0];
            } catch (e) {
              console.warn("Invalid date encountered:", date);
              return null;
            }
          })
        ),
      ].filter(Boolean); // Remove null values
      days.sort();
      setAvailableDays(days);
    }
  }, [availableDates, movements]);

  // Handle mode change
  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);

      // Handle both string-based and object-based timeFilter values
      if (typeof value === "string") {
        // If current value is string-based, just pass the new mode as string
        onChange(newMode);
      } else {
        // If current value is object-based, create a new object with the new mode
        let newValue = { mode: newMode };

        if (newMode === "day" && availableDays.length > 0) {
          newValue.day = availableDays[availableDays.length - 1]; // Most recent day
        } else if (newMode === "month" && availableMonths.length > 0) {
          newValue.month = availableMonths[availableMonths.length - 1]; // Most recent month
        } else if (newMode === "quarter" && availableQuarters.length > 0) {
          newValue.quarter = availableQuarters[availableQuarters.length - 1]; // Most recent quarter
        } else if (newMode === "year" && availableYears.length > 0) {
          newValue.year = availableYears[availableYears.length - 1]; // Most recent year
        }

        onChange(newValue);
      }
    }
  };

  // Handle specific selection change
  const handleSelectionChange = (event) => {
    const { name, value: selectedValue } = event.target;

    // Handle both string-based and object-based timeFilter values
    if (typeof value === "string") {
      // If current value is string-based, create a new object with the mode and selection
      onChange({ mode, [name]: selectedValue });
    } else {
      // If current value is object-based, update the existing object
      onChange({ ...value, [name]: selectedValue });
    }
  };

  // Get month name from month number
  const getMonthName = (monthNum) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[parseInt(monthNum) - 1];
  };

  // Format month display (YYYY-MM to Month YYYY)
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split("-");
    return `${getMonthName(month)} ${year}`;
  };

  // Format quarter display
  const formatQuarter = (quarterStr) => {
    const [year, quarter] = quarterStr.split("-");
    return `${quarter} ${year}`;
  };

  // Format day display (YYYY-MM-DD to Month DD, YYYY)
  const formatDay = (dayStr) => {
    const date = new Date(dayStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Box sx={{ mb: 2 }}>
      {label && (
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            aria-label="time period filter mode"
            size="small"
            sx={{
              width: "100%",
              "& .MuiToggleButton-root": {
                textTransform: "none",
                flex: 1,
              },
            }}
          >
            <ToggleButton value="day" aria-label="specific day">
              Day
            </ToggleButton>
            <ToggleButton value="month" aria-label="specific month">
              Month
            </ToggleButton>
            <ToggleButton value="quarter" aria-label="specific quarter">
              Quarter
            </ToggleButton>
            <ToggleButton value="year" aria-label="specific year">
              Year
            </ToggleButton>
            <ToggleButton value="all" aria-label="all data">
              All
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>

        <Grid item xs={12} md={8}>
          {mode === "day" && (
            <FormControl fullWidth size="small">
              <InputLabel id="day-select-label">Select Day</InputLabel>
              <Select
                labelId="day-select-label"
                id="day-select"
                name="day"
                value={typeof value === "object" ? value.day || "" : ""}
                label="Select Day"
                onChange={handleSelectionChange}
              >
                {availableDays.map((day) => (
                  <MenuItem key={day} value={day}>
                    {formatDay(day)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {mode === "month" && (
            <FormControl fullWidth size="small">
              <InputLabel id="month-select-label">Select Month</InputLabel>
              <Select
                labelId="month-select-label"
                id="month-select"
                name="month"
                value={typeof value === "object" ? value.month || "" : ""}
                label="Select Month"
                onChange={handleSelectionChange}
              >
                {availableMonths.map((month) => (
                  <MenuItem key={month} value={month}>
                    {formatMonth(month)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {mode === "quarter" && (
            <FormControl fullWidth size="small">
              <InputLabel id="quarter-select-label">Select Quarter</InputLabel>
              <Select
                labelId="quarter-select-label"
                id="quarter-select"
                name="quarter"
                value={typeof value === "object" ? value.quarter || "" : ""}
                label="Select Quarter"
                onChange={handleSelectionChange}
              >
                {availableQuarters.map((quarter) => (
                  <MenuItem key={quarter} value={quarter}>
                    {formatQuarter(quarter)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {mode === "year" && (
            <FormControl fullWidth size="small">
              <InputLabel id="year-select-label">Select Year</InputLabel>
              <Select
                labelId="year-select-label"
                id="year-select"
                name="year"
                value={typeof value === "object" ? value.year || "" : ""}
                label="Select Year"
                onChange={handleSelectionChange}
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default TimeFilterSelector;
