import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEnvelope, FaPhone } from 'react-icons/fa';
import '../Login/Login.css';

// Prefer environment variables (e.g., Vite: import.meta.env.VITE_API_URL, CRA: process.env.REACT_APP_API_URL)
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://candle-7jh2.onrender.com';

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
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMsg) setErrorMsg(''); // Clear error when user edits
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Client-side validation
    const { name, username, email, phone, password, confirmPassword } = formData;
    if (!name || !username || !email || !phone || !password || !confirmPassword) {
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

    try {
      // Exclude confirmPassword before sending payload to the backend
      const { confirmPassword: _, ...payload } = formData;

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }

      setSuccessMsg('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Could not connect to server. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleRegister} className="login-card" style={{ width: '450px' }}>
        <h2>Create Account</h2>

        {/* Feedback Messages */}
        {errorMsg && (
          <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ color: '#15803d', backgroundColor: '#dcfce7', padding: '8px 12px', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>
            {successMsg}
          </div>
        )}

        <div className="input-group">
          <label>Full Name</label>
          <div className="input-wrapper">
            <FaUser className="input-icon" />
            <input 
              type="text" 
              name="name"
              value={formData.name} 
              onChange={handleChange} 
              placeholder="e.g. Amit Kumar Samanta" 
              required 
            />
          </div>
        </div>

        <div className="input-group">
          <label>Username</label>
          <div className="input-wrapper">
            <FaUser className="input-icon" />
            <input 
              type="text" 
              name="username"
              value={formData.username} 
              onChange={handleChange} 
              placeholder="e.g. amit_admin" 
              required 
            />
          </div>
        </div>

        <div className="input-group">
          <label>Email Address</label>
          <div className="input-wrapper">
            <FaEnvelope className="input-icon" />
            <input 
              type="email" 
              name="email"
              value={formData.email} 
              onChange={handleChange} 
              placeholder="e.g. amit@example.com" 
              required 
            />
          </div>
        </div>

        <div className="input-group">
          <label>Phone Number</label>
          <div className="input-wrapper">
            <FaPhone className="input-icon" />
            <input 
              type="tel" 
              name="phone"
              value={formData.phone} 
              onChange={handleChange} 
              placeholder="+8801XXXXXXXXX" 
              required 
            />
          </div>
        </div>

        <div className="input-group">
          <label>Password</label>
          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input 
              type="password" 
              name="password"
              value={formData.password} 
              onChange={handleChange} 
              placeholder="Enter secure password" 
              required 
            />
          </div>
        </div>

        <div className="input-group">
          <label>Confirm Password</label>
          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input 
              type="password" 
              name="confirmPassword"
              value={formData.confirmPassword} 
              onChange={handleChange} 
              placeholder="Re-enter password" 
              required 
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
          <a 
            href="#login" 
            onClick={(e) => { e.preventDefault(); navigate('/login'); }}
          >
            Login here
          </a>
        </div>
      </form>
    </div>
  );
}