import React, { useState } from 'react';
import * as XLSX from 'xlsx';  // For Excel
import { FormControl, InputLabel, Select, MenuItem, Typography, Button } from '@mui/material';

const FileUploadDropdowns = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedValues, setSelectedValues] = useState({});

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const binaryStr = event.target.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary' });

      // Assuming the first sheet is the one to be used
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // Convert sheet to JSON
      const sheetData = XLSX.utils.sheet_to_json(sheet);
      setData(sheetData);

      // Get columns based on the first row (headers)
      if (sheetData.length > 0) {
        setColumns(Object.keys(sheetData[0]));
      }
    };

    reader.readAsBinaryString(file);
  };

  // Handle dropdown selection
  const handleSelectValue = (column, value) => {
    setSelectedValues((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  return (
    <div>
      <input type="file" onChange={handleFileUpload} accept=".xlsx,.xls" />
      {columns.length > 0 && (
        <div>
          <Typography variant="h6" align="center" className="query-title">
            Select Column Values
          </Typography>
          {columns.map((column, index) => (
            <FormControl fullWidth key={index} margin="normal">
              <InputLabel>{`Select ${column}`}</InputLabel>
              <Select
                value={selectedValues[column] || ''}
                onChange={(e) => handleSelectValue(column, e.target.value)}
              >
                {/* Create a dropdown with unique values from the column */}
                {data
                  .map((row) => row[column])
                  .filter((value, index, self) => self.indexOf(value) === index) // Unique values
                  .map((value, rowIndex) => (
                    <MenuItem key={rowIndex} value={value}>
                      {value || 'N/A'}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadDropdowns;
