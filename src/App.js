import React, { useState, useMemo } from 'react';
import {
  TextField, Container, Typography, Box, Grid, AppBar, Toolbar,
  CssBaseline, Button, Card, CardContent, IconButton, Snackbar,
  useMediaQuery, Tooltip, Fade, Select, MenuItem, Chip
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { FileCopy as FileCopyIcon, Clear as ClearIcon, DarkMode, LightMode, Add as AddIcon } from '@mui/icons-material';
import { FaGithub } from 'react-icons/fa';

const unicodeSpaces = {
  'Em Space': '\u2003',
  'En Space': '\u2002',
  'Thin Space': '\u2009',
  'Thin Space*2': '\u2009\u2009',
  'Hair Space': '\u200A',
  'Narrow, Hair': '\u202F\u200A',
  'Thin, Hair': ' \u2009\u200A',
  'Hair Space*3': '\u200A\u200A\u200A',
  'Narrow No-Break': '\u202F',
  'Narrow No-Break*2': '\u202F\u202F',
  'Zero Width Space': '\u200A\u200B\u200A',
  'Word Joiner': '\u2009\u2060\u2009'
};

const usageDescription = {
  'Em Space': 'in wide spacing between characters',
  'En Space': 'for mid-range spacing',
  'Thin Space': 'for slightly narrower spacing',
  'Thin Space*2': 'for even narrower spacing',
  'Hair Space': 'for very thin spacing',
  'Narrow, Hair': 'for extra narrow hair-like spacing',
  'Thin, Hair': 'for a mix of thin and hair spacing',
  'Hair Space*3': 'for extremely tight spacing',
  'Narrow No-Break': 'to prevent line breaks with tight spacing',
  'Narrow No-Break*2': 'for even tighter no-break spacing',
  'Zero Width Space': 'to create word breaks without visible space',
  'Word Joiner': 'to prevent word breaks without adding width'
};

const App = () => {
  const [inputText, setInputText] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(prefersDarkMode ? 'dark' : 'light');
  const [customSpaces, setCustomSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState('');

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'light' ? '#2196f3' : '#90caf9',
          },
          secondary: {
            main: mode === 'light' ? '#f50057' : '#f48fb1',
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#121212',
            paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
          },
          text: {
            primary: mode === 'light' ? '#333333' : '#ffffff',
            secondary: mode === 'light' ? '#757575' : '#b0bec5',
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h4: {
            fontWeight: 700,
            marginBottom: '1rem',
            color: mode === 'light' ? '#1976d2' : '#90caf9',
          },
          h6: {
            fontWeight: 500,
            marginBottom: '0.5rem',
          },
          body1: {
            marginBottom: '0.75rem',
          },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'light' ? '#ffffff' : '#1e1e1e',
                color: mode === 'light' ? '#333333' : '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'light' 
                  ? '0 2px 4px rgba(0, 0, 0, 0.1)'
                  : '0 2px 4px rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: mode === 'light'
                    ? '0 4px 8px rgba(0, 0, 0, 0.15)'
                    : '0 4px 8px rgba(255, 255, 255, 0.1)',
                },
              },
            },
          },
          MuiCardContent: {
            styleOverrides: {
              root: {
                padding: '16px',
                '&:last-child': {
                  paddingBottom: '16px',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: '6px',
                textTransform: 'none',
                padding: '8px 16px',
                fontWeight: 500,
              },
            },
          },
        },
      }),
    [mode],
  );

  const handleInputChange = (event) => {
    setInputText(event.target.value);
  };

  const replaceSpaces = (text, unicodeCharacter) => {
    return text.split(' ').join(unicodeCharacter);
  };

  const getUnicodeCode = (text) => {
    return text.split('').map((char) => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()).join('');
  };

  const handleClearText = () => {
    setInputText('');
  };

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbarMessage(`Copied text with ${key} spacing!`);
      setSnackbarOpen(true);
    });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleToggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const handleAddCustomSpace = () => {
    if (selectedSpace && !customSpaces.includes(selectedSpace)) {
      setCustomSpaces([...customSpaces, selectedSpace]);
      setSelectedSpace('');
    }
  };

  const handleRemoveCustomSpace = (space) => {
    setCustomSpaces(customSpaces.filter(s => s !== space));
  };

  const getCustomSpacingText = () => {
    const customSpacing = customSpaces.map(space => unicodeSpaces[space]).join('');
    return replaceSpaces(inputText, customSpacing);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="fixed" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" color="inherit" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Zero-ZeroGPT
          </Typography>
          <Tooltip title="View on GitHub">
            <IconButton
              color="inherit"
              aria-label="github"
              href="https://github.com/oct4pie/zero-zerogpt.git"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mr: 2 }}
            >
              <FaGithub size={24} />
            </IconButton>
          </Tooltip>
          <Tooltip title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}>
            <IconButton color="inherit" onClick={handleToggleMode} edge="end">
              {mode === 'light' ? <DarkMode /> : <LightMode />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Box my={2}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            AI Content with Unicode Spacing
          </Typography>
          <Typography variant="body1" align="center" paragraph>
            Enter text to experiment with the impact of unicode space types on AI detection tools.
          </Typography>
          <TextField
            label="Input Text"
            variant="outlined"
            multiline
            minRows={12}
            maxRows={14}
            value={inputText}
            onChange={handleInputChange}
            margin="dense"
            placeholder="Enter your text here..."
            sx={{
              width:"90%",
              mx: "5%",
              borderRadius: '6px',
             '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.background.paper,
              },
            }}
          />
          <Box display="flex" justifyContent="center" mb={6} mt={2}>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleClearText}
              startIcon={<ClearIcon />}
            >
              Clear Text
            </Button>
          </Box>

          <Grid container spacing={2} mb={5}>
            {Object.entries(unicodeSpaces).map(([key, value]) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" color="primary" fontWeight="bold">
                        {key}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {getUnicodeCode(value)}
                      </Typography>
                    </Box>
                    <TextField
                      variant="outlined"
                      fullWidth
                      multiline
                      minRows={1}
                      maxRows={10}
                      value={replaceSpaces(inputText, value)}
                      InputProps={{
                        readOnly: true,
                      }}
                      sx={{
                        mb: 1,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: theme.palette.background.paper,
                          '& fieldset': {
                            borderColor: 'rgba(0, 0, 0, 0.12)',
                          },
                        },
                      }}
                    />
                    <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                      {usageDescription[key]}
                    </Typography>
                    <Box display="flex" justifyContent="flex-end" mt={1}>
                      <Tooltip title={`Copy text with ${key} spacing`}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleCopyText(replaceSpaces(inputText, value), key)}
                        >
                          <FileCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Custom Unicode Spacing
              </Typography>
              <Box display="flex" alignItems="center" mb={2}>
                <Select
                  value={selectedSpace}
                  onChange={(e) => setSelectedSpace(e.target.value)}
                  displayEmpty
                  sx={{ mr: 2, minWidth: 200 }}
                >
                  <MenuItem value="" disabled>Select</MenuItem>
                  {Object.keys(unicodeSpaces).map((key) => (
                    <MenuItem key={key} value={key}>{key}</MenuItem>
                  ))}
                </Select>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddCustomSpace}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                {customSpaces.map((space) => (
                  <Chip
                    key={space}
                    label={space}
                    onDelete={() => handleRemoveCustomSpace(space)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              <TextField
                variant="outlined"
                fullWidth
                multiline
                minRows={10}
                maxRows={12}
                value={getCustomSpacingText()}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mb: 2 }}
              />
              <Box display="flex" justifyContent="flex-end">
                <Tooltip title="Copy custom spaced text">
                  <IconButton
                    color="primary"
                    onClick={() => handleCopyText(getCustomSpacingText(), 'Custom')}
                  >
                    <FileCopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={
          <Box display="flex" alignItems="center">
            <FileCopyIcon sx={{ mr: 1 }} />
            <Typography>{snackbarMessage}</Typography>
          </Box>
        }
        TransitionComponent={Fade}
      />
    </ThemeProvider>
  );
};

export default App;