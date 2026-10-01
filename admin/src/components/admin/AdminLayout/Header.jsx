import { useState, useRef, useEffect } from 'react';
import { FaBars, FaUserCircle, FaCog, FaSignOutAlt, FaTimes } from 'react-icons/fa';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'candle-7jh2.onrender.com';

export default function Header({ toggleSidebar, handleLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // User State (pre-populated from storage if present, updated from API)
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: '', text: '' });

  // Get Auth Token Helper
  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live profile details on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (response.status === 401) {
          handleLogout();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setUserData(data.user);
          // Sync storage with latest details
          if (localStorage.getItem('token')) {
            localStorage.setItem('user', JSON.stringify(data.user));
          } else {
            sessionStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, [handleLogout]);

  // Submit Password Change
  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', text: '' });

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'Please fill out all fields.' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordStatus({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    const token = getToken();
    if (!token) {
      handleLogout();
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update password.');
      }

      setPasswordStatus({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordStatus({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      setPasswordStatus({ type: 'error', text: err.message || 'Server error.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const displayName = userData?.name || 'Administrator';

  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="collapse-btn" onClick={toggleSidebar}>
          <FaBars />
        </button>
        <h2>Welcome back, {displayName}!</h2>
      </div>

      {/* User Profile & Dropdown */}
      <div className="header-right" ref={dropdownRef}>
        <div 
          className="user-profile-trigger" 
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <FaUserCircle className="user-avatar-icon" />
          <span className="user-name">{displayName}</span>
        </div>

        {dropdownOpen && (
          <div className="user-dropdown-menu">
            <div className="dropdown-user-info" style={{ padding: '10px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
              <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{displayName}</div>
              <div style={{ textTransform: 'capitalize' }}>Role: {userData?.role || 'User'}</div>
              <div>{userData?.email}</div>
            </div>
            
            <a href="#profile" onClick={(e) => { e.preventDefault(); setDropdownOpen(false); setIsProfileModalOpen(true); }}>
              <FaUserCircle /> My Profile
            </a>
            
            <a href="#settings" onClick={(e) => { e.preventDefault(); setDropdownOpen(false); setIsPasswordModalOpen(true); }}>
              <FaCog /> Change Password
            </a>
            
            <div className="dropdown-divider"></div>
            
            <button className="dropdown-logout" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        )}
      </div>

      {/* My Profile Modal */}
      {isProfileModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '420px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative' }}>
            <button onClick={() => setIsProfileModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><FaTimes /></button>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>User Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155' }}>
              <div><strong>Name:</strong> {userData?.name || 'N/A'}</div>
              <div><strong>Username:</strong> {userData?.username || 'N/A'}</div>
              <div><strong>Email:</strong> {userData?.email || 'N/A'}</div>
              <div><strong>Phone:</strong> {userData?.phone || 'N/A'}</div>
              <div><strong>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{userData?.role || 'User'}</span></div>
              <div><strong>Status:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>● Active</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '420px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative' }}>
            <button onClick={() => setIsPasswordModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><FaTimes /></button>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Change Password</h3>

            {passwordStatus.text && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '13px',
                color: passwordStatus.type === 'error' ? '#b91c1c' : '#15803d',
                backgroundColor: passwordStatus.type === 'error' ? '#fee2e2' : '#dcfce7',
                border: `1px solid ${passwordStatus.type === 'error' ? '#fca5a5' : '#86efac'}`
              }}>
                {passwordStatus.text}
              </div>
            )}
            
            <form onSubmit={handlePasswordChangeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Current Password</label>
                <input 
                  type="password" 
                  value={passwordData.currentPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} 
                  required 
                  disabled={passwordLoading}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>New Password</label>
                <input 
                  type="password" 
                  value={passwordData.newPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                  required 
                  disabled={passwordLoading}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Confirm New Password</label>
                <input 
                  type="password" 
                  value={passwordData.confirmPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                  required 
                  disabled={passwordLoading}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} disabled={passwordLoading} style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}>Cancel</button>
                <button type="submit" disabled={passwordLoading} style={{ padding: '8px 14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: passwordLoading ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: passwordLoading ? 0.7 : 1 }}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}