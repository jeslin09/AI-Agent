import React, { useState } from 'react';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query.');
      return;
    }
    setError(null); // Clear previous errors

    try {
      // Send the query to the Flask backend
      const response = await fetch('http://127.0.0.1:5000/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        setResults(data.results);
      } else {
        setResults([]);
        setError('No results found.');
      }
    } catch (error) {
      setError(error.message);
      setResults([]);
    }
  };

  
};

export default Search;
