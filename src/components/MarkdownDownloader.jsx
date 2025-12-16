import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as MarkdownIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { useMarkdownGenerator } from '../hooks/useMarkdownGenerator';

/**
 * MarkdownDownloader Component
 *
 * A Material UI styled component for downloading Markdown files with Unicode space transformations.
 * Receives already-transformed text and provides download functionality.
 *
 * @param {Object} props - Component props
 * @param {string} props.transformedText - The text content with Unicode spaces already applied
 * @param {string} props.originalFileName - Original filename to derive download filename (optional)
 * @param {boolean} props.disabled - Whether the download button is disabled (optional)
 * @param {string} props.className - Additional CSS classes (optional)
 * @param {string} props.unicodeSpaceChar - The Unicode space character used, for info display (optional)
 * @param {Function} props.onDownloadComplete - Callback when download completes (optional)
 * @param {Function} props.onError - Callback when an error occurs (optional)
 * @param {string} props.buttonText - Custom text for the download button (optional)
 * @param {string} props.variant - Button variant: 'button', 'iconButton', or 'fullWidth' (optional)
 * @param {string} props.size - Button size: 'small', 'medium', or 'large' (optional)
 */
const MarkdownDownloader = ({
  transformedText,
  originalFileName = '',
  disabled = false,
  className = '',
  unicodeSpaceChar = '',
  onDownloadComplete,
  onError,
  buttonText = 'Download Markdown',
  variant = 'button',
  size = 'medium'
}) => {
  const [filenameDialogOpen, setFilenameDialogOpen] = useState(false);
  const [customFilename, setCustomFilename] = useState('');
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    isGenerating,
    error: generationError,
    createMarkdownBlob,
    downloadBlob,
    clearError
  } = useMarkdownGenerator();

  /**
   * Derives the default filename from the original filename
   */
  const getDefaultFilename = useCallback(() => {
    if (originalFileName) {
      // Remove original extension and add _transformed.md
      const baseName = originalFileName.replace(/\.(md|markdown)$/i, '');
      return `${baseName}_transformed.md`;
    }
    return 'transformed.md';
  }, [originalFileName]);

  /**
   * Handles the download process
   */
  const handleDownload = useCallback(async (filename = customFilename || getDefaultFilename()) => {
    try {
      setShowError(false);
      setShowSuccess(false);
      clearError();

      // Validate input
      if (!transformedText || transformedText.trim().length === 0) {
        throw new Error('No text available for download');
      }

      // Ensure filename ends with .md
      let safeFilename = filename;
      if (!safeFilename.toLowerCase().endsWith('.md') &&
          !safeFilename.toLowerCase().endsWith('.markdown')) {
        safeFilename += '.md';
      }

      // Create blob from the transformed text
      const blob = createMarkdownBlob(transformedText);

      // Trigger download
      downloadBlob(blob, safeFilename);

      // Show success feedback
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      if (onDownloadComplete) {
        onDownloadComplete(safeFilename);
      }

      setFilenameDialogOpen(false);
    } catch (err) {
      setShowError(true);
      if (onError) {
        onError(err);
      }
    }
  }, [transformedText, customFilename, getDefaultFilename, createMarkdownBlob, downloadBlob, clearError, onDownloadComplete, onError]);

  /**
   * Opens the filename customization dialog
   */
  const handleOpenFilenameDialog = useCallback(() => {
    setCustomFilename(getDefaultFilename());
    setFilenameDialogOpen(true);
    setShowError(false);
    setShowSuccess(false);
  }, [getDefaultFilename]);

  /**
   * Closes the filename customization dialog
   */
  const handleCloseFilenameDialog = useCallback(() => {
    setFilenameDialogOpen(false);
    setShowError(false);
    clearError();
  }, [clearError]);

  /**
   * Handles Enter key in filename input
   */
  const handleFilenameKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !isGenerating && transformedText) {
      handleDownload(customFilename);
    }
  }, [customFilename, isGenerating, transformedText, handleDownload]);

  /**
   * Dismisses the error alert
   */
  const handleDismissError = useCallback(() => {
    setShowError(false);
    clearError();
  }, [clearError]);

  /**
   * Dismisses the success alert
   */
  const handleDismissSuccess = useCallback(() => {
    setShowSuccess(false);
  }, []);

  // Determine if download should be disabled
  const isDisabled = disabled || !transformedText || transformedText.trim().length === 0 || isGenerating;

  // Get the appropriate tooltip text
  const getTooltipText = useCallback(() => {
    if (isDisabled) return 'No text available';
    if (unicodeSpaceChar) {
      return `${buttonText} (with Unicode spacing)`;
    }
    return buttonText;
  }, [isDisabled, buttonText, unicodeSpaceChar]);

  // Get Unicode space display info
  const getUnicodeInfo = useCallback(() => {
    if (!unicodeSpaceChar) return null;
    const codes = unicodeSpaceChar.split('').map(char =>
      'U+' + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')
    ).join(' ');
    return codes;
  }, [unicodeSpaceChar]);

  // Render icon button variant
  if (variant === 'iconButton') {
    return (
      <Box className={className}>
        <Tooltip title={getTooltipText()}>
          <span>
            <IconButton
              onClick={() => handleDownload(getDefaultFilename())}
              disabled={isDisabled}
              color="primary"
              size={size}
              sx={{
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)'
                },
                '&:active': {
                  transform: 'scale(0.95)'
                }
              }}
            >
              {isGenerating ? (
                <CircularProgress size={size === 'small' ? 16 : 24} />
              ) : (
                <DownloadIcon fontSize={size} />
              )}
            </IconButton>
          </span>
        </Tooltip>

        {showSuccess && (
          <Alert
            severity="success"
            sx={{ mt: 1 }}
            onClose={handleDismissSuccess}
          >
            Markdown file downloaded successfully!
          </Alert>
        )}

        {showError && generationError && (
          <Alert
            severity="error"
            sx={{ mt: 1 }}
            onClose={handleDismissError}
          >
            {generationError}
          </Alert>
        )}
      </Box>
    );
  }

  // Render full-width button variant with filename dialog
  if (variant === 'fullWidth') {
    return (
      <Box sx={{ width: '100%' }} className={className}>
        {showSuccess && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={handleDismissSuccess}
          >
            Markdown file downloaded successfully!
          </Alert>
        )}

        {showError && generationError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={handleDismissError}
          >
            {generationError}
          </Alert>
        )}

        {/* Unicode space indicator */}
        {unicodeSpaceChar && (
          <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
            <Chip
              icon={<CodeIcon />}
              label={`Unicode: ${getUnicodeInfo()}`}
              size="small"
              color="info"
              variant="outlined"
            />
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <MarkdownIcon />}
          endIcon={<EditIcon fontSize="small" />}
          onClick={handleOpenFilenameDialog}
          disabled={isDisabled}
          fullWidth
          size={size}
          sx={{
            py: 1.5,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 3
            }
          }}
        >
          {isGenerating ? 'Generating...' : buttonText}
        </Button>

        {/* Filename Customization Dialog */}
        <Dialog
          open={filenameDialogOpen}
          onClose={handleCloseFilenameDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MarkdownIcon color="primary" />
              <Typography variant="h6">Download Markdown</Typography>
            </Box>
            <IconButton onClick={handleCloseFilenameDialog} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {unicodeSpaceChar
                ? `Your Markdown file will include Unicode space characters (${getUnicodeInfo()}).`
                : 'Customize the filename for your Markdown download.'}
            </Typography>

            <TextField
              autoFocus
              fullWidth
              label="Filename"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              onKeyPress={handleFilenameKeyPress}
              placeholder="Enter filename"
              helperText=".md extension will be added automatically if not included"
              disabled={isGenerating}
              InputProps={{
                endAdornment: (
                  <Typography variant="body2" color="textSecondary">
                    {!customFilename.toLowerCase().endsWith('.md') &&
                     !customFilename.toLowerCase().endsWith('.markdown') && '.md'}
                  </Typography>
                )
              }}
            />

            {showError && generationError && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={handleDismissError}>
                {generationError}
              </Alert>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseFilenameDialog} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
              onClick={() => handleDownload(customFilename)}
              disabled={!customFilename.trim() || isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Download'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Default button variant
  return (
    <Box className={className}>
      {showSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={handleDismissSuccess}
        >
          Markdown file downloaded successfully!
        </Alert>
      )}

      {showError && generationError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={handleDismissError}
        >
          {generationError}
        </Alert>
      )}

      <Tooltip title={unicodeSpaceChar ? `Download with Unicode spacing (${getUnicodeInfo()})` : 'Download Markdown'}>
        <Button
          variant="contained"
          color="primary"
          startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
          onClick={() => handleDownload(getDefaultFilename())}
          disabled={isDisabled}
          size={size}
          sx={{
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 3
            },
            '&:active': {
              transform: 'translateY(0)'
            }
          }}
        >
          {isGenerating ? 'Generating...' : buttonText}
        </Button>
      </Tooltip>
    </Box>
  );
};

export default MarkdownDownloader;