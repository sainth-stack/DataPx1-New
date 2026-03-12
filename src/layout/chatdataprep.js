// MiddleContent.js

import { Box, CircularProgress, IconButton } from "@mui/material"
import TextField from '@mui/material/TextField';
import { useEffect, useState, useRef } from "react";
import axios from "axios";
// import '../../../../genAi/Main.css'
import { InputAdornment } from '@mui/material';
import { IoMdClose, IoMdSend } from 'react-icons/io';
import AnswersChat2 from "./answers";
import { API_URL } from "../const";
import botLogo from "../assets/images/botlogo.png";
const ChatDataPrep = ({ showModel, setShowModel }) => {
  const [search, setSearch] = useState('')
  const [answers, setAnswers] = useState([]);
  const lastMessageRef = useRef(null);

  const scrollToLastMessage = () => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    scrollToLastMessage();
  }, [answers]);

  const safeParseMaybeJson = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try {
      const sanitized = value.replace(/\bNaN\b/g, 'null');
      return JSON.parse(sanitized);
    } catch (_) {
      return null;
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

    let columns = Array.isArray(parsed.columns) ? parsed.columns : undefined;
    let data = undefined;

    if (Array.isArray(parsed.data)) {
      data = parsed.data.map(row => (row && typeof row === 'object') ? row : {});
      if (!columns) {
        const setCols = new Set();
        data.forEach(r => Object.keys(r).forEach(k => setCols.add(k)));
        columns = Array.from(setCols);
      }
    } else if (parsed.data && typeof parsed.data === 'object') {
      const colNames = Object.keys(parsed.data);
      const maxLen = colNames.reduce((m, c) => Math.max(m, Array.isArray(parsed.data[c]) ? parsed.data[c].length : 0), 0);
      data = Array.from({ length: maxLen }, (_, i) => {
        const row = {};
        colNames.forEach(c => {
          const arr = Array.isArray(parsed.data[c]) ? parsed.data[c] : [];
          row[c] = arr[i];
        });
        return row;
      });
      columns = columns || colNames;
    }

    if (!columns || !Array.isArray(data)) return null;
    return { format: 'table', columns, data };
  };

  const handleSubmit = () => {
    if (search.trim()) {
      handleQuestionClick(search);
      setSearch("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleGetAnswer = async (question, data) => {
    var formData = new FormData();
    formData.append('prompt', question);
    const isVisualizationsPage = window.location.pathname === '/visualizations';
    const endpoint = `${API_URL}${isVisualizationsPage ? '/get_plot_insights' : '/genai_bot'}`;

    // Get user ID from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;

    try {
      const res = await axios.post(
        `${endpoint}`,
        formData,
        {
          headers: {
            'X-User-ID': userId,
          }
        }
      );
      const ans = data.map((item) => {
        if (item.question === question) {
          const responseData = safeParseMaybeJson(res?.data) || {};
          console.log('API Response:', responseData);
          console.log('text_output:', responseData.text_output);

          const tableOutput = normalizeTableOutput(responseData.text_output);
          console.log('Normalized table output:', tableOutput);

          const parsedChartResponse = safeParseMaybeJson(responseData.chart_response);
          const graphObj = parsedChartResponse || safeParseMaybeJson(responseData.plot);

          const tableHtml = (responseData.text_output && typeof responseData.text_output === 'object' && typeof responseData.text_output?.html === 'string') ? responseData.text_output?.html : null;
          console.log('Table HTML:', tableHtml);

          const content = tableOutput ? "" : (parsedChartResponse ? "" : (typeof responseData.text_output === 'string' ? responseData.text_output : (responseData.text_pre_code_response)));
          console.log('Content:', content);
          console.log('Final item:', { tableOutput, tableHtml, content, graphObj });

          return {
            ...item,
            view: "Text",
            answer: content,
            tableOutput,
            tableHtml,
            graph: graphObj,
            loading: false,
            isHtml: true // Add flag to indicate HTML content
          }
        } else return item;
      })
      console.log(ans)
      setAnswers(ans)
    } catch (err) {
      const ans = data.map((item) => {
        if (item.question === question) {
          return {
            ...item,
            answer: "No Data found",
            loading: false,
            isHtml: false
          }
        } else return item;
      })
      setAnswers(ans)
    }
  }

  const handleQuestionClick = async (question) => {
    const data = [...answers, { question, answer: "", loading: true }]
    setAnswers(data);
    handleGetAnswer(question, data)
  };

  return (
    showModel && (
      <Box
        title=""
        sx={{
          position: "fixed",
          top: "64%",
          right: "1rem",
          transform: "translateY(-50%)",
          width: "700px",
          height: "70vh",
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.15)",
          overflow: "hidden",
          zIndex: 1300,
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <Box sx={{
          padding: "16px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <img 
              src={botLogo} 
              alt="Vector Bot" 
              style={{ 
                width: "90px", 
                height: "40px", 
                objectFit: "contain" 
              }} 
            />
            {/* <span style={{ fontWeight: 600 }}>Vector</span> */}
          </Box>
          <IconButton
            onClick={() => setShowModel(false)}
            sx={{ color: "#666" }}
          >
            <IoMdClose size={20} />
          </IconButton>
        </Box>

        {/* Chat Messages Area */}
        <Box sx={{
          flex: 1,
          overflow: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          {answers?.map((item, index) => (
            <div key={index}
              ref={index === answers.length - 1 ? lastMessageRef : null}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
              {/* User Message */}
              <Box sx={{
                alignSelf: "flex-end",
                maxWidth: "80%",
                backgroundColor: "#f0f0f0",
                padding: "12px",
                borderRadius: "12px 12px 0 12px",
              }}>
                {item.question}
              </Box>

              {/* AI Response */}
              <Box sx={{
                alignSelf: "flex-start",
                maxWidth: item?.graph ? "100%" : "80%",
                backgroundColor: "#fff",
                padding: item.graph ? "0" : "12px",
                width: item?.graph ? "100%" : "80%",
                borderRadius: "12px 12px 12px 0",
                boxShadow: item.graph ? "none" : "0 2px 4px rgba(0,0,0,0.1)",
              }}>
                {item.loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <>
                    {item.tableOutput && item.tableOutput.columns && item.tableOutput.columns.length > 0 ? (
                      <div style={{ width: '100%', overflowX: 'auto' }}>
                        <table className="modern-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, backgroundColor: '#fff' }}>
                          <thead>
                            <tr>
                              {item.tableOutput.columns?.map((col) => (
                                <th key={col} style={{ backgroundColor: '#f8fafc', padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1a237e', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(item.tableOutput.data) && item.tableOutput.data.map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                {item.tableOutput.columns?.map((col) => (
                                  <td key={col} style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#4a5568' }}>
                                    {(row[col] === null || row[col] === undefined || (typeof row[col] === 'number' && Number.isNaN(row[col])) || row[col] === 'NaN') ? 'N/A' : String(row[col])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : item.tableHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: item.tableHtml }}
                        style={{
                          overflow: 'auto',
                          maxHeight: '500px'
                        }}
                      />
                    ) : item.answer && item.isHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: item.answer }}
                        style={{
                          overflow: 'auto',
                          maxHeight: '500px',
                          '& table': {
                            borderCollapse: 'collapse',
                            width: '100%',
                            marginBottom: '1rem'
                          },
                          '& th, & td': {
                            border: '1px solid #ddd',
                            padding: '8px',
                            textAlign: 'left'
                          },
                          '& th': {
                            backgroundColor: '#f5f5f5'
                          }
                        }}
                      />
                    ) : (
                      <div>{item.answer}</div>
                    )}
                    {item.graph && (
                      <AnswersChat2
                        question={item.question}
                        answer={item.answer}
                        graph={item.graph}
                        loading={false}
                        type={item.view}
                        name={"genbi"}
                      />
                    )}
                  </>
                )}
              </Box>
            </div>
          ))}
        </Box>

        {/* Input Area */}
        <Box sx={{
          padding: "16px",
          borderTop: "1px solid #e0e0e0",
          backgroundColor: "#fff"
        }}>
          <TextField
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "24px",
                backgroundColor: "#f5f5f5",
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSubmit}
                    sx={{
                      color: search ? "primary.main" : "#bbb"
                    }}
                  >
                    <IoMdSend />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>
    )
  );
}

export default ChatDataPrep;
