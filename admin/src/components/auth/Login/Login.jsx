import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa';
import './Login.css';

// সক্রিয় লাইভ ব্যাকএন্ড প্রোডাকশন ডোমেইন
const DEFAULT_API_BASE_URL = 'https://backend-gamma-umber-55.vercel.app';

const getApiBaseUrl = () => {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.API_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL);

  if (envUrl) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_API_BASE_URL;
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

    const apiUrl = getApiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Login failed with status code ${response.status}`);
      }

      if (!data.token) {
        throw new Error('No authentication token returned by the server.');
      }

      // Store in localStorage if rememberMe is true, otherwise use sessionStorage
      const storage = rememberMe ? localStorage : sessionStorage;
      
      // Clean up opposite storage to avoid stale credential conflicts
      (rememberMe ? sessionStorage : localStorage).removeItem('token');
      (rememberMe ? sessionStorage : localStorage).removeItem('user');

      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user || {}));
      
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      if (typeof setIsAuthenticated === 'function') {
        setIsAuthenticated(true);
      }

      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error details:', err);
      if (err.name === 'AbortError') {
        setErrorMessage('Connection timed out. The server took too long to respond. Please try again.');
      } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        setErrorMessage(`Cannot connect to backend server at ${apiUrl}. Ensure your backend is running and CORS is configured.`);
      } else {
        setErrorMessage(err.message || 'Invalid login credentials.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-card">
        <h2>Admin Login</h2>

        {errorMessage && (
          <div
            style={{
              color: '#dc2626',
              backgroundColor: '#fee2e2',
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '15px',
              fontSize: '13px',
              border: '1px solid #fca5a5',
              lineHeight: '1.4'
            }}
          >
            {errorMessage}
          </div>
        )}

        <div className="input-group">
          <label htmlFor="login-username">Username or Email</label>
          <div className="input-wrapper">
            <FaUser className="input-icon" />
            <input
              id="login-username"
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
          <label htmlFor="login-password">Password</label>
          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
              id="login-password"
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
          <button
            type="button"
            onClick={() => navigate('/auth/forgot-password')}
            className="forgot-password"
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
          >
            Forgot Password?
          </button>
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
          <button
            type="button"
            onClick={() => navigate('/auth/register')}
            style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Register
          </button>
        </div>
      </form>
    </div>
  );
}