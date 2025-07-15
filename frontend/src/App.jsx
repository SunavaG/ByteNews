import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'; // App-specific styles


import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NewsFeedPage from './pages/NewsFeedPage.jsx';
import PreferencesPage from './pages/PreferencesPage.jsx';

function App() {
  // State to manage user authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for token in localStorage on app load
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Function to handle login (passed to LoginPage)
  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Function to handle logout (passed to NewsFeedPage)
  const handleLogout = () => {
    localStorage.removeItem('accessToken'); // Clear token
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default route: if authenticated, go to news, else login */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/news" /> : <Navigate to="/login" />} />

          {/* Login Page */}
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />

          {/* Register Page */}
          <Route path="/register" element={<RegisterPage />} />

          {/* News Feed Page - Protected Route */}
          <Route
            path="/news"
            element={isAuthenticated ? <NewsFeedPage onLogout={handleLogout} /> : <Navigate to="/login" />}
          />

          {/* Preferences Page - Protected Route */}
          <Route
            path="/preferences"
            element={isAuthenticated ? <PreferencesPage /> : <Navigate to="/login" />}
          />

          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
