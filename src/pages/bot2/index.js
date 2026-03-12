import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import Plot from 'react-plotly.js';
import Spinner from 'react-bootstrap/Spinner';
import { Spin, Collapse, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import Bot from '../bot';
import { API_URL } from '../../const';
import { LoadingIndicator } from '../../components/loader';
import { logAmplitudeEvent } from '../../utils';

const Bot2 = () => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(localStorage.getItem('fileName') || '');
  const [messageType, setMessageType] = useState('text');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialFileProcessing, setIsInitialFileProcessing] = useState(false);
  const [messages, setMessages] = useState([

  ]);
  const [recentChats, setRecentChats] = useState([]);
  const [visualizationData, setVisualizationData] = useState(null);

  const safeParseMaybeJson = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try {
      // Replace bare NaN with null to avoid JSON.parse errors if present
      const sanitized = value.replace(/\bNaN\b/g, 'null');
      return JSON.parse(sanitized);
    } catch (_) {
      return null;
    }
  };

  const parseResponseJsonTolerant = async (response) => {
    const raw = await response.text();
    try {
      return JSON.parse(raw);
    } catch (_) {
      try {
        const sanitized = raw.replace(/\bNaN\b/g, 'null');
        return JSON.parse(sanitized);
      } catch (e2) {
        throw e2;
      }
    }
  };

  const normalizeTableOutput = (textOutput) => {
    if (!textOutput) return null;
    let parsed = textOutput;
    if (typeof textOutput === 'string') {
      try {
        parsed = JSON.parse(textOutput);
      } catch (_) {
        return null;
      }
    }
    if (!parsed || typeof parsed !== 'object' || parsed.format !== 'table') return null;

    // prefer provided columns + data if valid
    let columns = Array.isArray(parsed.columns) ? parsed.columns : undefined;
    let data = undefined;

    if (Array.isArray(parsed.data)) {
      // data is an array of row objects
      data = parsed.data.map(row => (row && typeof row === 'object') ? row : {});
      if (!columns) {
        const columnSet = new Set();
        data.forEach(row => Object.keys(row).forEach(k => columnSet.add(k)));
        columns = Array.from(columnSet);
      }
    } else if (parsed.data && typeof parsed.data === 'object') {
      // data is an object of column -> array values
      const colNames = Object.keys(parsed.data);
      const maxLen = colNames.reduce((m, c) => Math.max(m, Array.isArray(parsed.data[c]) ? parsed.data[c].length : 0), 0);
      data = Array.from({ length: maxLen }, (_, i) => {
        const row = {};
        colNames.forEach(c => {
          const colArr = Array.isArray(parsed.data[c]) ? parsed.data[c] : [];
          row[c] = colArr[i];
        });
        return row;
      });
      columns = columns || colNames;
    }

    if (!columns || !Array.isArray(data)) return null;
    return { format: 'table', columns, data };
  };

  // Fetch and cache 'describe the data' response
  const fetchDescribeData = async (fileName = null) => {
    setIsInitialFileProcessing(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;
    try {
      const formData = new FormData();
      formData.append('prompt', 'explain about the data');
      const response = await fetch(`${API_URL}/genai_bot`, {
        method: 'POST',
        headers: {
          'X-User-ID': userId,
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await parseResponseJsonTolerant(response);
      // Cache the result and file name
      localStorage.setItem('describeDataCache', JSON.stringify(data));
      if (fileName) {
        localStorage.setItem('describeDataCacheFileName', fileName);
      }
      const tableOutput = normalizeTableOutput(data?.text_output);
      const parsedChartResponse = safeParseMaybeJson(data?.chart_response);
      const content = tableOutput ? "" : (parsedChartResponse ? "" : (typeof data?.text_output === 'string' ? data?.text_output : (data?.text_pre_code_response || data?.message)));
      setMessages(prev => [...prev, {
        type: 'bot',
        content,
        tableOutput,
        plotsData: parsedChartResponse || safeParseMaybeJson(data?.plot),
        code: data?.code || "Not Found",
        data: safeParseMaybeJson(data?.data) || ""
      }]);
    } catch (error) {
      console.error('Error processing initial file:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: 'File uploaded successfully! I encountered an issue describing the data, but you can ask me questions about it.',
        code: 'Not Found'
      }]);
    } finally {
      setIsInitialFileProcessing(false);
    }
  };

  // On mount, show 'describe the data' response (from cache or API)
  useEffect(() => {
    // Log Home Opened event on mount
    const fileName = typeof file === 'string' ? file : (file?.name || '');
    if (window && window.amplitude) {
      logAmplitudeEvent('Home Opened', { fileName });
    }
    const cached = localStorage.getItem('describeDataCache');
    const cachedFileName = localStorage.getItem('describeDataCacheFileName');
    console.log(file, cachedFileName, 'cached');
    const lastUploadedFileName = file ? file : null;
    if (cached && cachedFileName && lastUploadedFileName && cachedFileName === lastUploadedFileName) {
      try {
        const data = JSON.parse(cached);
        const tableOutput = normalizeTableOutput(data?.text_output);
        const parsedChartResponse = safeParseMaybeJson(data?.chart_response);
        const content = tableOutput ? "" : (parsedChartResponse ? "" : (typeof data?.text_output === 'string' ? data?.text_output : data?.text_pre_code_response));
        setMessages(prev => [...prev, {
          type: 'bot',
          content,
          tableOutput,
          plotsData: parsedChartResponse || safeParseMaybeJson(data?.plot),
          code: data?.code || "Not Found",
          data: safeParseMaybeJson(data?.data) || ""
        }]);
      } catch (e) {
        fetchDescribeData(lastUploadedFileName);
      }
    } else {
      fetchDescribeData(lastUploadedFileName);
    }
    // eslint-disable-next-line
  }, [file]);

  // Callback function to handle file upload completion
  const handleFileUploadComplete = async (uploadData) => {
    // Reset recent chats
    setRecentChats([]);
    // Invalidate cache and re-fetch with new file name
    if (file && file.name) {
      localStorage.removeItem('describeDataCache');
      localStorage.removeItem('describeDataCacheFileName');
      fetchDescribeData(file.name);
    } else {
      localStorage.removeItem('describeDataCache');
      localStorage.removeItem('describeDataCacheFileName');
      fetchDescribeData();
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Get user ID from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.id;

      try {
        const response = await fetch(`${API_URL}/file_upload`, {
          method: 'POST',
          headers: {
            'X-User-ID': userId,
          },
          body: formData,
        });
        const data = await response.json();
        console.log(data);
      } catch (error) {
        console.error('Error uploading file:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    const fileName = typeof file === 'string' ? file : (file?.name || '');
    // Log Query Asked event
    if (window && window.amplitude) {
      logAmplitudeEvent('Query Asked', { query: message, fileName });
    }
    setMessages(prev => [...prev, {
      type: 'user',
      content: message,
      question: true,
      isLoading: true
    }]);

    setIsLoading(true);
    const formData = new FormData();
    formData.append('prompt', message);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;

    try {
      setIsLoading(true);

      const endpoint = `${API_URL}/genai_bot`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-User-ID': userId,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await parseResponseJsonTolerant(response);
      const tableOutput = normalizeTableOutput(data?.text_output);
      const parsedChartResponse = safeParseMaybeJson(data?.chart_response);
      const content = tableOutput ? "" : (parsedChartResponse ? "" : (typeof data?.text_output === 'string' ? data?.text_output : data?.text_pre_code_response));
      setMessages(prev => prev.map(msg =>
        msg.isLoading ? { ...msg, isLoading: false } : msg
      ).concat([{
        type: 'bot',
        content,
        tableOutput,
        plotsData: parsedChartResponse || safeParseMaybeJson(data?.plot),
        code: data?.code || "Not Found",
        data: safeParseMaybeJson(data?.data) || ""
      }]));
      // Log Query Answered event
      if (window && window.amplitude) {
        logAmplitudeEvent('Query Answered', { query: message, answer: data?.text_output || data?.text_pre_code_response, fileName });
      }
      setRecentChats(prev => [...prev, { question: message, answer: data?.result }]);

      if (messageType === 'graph') {
        setVisualizationData(data?.chartData);
      }
    } catch (error) {
      console.error('Error:', error);

      setMessages(prev => prev.map(msg =>
        msg.isLoading ? { ...msg, isLoading: false } : msg
      ).concat([{
        type: 'bot',
        content: 'Sorry, there was an error processing your request.',
        messageType: 'text',
        code: 'Not Found'
      }]));
    } finally {
      setIsLoading(false); // Ensure loader stops in both success and failure cases
      setMessage('');
    }

  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const fileInputRef = useRef(null);


  const lastMessageRef = useRef(null);

  const scrollToLastMessage = () => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    scrollToLastMessage();
  }, [messages, isLoading]);


  return (
    <>
      <Bot onFileUploadComplete={handleFileUploadComplete} />
      {isInitialFileProcessing && (
        <LoadingIndicator message="Processing..." />
      )}
      <div className="chat-container">
        <div className="recent-chats">
          <h3>Recent Chats</h3>
          {recentChats.map((chat, index) => (
            <div key={index} className="recent-chat-item">
              <p><strong></strong> {chat.question}</p>
              {/* <p><strong>A:</strong> {chat.answer}</p> */}
            </div>
          ))}
        </div>
        <div className="chat-window">
          <div className="chat-messages">
            {(() => {
              const lastUserMessageIndex = messages.reduce((lastIndex, msg, index) => msg.type === 'user' ? index : lastIndex, -1);

              return messages?.map((msg, index) => {
                console.log(msg, 'msg')
                const isRefTarget = lastUserMessageIndex !== -1 ? index === lastUserMessageIndex : index === messages.length - 1;
                return (
                  <div
                    key={index}
                    ref={isRefTarget ? lastMessageRef : null}
                    style={{
                      display: "flex",
                      maxWidth: "100%",
                      flexDirection: "column",
                      gap: "10px",
                      alignItems: msg.question ? "flex-start" : "flex-end", // Align right for questions
                    }}
                  >
                    <div
                      className={`${msg.type}-message`}
                      style={{
                        display: "flex",
                        width: msg.question ? "fit-content" : "100%", // 50% for questions, 100% for answers
                        flexDirection: "column",
                        gap: "10px",
                        maxWidth: "100%",
                        alignSelf: msg.question ? "flex-end" : "flex-start",
                        alignItems: msg.question ? "flex-end" : "flex-start", // Align content accordingly
                      }}
                    >
                      {msg?.content ? (
                        msg.type === "bot" ? (
                          <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                        ) : (
                          msg.content
                        )
                      ) : null}
                      {msg?.tableOutput && (
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                          <table className="modern-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, backgroundColor: '#fff' }}>
                            <thead>
                              <tr>
                                {msg.tableOutput.columns?.map((col) => (
                                  <th key={col} style={{ backgroundColor: '#f8fafc', padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1a237e', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(msg.tableOutput.data) && msg.tableOutput.data.map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                  {msg.tableOutput.columns?.map((col) => (
                                    <td key={col} style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#4a5568' }}>
                                      {(row[col] === null || row[col] === undefined || (typeof row[col] === 'number' && Number.isNaN(row[col])) || row[col] === 'NaN') ? 'N/A' : String(row[col])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {(msg?.code && msg?.code !== "Not Found") && (
                        <Collapse>
                          <Collapse.Panel header="Code" key="msg-code">
                            <div key={'text'} className="code-block-container">
                              <button
                                className="copy-button"
                              // onClick={() => handleCopyCode(msg.code)}
                              >
                                <CopyOutlined /> Copy
                              </button>
                              <pre className="code-block">
                                <code>{msg.code}</code>
                              </pre>
                            </div>
                          </Collapse.Panel>
                        </Collapse>
                      )}

                      {msg?.plotsData && (
                        <Plot
                          data={msg?.plotsData?.data}
                          layout={msg?.plotsData?.layout}
                          config={{ responsive: true }}
                          style={{
                            width: "100%",
                            height: "60vh",
                            padding: "15px",
                            backgroundColor: "#ffffff",
                            borderRadius: "12px",
                          }}
                          className="plot-container"
                        />
                      )}

                      {msg?.data && (
                        <div style={{ padding: '16px' }}>
                          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Forecast Data</h2>
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              border: '1px solid #ccc',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                              borderRadius: '8px',
                              overflow: 'hidden',
                            }}
                          >
                            <thead style={{ backgroundColor: '#f5f5f5' }}>
                              <tr>
                                <th style={{
                                  padding: '12px',
                                  textAlign: 'left',
                                  color: '#444',
                                  fontWeight: '500',
                                  textTransform: 'capitalize',
                                  borderBottom: '1px solid #ccc',
                                }}>Date</th>
                                <th style={{
                                  padding: '12px',
                                  textAlign: 'left',
                                  color: '#444',
                                  fontWeight: '500',
                                  textTransform: 'capitalize',
                                  borderBottom: '1px solid #ccc',
                                }}>Forecasted Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.keys(msg.data.date).map((key) => (
                                <tr
                                  key={key}
                                  style={{
                                    borderTop: '1px solid #e0e0e0',
                                    backgroundColor: key % 2 === 0 ? '#fff' : '#f9f9f9',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f1f1')}
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor = key % 2 === 0 ? '#fff' : '#f9f9f9')
                                  }
                                >
                                  <td style={{ padding: '12px' }}>{msg.data.date[key]}</td>
                                  <td style={{ padding: '12px' }}>{msg.data.forecasted_value[key]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}


                    </div>
                    {msg.isLoading && (
                      <div className="spinner-container">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </Spinner>
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>

          <form onSubmit={handleSubmit} className="chat-input-form">
            <div className="input-container">
              {/* <FaPaperclip className="upload-icon" onClick={handleIconClick} /> */}
              <input
                type="text"
                className="chat-input"
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask something..."
              />
              <input
                type="file"
                className="file-input"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
              />
            </div>
            <button type="submit" className="send-button" disabled={isLoading}>
              {isLoading ? (
                <Spinner
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
              ) : (
                'Send'
              )}
            </button>
          </form>
          {/* {file && (
            <div className="file-name">
              Selected file: {file.name}
            </div>
          )} */}
        </div>
      </div>
    </>
  );
};

export default Bot2;