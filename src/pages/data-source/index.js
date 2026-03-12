import React, { useEffect, useState, useRef } from "react";
import { API_URL } from "../../const";
import axios from "axios";
import { CircularProgress } from '@mui/material';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import { useNavigate } from "react-router-dom";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { Box, Typography, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { logAmplitudeEvent } from '../../utils';
import { LoadingIndicator } from '../../components/loader';

const thumbnail = require('../../assets/images/dataThumbnail.jpeg');

export default function DataSource() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'uploading' | 'processing' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [showFileExistsModal, setShowFileExistsModal] = useState(false);
  const [duplicateFiles, setDuplicateFiles] = useState([]);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [deletingFile, setDeletingFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileDescriptions, setFileDescriptions] = useState({}); // { fileName: desc }
  const [showDescModal, setShowDescModal] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState([]); // Files waiting for desc

  // New states for pagination and view all modal
  const [showViewAllModal, setShowViewAllModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFiles, setFilteredFiles] = useState([]);

  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameFile, setRenameFile] = useState(null);
  const [renameNewName, setRenameNewName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // Info modal state (file metadata - supports multiple merged files)
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoMetadata, setInfoMetadata] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);

  // Stable sorted files - sorted once on load, doesn't change during selection
  const [stableSortedFiles, setStableSortedFiles] = useState([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedFilesLoaded, setSelectedFilesLoaded] = useState(false);

  const ITEMS_PER_PAGE = 5;

  const userObj = localStorage.getItem('user');
  const userId = userObj ? JSON.parse(userObj).id : null;

  // Create initial sorted list when both files and selectedFiles are loaded
  useEffect(() => {
    console.log('Sorting effect triggered with:', {
      filesLength: files.length,
      selectedFilesLoaded,
      initialLoadComplete,
      selectedFilesLength: selectedFiles.length
    });

    // Only run this once when both API calls have completed
    if (files.length > 0 && selectedFilesLoaded && !initialLoadComplete) {
      console.log('✅ CONDITIONS MET - Creating initial sorted files with:');
      console.log('Files:', files);
      console.log('Selected files:', selectedFiles);
      console.log('selectedFilesLoaded:', selectedFilesLoaded);

      const sortedFiles = [...files].sort((a, b) => {
        const aSelected = selectedFiles.includes(a);
        const bSelected = selectedFiles.includes(b);

        // Selected files come first
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

        // Within same selection status, maintain original order
        return files.indexOf(a) - files.indexOf(b);
      });

      console.log('✅ Initial sorted files:', sortedFiles);
      setStableSortedFiles(sortedFiles);
      setInitialLoadComplete(true);
    } else {
      console.log('❌ CONDITIONS NOT MET - Skipping sort');
    }
  }, [files, selectedFiles, selectedFilesLoaded, initialLoadComplete]);

  // Reset when files are refreshed
  useEffect(() => {
    if (files.length === 0) {
      setInitialLoadComplete(false);
      setSelectedFilesLoaded(false);
      setStableSortedFiles([]);
    }
  }, [files]);

  // Filter files based on search term - use stable sorted files
  useEffect(() => {
    if (searchTerm) {
      setFilteredFiles(stableSortedFiles.filter(file =>
        file.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredFiles(stableSortedFiles);
    }
  }, [stableSortedFiles, searchTerm]);

  // Fetch S3 files
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const userObj = localStorage.getItem('user');
      const userId = userObj ? JSON.parse(userObj).id : null;
      const res = await axios.get(`${API_URL}/get_user_files/`, {
        headers: { 'X-User-ID': userId },
      });
      console.log('Loaded files from API:', res.data.available_files);
      setFiles(res.data.available_files || []);
      // Reset the initial load flag so files get re-sorted with current selections
      setInitialLoadComplete(false);
    } catch (e) {
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's selected files
  const fetchUserSelectedFiles = async () => {
    try {
      const userObj = localStorage.getItem('user');
      const userId = userObj ? JSON.parse(userObj).id : null;
      console.log('Fetching user selected files for userId:', userId);
      const response = await axios.get(`${API_URL}/get_user_selected_file_name`, {
        headers: { 'X-User-ID': userId },
      });
      console.log('Response status:', response.status);

      const data = response.data;
      console.log('Raw response data:', data);
      if (data && Array.isArray(data.file_name)) {
        console.log('Setting selected files to:', data.file_name);
        setSelectedFiles(data.file_name);
      } else {
        console.log('No selected files data or invalid format:', data);
        setSelectedFiles([]);
      }
      setSelectedFilesLoaded(true);
      console.log('selectedFilesLoaded set to true');
    } catch (error) {
      console.log('Error fetching selected files:', error);
      setSelectedFiles([]);
      setSelectedFilesLoaded(true);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchUserSelectedFiles();
  }, []);

  // Debug: Log when selectedFiles changes
  useEffect(() => {
    console.log('selectedFiles state changed to:', selectedFiles);
  }, [selectedFiles]);

  // Debug: Log when selectedFilesLoaded changes
  useEffect(() => {
    console.log('selectedFilesLoaded changed to:', selectedFilesLoaded);
  }, [selectedFilesLoaded]);

  // Fire Data Source Opened event with all file names when files are loaded
  useEffect(() => {
    if (stableSortedFiles.length > 0 && window && window.amplitude) {
      logAmplitudeEvent('Data Source Opened', { data: stableSortedFiles });
      console.log('[Amplitude] Data Source Opened event sent', stableSortedFiles);
    }
  }, [stableSortedFiles]);

  const checkFilesExist = async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('file_name', file.name);
    });
    const response = await axios.post(`${API_URL}/check_input_file_s3/`, formData, {
      headers: { 'X-User-ID': userId },
    });
    return response.data.files_status || {};
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    setIsUploading(true);

    const statuses = await checkFilesExist(selectedFiles);
    const duplicates = selectedFiles.filter(file => statuses[file.name] && statuses[file.name].status);

    if (duplicates.length > 0) {
      setDuplicateFiles(
        duplicates.map(file => ({
          originalFile: file,
          action: 'replace',
          newName: file.name,
        }))
      );
      setShowFileExistsModal(true);
      setIsUploading(false);
      return;
    }

    // Instead of uploading directly, show description modal
    setPendingUploadFiles(selectedFiles);
    setShowDescModal(true);
    setIsUploading(false);
  };

  const handleDuplicateActionChange = (idx, action) => {
    setDuplicateFiles(prev => prev.map((item, i) => i === idx ? { ...item, action } : item));
  };

  const handleDuplicateNameChange = (idx, newName) => {
    setDuplicateFiles(prev => prev.map((item, i) => i === idx ? { ...item, newName } : item));
  };

  const handleConfirmDuplicates = async () => {
    setReplaceLoading(true);
    const filesToUpload = duplicateFiles.map(item => {
      if (item.action === 'rename' && item.newName !== item.originalFile.name) {
        return new File([item.originalFile], item.newName, { type: item.originalFile.type });
      }
      return item.originalFile;
    });
    // Instead of uploading directly, show description modal for these files
    setPendingUploadFiles(filesToUpload);
    setShowFileExistsModal(false);
    setShowDescModal(true);
    setReplaceLoading(false);
  };

  const handleModalClose = () => {
    setShowFileExistsModal(false);
    setDuplicateFiles([]);
    setReplaceLoading(false);
  };

  const uploadFiles = async (files, fileDescriptions = {}) => {
    setIsUploading(true);
    setUploadStatus('uploading');
    const formData = new FormData();
    files.forEach(file => {
      formData.append('file', file);
    });
    // Add file_name_desc as JSON string
    if (Object.keys(fileDescriptions).length > 0) {
      formData.append('file_name_desc', JSON.stringify(
        Object.fromEntries(files.map(f => [f.name, fileDescriptions[f.name] || '']))
      ));
    }
    try {
      await axios.post(`${API_URL}/file_upload/`, formData, {
        headers: { 'X-User-ID': userId },
      });
      toast.success('Files uploaded successfully!');
      logAmplitudeEvent('File Upload', { userId, fileCount: files.length, fileNames: files.map(f => f.name) });
      console.log('[Amplitude] File Upload event sent', files.map(f => f.name));

      // Call process_file API after successful upload
      setUploadStatus('processing');
      try {
        const processResponse = await axios.get(`${API_URL}/process_file`, {
          headers: { 'X-User-ID': userId },
        });
        console.log('process_file response:', processResponse.data);
      } catch (processError) {
        console.warn('process_file API call error:', processError);
      }

      fetchFiles();
      setShowFileExistsModal(false);
      setDuplicateFiles([]);
      setReplaceLoading(false);
    } catch (error) {
      toast.error('Failed to upload files. Please try again.');
      logAmplitudeEvent('File Upload Failure', { userId, error: error?.message });
      console.warn('[Amplitude] File Upload Failure event sent', error?.message);
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
      setReplaceLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleDelete = async (fileName, e) => {
    e.stopPropagation();
    setDeletingFile(fileName);
    try {
      const userObj = localStorage.getItem('user');
      const userId = userObj ? JSON.parse(userObj).id : null;
      const formData = new FormData();
      formData.append('file_name', fileName);
      const response = await axios.post(`${API_URL}/delete_file/`, formData, {
        headers: { 'X-User-ID': userId },
      });
      const data = response.data;
      if (data.status) {
        toast.success('File deleted successfully!');
        logAmplitudeEvent('File Delete', { userId, fileName });
        console.log('[Amplitude] File Delete event sent', fileName);
        fetchFiles();
        if (selectedFile === fileName) {
          setSelectedFile(null);
          localStorage.removeItem('fileName');
        }
        // Remove from selected files if it was selected
        setSelectedFiles(prev => prev.filter(f => f !== fileName));
      } else {
        toast.error(data.message || 'Failed to delete file.');
        logAmplitudeEvent('File Delete Failure', { userId, fileName, error: data.message });
        console.warn('[Amplitude] File Delete Failure event sent', fileName, data.message);
      }
    } catch (error) {
      toast.error('Failed to delete file. Please try again.');
      logAmplitudeEvent('File Delete Failure', { userId, fileName, error: error?.message });
      console.warn('[Amplitude] File Delete Failure event sent', fileName, error?.message);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleFileCardClick = (fileName) => {
    setSelectedFiles(prev =>
      prev.includes(fileName)
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
  };

  const handleSubmitSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file.');
      return;
    }
    setIsSubmitting(true);
    try {
      const validSelectedFiles = selectedFiles.filter(fileName => stableSortedFiles.includes(fileName));

      if (validSelectedFiles.length === 0) {
        toast.error('None of the selected files exist anymore. Please select available files.');
        return;
      }

      // Log Amplitude event for submit
      if (window && window.amplitude) {
        logAmplitudeEvent('Data Source Submit', { data: validSelectedFiles });
        console.log('[Amplitude] Data Source Submit event sent', validSelectedFiles);
      }
      const userObj = localStorage.getItem('user');
      const userId = userObj ? JSON.parse(userObj).id : null;
      const formData = new FormData();
      validSelectedFiles.forEach(fileName => {
        formData.append('file_name', fileName);
      });
      await axios.post(`${API_URL}/update_user_file_name`, formData, {
        headers: {
          'X-User-ID': userId,
        },
      });
      toast.success('Files selected!');
      localStorage.setItem('fileName', JSON.stringify(validSelectedFiles));

      // Call download_selected_data API after successful file selection
      try {
        const downloadResponse = await axios.get(`${API_URL}/download_selected_data`, {
          headers: { 'X-User-ID': userId },
        });
        console.log('download_selected_data response:', downloadResponse.data);
      } catch (downloadError) {
        console.warn('download_selected_data API call error:', downloadError);
      }

      navigate('/');
    } catch (error) {
      toast.error('Failed to select files. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get displayed files (first 5 for main view) - use stable sorted files
  const displayedFiles = stableSortedFiles.slice(0, ITEMS_PER_PAGE);
  const hasMoreFiles = stableSortedFiles.length > ITEMS_PER_PAGE;

  // Debug: Log what's being displayed
  console.log('📊 RENDER STATE:', {
    stableSortedFiles: stableSortedFiles.slice(0, 3), // First 3 only to avoid spam
    displayedFiles: displayedFiles.slice(0, 3),
    selectedFiles: selectedFiles.slice(0, 3)
  });

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
  };

  // Handle view all modal close
  const handleViewAllClose = () => {
    setShowViewAllModal(false);
    setSearchTerm('');
  };

  // Description Modal Handlers
  const handleDescChange = (fileName, value) => {
    setFileDescriptions(prev => ({ ...prev, [fileName]: value }));
  };

  const handleDescModalClose = () => {
    setShowDescModal(false);
    setPendingUploadFiles([]);
    setFileDescriptions({});
  };

  const handleDescModalSubmit = async () => {
    // Validate all descriptions are filled
    const missing = pendingUploadFiles.some(f => !fileDescriptions[f.name]?.trim());
    if (missing) {
      toast.error('Please enter a description for all files.');
      return;
    }
    // Close modal so user sees upload card with "Uploading File" / "Processing File"
    setShowDescModal(false);
    setPendingUploadFiles([]);
    const descs = { ...fileDescriptions };
    setFileDescriptions({});
    await uploadFiles(pendingUploadFiles, descs);
  };

  // Rename: open modal with prefilled name
  const handleRenameClick = (fileName, e) => {
    e.stopPropagation();
    setRenameFile(fileName);
    setRenameNewName(fileName);
    setShowRenameModal(true);
  };

  const handleRenameModalClose = () => {
    setShowRenameModal(false);
    setRenameFile(null);
    setRenameNewName('');
  };

  const handleRenameSave = async () => {
    if (!renameFile || !renameNewName?.trim() || renameNewName.trim() === renameFile) {
      if (renameNewName?.trim() === renameFile) {
        handleRenameModalClose();
      }
      return;
    }
    setRenameLoading(true);
    try {
      const userObj = localStorage.getItem('user');
      const userId = userObj ? JSON.parse(userObj).id : null;
      const formData = new FormData();
      formData.append('old_name', renameFile);
      formData.append('new_name', renameNewName.trim());
      const response = await axios.post(`${API_URL}/rename_file/`, formData, {
        headers: { 'X-User-ID': userId },
      });
      if (response.data?.status !== false) {
        toast.success('File renamed successfully!');
        handleRenameModalClose();
        fetchFiles();
        setSelectedFiles(prev =>
          prev.includes(renameFile)
            ? prev.map(f => (f === renameFile ? renameNewName.trim() : f))
            : prev
        );
      } else {
        toast.error(response.data?.message || 'Failed to rename file.');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to rename file. Please try again.');
    } finally {
      setRenameLoading(false);
    }
  };

  // Info: fetch metadata via get_file_meta_data (supports multiple merged files)
  const handleInfoClick = async (fileName, e) => {
    e.stopPropagation();
    setShowInfoModal(true);
    setInfoMetadata(null);
    setInfoLoading(true);
    try {
      const userObj = localStorage.getItem('user');
      const userId = userObj ? JSON.parse(userObj).id : null;
      const formData = new FormData();
      formData.append('table', fileName);
      const response = await axios.post(`${API_URL}/get_file_meta_data/`, formData, {
        headers: { 'X-User-ID': userId },
      });
      const data = response.data;
      // API returns { status, metadata: { table_name, files: { "file.csv": { file_name, rows, created_at, last_updated_at } } } }
      if (data?.status && data?.metadata?.files) {
        setInfoMetadata(data.metadata.files);
      } else if (data && typeof data === 'object' && !data.metadata) {
        // Legacy: flat object with file keys
        setInfoMetadata(data);
      } else {
        setInfoMetadata({ [fileName]: data });
      }
    } catch (error) {
      toast.error('Failed to fetch file info.');
      setInfoMetadata(null);
    } finally {
      setInfoLoading(false);
    }
  };

  const handleInfoModalClose = () => {
    setShowInfoModal(false);
    setInfoMetadata(null);
  };

  return (
    <div className="data-source-container">
      {isUploading && (
        <LoadingIndicator
          message={uploadStatus === 'processing' ? 'Processing File' : 'Uploading File'}
        />
      )}
      <ToastContainer />

      {/* File Exists Modal */}
      <Dialog open={showFileExistsModal} onClose={handleModalClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningAmberIcon color="warning" />
            <span>Duplicate Files Detected</span>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            The following files already exist. For each, choose to <b>replace</b> the existing file or <b>rename</b> your upload.
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {duplicateFiles.map((item, idx) => (
              <Paper
                key={item.originalFile.name}
                elevation={2}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: item.action === 'rename' ? '2px solid #1976d2' : '1px solid #eee',
                  background: item.action === 'rename' ? '#f0f7ff' : '#fafbfc',
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <FileCopyIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    {item.originalFile.name}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <ToggleButtonGroup
                    value={item.action}
                    exclusive
                    onChange={(_, value) => value && handleDuplicateActionChange(idx, value)}
                    size="small"
                    sx={{ mr: 2 }}
                  >
                    <ToggleButton value="replace" disabled={replaceLoading}>
                      Replace
                    </ToggleButton>
                    <ToggleButton value="rename" disabled={replaceLoading}>
                      <DriveFileRenameOutlineIcon style={{ marginRight: 4, fontSize: 18 }} />
                      Rename
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <TextField
                    label="New file name"
                    value={item.newName}
                    onChange={e => handleDuplicateNameChange(idx, e.target.value)}
                    size="small"
                    margin="dense"
                    disabled={replaceLoading || item.action !== 'rename'}
                    sx={{ minWidth: 220 }}
                    error={item.action === 'rename' && !item.newName}
                    helperText={item.action === 'rename' && !item.newName ? 'Enter a new file name' : ' '}
                  />
                </Box>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleModalClose} disabled={replaceLoading}>Cancel</Button>
          <Button
            onClick={handleConfirmDuplicates}
            disabled={replaceLoading || duplicateFiles.some(item => item.action === 'rename' && !item.newName)}
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* View All Modal */}
      <Dialog
        open={showViewAllModal}
        onClose={handleViewAllClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh',
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          py: 3
        }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight={600}>
              All Files ({stableSortedFiles.length})
            </Typography>
            <Button
              onClick={handleViewAllClose}
              sx={{
                color: 'white',
                minWidth: 'auto',
                p: 1,
                borderRadius: '50%',
                '&:hover': { background: 'rgba(255,255,255,0.1)' }
              }}
            >
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Search Bar */}
          <Box sx={{
            p: 3,
            borderBottom: '1px solid #e0e0e0',
            background: '#fafafa'
          }}>
            <Box position="relative">
              <TextField
                fullWidth
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
                size="medium"
                InputProps={{
                  startAdornment: <SearchIcon style={{ marginRight: 12, color: '#666' }} />,
                  endAdornment: searchTerm && (
                    <Button
                      onClick={clearSearch}
                      sx={{
                        minWidth: 'auto',
                        p: 0.5,
                        color: '#666',
                        '&:hover': { background: 'rgba(0,0,0,0.04)' }
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </Button>
                  ),
                  sx: {
                    borderRadius: 2,
                    background: 'white',
                    '& fieldset': { borderColor: '#e0e0e0' },
                    '&:hover fieldset': { borderColor: '#667eea' },
                    '&.Mui-focused fieldset': { borderColor: '#667eea' }
                  }
                }}
              />
            </Box>
            {selectedFiles.length > 0 && (
              <Box mt={2}>
                <Typography variant="body2" color="primary" fontWeight={500}>
                  {selectedFiles.length} file(s) selected
                </Typography>
              </Box>
            )}
          </Box>

          {/* Files Grid in Modal */}
          <Box sx={{
            flex: 1,
            overflow: 'auto',
            p: 3,
            background: '#f8f9fa'
          }}>
            {filteredFiles.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="300px"
                sx={{ color: '#666' }}
              >
                <SearchIcon style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.3 }} />
                <Typography variant="h6" gutterBottom>
                  {searchTerm ? 'No files found' : 'No files available'}
                </Typography>
                <Typography variant="body2">
                  {searchTerm ? 'Try adjusting your search terms' : 'Upload some files to get started'}
                </Typography>
              </Box>
            ) : (
              <div className="modal-file-grid">
                {filteredFiles.map((file, idx) => (
                  <div
                    className={`modal-file-card ${selectedFiles.includes(file) ? 'selected' : ''}`}
                    key={file}
                    onClick={() => handleFileCardClick(file)}
                  >
                    {selectedFiles.includes(file) && (
                      <div className="selected-indicator">
                        <CheckIcon className="check-icon" />
                      </div>
                    )}
                    <div className="modal-thumbnail-wrapper">
                      <img src={thumbnail} alt="thumbnail" className="modal-file-thumbnail" />
                    </div>
                    <div className="modal-file-name" title={file}>{file}</div>
                    <div className="modal-file-card-actions">
                      <InfoOutlinedIcon
                        className="modal-card-action-icon modal-info-icon"
                        titleAccess="File info"
                        onClick={e => handleInfoClick(file, e)}
                      />
                      <DriveFileRenameOutlineIcon
                        className="modal-card-action-icon modal-edit-icon"
                        titleAccess="Rename file"
                        onClick={e => handleRenameClick(file, e)}
                      />
                      {deletingFile === file ? (
                        <CircularProgress size={18} className="modal-delete-icon loading" />
                      ) : (
                        <DeleteOutlineIcon
                          className="modal-card-action-icon modal-delete-icon"
                          titleAccess="Delete file"
                          onClick={e => handleDelete(file, e)}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{
          p: 3,
          borderTop: '1px solid #e0e0e0',
          background: '#fafafa',
          gap: 2
        }}>
          <Button onClick={handleViewAllClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await handleSubmitSelectedFiles();
              setShowViewAllModal(false);
            }}
            disabled={selectedFiles.length === 0 || isSubmitting}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            {isSubmitting ? (
              <>
                <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                Submitting...
              </>
            ) : (
              `Submit Selected (${selectedFiles.length})`
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Description Modal */}
      <Dialog open={showDescModal} onClose={handleDescModalClose} maxWidth="sm" fullWidth>
        <DialogTitle>File Descriptions</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please enter a description for each file you are uploading:
          </Typography>
          {pendingUploadFiles.map(file => (
            <Box key={file.name} sx={{ mb: 2 }}>
              <Typography variant="subtitle2">{file.name}</Typography>
              <TextField
                fullWidth
                multiline
                minRows={2}
                value={fileDescriptions[file.name] || ''}
                onChange={e => handleDescChange(file.name, e.target.value)}
                placeholder="Enter description"
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDescModalClose}>Cancel</Button>
          <Button onClick={handleDescModalSubmit} variant="contained">Upload</Button>
        </DialogActions>
      </Dialog>

      {/* Rename Modal */}
      <Dialog
        open={showRenameModal}
        onClose={handleRenameModalClose}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' } }
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            m: 0,
            py: 2,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: '1.125rem',
            color: '#1e293b',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.1) 100%)'
              }}
            >
              <DriveFileRenameOutlineIcon sx={{ color: '#667eea', fontSize: 22 }} />
            </Box>
            <span>Rename File</span>
          </Box>
          <Button
            onClick={handleRenameModalClose}
            sx={{
              minWidth: 32,
              height: 32,
              p: 0,
              color: '#64748b',
              borderRadius: '50%',
              '&:hover': { background: '#f1f5f9', color: '#1e293b' }
            }}
          >
            <CloseIcon fontSize="small" />
          </Button>
        </DialogTitle>
        <DialogContent sx={{ py: 3, px: 3, mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b', mb: 1 }}>
            New file name
          </Typography>
          <TextField
            fullWidth
            value={renameNewName}
            onChange={e => setRenameNewName(e.target.value)}
            disabled={renameLoading}
            placeholder="Enter new name"
            variant="outlined"
            autoFocus
            inputProps={{ autoComplete: 'off' }}
            sx={{
              '& .MuiOutlinedInput-input': { fontSize: '1rem' },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#f8fafc',
                '& fieldset': { borderColor: '#e2e8f0' },
                '&:hover fieldset': { borderColor: '#94a3b8' },
                '&.Mui-focused fieldset': { borderColor: '#667eea', borderWidth: 2 }
              }
            }}
          />
        </DialogContent>
        <DialogActions
          sx={{
            py: 2,
            px: 3,
            gap: 1.5,
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#fafbfc'
          }}
        >
          <Button
            onClick={handleRenameModalClose}
            disabled={renameLoading}
            variant="outlined"
            sx={{
              minWidth: 100,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#cbd5e1',
              color: '#64748b',
              '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f8fafc' }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameSave}
            disabled={renameLoading || !renameNewName?.trim() || renameNewName.trim() === renameFile}
            variant="contained"
            sx={{
              minWidth: 100,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }
            }}
          >
            {renameLoading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info Modal - file metadata (supports multiple merged files) */}
      <Dialog
        open={showInfoModal}
        onClose={handleInfoModalClose}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' } }
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            m: 0,
            py: 2,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: '1.125rem',
            color: '#1e293b',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)'
              }}
            >
              <InfoOutlinedIcon sx={{ color: '#3b82f6', fontSize: 22 }} />
            </Box>
            <span>File Info</span>
          </Box>
          <Button
            onClick={handleInfoModalClose}
            sx={{
              minWidth: 32,
              height: 32,
              p: 0,
              color: '#64748b',
              borderRadius: '50%',
              '&:hover': { background: '#f1f5f9', color: '#1e293b' }
            }}
          >
            <CloseIcon fontSize="small" />
          </Button>
        </DialogTitle>
        <DialogContent sx={{ py: 3, px: 3 }}>
          {infoLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={6}>
              <CircularProgress />
            </Box>
          ) : infoMetadata && Object.keys(infoMetadata).length > 0 ? (
            <Box display="flex" flexDirection="column" mt={2}gap={2}>
              {Object.entries(infoMetadata).map(([fileKey, meta]) => {
                const m = typeof meta === 'object' ? meta : { file_name: fileKey, rows: meta };
                const formatDate = (str) => {
                  if (!str) return '';
                  try {
                    const d = new Date(str);
                    return isNaN(d.getTime()) ? str : d.toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    });
                  } catch {
                    return str;
                  }
                };
                return (
                  <Paper
                    key={fileKey}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#1e293b', mb: 1.5 }}>
                      {m.file_name || fileKey}
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      {m.rows != null && (
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" color="textSecondary">Rows</Typography>
                          <Typography variant="body2" fontWeight={500}>{m.rows.toLocaleString?.() ?? m.rows}</Typography>
                        </Box>
                      )}
                      {m.created_at && (
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" color="textSecondary">Created</Typography>
                          <Typography variant="body2" fontWeight={500}>{formatDate(m.created_at)}</Typography>
                        </Box>
                      )}
                      {m.last_updated_at && (
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" color="textSecondary">Last updated</Typography>
                          <Typography variant="body2" fontWeight={500}>{formatDate(m.last_updated_at)}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
              No metadata available.
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            py: 2,
            px: 3,
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#fafbfc'
          }}
        >
          <Button
            onClick={handleInfoModalClose}
            variant="contained"
            sx={{
              minWidth: 100,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)' }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Main Content */}
      <div className="header-section">
        <h1 className="data-source-title">Data Source</h1>
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-number">{stableSortedFiles.length}</span>
            <span className="stat-label">Total Files</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{selectedFiles.length}</span>
            <span className="stat-label">Selected</span>
          </div>
        </div>
      </div>

      <div className="file-grid">
        {/* Upload Card */}
        <div
          className={`file-card upload-card ${isUploading ? 'uploading' : ''}`}
          onClick={handleUploadClick}
          tabIndex={0}
          role="button"
        >
          <input
            type="file"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isUploading}
            multiple
            accept=".csv,.xml,.pdf"
          />
          <div className="thumbnail-wrapper upload-icon-wrapper">
            <CloudUploadOutlinedIcon className="upload-cloud-icon" />
            <AddIcon className="upload-plus-icon" />
          </div>
          <div className="file-name">Upload New</div>
        </div>

        {/* File Cards */}
        {loading ? (
          <div className="loading-container">
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ mt: 2, color: '#666' }}>
              Loading files...
            </Typography>
          </div>
        ) : displayedFiles.length === 0 && stableSortedFiles.length === 0 ? (
          <div className="empty-state">
            <CloudUploadOutlinedIcon className="empty-icon" />
            <Typography variant="h6" gutterBottom>
              No files found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Upload your first file to get started
            </Typography>
          </div>
        ) : (
          displayedFiles.map((file, idx) => (
            <div
              className={`file-card ${selectedFiles.includes(file) ? 'selected' : ''}`}
              key={file}
              tabIndex={0}
              onClick={() => handleFileCardClick(file)}
            >
              {selectedFiles.includes(file) && (
                <div className="selected-indicator">
                  <CheckIcon className="check-icon" />
                </div>
              )}
              <div className="thumbnail-wrapper">
                <img src={thumbnail} alt="thumbnail" className="file-thumbnail" />
              </div>
              <div className="file-name" title={file}>{file}</div>
              <div className="file-card-actions">
                <InfoOutlinedIcon
                  className="card-action-icon info-icon"
                  titleAccess="File info"
                  onClick={e => handleInfoClick(file, e)}
                />
                <DriveFileRenameOutlineIcon
                  className="card-action-icon edit-icon"
                  titleAccess="Rename file"
                  onClick={e => handleRenameClick(file, e)}
                />
                {deletingFile === file ? (
                  <CircularProgress size={20} className="delete-icon loading" />
                ) : (
                  <DeleteOutlineIcon
                    className="card-action-icon delete-icon"
                    titleAccess="Delete file"
                    onClick={e => handleDelete(file, e)}
                  />
                )}
              </div>
            </div>
          ))
        )}

        {/* View All Card */}
        {hasMoreFiles && (
          <div
            className="file-card view-all-card"
            onClick={() => {
              if (window && window.amplitude) {
                logAmplitudeEvent('Data Source View All', { data: stableSortedFiles });
                console.log('[Amplitude] Data Source View All event sent', stableSortedFiles);
              }
              setShowViewAllModal(true);
            }}
            tabIndex={0}
            role="button"
          >
            <div className="view-all-content">
              <div className="view-all-icon">
                <span className="more-count">+{stableSortedFiles.length - ITEMS_PER_PAGE}</span>
              </div>
              <div className="view-all-text">View All Files</div>
              <div className="view-all-subtitle">
                {stableSortedFiles.length} total files
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit button for selected files */}
      {selectedFiles.length > 0 && (
        <div className="submit-section">
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmitSelectedFiles}
            disabled={selectedFiles.length === 0 || isSubmitting}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 3,
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {isSubmitting ? (
              <>
                <CircularProgress size={22} sx={{ color: 'white', mr: 1.5 }} />
                Submitting...
              </>
            ) : (
              `Submit (${selectedFiles.length})`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}