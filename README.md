# RTLS Equipment Tracker

An Electron application for tracking and optimizing equipment using Real-Time Location System (RTLS) data.

## Features

- Import and analyze RTLS data from CSV files
- Visualize equipment movement patterns with interactive heat maps
- Track equipment usage and location history
- Generate optimization recommendations to reduce staff walking distance
- Monitor equipment utilization to support purchase decisions
- Track maintenance needs based on usage patterns

## Architecture

This application follows a modern architecture with:

- Electron for the desktop application framework
- React for the UI components
- Material-UI for styling
- NeDB for embedded database
- D3.js for visualizations

## Optimization Algorithms

The application implements several advanced optimization algorithms:

1. **Staff Walking Distance Optimization**: Uses Dijkstra's algorithm to find optimal equipment placement based on usage frequency and walking distance.

2. **Equipment Utilization Optimization**: Implements time-series analysis to identify peak usage periods and calculate utilization rates to determine if additional equipment purchases are justified.

3. **Maintenance Scheduling Optimization**: Uses a predictive maintenance model that analyzes usage hours, movement frequency, and historical maintenance data to predict optimal maintenance timing.

## Project Structure

```
electron-rtls-app/
├── electron/              # Electron main process
│   ├── main.js            # Main process entry
│   └── preload.js         # Preload script for IPC
├── src/
│   ├── components/        # Reusable UI components
│   ├── views/             # Application views
│   ├── services/          # Backend services
│   ├── context/           # React context providers
│   ├── utils/             # Utility functions
│   ├── assets/            # Static assets
│   ├── App.js             # Main React component
│   └── index.js           # Renderer process entry
└── public/                # Public assets
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/rtls-equipment-tracker.git
   cd rtls-equipment-tracker
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Run the application in development mode:

   ```
   npm run dev
   ```

4. Build the application for production:
   ```
   npm run build
   ```

## Usage

### Importing Data

1. Navigate to the "Import Data" view
2. Click "Select File" to choose a CSV file
3. Follow the steps to process and import the data

The CSV file should have the following columns:

- Device: Equipment identifier
- Location: Room identifier
- Status: Equipment status (e.g., "In Use", "Available")
- In: Time when equipment entered the location
- Out: Time when equipment left the location

### Viewing Data

- **Dashboard**: Overview of equipment usage and recommendations
- **Data Table**: Detailed view of all equipment movements
- **Heat Map**: Visualization of equipment usage and movement patterns

### Generating Recommendations

The application automatically generates recommendations based on the imported data. These recommendations are displayed on the Dashboard and can be implemented by clicking the "Implement" button.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
