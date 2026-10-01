import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import '../Login/Login.css';; // Shares the exact same styling as Login

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleResetSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      alert('Please enter your registered email address.');
      return;
    }

    // Here you would typically trigger your backend password reset API
    console.log('Password reset link sent to:', email);
    setIsSubmitted(true);
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ width: '420px' }}>
        <h2>Reset Password</h2>
        
        {!isSubmitted ? (
          <>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', textAlign: 'center' }}>
              Enter your email address below and we will send you instructions to reset your password.
            </p>

            <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="input-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <FaEnvelope className="input-icon" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="e.g. amit@example.com" 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="login-btn">
                Send Reset Instructions
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: '14px', color: '#059669', fontWeight: '600', marginBottom: '15px' }}>
              Reset link sent successfully! Please check your email inbox.
            </p>
            <button 
              onClick={() => navigate('/login')} 
              className="login-btn"
            >
              Back to Login
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a 
            href="#login" 
            onClick={(e) => { e.preventDefault(); navigate('/auth/login'); }}
            style={{ fontSize: '13px', color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}
          >
            <FaArrowLeft size={11} /> Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}