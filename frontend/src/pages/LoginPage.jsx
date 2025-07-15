// frontend/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate(); // Hook to programmatically navigate

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setMessage(''); // Clear previous messages

    try {
      // IMPORTANT: Replace with your deployed Flask backend URL when deploying
      const response = await axios.post('http://localhost:5000/api/login', {
        username,
        password,
      });
      // On successful login, store the access token
      localStorage.setItem('accessToken', response.data.access_token);
      setMessage({ type: 'success', text: response.data.message });
      onLogin(); // Update authentication state in App.jsx
      navigate('/news'); // Redirect to news feed
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Login failed. Please try again.' });
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="rounded-md"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-md"
          />
        </div>
        <button type="submit" className="btn-primary rounded-md">Login</button>
      </form>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
      <p style={{ marginTop: '20px', fontSize: '0.9em' }}>
        Don't have an account? <Link to="/register" style={{ color: '#007bff', textDecoration: 'none' }}>Register here</Link>
      </p>
    </div>
  );
}

export default LoginPage;
