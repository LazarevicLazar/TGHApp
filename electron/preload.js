const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  // File operations
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  readCsvFile: (filePath) => ipcRenderer.invoke("read-csv-file", filePath),
  importCsvData: (csvData) => ipcRenderer.invoke("import-csv-data", csvData),

  // Database operations
  getDevices: () => ipcRenderer.invoke("get-devices"),
  getLocations: () => ipcRenderer.invoke("get-locations"),
  getMovements: () => ipcRenderer.invoke("get-movements"),
  getRecommendations: () => ipcRenderer.invoke("get-recommendations"),
  generateRecommendations: () => ipcRenderer.invoke("generate-recommendations"),
  implementRecommendation: (recommendationId) =>
    ipcRenderer.invoke("implement-recommendation", recommendationId),
  implementAllRecommendations: () =>
    ipcRenderer.invoke("implement-all-recommendations"),
  resetDatabase: () => ipcRenderer.invoke("reset-database"),

  // App info
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Listeners
  on: (channel, callback) => {
    // Whitelist channels
    const validChannels = ["csv-import-progress", "recommendation-generated"];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    const validChannels = ["csv-import-progress", "recommendation-generated"];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});

// Add any additional context bridge exposures here
