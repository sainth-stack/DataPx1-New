import { API_URL } from '../../const';
import './index.css';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { Tabs, Tab, Box, Typography, CircularProgress } from '@mui/material';
import { logAmplitudeEvent } from '../../utils';
import { LoadingIndicator } from '../../components/loader';

const AiAndModels = () => {
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        model: 'Prediction', // Default set to Prediction
        col: '',
        frequency: 'days', // Default frequency
        tenure: '1' // Default tenure
    });
    const [rfInputs, setRfInputs] = useState({});
const[predictLoader,setPredictLoader] = useState(false)
    // Ref for prediction analysis section
    const predictionAnalysisRef = useRef(null);

    // Training progress states
    const [trainingProgress, setTrainingProgress] = useState(0);
    const [trainingMessage, setTrainingMessage] = useState('');
    const [isTraining, setIsTraining] = useState(false);
    const trainingIntervalRef = useRef(null);
    // Inside your main component (e.g., AiAndModels)
    const [fileKeys, setFileKeys] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filesData, setFilesData] = useState({});
    // Columns for the selected file
    const columns = selectedFile && filesData[selectedFile] ? filesData[selectedFile] : [];
    const [columnsLoading, setColumnsLoading] = useState(!selectedFile || !filesData[selectedFile]);

    // Fetch models API and parse files
    useEffect(() => {
        const fetchModels = async () => {
            // Get user ID from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.id;
            const modelParamMap = {
                'Prediction': 'prediction',
                'Forecast': 'forecast',
                'Classification': 'classification',
                'OutlierDetection': 'outlier',
            };
            setColumnsLoading(true);
            const modelParam = modelParamMap[formData.model] || 'prediction';
            const response = await fetch(`${API_URL}/models?model=${modelParam}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-User-ID': userId,
                },
            });

            if (response.ok) {
                setColumnsLoading(false);
                const result = await response.json();
                if (result.files && typeof result.files === 'object') {
                    const keys = Object.keys(result.files);
                    setFileKeys(keys);
                    setFilesData(result.files);
                    // Default to file name in use (from localStorage or props)
                    let user = JSON.parse(localStorage.getItem('user') || '{}');
                    let currentFileName = user.fileName || localStorage.getItem('fileName') || keys[0];
                    // Find closest match (case-insensitive)
                    let defaultKey = keys.find(k => k.toLowerCase() === currentFileName?.toLowerCase()) || keys[0];
                    setSelectedFile(defaultKey);
                    // Log AI Models Viewed event
                    if (window && window.amplitude) {
                      logAmplitudeEvent('AI Models Viewed', { fileNames: keys });
                    }
                }
            } else {
                setColumnsLoading(false);
                console.error('Failed to fetch files');
                setFileKeys([]);
                setFilesData({});
                setSelectedFile(null);
            }
        };
        
        fetchModels();
    }, [formData.model]);

    // Scroll to prediction analysis section when prediction model succeeds
    useEffect(() => {
        if (response && response.status && formData.model === 'Prediction' && predictionAnalysisRef.current) {
            // Small delay to ensure the analysis section is rendered
            setTimeout(() => {
                predictionAnalysisRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    }, [response, formData.model]);

    // Training progress simulation effect
    useEffect(() => {
        if (loading && (formData.model === 'Prediction' || formData.model === 'Forecast')) {
            setIsTraining(true);
            setTrainingProgress(0);
            
            // Different training phases for different models
            let trainingPhases;
            if (formData.model === 'Prediction') {
                setTrainingMessage('Initializing model training...');
                trainingPhases = [
                    { progress: 10, message: 'Loading training data...', duration: 2000 },
                    { progress: 25, message: 'Feature engineering...', duration: 3000 },
                    { progress: 40, message: 'Building decision trees...', duration: 4000 },
                    { progress: 60, message: 'Training random forest...', duration: 5000 },
                    { progress: 75, message: 'Cross-validation...', duration: 3000 },
                    { progress: 90, message: 'Model optimization...', duration: 2000 },
                    { progress: 100, message: 'Training completed successfully!', duration: 1000 }
                ];
            } else if (formData.model === 'Forecast') {
                setTrainingMessage('Initializing time series analysis...');
                trainingPhases = [
                    { progress: 15, message: 'Loading time series data...', duration: 2500 },
                    { progress: 30, message: 'Detecting seasonal patterns...', duration: 3500 },
                    { progress: 45, message: 'Analyzing trend components...', duration: 4000 },
                    { progress: 60, message: 'Building ARIMA model...', duration: 4500 },
                    { progress: 75, message: 'Parameter optimization...', duration: 3000 },
                    { progress: 90, message: 'Generating forecasts...', duration: 2000 },
                    { progress: 100, message: 'Forecasting completed successfully!', duration: 1000 }
                ];
            }

            let currentPhaseIndex = 0;
            
            const updateProgress = () => {
                if (currentPhaseIndex < trainingPhases.length) {
                    const phase = trainingPhases[currentPhaseIndex];
                    setTrainingProgress(phase.progress);
                    setTrainingMessage(phase.message);
                    
                    trainingIntervalRef.current = setTimeout(() => {
                        currentPhaseIndex++;
                        if (currentPhaseIndex < trainingPhases.length) {
                            updateProgress();
                        }
                    }, phase.duration);
                }
            };

            // Start progress after a brief delay
            setTimeout(updateProgress, 500);
            
        } else {
            // Clean up training progress when not training
            setIsTraining(false);
            setTrainingProgress(0);
            setTrainingMessage('');
            if (trainingIntervalRef.current) {
                clearTimeout(trainingIntervalRef.current);
                trainingIntervalRef.current = null;
            }
        }

        // Cleanup on unmount
        return () => {
            if (trainingIntervalRef.current) {
                clearTimeout(trainingIntervalRef.current);
                trainingIntervalRef.current = null;
            }
        };
    }, [loading, formData.model]);

    // Function to detect if a field is a date field
    const isDateField = (fieldName) => {
        const dateKeywords = ['date', 'time', 'created', 'updated', 'modified', 'timestamp', 'datetime', 'birth', 'expiry', 'start', 'end'];
        return dateKeywords.some(keyword => 
            fieldName.toLowerCase().includes(keyword.toLowerCase())
        );
    };
    
    // Normalize various datetime strings to input[type="datetime-local"] compatible value (YYYY-MM-DDTHH:MM)
    const toDateTimeLocal = (value) => {
        if (!value) return value;
        try {
            // Replace space between date and time with 'T' if present
            const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value;
            const dt = new Date(normalized);
            if (isNaN(dt.getTime())) {
                return value;
            }
            const pad = (n) => String(n).padStart(2, '0');
            const year = dt.getFullYear();
            const month = pad(dt.getMonth() + 1);
            const day = pad(dt.getDate());
            const hours = pad(dt.getHours());
            const minutes = pad(dt.getMinutes());
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
            return value;
        }
    };

    const models = [
        { id: 'Classification', label: 'Classification', description: 'Discover hidden patterns and segment data using clustering' },
        { id: 'Prediction', label: 'Prediction', description: 'Categorize data into distinct groups using supervised learning' },
        { id: 'Forecast', label: 'Forecast', description: 'Time-series forecasting for trend analysis' },
        { id: 'OutlierDetection', label: 'Outlier Detection', description: 'Identify anomalies and unusual patterns' }
    ];

    const frequencyOptions = [
        { value: 'hours', label: 'Hours' },
        { value: 'days', label: 'Days' },
        { value: 'weeks', label: 'Weeks' },
        { value: 'months', label: 'Months' },
        { value: 'quarters', label: 'Quarters' },
        { value: 'years', label: 'Years' }
    ];

    const tenureOptions = [1, 3, 5, 7, 10]; // Example tenure values

    const handleModelChange = (model) => {
        setFormData(prev => ({ ...prev, model, col: '' }));
        setResponse(null);
        setRfInputs({});
    };

    const handleColumnChange = (e) => {
        const col = e.target.value;
        setFormData(prev => ({ ...prev, col }));
    };

    const handleFrequencyChange = (e) => {
        const frequency = e.target.value;
        setFormData(prev => ({ ...prev, frequency }));
    };

    const handleTenureChange = (e) => {
        const tenure = e.target.value;
        setFormData(prev => ({ ...prev, tenure }));
    };

    // Log tab change event
    const handleTabChange = (e, newValue) => {
        setSelectedFile(newValue);
        if (window && window.amplitude) {
          logAmplitudeEvent('AI Models Tab Changed', { fileName: newValue });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Get user ID from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.id;

            // Map business terms to technical models
            const modelMapping = {
                'Classification': 'K-Means',
                'Prediction': 'RandomForest',
                'Forecast': 'Arima',
                'OutlierDetection': 'OutlierDetection'
            };

            const response = await axios.post(`${API_URL}/models`, new URLSearchParams({
                model: modelMapping[formData.model],
                col: formData.col,
                frequency: formData.frequency,
                tenure: formData.tenure,
                file_name: selectedFile
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-User-ID': userId,
                },
            });
console.log(response,'sdfiusdfhsdiuf22')
            let data = response.data;
            // Safe parsing: if data is a string, try to parse it as JSON
            if (typeof data === 'string') {
                try {
                    // Replace NaN with null before parsing (NaN is not valid JSON)
                    const cleanedData = data.replace(/:\s*NaN\b/g, ': null');
                    data = JSON.parse(cleanedData);
                } catch (e) {
                    // If parsing fails, try to use the original data (might already be an object)
                    console.error('Failed to parse response data:', e);
                    // If response.data is still a string, we can't use it as-is, so try to handle gracefully
                    data = typeof response.data === 'string' ? response.data : response.data;
                }
            }
            setResponse(data);
            // Log AI Model Analysis Run event
            if (window && window.amplitude) {
              logAmplitudeEvent('AI Model Analysis Run', {
                fileName: selectedFile,
                model: formData.model,
                col: formData.col,
                frequency: formData.frequency,
                tenure: formData.tenure,
                input: formData,
                output: data
              });
            }
            // Prepopulate RandomForest (Prediction) inputs with suggested row_data from API
            if (formData.model === 'Prediction' && data && data.row_data) {
                setRfInputs((prev) => {
                    // Avoid overriding if user already started typing
                    if (prev && Object.keys(prev).length > 0) return prev;
                    const cols = Array.isArray(data.rf_cols) ? data.rf_cols : Object.keys(data.row_data);
                    const initial = {};
                    cols.forEach((col) => {
                        let val = data.row_data[col];
                        if (val === null || val === undefined) {
                            initial[col] = '';
                            return;
                        }
                        // Ensure strings in inputs; format datetime fields for datetime-local inputs
                        if (isDateField(col)) {
                            initial[col] = toDateTimeLocal(val);
                        } else {
                            initial[col] = typeof val === 'string' ? val : String(val);
                        }
                    });
                    return initial;
                });
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };
console.log(response,'sdfiusdfhsdiuf')
    const renderResponse = () => {
        if (!response) return null;
    
        // Check if the response contains the specific message
        if (response.msg) {
            return <div className="error-text">{response.msg}</div>;
        }
        switch (formData.model) {
            case 'Classification':
                let clusteredData;
                try {
                    clusteredData = JSON.parse(response.clustered_data);
                } catch (error) {
                    console.error('Error parsing clustered_data:', error);
                    return <div className="error-text">This dataset doesn't meet the clustering requirements</div>;
                }
    
                const tableColumns = Object.keys(clusteredData);
                const rows = Object.keys(clusteredData[tableColumns[0]]).map(rowIndex => {
                    const row = {};
                    tableColumns.forEach(col => {
                        row[col] = clusteredData[col][rowIndex];
                    });
                    return row;
                });
    
                return (
                    <div className="response-container">
                        <h2 className="response-title">Pattern Recognition Results</h2>
                        <div className="business-inference">
                            <h3>Business Insights:</h3>
                            <p>
                                This analysis discovers hidden patterns in your <strong>{formData.col}</strong> data by grouping similar records together. 
                                These clusters reveal natural segments in your data that can inform customer targeting, product positioning, and strategic decisions.
                            </p>
                        </div>
                        <p className="status-text">Analysis Status: {response.status ? 'Successfully Completed' : 'Analysis Failed'}</p>
                        <p className="status-text">Clusters Identified: {response.cluster}</p>
                        <div className="table-container">
                            <table className="clustered-data-table">
                                <thead>
                                    <tr>
                                        {tableColumns.map(col => (
                                            <th key={col}>{col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr key={index}>
                                            {tableColumns.map(col => (
                                                <td key={`${index}-${col}`}>
                                                    {typeof row[col] === 'number' 
                                                        ? row[col].toFixed(2) 
                                                        : row[col]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
    
            case 'Prediction':
                return (
                    <div className="rf-container">
                        <h2 className="response-title" ref={predictionAnalysisRef}>Prediction Analysis</h2>
                        <p className="status-text">Model Status: {response.status ? '✓ Successfully Trained' : '✗ Training Failed'}</p>
                        
                        <div className="rf-content">
                            <form className="rf-input-form" onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const formData2 = new FormData();
                                    formData2.append('form_name', 'rf');
                                    formData2.append('file_name',selectedFile)
                                    formData2.append('targetColumn', formData.col);
                                    Object.entries(rfInputs).forEach(([key, value]) => {
                                        formData2.append(key, value);
                                    });
    setPredictLoader(true)
                                    // Get user ID from localStorage
                                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                                    const userId = user.id;

                                    const response = await fetch(`${API_URL}/model_predict`, {
                                        method: 'POST',
                                        headers: {
                                            'X-User-ID': userId,
                                        },
                                        body: formData2,
                                    });
                                    setPredictLoader(false)
                                    const data = await response.json();
                                    setResponse(prev => ({
                                        ...prev,
                                        rf_result: data.rf_result,
                                        insights: data.insights
                                    }));
                                } catch (error) {
                                    setPredictLoader(false)
                                    console.error('Error:', error);
                                }
                            }}>
                                <div className="rf-inputs">
                                    <h4>{`Enter Values for ${formData.col ? formData.col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' ' : ''}Prediction:`}</h4>
                                    {response.rf_cols?.map((col) => (
                                        <div key={col} className="rf-form-group">
                                            <label className="rf-label">
                                                {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                <input
                                                    type={isDateField(col) ? 'datetime-local' : 'text'}
                                                    className="rf-input"
                                                    value={rfInputs[col] || ''}
                                                    onChange={(e) => setRfInputs(prev => ({
                                                        ...prev,
                                                        [col]: e.target.value
                                                    }))}
                                                    required
                                                    placeholder={isDateField(col) ? 'Select date and time' : `Enter ${col.replace(/_/g, ' ')}`}
                                                />
                                            </label>
                                        </div>
                                    ))}
                                    <button type="submit" className="rf-submit-button" disabled={predictLoader}>
                                       {predictLoader ?'Predicting...' :"Get Prediction"} 
                                    </button>
                                </div>
                            </form>
                            <div className="rf-result">
                                {/* Output Levels visualization (professional segmented meter) */}
                                {(() => {
                                    const insights = response?.insights;
                                    const ranges = insights?.output_level_ranges;
                                    if (!ranges || typeof ranges !== 'object') return null;
                                    
                                    // Order levels for consistent UX
                                    const preferredOrder = ['Low', 'Medium', 'High', 'Critical'];
                                    const entries = Object.entries(ranges).map(([name, r]) => ({
                                        name,
                                        min: Number(r?.min),
                                        max: Number(r?.max)
                                    })).filter(r => !Number.isNaN(r.min) && !Number.isNaN(r.max) && r.max >= r.min);
                                    
                                    if (entries.length === 0) return null;
                                    
                                    const ordered = entries.sort((a, b) => {
                                        const ai = preferredOrder.indexOf(a.name);
                                        const bi = preferredOrder.indexOf(b.name);
                                        if (ai !== -1 && bi !== -1 && ai !== bi) return ai - bi;
                                        if (a.min !== b.min) return a.min - b.min;
                                        return a.max - b.max;
                                    });
                                    
                                    const overallMin = Math.min(...ordered.map(o => o.min));
                                    const overallMax = Math.max(...ordered.map(o => o.max));
                                    const span = Math.max(1, overallMax - overallMin);
                                    
                                    const predictedLevel = insights?.predicted_output_level;
                                    const numericValueRaw = response?.rf_result;
                                    const numericValue = typeof numericValueRaw === 'number'
                                        ? numericValueRaw
                                        : parseFloat(String(numericValueRaw ?? '').replace(/[^0-9.+-eE]/g, ''));
                                    const hasNumeric = Number.isFinite(numericValue);
                                    const pct = hasNumeric ? Math.min(100, Math.max(0, ((numericValue - overallMin) / span) * 100)) : null;
                                    
                                    return (
                                        <div className="levels-card">
                                            <div className="levels-header">
                                                <h3 className="levels-title">Output Levels</h3>
                                                <div className="level-info-group">
                                                    {typeof numericValueRaw !== 'undefined' && numericValueRaw !== null && (
                                                        <span className="level-value">Value: Predicted {formData.col ? formData.col.replace(/_/g, ' ') : 'value'} is {numericValueRaw}</span>
                                                    )}
                                                    {predictedLevel && (
                                                        <span className={`level-chip ${String(predictedLevel).toLowerCase()}`}>
                                                            <strong>Predicted:</strong> {predictedLevel}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Simple Range Table */}
                                            <div className="range-table-container">
                                                <table className="range-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Level</th>
                                                            <th>Range</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {ordered.map((seg, idx) => {
                                                            const active = String(predictedLevel).toLowerCase() === String(seg.name).toLowerCase();
                                                            return (
                                                                <tr key={`${seg.name}-${idx}`} className={active ? 'active-row' : ''}>
                                                                    <td className={`level-name ${String(seg.name).toLowerCase()}`}>
                                                                        <strong>{seg.name.toUpperCase()}</strong>
                                                                    </td>
                                                                    <td className="level-range">{seg.min} – {seg.max}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}
                                {(response.rf_result || response.insights) && (
                                    <div className="prediction-result-wrapper">
                                        {/* Main Prediction Result */}
                                        {response.rf_result && (
                                            <div className="prediction-result-card">
                                                <div className="result-header">
                                                    <div>
                                                        <h3 className="result-title">Prediction Result</h3>
                                                        <p className="result-subtitle">{formData.col ? formData.col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Target Value'}</p>
                                                    </div>
                                                </div>
                                                <div className="result-value-display">{response.rf_result}</div>
                                            </div>
                                        )}

                                        {/* Insights Grid */}
                                        {response.insights && (
                                            <div className="insights-grid">
                                                {Array.isArray(response.insights.input_analysis) && response.insights.input_analysis.length > 0 && (
                                                    <div className="insight-card">
                                                        <div className="insight-header">
                                                            <h4>Input Analysis</h4>
                                                        </div>
                                                        <ul className="insight-list">
                                                            {response.insights.input_analysis.map((item, idx) => (
                                                                <li key={`input_${idx}`}>{item}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                
                                                {Array.isArray(response.insights.prediction_interpretation) && response.insights.prediction_interpretation.length > 0 && (
                                                    <div className="insight-card">
                                                        <div className="insight-header">
                                                            <h4>Prediction Interpretation</h4>
                                                        </div>
                                                        <ul className="insight-list">
                                                            {response.insights.prediction_interpretation.map((item, idx) => (
                                                                <li key={`interpretation_${idx}`}>{item}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                
                                                {Array.isArray(response.insights.business_insights) && response.insights.business_insights.length > 0 && (
                                                    <div className="insight-card">
                                                        <div className="insight-header">
                                                            <h4>Business Insights</h4>
                                                        </div>
                                                        <ul className="insight-list">
                                                            {response.insights.business_insights.map((item, idx) => (
                                                                <li key={`business_${idx}`}>{item}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                
                                                {Array.isArray(response.insights.recommended_actions) && response.insights.recommended_actions.length > 0 && (
                                                    <div className="insight-card insight-card-highlight">
                                                        <div className="insight-header">
                                                            <h4>Recommended Actions</h4>
                                                        </div>
                                                        <ul className="insight-list">
                                                            {response.insights.recommended_actions.map((item, idx) => (
                                                                <li key={`action_${idx}`}>{item}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
    
            case 'Forecast':
                let plotData;
                try {
                    plotData = response?.path ? JSON.parse(response?.path) : null;
                } catch (error) {
                    console.error('Error parsing plot data:', error);
                    return <div className="error-text">This dataset doesn't meet the forecasting requirements</div>;
                }
    
                return (
                    <div className="response-container">
                        <h2 className="response-title">Time Series Forecast Results</h2>
                        <div className="business-inference">
                            <h3>Business Insights:</h3>
                            <p>
                                This forecast analysis predicts future trends for <strong>{formData.col}</strong> over the next {formData.tenure} {formData.frequency}. 
                                The model identifies seasonal patterns, trends, and potential future values to support strategic planning and resource allocation.
                            </p>
                        </div>
                        <p className="status-text">Forecast Status: {response?.status ? "Successfully Generated" : "Generation Failed"}</p>
                        {plotData && (
                            <>
                                <Plot
                                    data={plotData?.data}
                                    layout={{
                                        ...plotData?.layout,
                                        autosize: true,
                                        plot_bgcolor: '#ffffff',
                                        paper_bgcolor: '#ffffff',
                                        margin: { l: 50, r: 50, t: 50, b: 50 }
                                    }}
                                    config={{ responsive: true }}
                                    className="arima-plot"
                                />

                            </>
                        )}
                    </div>
                );
    
            case 'OutlierDetection':
                return (
                    <div className="response-container">
                        <h2 className="response-title">Anomaly Detection Results</h2>
                        <div className="business-inference">
                            <h3>Business Insights:</h3>
                            <p>
                                This analysis identifies unusual patterns or anomalies in your <strong>{formData.col}</strong> data. 
                                Outliers can indicate data quality issues, fraud, exceptional performance, or opportunities for investigation.
                            </p>
                        </div>
                        <p className="status-text">Detection Status: {response.status ? 'Analysis Complete' : 'Analysis Failed'}</p>
                        <div className="processed-data">
                            <h3 className="response-subtitle">Analysis Details:</h3>
                            <div 
                                className="data-explanation" 
                                dangerouslySetInnerHTML={{ __html: response.processed_data }}
                            />
                        </div>
                    </div>
                );
    
            default:
                return <pre className="default-response">{JSON.stringify(response, null, 2)}</pre>;
        }
    };
    

    return (
        <div className="modern-container">
            {/* Professional Training Progress Overlay */}
            {loading && isTraining && (formData.model === 'Prediction' || formData.model === 'Forecast') && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
                        borderRadius: "16px",
                        padding: "40px",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                        border: "1px solid #e2e8f0",
                        maxWidth: "500px",
                        width: "90%",
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
                            padding: "20px",
                            marginBottom: "20px",
                            border: "2px solid #e2e8f0"
                        }}>
                            <Typography 
                                variant="h4" 
                                style={{ 
                                    fontWeight: 800,
                                    color: "#1e293b",
                                    marginBottom: "12px",
                                    fontSize: "2rem"
                                }}
                            >
                                {trainingProgress}%
                            </Typography>
                            
                            {/* Progress Bar */}
                            <div style={{
                                width: "100%",
                                height: "12px",
                                backgroundColor: "#e2e8f0",
                                borderRadius: "6px",
                                overflow: "hidden",
                                marginBottom: "16px"
                            }}>
                                <div style={{
                                    width: `${trainingProgress}%`,
                                    height: "100%",
                                    background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                                    borderRadius: "6px",
                                    transition: "width 0.8s ease-in-out"
                                }} />
                            </div>
                            
                            <Typography 
                                variant="h6" 
                                style={{ 
                                    color: "#475569",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    marginBottom: "8px"
                                }}
                            >
                                {formData.model === 'Prediction' ? 'Model Training in Progress' : 'Forecasting in Progress'}
                            </Typography>

                            <Typography 
                                variant="body1" 
                                style={{ 
                                    color: "#64748b",
                                    fontSize: "0.95rem",
                                    fontWeight: 500
                                }}
                            >
                                {trainingMessage}
                            </Typography>
                        </div>
                        
                        <Typography 
                            variant="body2" 
                            style={{ 
                                color: "#94a3b8",
                                fontSize: "0.85rem",
                                marginBottom: "8px"
                            }}
                        >
                            {formData.model === 'Prediction' 
                                ? 'Training RandomForest Classification Model' 
                                : 'Building ARIMA Time Series Model'}
                        </Typography>

                        <Typography 
                            variant="caption" 
                            style={{ 
                                color: "#94a3b8",
                                fontSize: "0.75rem"
                            }}
                        >
                            {formData.model === 'Prediction' 
                                ? 'Please wait while we train your prediction model...' 
                                : 'Please wait while we generate your forecasting model...'}
                        </Typography>
                    </div>
                </div>
            )}

            {/* Regular overlay loader for non-training API calls */}
            {loading && (!isTraining || (formData.model !== 'Prediction' && formData.model !== 'Forecast')) && 
                <LoadingIndicator message="Analyzing your data..." />}
            
            {/* Overlay loader for prediction API calls */}
            {predictLoader && <LoadingIndicator message="Making prediction..." />}
            
            <h1 className="modern-title">AI and Models Analysis</h1>
            
            {/* Tabs for multiple files */}
            {fileKeys.length > 1 && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', margin: '0 0 24px 0', background: '#fff', borderRadius: '8px 8px 0 0' }}>
                    <Tabs
                        value={selectedFile}
                        onChange={handleTabChange}
                        indicatorColor="primary"
                        textColor="primary"
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="AI Models File Tabs"
                    >
                        {fileKeys.map((key) => (
                            <Tab key={key} label={key.replace(/_/g, ' ')} value={key} sx={{ fontWeight: 600, fontSize: '1rem', textTransform: 'none' }} />
                        ))}
                    </Tabs>
                </Box>
            )}

            <form onSubmit={handleSubmit} className="modern-form">
                <div className="tab-panel">
                    <div className="tabs">
                        {models.map((model) => (
                            <button
                                key={model.id}
                                type="button"
                                className={`tab-button ${formData.model === model.id ? 'active' : ''}`}
                                onClick={() => handleModelChange(model.id)}
                                title={model.description}
                            >
                                {model.label}
                            </button>
                        ))}
                    </div>
                    <div className="model-description">
                        <p>{models.find(m => m.id === formData.model)?.description}</p>
                    </div>
                </div>

                <div className="form-group2">
                    <label className="modern-label">
                        Target Column
                        <select
                            name="col"
                            className="modern-select"
                            value={formData.col}
                            onChange={handleColumnChange}
                            disabled={!formData.model || columnsLoading}
                        >
                            <option value="" disabled>
                                {columnsLoading ? 'Loading columns...' : 'Select target column'}
                            </option>
                            {columns.map((column) => (
                                <option key={column} value={column}>
                                    {column}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

   {formData.model==="Forecast"&&     <>
                {/* New frequency dropdown */}
                <div className="form-group2">
                    <label className="modern-label">
                        Frequency
                        <select
                            name="frequency"
                            className="modern-select"
                            value={formData.frequency}
                            onChange={handleFrequencyChange}
                        >
                            {frequencyOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {/* New tenure dropdown */}
                <div className="form-group2">
                    <label className="modern-label">
                        Forecast Period
                        <select
                            name="tenure"
                            className="modern-select"
                            value={formData.tenure}
                            onChange={handleTenureChange}
                        >
                            {tenureOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option} {formData.frequency}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

        </>}
                <button 
                    type="submit" 
                    className="modern-submit"
                    disabled={loading || !formData.model || !formData.col || columnsLoading}
                >
                    {loading ? 'Analyzing...' : `Run ${formData.model} Analysis`}
                </button>
            </form>

            {response && (
                <div className="response-wrapper">
                    {renderResponse()}
                </div>
            )}
        </div>
    );
};

export default AiAndModels;