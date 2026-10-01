import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa';
import './Login.css';

// Checks for VITE_API_URL or VITE_API_BASE_URL; falls back to localhost only in dev mode
const getApiBaseUrl = () => {
  const envUrl = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  // If in production on Vercel but env var is missing, don't invent a broken :5000 URL
  if (import.meta.env?.PROD) {
    console.warn('VITE_API_URL environment variable is missing in production!');
  }
  return 'http://localhost:5000';
};

export default function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMessage('Please enter both username/email and password.');
      return;
    }

    setLoading(true);

    const API_BASE_URL = getApiBaseUrl();

    try {
      // Abort controller timeout extended to 45s to account for Render free tier spin-up
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: trimmedUser,
          email: trimmedUser,
          password: trimmedPass
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Login failed with status code ${response.status}`);
      }

      if (!data.token) {
        throw new Error('No authentication token returned by the server.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      if (typeof setIsAuthenticated === 'function') {
        setIsAuthenticated(true);
      }

      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error details:', err);
      if (err.name === 'AbortError') {
        setErrorMessage('Connection timed out. The backend server might be waking up from sleep. Please try again.');
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setErrorMessage(`Cannot connect to backend server at ${API_BASE_URL}. Ensure your Render backend is running and CORS is configured.`);
      } else {
        setErrorMessage(err.message || 'Invalid login credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-card">
        <h2>Admin Login</h2>

        {errorMessage && (
          <div style={{
            color: '#dc2626',
            backgroundColor: '#fee2e2',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '13px',
            border: '1px solid #fca5a5',
            lineHeight: '1.4'
          }}>
            {errorMessage}
          </div>
        )}

        <div className="input-group">
          <label>Username or Email</label>
          <div className="input-wrapper">
            <FaUser className="input-icon" />
            <input 
              type="text" 
              value={username} 
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMessage) setErrorMessage('');
              }} 
              placeholder="Enter your username or email" 
              required 
              disabled={loading}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
        </div>

        <div className="input-group">
          <label>Password</label>
          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input 
              type="password" 
              value={password} 
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage('');
              }} 
              placeholder="••••••••" 
              required 
              disabled={loading}
            />
          </div>
        </div>

        <div className="login-options">
          <label className="remember-me">
            <input 
              type="checkbox" 
              checked={rememberMe} 
              onChange={(e) => setRememberMe(e.target.checked)} 
              disabled={loading}
            />
            Remember Me
          </label>
          <a 
            href="#forgot" 
            onClick={(e) => { e.preventDefault(); navigate('/auth/forgot-password'); }} 
            className="forgot-password"
          >
            Forgot Password?
          </a>
        </div>

        <button 
          type="submit" 
          className="login-btn" 
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div className="register-link">
          Don't have an account?{' '}
          <a 
            href="#register" 
            onClick={(e) => { e.preventDefault(); navigate('/auth/register'); }}
          >
            Register
          </a>
        </div>
      </form>
    </div>
  );
}