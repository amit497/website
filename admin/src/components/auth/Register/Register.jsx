import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEnvelope, FaPhone } from 'react-icons/fa';
import '../Login/Login.css';

// Default production backend URL (trailing slashes stripped)
const DEFAULT_API_BASE_URL = 'https://backend-nine-beta-31.vercel.app';

/**
 * Resolves the API Base URL with the following priority:
 * 1. Environment variables (Vite or Create-React-App)
 * 2. Local network/host resolution if running locally (Desktop & Mobile testing)
 * 3. Default production URL fallback
 */
export const getApiBaseUrl = () => {
  // 1. Check environment variables safely across bundlers
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.API_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL);

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Localhost & Local Area Network (LAN) fallback for mobile testing
  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;

    // Matches localhost, 127.0.0.1, or local subnet IPs (e.g., 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isLocalOrLAN =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

    if (isLocalOrLAN) {
      return `http://${hostname}:5000`;
    }
  }

  // 3. Fallback to production default
  return DEFAULT_API_BASE_URL.replace(/\/+$/, '');
};

// Export the resolved base URL directly for convenience
export const API_BASE_URL = getApiBaseUrl();

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedName = formData.name.trim();
    const trimmedUsername = formData.username.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const { password, confirmPassword } = formData;

    if (!trimmedName || !trimmedUsername || !trimmedEmail || !trimmedPhone || !password || !confirmPassword) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    const apiUrl = getApiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const payload = {
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail,
        phone: trimmedPhone,
        password
      };

      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Registration failed with status ${response.status}`);
      }

      setSuccessMsg('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error('Registration error details:', err);
      if (err.name === 'AbortError') {
        setErrorMsg('Connection timed out. The server took too long to respond. Please try again.');
      } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        setErrorMsg(`Cannot connect to backend server at ${apiUrl}. Ensure your backend is running and CORS is configured.`);
      } else {
        setErrorMsg(err.message || 'Registration failed. Please check your network and try again.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleRegister} className="login-card" style={{ maxWidth: '450px', width: '100%' }}>
        <h2>Create Account</h2>

        {errorMsg && (
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
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              color: '#15803d',
              backgroundColor: '#dcfce7',
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '15px',
              fontSize: '13px',
              border: '1px solid #86efac',
              lineHeight: '1.4'
            }}
          >
            {successMsg}
          </div>
        )}

        <div className="input-group">
          <label htmlFor="reg-name">Full Name</label>
          <div className="input-wrapper">
            <FaUser className="input-icon" />
            <input
              id="reg-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Amit Kumar Samanta"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="reg-username">Username</label>
          <div className="input-wrapper">
            <FaUser className="input-icon" />
            <input
              id="reg-username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="e.g. amit_admin"
              required
              disabled={loading}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="reg-email">Email Address</label>
          <div className="input-wrapper">
            <FaEnvelope className="input-icon" />
            <input
              id="reg-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. amit@example.com"
              required
              disabled={loading}
              autoCapitalize="none"
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="reg-phone">Phone Number</label>
          <div className="input-wrapper">
            <FaPhone className="input-icon" />
            <input
              id="reg-phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+8801XXXXXXXXX"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="reg-password">Password</label>
          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
              id="reg-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter secure password"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="reg-confirmPassword">Confirm Password</label>
          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
              id="reg-confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              required
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          className="login-btn"
          style={{ marginTop: '10px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>

        <div className="register-link" style={{ marginTop: '15px' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Login here
          </button>
        </div>
      </form>
    </div>
  );
}