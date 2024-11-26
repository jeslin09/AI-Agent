
import { Button, TextField, Typography, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import axios from 'axios';
import './App.css';
import * as XLSX from 'xlsx';
import React, { useState, useEffect } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [columns, setColumns] = useState([]);
  const [filename, setFilename] = useState('');
  const [query, setQuery] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [sheetData, setSheetData] = useState([]);
  const [rowValues, setRowValues] = useState([]);
  const [results, setResults] = useState([]);  // State for search results

  // Function to handle file upload
  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
    setSheetUrl('');
    setColumns([]);
    setError('');
    setSheetData([]);
    setRowValues([]);
  };

  // Function to handle file submission
  const handleFileSubmit = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError('');
    setColumns([]);
    setSheetData([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (sheetData.length > 0) {
        setColumns(Object.keys(sheetData[0]));
        setFilename(file.name);
        setSheetData(sheetData);
        setShowModal(true);
      } else {
        setError('No data found in the selected file');
      }

      setLoading(false);
    };
    reader.onerror = () => {
      setError('Failed to read the file');
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  // Function to handle Google Sheets data fetching
  const handleGoogleSheetData = async () => {
    if (!sheetUrl) {
      setError('Please enter a valid Google Sheets URL');
      return;
    }

    setLoading(true);
    setError('');
    setColumns([]);
    setSheetData([]);
    setRowValues([]);

    try {
      const response = await axios.post('http://127.0.0.1:5000/fetch_and_download', { sheet_url: sheetUrl });
      if (response.data.columns) {
        setColumns(response.data.columns);
        setFilename('Google Sheet Data');
        setSheetData(response.data.data);
        setShowModal(true);
      } else {
        setError('No columns found in the provided Google Sheets URL');
      }
    } catch (err) {
      setError('Failed to fetch data from Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle column selection
  const handleColumnSelect = (event) => {
    const column = event.target.value;
    setSelectedColumn(column);

    if (sheetData.length > 0) {
      const uniqueValues = Array.from(new Set(sheetData.map((row) => row[column])));
      setRowValues(uniqueValues);
    } else {
      setError('No data available to fetch unique values');
    }
  };

  // Function to handle row selection
  const handleRowSelect = (value) => {
    setQuery((prev) => `${prev} ${value}`);
  };

  // Function to handle search logic
  const handleSearch = async (query) => {
    try {
      // Send the POST request with the query data
      const response = await axios.post('http://127.0.0.1:5000/search', { query });

      // Check if data exists and if the data array is not empty
      if (response.data && response.data.results && response.data.results.length > 0) {
        setResults(response.data.results); // Set the results to the state
        setError(''); // Clear any previous errors
      } else {
        setError('No matching results found');
        setResults([]); // Clear the results if no data is found
      }
    } catch (err) {
      // Catch and handle any errors during the request
      console.error('Search failed:', err);
      setError('Failed to perform the search');
      setResults([]); // Clear results in case of failure
    }
  };

  // Search query input component
  const QueryInput = () => {
    const [localQuery, setLocalQuery] = useState(query); // Local state to store the query for the input field
  
    // Function to handle search when the button is clicked
    const handleSearchClick = () => {
      setQuery(localQuery); // Update the global query state only when the search button is clicked
      handleSearch(localQuery); // Trigger the search with the local query
    };
  
    return (
      <div>
        <Typography variant="h6" align="center" className="query-title">Enter Your Query</Typography>
        <TextField
          label="Enter Prompt or Query"
          variant="outlined"
          fullWidth
          value={localQuery}  // Bind to local state
          onChange={(e) => setLocalQuery(e.target.value)}  // Update local state on change
          className="text-field"
          margin="normal"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSearchClick} // Use the local state for search
          disabled={loading || !localQuery}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : 'Search'}
        </Button>
      </div>
    );
  };

  return (
      <div className="app-container">
        <Typography variant="h4" align="center" gutterBottom>AI-Data Extractor</Typography>
    
        {/* File Upload Section */}
        <input type="file" accept=".csv, .xlsx" onChange={handleFileUpload} className="file-input" />
        <Button variant="contained" color="primary" fullWidth onClick={handleFileSubmit} disabled={loading || !file}>
          {loading ? <CircularProgress size={24} /> : 'Upload CSV/Excel'}
        </Button>
    
        <Typography align="center" variant="body1" className="or-text">OR</Typography>
    
        {/* Google Sheets URL Section */}
        <TextField
          label="Enter Google Sheets URL"
          variant="outlined"
          fullWidth
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          className="text-field"
          margin="normal"
        />
        <Button variant="contained" color="secondary" fullWidth onClick={handleGoogleSheetData} disabled={loading || !sheetUrl}>
          {loading ? <CircularProgress size={24} /> : 'Fetch from Google Sheets'}
        </Button>
    
        {/* Dropdown Menu for Columns */}
        {columns.length > 0 && (
          <div className="dropdown-section">
            <FormControl fullWidth className="dropdown">
              <InputLabel shrink={true}>Select Column</InputLabel>
              <Select
                value={selectedColumn}
                onChange={handleColumnSelect}
                displayEmpty
                autoWidth
                label="Select Column"
              >
                {columns.map((column, index) => (
                  <MenuItem key={index} value={column}>
                    {column}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        )}
    
        {/* Dropdown for Row Values */}
        {rowValues.length > 0 && (
          <div className="dropdown-section">
            <FormControl fullWidth className="dropdown">
              <InputLabel shrink={true}>Select Row Value</InputLabel>
              <Select
                onChange={(e) => handleRowSelect(e.target.value)}
                displayEmpty
                autoWidth
                label="Select Row Value"
              >
                {rowValues.map((value, index) => (
                  <MenuItem key={index} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        )}
    
        {/* Query Input Component */}
        <QueryInput />
    
        {/* Display error message if there's an error */}
        {error && <div className="error">{error}</div>}
    
        {/* Display results */}
        <div className="results-container">
          {results.length > 0 ? (
            results.map((result, index) => (
              <div key={index} className="result-item">
                <h3><a href={result.link} target="_blank" rel="noopener noreferrer">{result.title}</a></h3>
                <p>{result.snippet}</p>
              </div>
            ))
          ) : (
            !error && <p>Loading...</p>  // Show loading state if there are no results and no error
          )}
        </div>
    
        {/* Modal Dialog for Column Selection */}
        <Dialog open={showModal} onClose={() => setShowModal(false)}>
          <DialogTitle>Select Columns</DialogTitle>
          <DialogContent>
            <Typography variant="body1">You can select the columns below:</Typography>
            <ul>
              {columns.map((column, index) => (
                <li key={index}>{column}</li>
              ))}
            </ul>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowModal(false)} color="primary">Close</Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }

export default App;
