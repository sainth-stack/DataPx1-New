import React, { useState, useEffect } from 'react';
import { API_URL } from '../../const';
import axios from 'axios';
import { LoadingIndicator } from '../../components/loader';
import './index.css';
import { Tabs, Tab, Box, FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import { logAmplitudeEvent } from '../../utils';

const MissingValues = () => {
    const [fileKeys, setFileKeys] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileData, setFileData] = useState({});
    const [loading, setLoading] = useState(false);
    const [filterOption, setFilterOption] = useState('missing-only'); // New filter state

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Get user ID from localStorage
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const userId = user.id;

                const response = await axios.get(`${API_URL}/mvt`, {
                    headers: {
                        'X-User-ID': userId,
                    }
                });
                const sanitizedData = JSON.stringify(response.data).replace(
                    /NaN/g,
                    "0"
                );
                let cleanedData;
                try {
                    const parsedOnce = JSON.parse(sanitizedData);
                    if (typeof parsedOnce === 'string') {
                        cleanedData = JSON.parse(parsedOnce);
                    } else {
                        cleanedData = parsedOnce;
                    }
                } catch (parseError) {
                    cleanedData = response.data;
                }
                // Multi-file support
                let files = [];
                let fileDataObj = {};
                if (cleanedData.data && typeof cleanedData.data === 'object') {
                    files = Object.keys(cleanedData.data);
                    fileDataObj = cleanedData.data;
                } else {
                    files = ['default'];
                    fileDataObj = { default: cleanedData };
                }
                setFileKeys(files);
                setSelectedFile(files[0] || null);
                setFileData(fileDataObj);
                // Log Amplitude event after data is loaded
                if (window && window.amplitude) {
                  // Calculate missing rows for each file
                  const isImputed = (cell) => cell?.is_imputed === true || cell?.is_imputed === "True";
                  const missingRows = files.map(f => {
                    const rows = fileDataObj[f]?.rows ?? fileDataObj[f]?.df ?? [];
                    const count = rows.filter(row => Object.values(row).some(cell => isImputed(cell))).length;
                    return { file: f, missingRows: count };
                  });
                  logAmplitudeEvent('Missing Values Viewed', {
                    fileNames: files,
                    missingRows
                  });
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Use selected file's data - API returns rows, fallback to df for backward compatibility
    const fileObj = selectedFile ? fileData[selectedFile] : null;
    const rawData = fileObj?.rows ?? fileObj?.df ?? [];
    const summary = fileObj?.Summary ?? fileObj?.summary ?? null;

    // Helper: is_imputed can be boolean or string from API
    const isImputed = (cell) => cell?.is_imputed === true || cell?.is_imputed === "True";

    // Filter data based on filter option
    const getFilteredData = () => {
        if (filterOption === 'missing-only') {
            return rawData.filter(row =>
                Object.values(row).some(cell => isImputed(cell))
            );
        }
        return rawData; // Return all rows
    };

    const data = getFilteredData();

    // Note: Using a plain table like Data Analysis page, so no dynamic height calculation needed

    const getColumns = () => {
        if (rawData.length === 0) return [];
        return Object.keys(rawData[0]);
    };

    // Calculate additional statistics
    const getAdvancedStats = () => {
        if (!summary) return {};
        
        const totalColumns = Object.keys(summary.missing_count_per_column).length;
        const totalCells = rawData.length * totalColumns;
        const completionRate = totalCells > 0 ? ((totalCells - summary.total_missing_values) / totalCells * 100) : 100;
        
        // Find most affected column
        const mostAffectedColumn = Object.entries(summary.missing_percentage_per_column)
            .reduce((max, [col, percentage]) => 
                percentage > max.percentage ? { column: col, percentage } : max, 
                { column: 'None', percentage: 0 }
            );

        return {
            totalColumns,
            totalCells,
            completionRate,
            mostAffectedColumn,
            dataQualityScore: completionRate
        };
    };

    // No virtualized row renderer needed for plain table

    const stats = getAdvancedStats();

    // Handle filter change
    const handleFilterChange = (event) => {
        setFilterOption(event.target.value);
    };

    // Get counts for filter options
    const getMissingRowsCount = () => {
        return rawData.filter(row =>
            Object.values(row).some(cell => isImputed(cell))
        ).length;
    };

    // Show loader while loading
    if (loading) {
        return <LoadingIndicator message="Loading missing values analysis..." />;
    }

    return (
        <div className="missing-values-container">
            <div className="page-header">
                <h1 className="page-title">Missing Values Analysis</h1>
            </div>

            {/* Tabs for multiple files */}
            {fileKeys.length > 1 && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', margin: '0 0 24px 0', background: '#fff', borderRadius: '8px 8px 0 0' }}>
                    <Tabs
                        value={selectedFile}
                        onChange={(e, newValue) => setSelectedFile(newValue)}
                        indicatorColor="primary"
                        textColor="primary"
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="Missing Values File Tabs"
                    >
                        {fileKeys.map((key) => (
                            <Tab key={key} label={key.replace(/_/g, ' ')} value={key} sx={{ fontWeight: 600, fontSize: '1rem', textTransform: 'none' }} />
                        ))}
                    </Tabs>
                </Box>
            )}
            
            {/* Summary Cards */}
            {summary && (
                <div className="summary-section">
                    <div className="summary-grid">
                        <div className="stat-card">
                            <div className="stat-content">
                                <div className="stat-value">{summary.total_missing_values}</div>
                                <div className="stat-label">Total Missing Values</div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-content">
                                <div className="stat-value">{stats.completionRate?.toFixed(1)}%</div>
                                <div className="stat-label">Data Completeness</div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-content">
                                <div className="stat-value">{rawData.length.toLocaleString()}</div>
                                <div className="stat-label">Total Records</div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-content">
                                <div className="stat-value">{summary.columns_with_missing.length}</div>
                                <div className="stat-label">Affected Columns</div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-content">
                                <div className="stat-value">{stats.dataQualityScore?.toFixed(1)}%</div>
                                <div className="stat-label">Quality Score</div>
                            </div>
                        </div>

                        {stats.mostAffectedColumn?.percentage > 0 && (
                            <div className="stat-card">
                                <div className="stat-content">
                                    <div className="stat-value">{stats.mostAffectedColumn.percentage.toFixed(1)}%</div>
                                    <div className="stat-label">Highest Missing Rate</div>
                                    <div className="stat-description">{stats.mostAffectedColumn.column}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Column Details */}
                    {summary.columns_with_missing.length > 0 && (
                        <div className="details-section">
                            <h3>Column-wise Missing Data</h3>
                            <div className="details-table">
                                <div className="details-header">
                                    <div className="details-column-name">Column Name</div>
                                    <div className="details-missing-count">Missing Count</div>
                                    <div className="details-percentage">Percentage</div>
                                </div>
                                {Object.entries(summary.missing_count_per_column)
                                    .filter(([_, count]) => count > 0)
                                    .sort(([,a], [,b]) => b - a)
                                    .map(([column, count]) => (
                                    <div key={column} className="details-row">
                                        <div className="details-column-name">{column}</div>
                                        <div className="details-missing-count">{count}</div>
                                        <div className="details-percentage">{summary.missing_percentage_per_column[column].toFixed(1)}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ignored Columns */}
                    {summary.ignored_columns && Object.keys(summary.ignored_columns).length > 0 && (
                        <div className="details-section" style={{ marginTop: '2rem' }}>
                            <h3>Ignored Columns</h3>
                            <div className="details-table">
                                <div className="details-header">
                                    <div className="details-column-name">Column Name</div>
                                    <div className="details-reason">Reason</div>
                                </div>
                                {Object.entries(summary.ignored_columns).map(([column, reason]) => (
                                    <div key={column} className="details-row ignored-column-row">
                                        <div className="details-column-name">{column}</div>
                                        <div className="details-reason">{reason}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Data Table */}
            {rawData.length > 0 && (
                    <div className="">
            <div className="">
                            <FormControl 
                                variant="outlined" 
                                size="small" 
                                sx={{ 
                                    minWidth: 200,
                                    backgroundColor: '#fff',
                                    borderRadius: '8px',
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        fontWeight: 500,
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#1976d2',
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#1976d2',
                                            borderWidth: 2,
                                        }
                                    },
                                    '& .MuiInputLabel-root': {
                                        fontWeight: 500,
                                        color: '#666',
                                        '&.Mui-focused': {
                                            color: '#1976d2',
                                        }
                                    }
                                }}
                            >
                                <InputLabel id="filter-select-label">View Options</InputLabel>
                                <Select
                                    labelId="filter-select-label"
                                    id="filter-select"
                                    value={filterOption}
                                    label="View Options"
                                    onChange={handleFilterChange}
                                    sx={{
                                        '& .MuiSelect-select': {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }
                                    }}
                                >
                                    <MenuItem 
                                        value="missing-only"
                                        sx={{ 
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            '&:hover': {
                                                backgroundColor: '#f5f5f5'
                                            }
                                        }}
                                    >
                                        <span style={{ color: '#ff6b35' }}>●</span>
                                        Only Missing Rows ({getMissingRowsCount().toLocaleString()})
                                    </MenuItem>
                                    <MenuItem 
                                        value="all-rows"
                                        sx={{ 
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            '&:hover': {
                                                backgroundColor: '#f5f5f5'
                                            }
                                        }}
                                    >
                                        <span style={{ color: '#4caf50' }}>●</span>
                                        All Rows ({rawData.length.toLocaleString()})
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </div>
                    
                    <div className="table-container">
                        {data.length > 0 ? (
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        {getColumns().map((column, index) => (
                                            <th key={index}>{column}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.slice(0, Math.min(data.length, 100)).map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {getColumns().map((column, colIndex) => (
                                                <td
                                                    key={colIndex}
                                                    className={isImputed(row[column]) ? "imputed" : ""}
                                                >
                                                    {row[column]?.value ?? 'N/A'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="no-data-message">
                                <p>No rows with missing values found in the current dataset.</p>
                            </div>
                        )}
                        {data.length > 100 && (
                            <p className="table-note">Showing first 100 rows of {data.length.toLocaleString()} total rows</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MissingValues;