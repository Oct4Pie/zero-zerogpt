import React, { useCallback, useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as MarkdownIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useMarkdownHandler } from '../hooks/useMarkdownHandler';

/**
 * MarkdownUploader Component
 *
 * A Material UI styled component for uploading and extracting text from Markdown files.
 * Supports both drag-and-drop and click-to-upload functionality.
 *
 * @param {Object} props - Component props
 * @param {Function} props.onTextExtracted - Callback when text is successfully extracted
 *        Signature: (text: string, fileName: string) => void
 * @param {boolean} [props.disabled=false] - Optional disabled state
 * @param {string} [props.className=''] - Optional additional CSS classes
 * @param {Object} props.theme - MUI theme object for styling
 */
const MarkdownUploader = ({ onTextExtracted, disabled = false, className = '', theme }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  const {
    markdownFile,
    markdownText,
    isLoading,
    error,
    fileName,
    handleMarkdownUpload,
    clearMarkdown,
    getTextPreview,
    getFormattedFileSize
  } = useMarkdownHandler();

  /**
   * Handles file drop event
   */
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    try {
      const extractedText = await handleMarkdownUpload(file);
      
      if (onTextExtracted && extractedText) {
        onTextExtracted(extractedText, file.name);
      }
    } catch (err) {
      // Error is already handled by the hook and stored in error state
      console.error('Markdown upload error:', err);
    }
  }, [handleMarkdownUpload, onTextExtracted, disabled]);

  /**
   * Handles drag over event
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  /**
   * Handles drag leave event
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * Handles file input change
   */
  const handleFileSelect = useCallback(async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    try {
      const extractedText = await handleMarkdownUpload(file);
      
      if (onTextExtracted && extractedText) {
        onTextExtracted(extractedText, file.name);
      }
    } catch (err) {
      // Error is already handled by the hook and stored in error state
      console.error('Markdown upload error:', err);
    }

    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleMarkdownUpload, onTextExtracted]);

  /**
   * Handles click on upload zone
   */
  const handleUploadClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  /**
   * Handles clear/remove file action
   */
  const handleClear = useCallback(() => {
    clearMarkdown();
    if (onTextExtracted) {
      onTextExtracted('', '');
    }
  }, [clearMarkdown, onTextExtracted]);

  // Get colors based on theme
  const isDarkMode = theme?.palette?.mode === 'dark';
  const primaryColor = theme?.palette?.primary?.main || '#2196f3';
  const successColor = theme?.palette?.success?.main || '#4caf50';
  const backgroundColor = theme?.palette?.background?.paper || '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)';
  const hoverBorderColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';

  return (
    <Box sx={{ width: '90%', mx: '5%', mb: 2 }} className={className}>
      {/* Hidden file input */}
      <input
        type="file"
        accept=".md,.markdown,text/markdown,text/x-markdown"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        ref={fileInputRef}
        id="markdown-upload-input"
        disabled={disabled}
      />

      {/* Error display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={handleClear}
        >
          <AlertTitle>Markdown Processing Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Main upload zone */}
      {!markdownFile && !isLoading && (
        <Paper
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleUploadClick}
          sx={{
            p: 4,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: isDragging ? primaryColor : borderColor,
            borderRadius: '8px',
            backgroundColor: isDragging 
              ? (isDarkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.05)')
              : backgroundColor,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            transition: 'all 0.3s ease',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': disabled ? {} : {
              borderColor: hoverBorderColor,
              backgroundColor: isDarkMode 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.02)'
            }
          }}
        >
          <UploadIcon 
            sx={{ 
              fontSize: 64, 
              color: isDragging ? primaryColor : 'text.secondary',
              mb: 2,
              transition: 'color 0.3s ease'
            }} 
          />
          <Typography variant="h6" color="textPrimary" gutterBottom>
            {isDragging ? 'Drop your Markdown file here' : 'Drag & drop a Markdown file here'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            or click to select a file
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<MarkdownIcon />}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              handleUploadClick();
            }}
          >
            Select Markdown File
          </Button>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 2 }}>
            Supports .md and .markdown files (Max 10MB)
          </Typography>
        </Paper>
      )}

      {/* Loading state */}
      {isLoading && (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: primaryColor,
            borderRadius: '8px',
            backgroundColor: backgroundColor,
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="h6" color="textPrimary" gutterBottom>
            Reading Markdown file...
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Processing file content
          </Typography>
        </Paper>
      )}

      {/* File info and preview */}
      {markdownFile && !isLoading && !error && (
        <Paper
          sx={{
            border: '1px solid',
            borderColor: borderColor,
            borderRadius: '8px',
            backgroundColor: backgroundColor,
            overflow: 'hidden'
          }}
        >
          {/* File header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: '1px solid',
              borderColor: borderColor,
              backgroundColor: isDarkMode
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.02)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MarkdownIcon sx={{ fontSize: 40, color: successColor }} />
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {fileName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {getFormattedFileSize()} • {markdownText.length.toLocaleString()} characters
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Remove Markdown file">
              <IconButton
                onClick={handleClear}
                color="error"
                size="small"
                disabled={disabled}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Text preview */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Content Preview:
            </Typography>
            <Box
              sx={{
                p: 2,
                backgroundColor: isDarkMode 
                  ? 'rgba(0, 0, 0, 0.2)' 
                  : 'rgba(0, 0, 0, 0.02)',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'text.secondary'
              }}
            >
              {getTextPreview() || 'No content extracted'}
            </Box>
          </Box>

          {/* Upload new file button */}
          <Box sx={{ p: 2, pt: 0 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<UploadIcon />}
              onClick={handleUploadClick}
              fullWidth
              disabled={disabled}
            >
              Upload Different Markdown File
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default MarkdownUploader;