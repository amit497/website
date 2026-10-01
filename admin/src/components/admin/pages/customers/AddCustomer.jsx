import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';

// Dynamic API Base URL resolver:
// 1. Uses VITE_API_URL if configured in .env
// 2. Otherwise dynamically detects the current browser hostname (e.g. 192.168.0.181) with port 5000
const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export default function AddCustomer() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('Active');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanPhone) {
      setFeedback({ type: 'error', message: 'Customer Name and Phone Number are required.' });
      return;
    }

    // Validate 10-digit phone number
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setFeedback({ type: 'error', message: 'Please enter a valid 10-digit phone number.' });
      return;
    }

    const token = getToken();
    if (!token) {
      setFeedback({ type: 'error', message: 'Authentication required. Please log in again.' });
      return;
    }

    setLoading(true);
    const API_BASE_URL = getApiBaseUrl();

    try {
      const response = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: cleanName,
          email: email.trim() ? email.trim().toLowerCase() : undefined,
          phone: cleanPhone,
          address: address.trim(),
          status
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Failed to save customer (Status ${response.status}).`);
      }

      setFeedback({ type: 'success', message: `Customer "${cleanName}" added successfully!` });

      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setStatus('Active');
    } catch (err) {
      console.error('Create customer error:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch') 
          ? `Cannot connect to server at ${API_BASE_URL}. Check if port 5000 is open in firewall.` 
          : (err.message || 'Network error occurred.') 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ marginBottom: '20px', color: '#333', fontSize: '1.5rem' }}>Add New Customer</h2>

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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Customer Name *</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="e.g. Ramesh Chandra" 
            required 
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none' }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Phone Number *</label>
          <input 
            type="tel" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            placeholder="+91 9876543210" 
            required 
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none' }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Email Address</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="e.g. ramesh@example.com" 
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none' }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Delivery / Billing Address</label>
          <textarea 
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
            placeholder="Shop no, street, city, state, pin code..." 
            rows="3" 
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', resize: 'vertical' }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)} 
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', background: '#fff' }}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            padding: '12px 20px', 
            background: '#4f46e5', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '6px', 
            fontWeight: 'bold', 
            fontSize: '15px', 
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background 0.2s',
            marginTop: '6px'
          }}
        >
          <FaPlus /> {loading ? 'Saving Customer...' : 'Save Customer'}
        </button>
      </form>
    </div>
  );
}