import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './index.css';
import { API_URL } from '../../const';
import Plot from 'react-plotly.js';
import { LoadingIndicator } from '../../components/loader';
import { Tabs, Tab, Box, Paper } from '@mui/material';
import { logAmplitudeEvent } from '../../utils';

const DataAnalysis = () => {
  const location = useLocation();
  const fileData = JSON.parse(localStorage.getItem('fileData'));

  const [allFilesData, setAllFilesData] = useState(null); // Holds the 'data' object from API
  const [selectedFile, setSelectedFile] = useState(null); // Currently selected file key
  const [loading, setLoading] = useState(false);
  
  // Get data from localStorage instead of location state
  const fileName = localStorage.getItem('fileName');
  useEffect(() => {
    // Fetch API data when component mounts
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get user ID from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id;

        const dataResponse = await fetch(`${API_URL}/dataprocess`, {
          headers: {
            'X-User-ID': userId,
          },
        });
        const data = await dataResponse.json();
        if (data && data.data && typeof data.data === 'object') {
          setAllFilesData(data.data);
          // Default to first file if available
          const fileKeys = Object.keys(data.data);
          if (fileKeys.length > 0) {
            setSelectedFile(fileKeys[0]);
          }
          // Log Amplitude event with file names and summary
          if (window && window.amplitude) {
            logAmplitudeEvent('Data Analysis Viewed', {
              fileNames: fileKeys,
              summary: fileKeys.map(key => ({
                file: key,
                ...data.data[key]
              }))
            });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper to get current file's data
  const currentFileData = selectedFile && allFilesData ? allFilesData[selectedFile] : null;

  const renderSummaryStats = () => {
    if (!currentFileData) return null;
    const stats = [
      { label: 'Total Records', value: currentFileData.nof_rows },
      { label: 'Number of Columns', value: currentFileData.nof_columns },
      { label: 'Time Stamp Data', value: currentFileData.timestamp },
      { label: 'Stationary', value: currentFileData.stationary },
      { label: 'Sentiment', value: currentFileData.sentiment },
    ];
    return (
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <h3>{stat.label}</h3>
            <p>{stat.value || 'N/A'}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderAccordionSection = (title, content) => (
    <div className="accordion-item">
      <h2 className="accordion-header">
        <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target={`#${title.replace(/\s+/g, '')}`}>
          {title}
        </button>
      </h2>
      <div id={title.replace(/\s+/g, '')} className="accordion-collapse collapse show">
        <div className="accordion-body">
          {content}
        </div>
      </div>
    </div>
  );

  const renderTable = () => {
    if (!currentFileData?.data || currentFileData.data === 'No data') {
      return <p>No data available</p>;
    }
    let parsedData;
    try {
      parsedData = typeof currentFileData.data === 'string' ? JSON.parse(currentFileData.data) : currentFileData.data;
    } catch (error) {
      return <p>Error parsing data</p>;
    }
    const headers = Object.keys(parsedData);
    if (headers.length === 0) return <p>No data available</p>;
    const rowCount = Math.max(...headers.map(header =>
      parsedData[header] && typeof parsedData[header] === 'object'
        ? Object.keys(parsedData[header]).length
        : 0
    ));
    if (rowCount === 0) return <p>No data available</p>;
    return (
      <div className="table-container">
        <table className="modern-table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(Math.min(rowCount, 100))].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((header, colIndex) => (
                  <td key={colIndex}>
                    {parsedData[header] && parsedData[header][rowIndex] !== undefined
                      ? parsedData[header][rowIndex]
                      : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rowCount > 100 && (
          <p className="table-note">Showing first 100 rows of {rowCount} total rows</p>
        )}
      </div>
    );
  };

  const renderMissingValueAnalysis = () => {
    if (!currentFileData?.missingvalue || currentFileData.missingvalue === 'No data') return <p>No data available</p>;
    let missingData;
    try {
      missingData = JSON.parse(currentFileData.missingvalue);
    } catch (e) {
      return <p>Error parsing missing value data</p>;
    }
    return (
      <div className="table-container">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Missing Value Count</th>
            </tr>
          </thead>
          <tbody>
            {missingData.map((item, index) => (
              <tr key={index}>
                <td>{item.Parameters}</td>
                <td>{item["Missing Value Count"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderNumericalAnalysis = () => {
    if (!currentFileData?.numdf || currentFileData.numdf === 'No data') return <p>No data available</p>;
    let numData;
    try {
      numData = JSON.parse(currentFileData.numdf);
    } catch (e) {
      return <p>Error parsing numerical data</p>;
    }
    if (!Array.isArray(numData) || numData.length === 0) {
      return <p>No numerical data available</p>;
    }
    const columnNames = numData.map(item => item.ColumnName || 'Unknown Column');
    const metricKeys = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'];
    const metricLabels = ['Count', 'Mean', 'Std Dev', 'Min', '25th Percentile', 'Median', '75th Percentile', 'Max'];
    return (
      <div className="table-container">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Metric</th>
              {columnNames.map((columnName, index) => (
                <th key={index}>{columnName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metricKeys.map((metricKey, metricIndex) => (
              <tr key={metricKey}>
                <td><strong>{metricLabels[metricIndex]}</strong></td>
                {numData.map((columnData, columnIndex) => {
                  const value = columnData[metricKey];
                  const numericValue = Number(value);
                  return (
                    <td key={columnIndex}>
                      {isNaN(numericValue) || value === null || value === undefined
                        ? 'N/A'
                        : numericValue.toFixed(2)
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCategoricalAnalysis = () => {
    // If you want to use actual categorical data from the API, parse and render it here
    // For now, fallback to a placeholder if not present
    if (!currentFileData?.catdf || currentFileData.catdf === 'No data') return <p>No data available</p>;
    let catData;
    try {
      catData = JSON.parse(currentFileData.catdf);
    } catch (e) {
      return <p>Error parsing categorical data</p>;
    }
    if (!Array.isArray(catData) || catData.length === 0) {
      return <p>No categorical data available</p>;
    }
    return (
      <div className="table-container">
        <table className="modern-table">
          <thead>
            <tr>
              {Object.keys(catData[0]).map((col, idx) => (
                <th key={idx}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catData.map((row, idx) => (
              <tr key={idx}>
                {Object.values(row).map((val, i) => (
                  <td key={i}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // If you want to render plots, adapt this function to your new API structure
  // const renderPlots = () => { ... }

  // if (!analysisData) {
  //   return (
  //     <div className="analysis-container">
  //       <div className="loading">Loading data analysis...</div>
  //     </div>
  //   );
  // }

  return (
    <div className="analysis-container">
      {loading && <LoadingIndicator message="Loading analysis data..." />}
      
      <h1 className="analysis-title">Data Analysis</h1>
      {/* Tab panel for multiple files */}
      {allFilesData && Object.keys(allFilesData).length > 1 && (
        <Paper elevation={2} style={{ margin: '24px 0 32px 0', borderRadius: 12 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa', borderRadius: 2 }}>
            <Tabs
              value={selectedFile}
              onChange={(_, newValue) => setSelectedFile(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="File Tabs"
              sx={{ minHeight: 48 }}
            >
              {Object.keys(allFilesData).map((fileKey) => (
                <Tab
                  key={fileKey}
                  value={fileKey}
                  label={fileKey}
                  sx={{
                    fontWeight: selectedFile === fileKey ? 700 : 400,
                    minHeight: 48,
                    textTransform: 'none',
                    fontSize: 16,
                  }}
                />
              ))}
            </Tabs>
          </Box>
        </Paper>
      )}
      {/* <div className="file-info">
        <h2>Analyzing: {fileName}</h2>
      </div> */}
      
      {renderSummaryStats()}

      <div className="accordion mt-4">
        {renderAccordionSection('Data Overview', renderTable())}
        {renderAccordionSection('Feature Analysis', renderCategoricalAnalysis())}
        {renderAccordionSection('Numerical Analysis', renderNumericalAnalysis())}
        {/* {renderAccordionSection('Missing Value Analysis', renderMissingValueAnalysis())} */}
        {/* {renderAccordionSection('Visualizations', renderPlots())} */}
      </div>
    </div>
  );
};

export default DataAnalysis;