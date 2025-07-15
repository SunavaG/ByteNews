// frontend/src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate(); // Hook to programmatically navigate

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      // IMPORTANT: Replace with your deployed Flask backend URL when deploying
      const response = await axios.post('http://localhost:5000/api/register', {
        username,
        password,
      });
      setMessage({ type: 'success', text: response.data.message + ' You can now login.' });
      // Optionally redirect to login page after successful registration
      setTimeout(() => navigate('/login'), 2000); // Redirect after 2 seconds
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Registration failed. Please try again.' });
    }
  };

  return (
    <div className="auth-container">
      <h2>Register</h2>
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
        <button type="submit" className="btn-primary rounded-md">Register</button>
      </form>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
      <p style={{ marginTop: '20px', fontSize: '0.9em' }}>
        Already have an account? <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Login here</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
