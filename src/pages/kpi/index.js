import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../const.js';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { Spin, Collapse, message } from 'antd';
import { LoadingOutlined, CopyOutlined } from '@ant-design/icons';
import { LoadingIndicator } from '../../components/loader';
import './index.css';
import { logAmplitudeEvent } from '../../utils';

const Kpi = () => {
    const [kpis, setKpis] = useState([]);
    const [prompt, setPrompt] = useState('');
    const [selectedKpiImage, setSelectedKpiImage] = useState([]);
    const [loadingImage, setLoadingImage] = useState(false);
    const [selectedKpiNames, setSelectedKpiNames] = useState([]);
    const [generatingKPIs, setGeneratingKPIs] = useState(false); // New state for KPI generation loading
    const [initialLoading, setInitialLoading] = useState(true); // New state for initial page loading
    const hasInitializedRef = useRef(false); // Use ref to prevent multiple initial calls

    // New state for controlling Collapse and auto-scrolling
    const [activeKeys, setActiveKeys] = useState([]);
    const [scrollToKey, setScrollToKey] = useState(null);

    // Auto-generate default KPIs when component mounts
    useEffect(() => {
        const generateDefaultKPIs = async () => {
            // Prevent multiple calls during initial loading
            if (hasInitializedRef.current) return;

            hasInitializedRef.current = true;

            try {
                // Get user ID from localStorage
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const userId = user.id;
                const defaultPrompt = "Generate 4 KPIs based on the dataset";

                const response = await axios.post(`${API_URL}/kpi_process`,
                    `prompt=${encodeURIComponent(defaultPrompt)}`,
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'X-User-ID': userId,
                        }
                    }
                );
                setKpis(response?.data?.kpis || []);
                // Log KPI Viewed event with default KPIs
                if (window && window.amplitude) {
                    logAmplitudeEvent('KPI Viewed', {
                        defaultPrompt,
                        kpis: response?.data?.kpis || []
                    });
                }
                // Don't show success message for initial load
            } catch (error) {
                console.error('Error fetching default KPIs:', error);
                message.error('Failed to generate default KPIs');
                // Reset flag on error so user can retry
                hasInitializedRef.current = false;
            } finally {
                setInitialLoading(false);
            }
        };

        generateDefaultKPIs();
    }, []);

    // Effect to handle auto-scrolling
    useEffect(() => {
        if (scrollToKey) {
            // We need to wait for the DOM to update and the panel to be rendered
            // A small timeout helps ensure the element exists
            const timer = setTimeout(() => {
                const element = document.getElementById(`kpi-panel-${scrollToKey}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setScrollToKey(null); // Reset after scrolling
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [scrollToKey, selectedKpiImage]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) {
            message.warning('Please enter a prompt');
            return;
        }

        setGeneratingKPIs(true); // Start loading

        try {
            // Get user ID from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.id;

            const response = await axios.post(`${API_URL}/kpi_process`,
                `prompt=${encodeURIComponent(prompt)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-User-ID': userId,
                    }
                }
            );
            setKpis(response?.data?.kpis || []);
            message.success('KPIs generated successfully');
            // Log KPI Query Run event with prompt and resulting KPIs
            if (window && window.amplitude) {
                logAmplitudeEvent('KPI Query Run', {
                    prompt,
                    kpis: response?.data?.kpis || []
                });
            }
        } catch (error) {
            console.error('Error fetching KPIs:', error);
            message.error('Failed to generate KPIs');
        } finally {
            setGeneratingKPIs(false); // Stop loading
        }
    };

    const generateKPIImage = async (kpi) => {
        const kpiName = kpi["KPI Name"];
        try {
            setLoadingImage(true);
            setSelectedKpiNames(prev => [...prev, kpiName]);

            // Add to active keys and set for scrolling
            setActiveKeys(prev => [...prev, kpiName]);
            setScrollToKey(kpiName);

            const newKpiImage = {
                name: kpiName,
                plots: null,
                code: null,
                loading: true
            };

            setSelectedKpiImage(prev => [...prev, newKpiImage]);

            // Get user ID from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.id;

            // Send as JSON with kpi_data object
            const response = await axios.post(`${API_URL}/generate_code`,
                { kpi_data: kpi },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': userId,
                    }
                }
            );

            if (response?.data?.code || response?.data?.plots) {
                const formattedCode = response.data.code;
                const plots = response.data.plots;

                setSelectedKpiImage(prev =>
                    prev.map(item =>
                        item.name === kpiName
                            ? {
                                ...item,
                                loading: false,
                                code: formattedCode,
                                plots: plots
                            }
                            : item
                    )
                );
                message.success(`Generated visualization for ${kpiName}`);
            }
        } catch (error) {
            console.error('Error generating KPI visualization:', error);
            message.error(`Failed to generate visualization for ${kpiName}`);
            setSelectedKpiNames(prev => prev.filter(name => name !== kpiName));
            setSelectedKpiImage(prev => prev.filter(item => item.name !== kpiName));
            setActiveKeys(prev => prev.filter(key => key !== kpiName));
        } finally {
            setLoadingImage(false);
        }
    };

    const handleCardClick = (kpi) => {
        if (loadingImage) return;

        const kpiName = kpi["KPI Name"];
        if (selectedKpiNames.includes(kpiName)) {
            setSelectedKpiNames(prev => prev.filter(name => name !== kpiName));
            setSelectedKpiImage(prev => prev.filter(item => item.name !== kpiName));
            setActiveKeys(prev => prev.filter(key => key !== kpiName));
        } else {
            generateKPIImage(kpi);
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code)
            .then(() => {
                message.success('Code copied to clipboard');
            })
            .catch(() => {
                message.error('Failed to copy code');
            });
    };

    // Show initial loading indicator
    if (initialLoading) {
        return <LoadingIndicator message="" />;
    }

    return (
        <div className="kpi-container">
            <h1 className="kpi-title">KPI Generator</h1>

            <form className="kpi-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <div className="input-label">
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Enter your prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>
                    <Spin spinning={generatingKPIs} indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}>
                        <button type="submit" className="submit-button" disabled={generatingKPIs}>
                            {generatingKPIs ? 'Generating...' : 'Generate KPIs'}
                        </button>
                    </Spin>
                </div>
            </form>
            {Object.keys(kpis)?.length > 0 && (
                <div className="kpi-message">
                    <p>Below are the suggested {Object.keys(kpis).length} KPIs based on the input data.</p>
                </div>
            )}

            {Object.keys(kpis)?.length > 0 && (
                <div className="kpi-grid">
                    {Object.entries(kpis).map(([key, kpi]) => (
                        <div
                            key={key}
                            className={`kpi-card ${selectedKpiNames.includes(kpi["KPI Name"]) ? 'selected' : ''}`}
                            onClick={() => handleCardClick(kpi)}
                        >
                            <div className="kpi-header">
                                {/* <div className="kpi-icon">
                                    <i className="fas fa-chart-line"></i>
                                </div> */}
                                <h3 className="kpi-name">{kpi["KPI Name"]}</h3>
                            </div>
                            <div className="kpi-details">
                                <div className="kpi-detail-row">
                                    <span className="detail-label">Column:</span>
                                    <span className="detail-value">
                                        {Array.isArray(kpi["Columns used"]) && kpi["Columns used"].length > 0
                                            ? kpi["Columns used"].join(', ')
                                            : (kpi.Column || kpi["Columns Used"] || "-")}
                                    </span>
                                </div>
                                <div className="kpi-detail-row">
                                    <span className="detail-label">Logic:</span>
                                    <span className="detail-value">{kpi.Logic}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedKpiImage.length > 0 && (
                <Collapse
                    activeKey={activeKeys}
                    onChange={setActiveKeys}
                >
                    {selectedKpiImage.map((item, index) => (
                        <Collapse.Panel
                            header={item.name}
                            key={item.name}
                            id={`kpi-panel-${item.name}`}
                        >
                            {item.loading ? (
                                <div className="loading-container">
                                    <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
                                </div>
                            ) : (
                                <>
                                    {/* Render Plotly chart if available */}
                                    {item?.plots && item.plots.data && item.plots.layout && (
                                        <div className="plot-container">
                                            <Plot
                                                data={item.plots.data}
                                                layout={{
                                                    ...item.plots.layout,
                                                    autosize: true,
                                                    margin: { l: 50, r: 50, t: 50, b: 50 }
                                                }}
                                                config={{ responsive: true }}
                                                style={{
                                                    width: '100%',
                                                    height: '60vh',
                                                    padding: '15px',
                                                    backgroundColor: '#ffffff',
                                                    borderRadius: '12px'
                                                }}
                                            />
                                        </div>
                                    )}

                                </>
                            )}
                        </Collapse.Panel>
                    ))}
                </Collapse>
            )}
        </div>
    );
};

export default Kpi;