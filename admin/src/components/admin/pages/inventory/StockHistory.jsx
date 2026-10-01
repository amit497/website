import { useState, useEffect } from 'react';
import { FaHistory, FaSearch, FaFilter, FaArrowUp, FaArrowDown } from 'react-icons/fa';

// Dynamic API Base URL resolver:
// 1. Checks VITE_API_URL from .env
// 2. Otherwise dynamically detects current browser hostname (e.g., 192.168.0.181) with port 5000
const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export default function StockHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // Format Date and Time
  const formatDateTime = (isoDate) => {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Fetch Stock History from Backend
  const fetchStockHistory = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      let url = `${API_BASE_URL}/api/stock-history`;
      if (filterType !== 'All') {
        url += `?type=${encodeURIComponent(filterType)}`;
      }

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setHistory(Array.isArray(data) ? data : data.history || []);
      } else {
        throw new Error(data.message || `Failed to fetch logs (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Error fetching stock history:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Error loading stock history.') 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockHistory();
  }, [filterType]);

  // Filter items by search bar
  const filteredHistory = history.filter((h) => {
    const pName = h.productName?.toLowerCase() || '';
    const ref = h.reference?.toLowerCase() || '';
    const user = h.handledBy?.toLowerCase() || '';
    const q = searchTerm.toLowerCase();

    return pName.includes(q) || ref.includes(q) || user.includes(q);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '8px', color: '#4f46e5' }}>
            <FaHistory size={20} />
          </div>
          <div>
            <h2 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 4px 0' }}>Stock Movement History</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Audit log tracking all stock additions, deductions, and sales in real time.</p>
          </div>
        </div>

        {/* Movement Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFilter size={12} color="#64748b" />
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f8fafc', color: '#334155', cursor: 'pointer' }}
          >
            <option value="All">All Movements</option>
            <option value="Stock In">Stock In (+)</option>
            <option value="Stock Out">Stock Out (-)</option>
          </select>
        </div>
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

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '12px' }} />
        <input 
          type="text" 
          placeholder="Search by product name, reference, or handled by..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
        />
      </div>

      {/* Audit Log Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px' }}>Date & Time</th>
              <th style={{ padding: '12px' }}>Product Name</th>
              <th style={{ padding: '12px' }}>Movement Type</th>
              <th style={{ padding: '12px' }}>Quantity</th>
              <th style={{ padding: '12px' }}>Previous & New</th>
              <th style={{ padding: '12px' }}>Reference</th>
              <th style={{ padding: '12px' }}>Handled By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading stock audit logs...</td></tr>
            ) : filteredHistory.length > 0 ? (
              filteredHistory.map((h) => {
                const isStockIn = h.type === 'Stock In';
                const qtyVal = Number(h.quantity);
                const displayQty = isStockIn ? `+${Math.abs(qtyVal)}` : `-${Math.abs(qtyVal)}`;

                return (
                  <tr key={h._id || h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDateTime(h.createdAt || h.date)}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>
                      {h.productName}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', 
                        background: isStockIn ? '#d1fae5' : '#fee2e2', 
                        color: isStockIn ? '#059669' : '#dc2626' 
                      }}>
                        {isStockIn ? <FaArrowUp size={9} /> : <FaArrowDown size={9} />} {h.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: '700', color: isStockIn ? '#059669' : '#dc2626' }}>
                      {displayQty} Units
                    </td>
                    <td style={{ padding: '12px', color: '#64748b', fontSize: '12px' }}>
                      {h.previousStock !== undefined && h.newStock !== undefined
                        ? `${h.previousStock} → ${h.newStock}` 
                        : '-'}
                    </td>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: '600' }}>
                      {h.reference || '-'}
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>
                      {h.handledBy || 'System'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No stock movement records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}