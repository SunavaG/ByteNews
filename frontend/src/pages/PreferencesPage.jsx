// frontend/src/pages/PreferencesPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const countries = [
  { code: 'us', name: 'United States' },
  { code: 'in', name: 'India' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'ca', name: 'Canada' },
  { code: 'au', name: 'Australia' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'jp', name: 'Japan' },
  // Add more countries as needed
];

const topicsList = [
  'technology', 'business', 'health', 'science', 'sports', 'entertainment', 'politics', 'world', 'finance'
];

function PreferencesPage() {
  const [selectedCountry, setSelectedCountry] = useState('us');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPreferences = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get('http://localhost:5000/api/user/preferences', { // IMPORTANT: Replace with deployed backend URL
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedCountry(response.data.country || 'us');
        setSelectedTopics(response.data.topics || []);
      } catch (error) {
        console.error('Error fetching preferences:', error);
        setMessage({ type: 'error', text: 'Failed to load preferences.' });
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const handleTopicChange = (topic) => {
    setMessage(''); // Clear message on topic change
    setSelectedTopics((prevTopics) => {
      if (prevTopics.includes(topic)) {
        return prevTopics.filter((t) => t !== topic);
      } else {
        if (prevTopics.length < 3) {
          return [...prevTopics, topic];
        } else {
          setMessage({ type: 'error', text: 'You can select a maximum of 3 topics.' });
          return prevTopics;
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (selectedTopics.length !== 3) {
      setMessage({ type: 'error', text: 'Please select exactly 3 topics.' });
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        'http://localhost:5000/api/user/preferences', // IMPORTANT: Replace with deployed backend URL
        {
          country: selectedCountry,
          topics: selectedTopics,
          // Removed publications field
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage({ type: 'success', text: response.data.message });
      setTimeout(() => navigate('/news'), 1500); // Redirect to news after saving
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save preferences.' });
    }
  };

  if (loading) {
    return <div className="auth-container">Loading preferences...</div>;
  }

  return (
    <div className="auth-container">
      <h2>Your News Preferences</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="country">Select Country:</label>
          <select
            id="country"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="rounded-md"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
          >
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select 3 Topics:</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {topicsList.map((topic) => (
              <div key={topic} style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id={topic}
                  checked={selectedTopics.includes(topic)}
                  onChange={() => handleTopicChange(topic)}
                  disabled={selectedTopics.length >= 3 && !selectedTopics.includes(topic)}
                  style={{ marginRight: '5px' }}
                />
                <label htmlFor={topic}>{topic.charAt(0).toUpperCase() + topic.slice(1)}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Removed publications input field */}

        <button type="submit" className="btn-primary rounded-md">Save Preferences</button>
      </form>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
      <p style={{ marginTop: '20px', fontSize: '0.9em' }}>
        <Link to="/news" style={{ color: '#007bff', textDecoration: 'none' }}>Back to News Feed</Link>
      </p>
    </div>
  );
}

export default PreferencesPage;
