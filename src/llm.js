import React, { useState } from 'react';
import axios from 'axios';

const LLMExtraction = () => {
  const [query, setQuery] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedResults, setSelectedResults] = useState('');
  const [extractedInfo, setExtractedInfo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLLMExtraction = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.post('http://127.0.0.1:5000/parse-with-llm', {
        query,
        prompt: customPrompt,
        webResults: selectedResults,
      });
      if (response.data.extractedInfo) {
        setExtractedInfo(response.data.extractedInfo);
      } else {
        setError('No information extracted');
      }
    } catch (err) {
      console.error('Error extracting information:', err);
      setError('Failed to extract information');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      extractedInfo.map(e => `${e.entity},${e.info}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "extracted_data.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <div>
        <label>Query:</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query"
          style={{ width: '100%', marginBottom: '10px', padding: '5px' }}
        />
      </div>
      <div>
        <label>Custom Prompt:</label>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Enter custom prompt"
          style={{ width: '100%', marginBottom: '10px', padding: '5px' }}
        />
      </div>
      <div>
        <label>Web Results:</label>
        <textarea
          value={selectedResults}
          onChange={(e) => setSelectedResults(e.target.value)}
          placeholder="Enter web results"
          style={{ width: '100%', marginBottom: '10px', padding: '5px' }}
        />
      </div>
      <button
        onClick={handleLLMExtraction}
        style={{ padding: '10px', width: '100%', backgroundColor: '#007BFF', color: '#FFF', border: 'none', cursor: 'pointer' }}
        disabled={loading}
      >
        {loading ? 'Extracting...' : 'Extract Information'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {extractedInfo.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Extracted Information</h3>
          <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Entity</th>
                <th>Info</th>
              </tr>
            </thead>
            <tbody>
              {extractedInfo.map((item, index) => (
                <tr key={index}>
                  <td>{item.entity}</td>
                  <td>{item.info}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={handleDownloadCSV}
            style={{ marginTop: '10px', padding: '10px', width: '100%', backgroundColor: '#28A745', color: '#FFF', border: 'none', cursor: 'pointer' }}
          >
            Download CSV
          </button>
        </div>
      )}
    </div>
  );
};

export default LLMExtraction;
