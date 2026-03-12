import { useEffect, useState, useRef } from "react";
import { API_URL } from "../../const";
import Plot from "react-plotly.js";
import axios from "axios";
import {
  Typography,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Fade,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
    TrendingUp as TrendingUpIcon,
    DeleteOutline as DeleteOutlineIcon
} from "@mui/icons-material";
import './index.css';
import { logAmplitudeEvent } from '../../utils';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileKeys, setFileKeys] = useState([]);
  const hasFetched = useRef(false);

  // For initial mount check
  const isInitialMount = useRef(true);

  // Advanced dialog states
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [numOfPlots, setNumOfPlots] = useState(4);
  const [numOfRows, setNumOfRows] = useState(100);
  const [advancedLoading, setAdvancedLoading] = useState(false);

  // Progress tracking states
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [totalGraphs, setTotalGraphs] = useState(4);
  const [progressMessage, setProgressMessage] = useState('');

  // Cache keys
  const CACHE_KEY = 'dashboard_data';
  const CACHE_EXPIRY_KEY = 'dashboard_data_expiry';
  const SAVED_CHARTS_KEY = 'dashboard_saved_charts';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Unified API call management
  const activeRequestRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // View and saved charts
  const [viewTab, setViewTab] = useState('charts');
  const [savedCharts, setSavedCharts] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_CHARTS_KEY) || '[]');
      if (Array.isArray(saved)) setSavedCharts(saved);
    } catch (e) {
      console.error('Error loading saved charts:', e);
      setSavedCharts([]);
    }
  }, []);

  const persistSavedCharts = (charts) => {
    try {
      localStorage.setItem(SAVED_CHARTS_KEY, JSON.stringify(charts));
    } catch (e) {
      console.error('Error saving charts to localStorage:', e);
    }
  };

  const isChartSaved = (chartId) => {
    return savedCharts.some((c) => c.id === chartId);
  };

  const handleSaveChart = ({ id, title, description, graphData, fileKey }) => {
    if (isChartSaved(id)) return;
    const next = [
      ...savedCharts,
      {
        id,
        title,
        description,
        graphData,
        fileKey,
        savedAt: Date.now(),
      },
    ];
    setSavedCharts(next);
    persistSavedCharts(next);
  };

  const handleRemoveSaved = (id) => {
    const next = savedCharts.filter((c) => c.id !== id);
    setSavedCharts(next);
    persistSavedCharts(next);
  };

  // On mount, clear cache and fetch data ONCE
  useEffect(() => {
    clearCache();
    fetchData(true, null, true); // true = isInitialLoad
    isInitialMount.current = false;
    
    // Cleanup on unmount
    return () => {
      cancelActiveRequest();
    };
    // eslint-disable-next-line
  }, []);

  // Watch fileName changes after mount
  useEffect(() => {
    if (isInitialMount.current) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentFileName = user.fileName || localStorage.getItem('fileName');
    if (currentFileName !== fileName) {
      setFileName(currentFileName);
      clearCache();
      fetchData(true);
    }
    // eslint-disable-next-line
  }, [fileName]);

  // Progress tracking effect
  useEffect(() => {
    if (loading || advancedLoading) {
      setLoadingProgress(0);
      setProgressMessage(`Initializing graph generation...`);
      
      // Start progress simulation with more realistic timing
      let currentProgress = 0;
      const updateProgress = () => {
        currentProgress++;
        if (currentProgress <= totalGraphs) {
          setLoadingProgress(currentProgress);
          if (currentProgress < totalGraphs) {
            setProgressMessage(`Generating graph ${currentProgress}/${totalGraphs}...`);
          } else if (currentProgress === totalGraphs) {
            setProgressMessage(`Finalizing visualizations...`);
          }
        }
      };
      
      // Initial update after 5 seconds
      setTimeout(updateProgress, 5000);
      
      // Then update every 8-12 seconds for more realistic feel
      progressIntervalRef.current = setInterval(() => {
        if (currentProgress < totalGraphs - 1) {
          updateProgress();
        }
      }, 8000 + Math.random() * 4000); // Random between 8-12 seconds
      
    } else {
      // Clean up interval when loading stops
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setLoadingProgress(0);
      setProgressMessage('');
    }
    
    // Cleanup on unmount
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [loading, advancedLoading, totalGraphs]);

  // Cancel any active request
  const cancelActiveRequest = () => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }
  };

  const getCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
      if (cached && expiry && Date.now() < parseInt(expiry)) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  };

  const setCachedData = (data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
  };

  // Parse API response for multi-file support
  const parseApiData = (apiData) => {
    if (!apiData) return { fileKeys: [], fileData: {} };
    if (apiData.data && typeof apiData.data === 'object') {
      const keys = Object.keys(apiData.data);
      return { fileKeys: keys, fileData: apiData.data };
    }
    // Fallback: treat as single file
    return { fileKeys: ["default"], fileData: { default: apiData } };
  };

  // FIXED: Unified API call function - removed premature setLoading(false)
  const makeApiCall = async (config = null) => {
    // Cancel any existing request
    cancelActiveRequest();
    
    // Create new AbortController for this request
    const controller = new AbortController();
    activeRequestRef.current = controller;
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;
    
    try {
      const formData = new FormData();
      formData.append('num_of_plots', config?.numOfPlots || 4);
      formData.append('num_of_rows', config?.numOfRows || 100);
      
      const response = await axios.post(
        `${API_URL}/get_plots`,
        formData,
        {
          headers: { 'X-User-ID': userId },
          signal: controller.signal,
        }
      );
      setLoading(false);
      return response.data;
    } catch (error) {
      if (axios.isCancel(error) || error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    } finally {
      // Clear the active request reference if this was the active request
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  };

  // Modified fetchData to accept isInitialLoad for event logging
  const fetchData = async (forceRefresh = false, config = null, isInitialLoad = false) => {
    // Prevent multiple simultaneous calls
    if (loading) return;
    
    // Set total graphs for progress tracking
    setTotalGraphs(config?.numOfPlots || numOfPlots || 4);
    
    // Set loading state based on context
    if (config) {
      setAdvancedLoading(true);
      setLoading(true);
    } else {
      setLoading(true);
    }
    
    setError(null);

    try {
      // Check cache only for GET requests without custom config
      if (!forceRefresh && !config) {
        const cachedData = getCachedData();
        if (cachedData) {
          const { fileKeys, fileData } = parseApiData(cachedData);
          setData(fileData);
          setFileKeys(fileKeys);
          setSelectedFile(fileKeys[0] || null);
            return;
        }
      }

      // Make API call
      const result = await makeApiCall(config);
      const { fileKeys, fileData } = parseApiData(result);

      setData(fileData);
      setFileKeys(fileKeys);
      setSelectedFile(fileKeys[0] || null);
      
      // Show completion briefly before hiding loading
      setLoadingProgress(totalGraphs);
      setProgressMessage(`All ${totalGraphs} graphs generated successfully!`);
      
      // Only cache if it's a default GET request
      if (!config) {
        setCachedData(result);
      }
      
      setError(null);
      
      // Show completion for 2 seconds before hiding loading
      setTimeout(() => {
        if (config) {
          setAdvancedLoading(false);
        }
        setLoading(false);
      }, 2000);
      
      // Log Amplitude events
      if (window && window.amplitude) {
        if (isInitialLoad) {
          logAmplitudeEvent('Visualizations Viewed', { fileNames: fileKeys });
        } else if (config) {
          logAmplitudeEvent('Visualizations Custom Config', { fileNames: fileKeys, config });
        } else if (forceRefresh) {
          logAmplitudeEvent('Visualizations Refreshed', { fileNames: fileKeys });
        }
      }
      
    } catch (error) {
      if (error.message === 'Request cancelled') {
        // Request was cancelled, don't show error
        return;
      }
      setLoading(false);
      console.error("Error fetching data:", error);
      setError(error.response?.data?.message || error.message || "Failed to fetch dashboard data");

      // Try to use cached data as fallback only for GET requests
      if (!config) {
        const cachedData = getCachedData();
        if (cachedData) {
          const { fileKeys, fileData } = parseApiData(cachedData);
          setData(fileData);
          setFileKeys(fileKeys);
          setSelectedFile(fileKeys[0] || null);
        }
      }
    } finally {
      // Loading states are handled in success case with delay
      // Only reset immediately on error
    }
  };

  const handleRefresh = () => {
    clearCache();
    fetchData(true);
  };

  // Parse plots for the selected file
  const parsedData =
    data && selectedFile && data[selectedFile] && data[selectedFile].plots
      ? Object.entries(data[selectedFile].plots)
          .map(([title, plotObject]) => {
            try {
              if (plotObject && typeof plotObject === "object" && plotObject.plot_data) {
                return {
                  title,
                  description: plotObject.description,
                  graphData: JSON.parse(plotObject.plot_data),
                };
              } else {
                return {
                  title,
                  graphData: JSON.parse(plotObject),
                };
              }
            } catch (parseError) {
              console.error(`Error parsing plot data for ${title}:`, parseError);
              return {
                title,
                description: plotObject?.description,
                graphData: null,
                error: true,
              };
            }
          })
          .filter((item) => item.graphData !== null)
      : [];

  const getIconForChart = (title) => {
    if (title.toLowerCase().includes("trend") || title.toLowerCase().includes("time")) {
      return <TrendingUpIcon style={{ color: "#1976d2", marginRight: "8px" }} />;
    }
    return <VisibilityIcon style={{ color: "#1976d2", marginRight: "8px" }} />;
  };

  // Advanced Generate handler
  const handleAdvancedGenerate = async () => {
    try {
      const config = {
        numOfPlots: numOfPlots,
        numOfRows: numOfRows
      };
      
      // Close dialog immediately so user can see progress on main screen
      setAdvancedOpen(false);
      
      // Start the API call
      await fetchData(true, config);
      
    } catch (error) {
      console.error("Error in advanced generate:", error);
      setError(error.message || "Failed to generate advanced plots");
    }
  };

  // Handle dialog close - cancel any ongoing advanced request
  const handleAdvancedClose = () => {
    if (advancedLoading) {
      cancelActiveRequest();
      setAdvancedLoading(false);
    }
    setAdvancedOpen(false);
  };

  // FIXED: Better loading state logging
  console.log('Loading states:', { loading, advancedLoading });

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div
        style={{
          padding: "24px",
          margin: "20px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <VisibilityIcon style={{ fontSize: "32px", marginRight: "16px" }} />
            <div>
              <Typography
                variant="h4"
                component="h1"
                style={{
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: "4px",
                }}
              >
                Visualizations
              </Typography>
              <Typography variant="body1" style={{ opacity: 0.9 }}>
                Real-time insights and data visualization
              </Typography>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '4px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                backdropFilter: 'saturate(160%) blur(6px)'
              }}
            >
              <Tabs
                value={viewTab}
                onChange={(e, newValue) => setViewTab(newValue)}
                aria-label="Charts and Saved Tabs"
                textColor="inherit"
                TabIndicatorProps={{ style: { display: 'none' } }}
                sx={{
                  minHeight: 36,
                  '& .MuiTabs-flexContainer': {
                    gap: 0
                  },
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 700,
                    px: 3,
                    py: 0.75,
                    minHeight: 36,
                    minWidth: 100,
                    borderRadius: '10px',
                  },
                  '& .MuiTab-root.Mui-selected': {
                    color: '#667eea',
                    backgroundColor: '#ffffff',
                    boxShadow: 'none',
                  },
                  '& .MuiTab-root:not(:last-of-type)': {
                    position: 'relative',
                  },
                  '& .MuiTab-root:not(:last-of-type)::after': {
                    content: '""',
                    position: 'absolute',
                    right: -2,
                    top: 8,
                    bottom: 8,
                    width: '1px',
                    background: 'rgba(255,255,255,0.25)',
                  },
                }}
              >
                <Tab
                  label="Charts"
                  value="charts"
                  disableRipple
                  sx={{ color: 'white', fontWeight: 700, textTransform: 'none' }}
                />
                <Tab
                  label="Saved"
                  value="saved"
                  disableRipple
                  sx={{ color: 'white', fontWeight: 700, textTransform: 'none' }}
                />
              </Tabs>
            </Box>
            {/* Generate Advanced Button */}
            <Button
              variant="contained"
              color="secondary"
              style={{
                fontWeight: 600,
                borderRadius: 8,
                boxShadow: "none",
                background: "#fff",
                color: "#764ba2",
                marginLeft: 12,
              }}
              onClick={() => setAdvancedOpen(true)}
              disabled={loading || advancedLoading}
            >
              Custom Config
            </Button>
            {/* Refresh Button */}
            <Tooltip title="Refresh Data">
              <Button
                onClick={handleRefresh}
                disabled={loading || advancedLoading}
                className="refresh-button"
                style={{
                  color: "white",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  minWidth: 40,
                  minHeight: 40,
                  padding: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {loading ? (
                  <CircularProgress size={24} style={{ color: "white" }} />
                ) : (
                  <RefreshIcon />
                )}
                <span style={{marginLeft: 8}}>Refresh</span>
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Advanced Generate Dialog */}
      <Dialog 
        open={advancedOpen} 
        onClose={handleAdvancedClose}
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          }
        }}
      >
        <DialogTitle sx={{
          fontWeight: 600,
          fontSize: '1.5rem',
          color: '#2c3e50',
          textAlign: 'center',
          pb: 2,
          pt: 4,
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          borderRadius: '16px 16px 0 0'
        }}>
          Plot Configuration
        </DialogTitle>
        
        <DialogContent sx={{ px: 4, py: 3, background: '#fff' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#64748b', 
              mb: 3, 
              textAlign: 'center',
              fontSize: '0.875rem'
            }}
          >
            Configure your visualization parameters for customized data plots
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={3}>
            <Box>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  mb: 1, 
                  fontWeight: 600, 
                  color: '#374151',
                  fontSize: '0.875rem'
                }}
              >
                Number of Plots
              </Typography>
              <TextField
                type="text"
                value={numOfPlots}
                onChange={(e) => setNumOfPlots(Number(e.target.value))}
                inputProps={{ 
                  min: 1, 
                  max: 20,
                  style: { fontSize: '0.95rem' }
                }}
                variant="outlined"
                fullWidth
                size="medium"
                placeholder="Enter number of plots"
                disabled={advancedLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#6b7280', 
                  fontSize: '0.75rem',
                  mt: 0.5,
                  display: 'block'
                }}
              >
                Range: 1-20 plots
              </Typography>
            </Box>

            <Box>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  mb: 1, 
                  fontWeight: 600, 
                  color: '#374151',
                  fontSize: '0.875rem'
                }}
              >
                Data Rows per Plot
              </Typography>
              <TextField
                type="text"
                value={numOfRows}
                onChange={(e) => setNumOfRows(Number(e.target.value))}
                inputProps={{ 
                  min: 1, 
                  max: 1000,
                  style: { fontSize: '0.95rem' }
                }}
                variant="outlined"
                fullWidth
                size="medium"
                placeholder="Enter number of rows"
                disabled={advancedLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#6b7280', 
                  fontSize: '0.75rem',
                  mt: 0.5,
                  display: 'block'
                }}
              >
                Range: 1-1,000 rows
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          px: 4, 
          pb: 4, 
          pt: 2, 
          gap: 2,
          background: '#fff',
          borderRadius: '0 0 16px 16px'
        }}>
          <Button 
            onClick={handleAdvancedClose}
            variant="outlined"
            size="large"
            disabled={advancedLoading}
            sx={{
              minWidth: '100px',
              borderRadius: '8px',
              borderColor: '#e5e7eb',
              color: '#6b7280',
              fontWeight: 500,
              textTransform: 'none',
              '&:hover': {
                borderColor: '#d1d5db',
                backgroundColor: '#f9fafb'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdvancedGenerate}
            variant="contained"
            size="large"
            disabled={advancedLoading}
            sx={{
              minWidth: '120px',
              borderRadius: '8px',
              fontWeight: 600,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
              },
              '&:disabled': {
                background: '#e5e7eb',
                boxShadow: 'none'
              }
            }}
          >
            {advancedLoading ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} sx={{ color: 'white' }} />
                <span>Generating...</span>
              </Box>
            ) : (
              'Generate Plots'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Tabs for Multiple Files */}
      {fileKeys.length > 1 && (
        <Box sx={{
          borderBottom: 1,
          borderColor: "divider",
          margin: "0 20px 24px 20px",
          background: "#fff",
          borderRadius: "8px 8px 0 0"
        }}>
          <Tabs
            value={selectedFile}
            onChange={(e, newValue) => setSelectedFile(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Visualization File Tabs"
          >
            {fileKeys.map((key) => (
              <Tab
                key={key}
                label={key.replace(/_/g, " ")}
                value={key}
                sx={{ fontWeight: 600, fontSize: "1rem", textTransform: "none" }}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Fade in={!!error}>
          <Alert
            severity="error"
            style={{ marginBottom: "24px", borderRadius: "8px" }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Professional Loading State with Progress */}
      {(loading || advancedLoading) && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          padding: "64px 0",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
            borderRadius: "16px",
            padding: "40px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            border: "1px solid #e2e8f0",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center"
          }}>
            {/* Main Loading Spinner */}
            <div style={{ marginBottom: "24px" }}>
              <CircularProgress 
                size={60} 
                style={{ 
                  color: "#667eea",
                  marginBottom: "16px"
                }} 
              />
            </div>
            
            {/* Progress Counter */}
            <div style={{
              background: "#f1f5f9",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
              border: "2px solid #e2e8f0"
            }}>
              <Typography 
                variant="h6" 
                style={{ 
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: "8px",
                  fontSize: "1.25rem"
                }}
              >
                {loadingProgress}/{totalGraphs} Graphs Generated
              </Typography>
              
              {/* Progress Bar */}
              <div style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#e2e8f0",
                borderRadius: "4px",
                overflow: "hidden",
                marginBottom: "12px"
              }}>
                <div style={{
                  width: `${(loadingProgress / totalGraphs) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "4px",
                  transition: "width 0.5s ease-in-out"
                }} />
              </div>
              
              <Typography 
                variant="body2" 
                style={{ 
                  color: "#64748b",
                  fontSize: "0.875rem",
                  fontWeight: 500
                }}
              >
                {progressMessage}
              </Typography>
            </div>
            
            {/* Status Message */}
            <Typography 
              variant="body1" 
              style={{ 
                color: "#475569",
                fontSize: "1rem",
                marginBottom: "8px",
                fontWeight: 500
              }}
            >
              {advancedLoading ? "Generating Custom Visualizations" : "Loading Dashboard Data"}
            </Typography>
            
            <Typography 
              variant="caption" 
              style={{ 
                color: "#94a3b8",
                fontSize: "0.8rem"
              }}
            >
              This may take a few moments depending on data complexity
            </Typography>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      {viewTab === 'charts' && !loading && !advancedLoading && parsedData.length > 0 && (
        <div
          className="dashboard-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
            gap: "24px",
            padding: "0 16px",
          }}
        >
          {parsedData.map(({ title, description, graphData }, index) => (
            <div key={index} className="chart-container fade-in-up">
              <div
                className="dashboard-card"
                style={{
                  borderRadius: "12px",
                  padding: "24px",
                  minHeight: "500px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Chart Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  {getIconForChart(title)}
                  <div style={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      component="h2"
                      style={{
                        fontWeight: 600,
                        color: "#333",
                        fontSize: "1.1rem",
                        marginBottom: "4px",
                      }}
                    >
                      {title}
                    </Typography>
                    {description && (
                      <Typography variant="body2" style={{ color: "#666", fontSize: "0.875rem" }}>
                        {description}
                      </Typography>
                    )}
                  </div>
                    <div style={{ marginLeft: 12 }}>
                      <Button
                        variant="contained"
                        size="small"
                        color={isChartSaved(`${selectedFile || 'default'}::${title}`) ? 'success' : 'primary'}
                        onClick={() =>
                          handleSaveChart({
                            id: `${selectedFile || 'default'}::${title}`,
                            title,
                            description,
                            graphData,
                            fileKey: selectedFile || 'default',
                          })
                        }
                        disabled={isChartSaved(`${selectedFile || 'default'}::${title}`)}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                      >
                        {isChartSaved(`${selectedFile || 'default'}::${title}`) ? 'Saved' : 'Save'}
                      </Button>
                    </div>
                </div>
                {/* Chart Content */}
                <div
                  className="plotly-chart"
                  style={{
                    flex: 1,
                    minHeight: "400px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plot
                    data={graphData?.data || []}
                    layout={{
                      ...graphData?.layout,
                      title: "",
                      autosize: true,
                      paper_bgcolor: "rgba(0,0,0,0)",
                      plot_bgcolor: "rgba(0,0,0,0)",
                      font: {
                        family: '"Roboto", "Helvetica", "Arial", sans-serif',
                        size: 11,
                        color: "#333",
                      },
                      margin: { t: 10, r: 10, b: 50, l: 50 },
                      showlegend: graphData?.layout?.showlegend || false,
                      hovermode: "closest",
                    }}
                    config={{
                      responsive: true,
                      displayModeBar: false,
                      staticPlot: false,
                      scrollZoom: false,
                      doubleClick: false,
                      showTips: false,
                      displaylogo: false,
                    }}
                    style={{
                      width: "100%",
                      height: "400px",
                    }}
                    useResizeHandler={true}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Saved Charts Grid */}
      {viewTab === 'saved' && !loading && !advancedLoading && savedCharts.length > 0 && (
        <div
          className="dashboard-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
            gap: "24px",
            padding: "0 16px",
          }}
        >
          {savedCharts.map(({ id, title, description, graphData }) => (
            <div key={id} className="chart-container fade-in-up">
              <div
                className="dashboard-card"
                style={{
                  borderRadius: "12px",
                  padding: "24px",
                  minHeight: "500px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Saved Chart Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  {getIconForChart(title)}
                  <div style={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      component="h2"
                      style={{
                        fontWeight: 600,
                        color: "#333",
                        fontSize: "1.1rem",
                        marginBottom: "4px",
                      }}
                    >
                      {title}
                    </Typography>
                    {description && (
                      <Typography variant="body2" style={{ color: "#666", fontSize: "0.875rem" }}>
                        {description}
                      </Typography>
                    )}
                  </div>
                  <IconButton
                    aria-label="Remove saved"
                    onClick={() => handleRemoveSaved(id)}
                    size="small"
                    sx={{
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      '&:hover': { backgroundColor: '#fecaca' },
                      borderRadius: '8px'
                    }}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </div>

                {/* Saved Chart Content */}
                <div
                  className="plotly-chart"
                  style={{
                    flex: 1,
                    minHeight: "400px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plot
                    data={graphData?.data || []}
                    layout={{
                      ...graphData?.layout,
                      title: "",
                      autosize: true,
                      paper_bgcolor: "rgba(0,0,0,0)",
                      plot_bgcolor: "rgba(0,0,0,0)",
                      font: {
                        family: '"Roboto", "Helvetica", "Arial", sans-serif',
                        size: 11,
                        color: "#333",
                      },
                      margin: { t: 10, r: 10, b: 50, l: 50 },
                      showlegend: graphData?.layout?.showlegend || false,
                      hovermode: "closest",
                    }}
                    config={{
                      responsive: true,
                      displayModeBar: false,
                      staticPlot: false,
                      scrollZoom: false,
                      doubleClick: false,
                      showTips: false,
                      displaylogo: false,
                    }}
                    style={{
                      width: "100%",
                      height: "400px",
                    }}
                    useResizeHandler={true}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {viewTab === 'charts' && !loading && !advancedLoading && parsedData.length === 0 && (
        <div
          className="dashboard-card"
          style={{
            padding: "64px",
            textAlign: "center",
            margin: "0 16px",
            borderRadius: "12px",
          }}
        >
          <VisibilityIcon style={{ fontSize: "64px", color: "#999", marginBottom: "16px" }} />
          <Typography variant="h6" style={{ color: "#666", marginBottom: "8px" }}>
            No visualization data available
          </Typography>
          <Typography variant="body2" style={{ color: "#999" }}>
            Click the refresh button to load data
          </Typography>
        </div>
      )}
      {viewTab === 'saved' && !loading && !advancedLoading && savedCharts.length === 0 && (
        <div
          className="dashboard-card"
          style={{
            padding: "64px",
            textAlign: "center",
            margin: "0 16px",
            borderRadius: "12px",
          }}
        >
          <VisibilityIcon style={{ fontSize: "64px", color: "#999", marginBottom: "16px" }} />
          <Typography variant="h6" style={{ color: "#666", marginBottom: "8px" }}>
            No saved charts yet
          </Typography>
          <Typography variant="body2" style={{ color: "#999" }}>
            Switch to Charts tab and click Save on any graph
          </Typography>
        </div>
      )}
    </div>
  );
};

export default Dashboard;