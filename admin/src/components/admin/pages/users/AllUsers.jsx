import { useState, useEffect } from 'react';
import { FaSearch, FaUserPlus, FaTrash, FaEdit, FaEye, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Dynamic API Base URL resolver:
// 1. Checks VITE_API_URL from .env
// 2. Otherwise dynamically detects current browser hostname (e.g. 192.168.0.181) with port 5000
const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export default function AllUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [selectedUser, setSelectedUser] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'Customer',
    status: 'Active'
  });
  const [updating, setUpdating] = useState(false);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const formatDate = (isoDate) => {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  // 1. Fetch all users from Backend
  const fetchUsers = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: {
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setUsers(Array.isArray(data) ? data : data.users || data.data || []);
      } else {
        throw new Error(data.message || `Failed to load users (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      setFeedback({
        type: 'error',
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Error fetching users from server.')
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. Handle Delete User
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;

    const token = getToken();
    if (!token) {
      alert('Authentication required. Please log in.');
      return;
    }

    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete user.');

      setUsers((prev) => prev.filter((u) => (u._id || u.id) !== id));
      setFeedback({ type: 'success', message: 'User deleted successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error deleting user.')
      );
    }
  };

  // View modal helper
  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  // Open edit modal with selected user data
  const handleOpenEditModal = (user) => {
    setEditFormData({
      id: user._id || user.id,
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Customer',
      status: user.status ? (user.status.charAt(0).toUpperCase() + user.status.slice(1)) : 'Active'
    });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  // 3. Handle Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      alert('Authentication required. Please log in.');
      return;
    }

    setUpdating(true);
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${editFormData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          username: editFormData.username.trim().toLowerCase(),
          email: editFormData.email.trim().toLowerCase(),
          phone: editFormData.phone.trim(),
          role: editFormData.role,
          status: editFormData.status
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update user.');

      setUsers((prev) =>
        prev.map((u) => ((u._id || u.id) === editFormData.id ? { ...u, ...editFormData } : u))
      );
      setIsEditModalOpen(false);
      setFeedback({ type: 'success', message: 'User updated successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error updating user.')
      );
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const name = u.name?.toLowerCase() || '';
    const username = u.username?.toLowerCase() || '';
    const email = u.email?.toLowerCase() || '';
    const phone = u.phone || '';
    const q = searchTerm.toLowerCase();

    return name.includes(q) || username.includes(q) || email.includes(q) || phone.includes(q);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 4px 0' }}>All System Users</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Manage administrators, staff, and customer accounts.</p>
        </div>
        <Link 
          to="/admin/users/add"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none', cursor: 'pointer' }}
        >
          <FaUserPlus /> Add New User
        </Link>
      </div>

      {feedback.message && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px',
          color: feedback.type === 'error' ? '#b91c1c' : '#15803d',
          backgroundColor: feedback.type === 'error' ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${feedback.type === 'error' ? '#fca5a5' : '#86efac'}`
        }}>
          {feedback.message}
        </div>
      )}

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '12px' }} />
        <input 
          type="text" 
          placeholder="Search by name, username, email, or phone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
        />
      </div>

      {/* Users Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px' }}>User ID</th>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Username</th>
              <th style={{ padding: '12px' }}>Email</th>
              <th style={{ padding: '12px' }}>Phone</th>
              <th style={{ padding: '12px' }}>Role</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Joined Date</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading registered users...</td></tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const userId = u._id || u.id;
                const userCode = String(userId).slice(-4).toUpperCase();
                const roleCapitalized = u.role ? (u.role.charAt(0).toUpperCase() + u.role.slice(1).toLowerCase()) : 'Customer';
                const statusCapitalized = u.status ? (u.status.charAt(0).toUpperCase() + u.status.slice(1).toLowerCase()) : 'Active';

                return (
                  <tr key={userId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: 'bold' }}>#USR-{userCode}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{u.name}</td>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: '500' }}>@{u.username}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{u.email}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{u.phone || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 'bold', 
                        background: roleCapitalized === 'Admin' ? '#e0e7ff' : roleCapitalized === 'Staff' ? '#fef3c7' : '#f1f5f9', 
                        color: roleCapitalized === 'Admin' ? '#4f46e5' : roleCapitalized === 'Staff' ? '#d97706' : '#475569' 
                      }}>
                        {roleCapitalized}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color: statusCapitalized === 'Active' ? '#059669' : '#dc2626', fontWeight: '600', fontSize: '12px' }}>
                        ● {statusCapitalized}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#64748b' }}>
                      {formatDate(u.createdAt || u.date)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button onClick={() => handleViewUser(u)} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }} title="View Details">
                          <FaEye />
                        </button>
                        <button onClick={() => handleOpenEditModal(u)} style={{ background: '#fef3c7', color: '#d97706', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }} title="Edit User">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete(userId)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }} title="Delete User">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View User Modal Popup */}
      {isViewModalOpen && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '420px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative' }}>
            <button onClick={() => setIsViewModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem' }}><FaTimes /></button>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>User Profile Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155' }}>
              <div><strong>Full Name:</strong> {selectedUser.name}</div>
              <div><strong>Username:</strong> @{selectedUser.username}</div>
              <div><strong>Email:</strong> {selectedUser.email}</div>
              <div><strong>Phone:</strong> {selectedUser.phone || '-'}</div>
              <div><strong>System Role:</strong> {selectedUser.role}</div>
              <div><strong>Account Status:</strong> {selectedUser.status}</div>
              <div><strong>Joined Date:</strong> {formatDate(selectedUser.createdAt || selectedUser.date)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal Popup */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '480px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative' }}>
            <button onClick={() => setIsEditModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem' }}><FaTimes /></button>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Edit User Information</h3>
            
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Username *</label>
                <input type="text" name="username" value={editFormData.username} onChange={handleEditChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Email *</label>
                <input type="email" name="email" value={editFormData.email} onChange={handleEditChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Phone *</label>
                <input type="text" name="phone" value={editFormData.phone} onChange={handleEditChange} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Role</label>
                  <select name="role" value={editFormData.role} onChange={handleEditChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                    <option value="Customer">Customer</option>
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Status</label>
                  <select name="status" value={editFormData.status} onChange={handleEditChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}>Cancel</button>
                <button type="submit" disabled={updating} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: updating ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}