// frontend/src/components/Chatbot.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function Chatbot({ articleSummary, articleTitle, articleDescription, fullArticleContent, onClose }) { // Added new props
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([
      { type: 'bot', text: `Hello! I'm your news assistant for "${articleTitle}". Ask me anything about this article:` },
      { type: 'bot', text: articleSummary } // Still show summary initially for brevity
    ]);
  }, [articleSummary, articleTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { type: 'user', text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        'http://localhost:5000/api/chat', // IMPORTANT: Replace with your deployed Flask backend URL
        {
          question: userMessage.text,
          article_summary: articleSummary, // Pass summary
          article_description: articleDescription, // Pass description
          full_article_content: fullArticleContent, // Pass full content
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessages((prevMessages) => [...prevMessages, { type: 'bot', text: response.data.answer }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: 'bot', text: 'Sorry, I could not get an answer. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-modal-overlay">
      <div className="chat-modal-content rounded-md">
        <div className="chat-header">
          <h3>Chat about: {articleTitle.substring(0, 40)}{articleTitle.length > 40 ? '...' : ''}</h3>
          <button onClick={onClose}>Close Chat</button>
        </div>
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message rounded-md ${msg.type}`}>
              {msg.text}
            </div>
          ))}
          {loading && <div className="chat-message bot">Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage} className="chat-input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this article..."
            disabled={loading}
            className="rounded-md"
          />
          <button type="submit" disabled={loading} className="rounded-md">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chatbot;
