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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import {
  Upload as UploadIcon,
  Description as FileIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  CloudUpload as CloudUploadIcon,
  DeleteForever as DeleteForeverIcon,
} from "@mui/icons-material";
import { useDataContext } from "../context/DataContext";
import { parseCSV } from "../utils/helpers";

function ImportData() {
  const { setData, setLoading, importFromCsv, resetDatabase } =
    useDataContext();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
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

        // Add a sample file for development
        setFiles([
          ...files,
          {
            path: "sample.csv",
            name: "sample.csv",
            status: "pending",
          },
        ]);
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

              // Import the data into the database
              try {
                const result = await importFromCsv(fileContentStr);
                if (result && result.success) {
                  updatedFiles[i].status = "success";
                  totalRecords += result.count || 0;
                  successfulRecords += result.count || 0;

                  // Track duplicates
                  if (result.duplicates && result.duplicates.length > 0) {
                    updatedFiles[i].duplicates = result.duplicates.length;
                    updatedFiles[
                      i
                    ].message = `${result.duplicates.length} duplicate records found`;
                  }

                  // Track errors
                  if (result.errors && result.errors.length > 0) {
                    updatedFiles[i].errors = result.errors.length;
                    errorRecords += result.errors.length;
                    updatedFiles[i].message =
                      (updatedFiles[i].message || "") +
                      `${result.errors.length} records with errors`;
                  }
                } else {
                  updatedFiles[i].status = "error";
                  const errorCount =
                    result.errorCount ||
                    (result.errors ? result.errors.length : 1);
                  errorRecords += errorCount;
                  updatedFiles[i].message =
                    result.error || `${errorCount} records with errors`;
                  updatedFiles[i].errors = errorCount;
                }
              } catch (dbError) {
                console.error("Error importing to database:", dbError);
                updatedFiles[i].status = "error";
                errorRecords += 1;
                updatedFiles[i].message = dbError.message || "Database error";
                updatedFiles[i].errors = 1;
              }
            } else {
              updatedFiles[i].status = "error";
              errorRecords += 1;
              updatedFiles[i].message = "Could not read file content";
              updatedFiles[i].errors = 1;
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

            // Update the context with the processed data
            setData(processedData);
          }
        } catch (fileError) {
          console.error("Error processing file:", fileError);
          updatedFiles[i].status = "error";
          errorRecords += 10; // Assume some records failed
        }
      }

      // Update the files state
      setFiles(updatedFiles);

      // Calculate duplicate records
      let duplicateRecords = 0;
      updatedFiles.forEach((file) => {
        if (file.duplicates) {
          duplicateRecords += file.duplicates;
        }
      });

      setImportStats({
        totalFiles: files.length,
        successfulFiles: updatedFiles.filter((f) => f.status === "success")
          .length,
        errorFiles: updatedFiles.filter((f) => f.status === "error").length,
        totalRecords,
        successfulRecords,
        errorRecords,
        duplicateRecords,
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

  const handleResetDatabase = async () => {
    try {
      setResetConfirmOpen(false);
      setProcessing(true);

      const result = await resetDatabase();

      if (result.success) {
        setSnackbar({
          open: true,
          message: "Database reset successfully. All data has been cleared.",
          severity: "success",
        });

        // Reset UI state
        setFiles([]);
        setActiveStep(0);
        setImportStats(null);
      } else {
        setSnackbar({
          open: true,
          message: result.message || "Failed to reset database",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error resetting database:", error);
      setSnackbar({
        open: true,
        message: "Error resetting database",
        severity: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box className="content-container">
      <Card>
        <CardHeader
          title="Import RTLS Data"
          action={
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={() => setResetConfirmOpen(true)}
              sx={{ mr: 1 }}
            >
              Reset Database
            </Button>
          }
        />
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
                                <>
                                  {file.status === "pending" && "Pending"}
                                  {file.status === "success" && (
                                    <>
                                      Processed
                                      {file.duplicates > 0 && (
                                        <Typography
                                          variant="caption"
                                          color="warning.main"
                                          display="block"
                                        >
                                          {file.duplicates} duplicate records
                                          found
                                        </Typography>
                                      )}
                                      {file.errors > 0 && (
                                        <Typography
                                          variant="caption"
                                          color="error"
                                          display="block"
                                        >
                                          {file.errors} records with errors
                                        </Typography>
                                      )}
                                    </>
                                  )}
                                  {file.status === "error" && (
                                    <Typography variant="caption" color="error">
                                      Error: {file.message || "Unknown error"}
                                    </Typography>
                                  )}
                                </>
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
                      <Typography
                        variant="body2"
                        color={
                          importStats.errorRecords > 0
                            ? "error.main"
                            : "text.secondary"
                        }
                      >
                        Errors: {importStats.errorRecords}
                      </Typography>
                      {importStats.duplicateRecords > 0 && (
                        <Typography variant="body2" color="warning.main">
                          Duplicates (skipped): {importStats.duplicateRecords}
                        </Typography>
                      )}
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
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog for Database Reset */}
      <Dialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
      >
        <DialogTitle id="reset-dialog-title">{"Reset Database?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-dialog-description">
            This will permanently delete all data from the database, including
            devices, locations, movements, and recommendations. This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleResetDatabase} color="error" autoFocus>
            Reset Database
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ImportData;
