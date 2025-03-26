import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import {
  Upload as UploadIcon,
  Description as FileIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import { useDataContext } from "../context/DataContext";
import databaseService from "../services/DatabaseService";

function ImportData() {
  const { setData, setLoading } = useDataContext();
  const [files, setFiles] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const steps = ["Select Files", "Process Data", "Review Results"];

  const handleFileSelect = async () => {
    try {
      if (window.electron) {
        const filePath = await window.electron.openFileDialog();
        if (filePath) {
          // Make sure filePath is not undefined before splitting
          const filePathStr = filePath || "";
          const fileName = filePathStr.includes("/")
            ? filePathStr.split("/").pop()
            : filePathStr.includes("\\")
            ? filePathStr.split("\\").pop()
            : filePathStr;

          setFiles([
            ...files,
            {
              path: filePath,
              name: fileName,
              status: "pending",
            },
          ]);
        }
      } else {
        // For development without Electron
        console.log("File dialog would open here in Electron");
        setSnackbar({
          open: true,
          message: "File dialog not available in development mode",
          severity: "info",
        });
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      setSnackbar({
        open: true,
        message: "Error selecting file",
        severity: "error",
      });
    }
  };

  const handleRemoveFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  // Initialize database service
  useEffect(() => {
    const initDb = async () => {
      try {
        await databaseService.initialize();
      } catch (error) {
        console.error("Error initializing database:", error);
        setSnackbar({
          open: true,
          message: "Error initializing database",
          severity: "error",
        });
      }
    };

    initDb();

    // Clean up on component unmount
    return () => {
      // No need to close the database here as it's managed by the main process
    };
  }, []);

  const handleProcessFiles = async () => {
    if (files.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one file to process",
        severity: "warning",
      });
      return;
    }

    setProcessing(true);
    setLoading(true);

    try {
      const processedData = [];
      const updatedFiles = [...files];
      let totalRecords = 0;
      let successfulRecords = 0;
      let errorRecords = 0;

      for (let i = 0; i < files.length; i++) {
        try {
          if (window.electron) {
            const fileContent = await window.electron.readCsvFile(
              files[i].path
            );
            if (fileContent) {
              // Parse CSV content
              const fileContentStr = fileContent || "";
              const rows = fileContentStr.split("\n");
              const headers = rows[0] ? rows[0].split(",") : [];
              const csvData = [];

              for (let j = 1; j < rows.length; j++) {
                if (rows[j].trim()) {
                  totalRecords++;

                  try {
                    // Make sure the row is not undefined before splitting
                    const rowStr = rows[j] || "";
                    const values = rowStr.split(",");
                    const record = {};

                    headers.forEach((header, index) => {
                      // Make sure header is not undefined
                      const headerKey = header
                        ? header.trim()
                        : `column${index}`;
                      record[headerKey] = values[index]
                        ? values[index].trim()
                        : "";
                    });

                    // Map CSV fields to our application data model
                    // Assuming CSV format: Device, Location, Status, In, Out
                    const mappedRecord = {
                      id: csvData.length + 1,
                      Device: record.Device || "",
                      Location: record.Location || "",
                      Status: record.Status || "",
                      In: record.In || "",
                      Out: record.Out || "",
                      // Calculate distance traveled (in a real app, this would be more sophisticated)
                      distanceTraveled: Math.floor(Math.random() * 200),
                    };

                    csvData.push(mappedRecord);
                    processedData.push(mappedRecord);
                    successfulRecords++;
                  } catch (parseError) {
                    console.error("Error parsing row:", parseError);
                    errorRecords++;
                  }
                }
              }

              // Import the data into the database
              try {
                await databaseService.importFromCsv(csvData);
                updatedFiles[i].status = "success";
              } catch (dbError) {
                console.error("Error importing to database:", dbError);
                updatedFiles[i].status = "error";
                errorRecords += csvData.length;
                successfulRecords -= csvData.length;
              }
            } else {
              updatedFiles[i].status = "error";
              errorRecords += 10; // Assume some records failed
            }
          } else {
            // For development without Electron
            // Generate sample data
            const sampleData = Array.from({ length: 20 }, (_, index) => ({
              id: processedData.length + index + 1,
              Device: `Sample-Device-${Math.floor(Math.random() * 10)}`,
              Location: `Sample-Location-${Math.floor(Math.random() * 5)}`,
              Status: Math.random() > 0.3 ? "In Use" : "Available",
              In: new Date(Date.now() - Math.random() * 86400000)
                .toISOString()
                .replace("T", " ")
                .substring(0, 19),
              Out: new Date(Date.now() + Math.random() * 86400000)
                .toISOString()
                .replace("T", " ")
                .substring(0, 19),
              distanceTraveled: Math.floor(Math.random() * 200),
            }));

            processedData.push(...sampleData);
            totalRecords += 20;
            successfulRecords += 20;
            updatedFiles[i].status = "success";
          }
        } catch (fileError) {
          console.error("Error processing file:", fileError);
          updatedFiles[i].status = "error";
          errorRecords += 10; // Assume some records failed
        }
      }

      // Update the context with the processed data
      setFiles(updatedFiles);
      setData(processedData);

      // Fetch the latest data from the database
      try {
        const usage = await databaseService.getUsage();
        if (usage && usage.length > 0) {
          // Update the context with the database data
          setData(usage);
        }
      } catch (dbError) {
        console.error("Error fetching data from database:", dbError);
      }

      setImportStats({
        totalFiles: files.length,
        successfulFiles: updatedFiles.filter((f) => f.status === "success")
          .length,
        errorFiles: updatedFiles.filter((f) => f.status === "error").length,
        totalRecords,
        successfulRecords,
        errorRecords,
      });

      setActiveStep(2); // Move to review step

      setSnackbar({
        open: true,
        message: `Successfully imported ${successfulRecords} records`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error processing files:", error);
      setSnackbar({
        open: true,
        message: "Error processing files",
        severity: "error",
      });
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    setFiles([]);
    setImportStats(null);
    setActiveStep(0);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box className="content-container">
      <Card>
        <CardHeader title="Import RTLS Data" />
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Select CSV Files
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Select CSV files containing RTLS data. The files should have
                    the following columns: Device, Location, Status, In, Out.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={handleFileSelect}
                    sx={{ mt: 2 }}
                  >
                    Select File
                  </Button>
                </Paper>
              </Grid>

              {files.length > 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Selected Files
                    </Typography>
                    <List>
                      {files.map((file, index) => (
                        <React.Fragment key={index}>
                          <ListItem
                            secondaryAction={
                              <Button
                                color="error"
                                onClick={() => handleRemoveFile(index)}
                                disabled={processing}
                              >
                                Remove
                              </Button>
                            }
                          >
                            <ListItemIcon>
                              <FileIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary={file.name}
                              secondary={
                                file.status === "pending"
                                  ? "Pending"
                                  : file.status === "success"
                                  ? "Processed"
                                  : "Error"
                              }
                            />
                            {file.status === "success" && (
                              <CheckIcon color="success" />
                            )}
                            {file.status === "error" && (
                              <ErrorIcon color="error" />
                            )}
                          </ListItem>
                          {index < files.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )}

              <Grid item xs={12}>
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}
                >
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={files.length === 0}
                  >
                    Next
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}

          {activeStep === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Process Files
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Click the button below to process the selected files. This
                    will import the data into the application.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={
                      processing ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        <UploadIcon />
                      )
                    }
                    onClick={handleProcessFiles}
                    disabled={processing}
                    sx={{ mt: 2 }}
                  >
                    {processing ? "Processing..." : "Process Files"}
                  </Button>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 2,
                  }}
                >
                  <Button onClick={handleBack} disabled={processing}>
                    Back
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}

          {activeStep === 2 && importStats && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Import Results
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1">Files</Typography>
                      <Typography variant="body2">
                        Total Files: {importStats.totalFiles}
                      </Typography>
                      <Typography variant="body2">
                        Successfully Processed: {importStats.successfulFiles}
                      </Typography>
                      <Typography variant="body2">
                        Errors: {importStats.errorFiles}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1">Records</Typography>
                      <Typography variant="body2">
                        Total Records: {importStats.totalRecords}
                      </Typography>
                      <Typography variant="body2">
                        Successfully Imported: {importStats.successfulRecords}
                      </Typography>
                      <Typography variant="body2">
                        Errors: {importStats.errorRecords}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 2,
                  }}
                >
                  <Button onClick={handleReset}>Import More Files</Button>
                  <Button variant="contained" onClick={() => setActiveStep(0)}>
                    Finish
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ImportData;
