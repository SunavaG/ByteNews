// frontend/src/pages/NewsFeedPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Chatbot from '../components/Chatbot.jsx';
import { Link } from 'react-router-dom';

function NewsFeedPage({ onLogout }) {
  const [sections, setSections] = useState({}); // Stores news for each topic
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null); // Stores fetched preferences
  const [searchTerm, setSearchTerm] = useState(''); // State for search input
  const [isSearching, setIsSearching] = useState(false); // New state to track if a search is active

  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedArticleSummary, setSelectedArticleSummary] = useState('');
  const [selectedArticleTitle, setSelectedArticleTitle] = useState('');
  const [selectedArticleDescription, setSelectedArticleDescription] = useState('');
  const [selectedArticleContent, setSelectedArticleContent] = useState('');

  // Fetch user preferences
  const fetchUserPreferences = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://localhost:5000/api/user/preferences', { // IMPORTANT: Replace with deployed backend URL
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserPreferences(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching user preferences:', err);
      if (err.response && err.response.status === 401) {
        onLogout();
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to load user preferences. Please set them.');
        return { country: 'us', topics: ['technology', 'business', 'health'] }; // Default if fetch fails
      }
    }
  };

  // Function to fetch news for a specific topic/country or general query
  const fetchNews = async (query = '', country = 'us', category = '') => {
    try {
      const token = localStorage.getItem('accessToken');
      let url = `http://localhost:5000/api/news?q=${query}&country=${country}`; // Base URL
      if (category) {
        url += `&category=${category}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (err) {
      console.error(`Error fetching news:`, err);
      return [];
    }
  };

  // Main effect to load news (personalized or search results)
  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      setError(null);
      setSections({}); // Clear previous sections

      if (isSearching && searchTerm) {
        // If searching, fetch general news based on search term
        const searchResults = await fetchNews(searchTerm);
        setSections({ 'Search Results': searchResults }); // Put all search results in one section
      } else {
        // If not searching, load personalized news based on preferences
        const prefs = await fetchUserPreferences();
        if (!prefs || !prefs.topics || prefs.topics.length === 0) {
          setError('Please set your news preferences in the settings to see personalized news.');
          setLoading(false);
          return;
        }

        const newSections = {};
        const fetchPromises = prefs.topics.map(async (topic) => {
          // Fetch news for each preferred topic, limited to 3 articles
          const articles = (await fetchNews(topic, prefs.country, topic)).slice(0, 3);
          newSections[topic] = articles;
        });

        await Promise.all(fetchPromises);
        setSections(newSections);
      }
      setLoading(false);
    };

    loadNews();
  }, [isSearching, searchTerm, onLogout]); // Re-run when search state/term changes, or logout

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsSearching(true); // Activate search mode
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setIsSearching(false); // Deactivate search mode, revert to personalized news
  };

  const openChatModal = (summary, title, description, content) => {
    setSelectedArticleSummary(summary);
    setSelectedArticleTitle(title);
    setSelectedArticleDescription(description);
    setSelectedArticleContent(content);
    setShowChatModal(true);
  };

  const closeChatModal = () => {
    setShowChatModal(false);
    setSelectedArticleSummary('');
    setSelectedArticleTitle('');
    setSelectedArticleDescription('');
    setSelectedArticleContent('');
  };

  return (
    <div className="news-container" style={{ maxWidth: '1200px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
        <h1 style={{ color: '#333', fontSize: '2em' }}>
          {isSearching ? `Search Results for "${searchTerm}"` : 'Your Personalized News'}
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/preferences" className="btn-primary rounded-md" style={{ width: 'auto', padding: '8px 15px', backgroundColor: '#007bff', textDecoration: 'none' }}>
            Preferences
          </Link>
          <button onClick={onLogout} className="btn-primary rounded-md" style={{ width: 'auto', padding: '8px 15px', backgroundColor: '#dc3545' }}>
            Logout
          </button>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} style={{ marginBottom: '30px', display: 'flex', gap: '10px', width: '100%' }}>
        <input
          type="text"
          placeholder="Search all news..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-md"
          style={{ flexGrow: 1, padding: '12px', border: '1px solid #ddd' }}
        />
        <button type="submit" className="btn-primary rounded-md" style={{ width: 'auto', padding: '12px 20px' }}>
          Search
        </button>
        {isSearching && (
          <button onClick={handleClearSearch} className="btn-primary rounded-md" style={{ width: 'auto', padding: '12px 20px', backgroundColor: '#6c757d' }}>
            Clear Search
          </button>
        )}
      </form>

      {loading && <div className="message">Loading news...</div>}
      {error && <div className="message error">{error}</div>}

      {!loading && !error && Object.keys(sections).length === 0 && (
        <div className="message">
          {isSearching ? `No search results found for "${searchTerm}".` : 'No personalized news sections found. Please set your preferences or try different ones.'}
        </div>
      )}

      {!loading && !error && userPreferences && !isSearching && (
        <p style={{ marginBottom: '20px', fontSize: '1.1em', color: '#555' }}>
          Showing news for: <strong>{userPreferences.country.toUpperCase()}</strong> | Topics: <strong>{userPreferences.topics.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}</strong>
        </p>
      )}

      {!loading && !error && Object.keys(sections).map((topic) => (
        <div key={topic} style={{ marginBottom: '40px', width: '100%' }}>
          <h2 style={{ fontSize: '1.8em', color: '#333', textAlign: 'left', marginBottom: '20px', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
            {topic.charAt(0).toUpperCase() + topic.slice(1)}
          </h2>
          <div className="news-grid">
            {sections[topic].length > 0 ? (
              sections[topic].map((article, index) => (
                <div key={index} className="news-card rounded-md">
                  {article.imageUrl && (
                    <img src={article.imageUrl} alt={article.title} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/cccccc/000000?text=No+Image'; }} />
                  )}
                  <div className="card-content">
                    <h2>{article.title}</h2>
                    <p>{article.summary}</p>
                    <div className="card-footer">
                      <span>Source: {article.source}</span>
                      <a href={article.url} target="_blank" rel="noopener noreferrer">Read Full Article</a>
                      <button
                        onClick={() => openChatModal(article.summary, article.title, article.description, article.content)}
                        className="btn-primary rounded-md"
                        style={{ width: 'auto', padding: '8px 12px', fontSize: '0.9em', backgroundColor: '#6c757d' }}
                      >
                        Chat about this
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="message" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                No news found for '{topic}'.
              </div>
            )}
          </div>
        </div>
      ))}

      {showChatModal && (
        <Chatbot
          articleSummary={selectedArticleSummary}
          articleTitle={selectedArticleTitle}
          articleDescription={selectedArticleDescription}
          fullArticleContent={selectedArticleContent}
          onClose={closeChatModal}
        />
      )}
    </div>
  );
}

export default NewsFeedPage;
