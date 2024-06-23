import React, { useState } from 'react';
import { TextField, Container, Typography, Box, Grid, AppBar, Toolbar, CssBaseline, Button, Card, CardContent, IconButton } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { FileCopy as FileCopyIcon } from '@mui/icons-material';

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
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#ffffff',
    },
  },
  typography: {
    h4: {
      fontWeight: 700,
      marginBottom: '1.5rem',
      color: '#3f51b5',
    },
    h6: {
      fontWeight: 500,
      marginBottom: '0.75rem',
    },
    body1: {
      marginBottom: '1rem',
    },
  },
});

const App = () => {
  const [inputText, setInputText] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

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
      setCopyStatus(key);
      setTimeout(() => {
        setCopyStatus('');
      }, 1000);
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography mx='auto' variant="h6" color="inherit">
            AI Content with Unicode Spacing
          </Typography>
        </Toolbar>
      </AppBar>
      <Container>
        <Box my={4}>
          <Typography variant="h4" component="h1" align="center">
            Zero-ZeroGPT
          </Typography>
          <Typography variant="body1" align="center">
            Enter text to experiment the impact of unicode space type on AI detection tools
          </Typography>
          <TextField
            label="Input"
            variant="outlined"
            fullWidth
            multiline
            rows={15}
            value={inputText}
            onChange={handleInputChange}
            margin="normal"
          />
          <Box textAlign="center" mb={8}>
            <Button variant="contained" color="secondary" onClick={handleClearText}>
              Clear Text
            </Button>
          </Box>
          <Grid container spacing={3}>
            {Object.keys(unicodeSpaces).map((key) => (
              <Grid item xs={12} sm={6} key={key}>
                <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: '#f9f9f9', paddingBottom: 0 }}>
                  <CardContent sx={{ paddingBottom: '0 !important' }}>
                    <Box width={"100%"} display={'flex'} flexDirection={'row'} alignItems="center">
                      <Typography variant="h7" color="primary">
                        {key} ({getUnicodeCode(unicodeSpaces[key])})
                      </Typography>
                      <IconButton
                        color="primary"
                        onClick={() => handleCopyText(replaceSpaces(inputText, unicodeSpaces[key]), key)}
                        sx={{ marginLeft: "auto" }}
                      >
                        <FileCopyIcon />
                      </IconButton>
                      {copyStatus === key && (
                        <Typography variant="body2" color="primary" sx={{ marginLeft: 1 }}>
                          Copied!
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginTop: 1 }}>
                      <TextField
                        variant="outlined"
                        fullWidth
                        multiline
                        rows={15}
                        value={replaceSpaces(inputText, unicodeSpaces[key])}
                        margin="dense"
                        InputProps={{
                          readOnly: true,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;
