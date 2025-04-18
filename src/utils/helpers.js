/**
 * Helper utility functions for the application
 */

/**
 * Format a date string to a more readable format
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return "";

  // If the date is represented as "#######", just return it as is
  if (dateString === "#######" || dateString.includes("#")) {
    return dateString;
  }

  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

/**
 * Calculate the time difference between two date strings
 * @param {string} startDate - The start date string
 * @param {string} endDate - The end date string
 * @returns {string} Formatted time difference
 */
export const calculateTimeDifference = (startDate, endDate) => {
  if (!startDate || !endDate) return "";

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;

    // Convert to hours and minutes
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  } catch (error) {
    console.error("Error calculating time difference:", error);
    return "";
  }
};

/**
 * Format a number with commas as thousands separators
 * @param {number} number - The number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (number) => {
  if (number === null || number === undefined) return "";

  try {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } catch (error) {
    console.error("Error formatting number:", error);
    return number.toString();
  }
};

/**
 * Truncate a string to a specified length and add ellipsis if needed
 * @param {string} str - The string to truncate
 * @param {number} length - The maximum length
 * @returns {string} Truncated string
 */
export const truncateString = (str, length = 50) => {
  if (!str) return "";

  if (str.length <= length) {
    return str;
  }

  return str.substring(0, length) + "...";
};

/**
 * Generate a random color
 * @returns {string} Random hex color
 */
export const getRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * Get a color based on a status
 * @param {string} status - The status
 * @returns {string} Color for the status
 */
export const getStatusColor = (status) => {
  if (!status) return "#999";

  const statusLower = status.toLowerCase();

  if (statusLower.includes("in use")) {
    return "#4caf50"; // Green
  } else if (statusLower.includes("available")) {
    return "#2196f3"; // Blue
  } else if (statusLower.includes("maintenance")) {
    return "#ff9800"; // Orange
  } else if (statusLower.includes("error") || statusLower.includes("fault")) {
    return "#f44336"; // Red
  } else {
    return "#9e9e9e"; // Grey
  }
};

/**
 * Calculate the distance between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} Distance between the points
 */
export const calculateDistance = (x1, y1, x2, y2) => {
  // Calculate the Euclidean distance and multiply by 1.6 to convert to feet
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) * 1.6;
};

/**
 * Find the distance between two rooms using the graph data
 * @param {string} fromRoom - The starting room ID
 * @param {string} toRoom - The destination room ID
 * @param {Object} graphData - The graph data containing nodes and edges
 * @returns {number|null} The distance between rooms or null if no path exists
 */
export const findRoomDistance = (fromRoom, toRoom, graphData) => {
  if (!graphData || !graphData.nodes || !graphData.edges) {
    console.error("Invalid graph data provided");
    return null;
  }

  // If rooms are the same, distance is 0
  if (fromRoom === toRoom) {
    return 0;
  }

  // Check if there's a direct edge between the rooms
  for (const edge of graphData.edges) {
    if (
      (edge[0] === fromRoom && edge[1] === toRoom) ||
      (edge[0] === toRoom && edge[1] === fromRoom)
    ) {
      return edge[2] * 1.6; // Return the distance multiplied by 1.6 to convert to feet
    }
  }

  // If no direct edge, we would need to implement a shortest path algorithm
  // For simplicity, we'll return null for now
  // In a real implementation, you would use Dijkstra's algorithm or similar
  console.log(`No direct path found between ${fromRoom} and ${toRoom}`);
  return null;
};

/**
 * Build an adjacency list from graph data for efficient path finding
 * @param {Object} graphData - The graph data containing nodes and edges
 * @returns {Object} An adjacency list representation of the graph
 */
export const buildAdjacencyList = (graphData) => {
  if (!graphData || !graphData.nodes || !graphData.edges) {
    console.error("Invalid graph data provided");
    return {};
  }

  const adjacencyList = {};

  // Initialize empty adjacency lists for all nodes
  graphData.nodes.forEach((node) => {
    adjacencyList[node] = [];
  });

  // Add edges to the adjacency list
  graphData.edges.forEach((edge) => {
    const [from, to, distance] = edge;
    adjacencyList[from].push({ node: to, distance });
    adjacencyList[to].push({ node: from, distance }); // Assuming undirected graph
  });

  return adjacencyList;
};

/**
 * Find the shortest path between two rooms using Dijkstra's algorithm
 * @param {string} fromRoom - The starting room ID
 * @param {string} toRoom - The destination room ID
 * @param {Object} graphData - The graph data containing nodes and edges
 * @returns {Object} Object containing the distance and path
 */
export const findShortestPath = (fromRoom, toRoom, graphData) => {
  if (!graphData || !graphData.nodes || !graphData.edges) {
    console.error("Invalid graph data provided");
    return { distance: null, path: [] };
  }

  // If rooms are the same, distance is 0
  if (fromRoom === toRoom) {
    return { distance: 0, path: [fromRoom] };
  }

  // Build adjacency list
  const adjacencyList = buildAdjacencyList(graphData);

  // Set up distances and previous nodes
  const distances = {};
  const previous = {};
  const unvisited = new Set(graphData.nodes);

  // Initialize distances
  graphData.nodes.forEach((node) => {
    distances[node] = Infinity;
  });
  distances[fromRoom] = 0;

  // Main Dijkstra algorithm
  while (unvisited.size > 0) {
    // Find the unvisited node with the smallest distance
    let current = null;
    let smallestDistance = Infinity;

    unvisited.forEach((node) => {
      if (distances[node] < smallestDistance) {
        smallestDistance = distances[node];
        current = node;
      }
    });

    // If we've reached the destination or there's no path
    if (
      current === toRoom ||
      current === null ||
      distances[current] === Infinity
    ) {
      break;
    }

    // Remove current from unvisited
    unvisited.delete(current);

    // Check each neighbor
    adjacencyList[current].forEach((neighbor) => {
      if (unvisited.has(neighbor.node)) {
        const tentativeDistance = distances[current] + neighbor.distance;

        if (tentativeDistance < distances[neighbor.node]) {
          distances[neighbor.node] = tentativeDistance;
          previous[neighbor.node] = current;
        }
      }
    });
  }

  // Build the path
  const path = [];
  let current = toRoom;

  // If there's no path to the destination
  if (distances[toRoom] === Infinity) {
    return { distance: null, path: [] };
  }

  // Reconstruct the path
  while (current) {
    path.unshift(current);
    current = previous[current];
  }

  // Multiply the final distance by 1.6 to convert to feet
  return { distance: distances[toRoom] * 1.6, path };
};

/**
 * Group an array of objects by a property
 * @param {Array} array - The array to group
 * @param {string} key - The property to group by
 * @returns {Object} Grouped object
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

/**
 * Convert an array to CSV format
 * @param {Array} data - The data array
 * @param {Array} headers - The CSV headers
 * @returns {string} CSV string
 */
export const convertToCSV = (data, headers) => {
  if (!data || !data.length) return "";

  const headerRow = headers.join(",");
  const rows = data.map((item) => {
    return headers
      .map((header) => {
        const value = item[header] || "";
        // Wrap in quotes if the value contains a comma
        return value.toString().includes(",") ? `"${value}"` : value;
      })
      .join(",");
  });

  return [headerRow, ...rows].join("\n");
};

/**
 * Download data as a CSV file
 * @param {string} csvContent - The CSV content
 * @param {string} filename - The filename
 */
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Set link properties
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  // Append to the document, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parse a CSV string into an array of objects
 * @param {string} csvString - The CSV string
 * @param {Array} headers - Optional headers (if not provided, first row is used)
 * @returns {Array} Array of objects
 */
export const parseCSV = (csvString, headers = null) => {
  if (!csvString) return [];

  // Split into rows
  const rows = csvString.split("\n");
  if (rows.length === 0) return [];

  // Use provided headers or extract from first row
  const csvHeaders =
    headers ||
    (rows[0] ? rows[0].split(",").map((h) => (h ? h.trim() : "")) : []);

  // Start from index 1 if using headers from the CSV
  const startIndex = headers ? 0 : 1;

  // Parse each row
  return rows
    .slice(startIndex)
    .filter((row) => row.trim())
    .map((row) => {
      const values = row && typeof row === "string" ? row.split(",") : [];
      const obj = {};

      csvHeaders.forEach((header, index) => {
        obj[header] = values[index] ? values[index].trim() : "";
      });

      return obj;
    });
};
