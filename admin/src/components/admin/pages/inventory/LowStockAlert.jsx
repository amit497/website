import { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaSearch, FaTimes, FaPlus } from 'react-icons/fa';

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

export default function LowStockAlert() {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [threshold, setThreshold] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Quick Restock Modal States
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addQuantity, setAddQuantity] = useState('');
  const [restocking, setRestocking] = useState(false);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // Fetch low-stock items from backend
  const fetchLowStockProducts = async (currentThreshold) => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/alerts/low-stock?threshold=${currentThreshold}`, {
        headers: { 
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setLowStockItems(Array.isArray(data) ? data : data.products || []);
      } else {
        throw new Error(data.message || `Failed to load alerts (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Fetch low stock error:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Error fetching low stock items.') 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStockProducts(threshold);
  }, [threshold]);

  // Open Restock Modal
  const handleOpenRestock = (product) => {
    setSelectedProduct(product);
    setAddQuantity('');
    setIsRestockModalOpen(true);
  };

  // Submit Restock to Backend
  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(addQuantity);
    if (!qty || qty <= 0) {
      alert('Please enter a valid stock quantity to add.');
      return;
    }

    setRestocking(true);
    const API_BASE_URL = getApiBaseUrl();
    const prodId = selectedProduct._id || selectedProduct.id;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${prodId}/restock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ addedStock: qty })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update stock');

      setFeedback({
        type: 'success',
        message: `Successfully added ${qty} units to ${selectedProduct.name}!`
      });

      setIsRestockModalOpen(false);
      fetchLowStockProducts(threshold); // Refresh list
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check your network connection.`
          : (err.message || 'Error updating stock.')
      );
    } finally {
      setRestocking(false);
    }
  };

  const filteredItems = lowStockItems.filter((item) => {
    const name = item.name?.toLowerCase() || '';
    const sku = (item.sku || '').toLowerCase();
    const cat = (item.category?.name || item.category || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    return name.includes(query) || sku.includes(query) || cat.includes(query);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '10px', color: '#dc2626' }}>
            <FaExclamationTriangle size={22} />
          </div>
          <div>
            <h2 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 4px 0' }}>Low Stock & Out of Stock Alerts</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Immediate inventory alerts for items running low or out of stock.</p>
          </div>
        </div>

        {/* Threshold Controller */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Alert Threshold:</span>
          <select 
            value={threshold} 
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', outline: 'none', background: '#fff', fontWeight: 'bold', color: '#4f46e5' }}
          >
            <option value="5">≤ 5 Units</option>
            <option value="10">≤ 10 Units</option>
            <option value="15">≤ 15 Units</option>
            <option value="20">≤ 20 Units</option>
            <option value="30">≤ 30 Units</option>
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
          placeholder="Search alerts by product name, SKU, or category..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px' }}>SKU</th>
              <th style={{ padding: '12px' }}>Product Name</th>
              <th style={{ padding: '12px' }}>Category</th>
              <th style={{ padding: '12px' }}>Current Stock</th>
              <th style={{ padding: '12px' }}>Min Threshold</th>
              <th style={{ padding: '12px' }}>Alert Status</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Checking stock levels...</td></tr>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const prodId = item._id || item.id;
                const isOutOfStock = (item.stock || 0) <= 0;
                const skuCode = item.sku || `SKU-${String(prodId).slice(-4).toUpperCase()}`;

                return (
                  <tr key={prodId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: 'bold' }}>{skuCode}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{item.name}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{item.category?.name || item.category || '-'}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: isOutOfStock ? '#dc2626' : '#d97706' }}>
                      {item.stock || 0} Units
                    </td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{threshold} Units</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', 
                        background: isOutOfStock ? '#fee2e2' : '#fef3c7', 
                        color: isOutOfStock ? '#dc2626' : '#d97706' 
                      }}>
                        {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleOpenRestock(item)}
                        style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <FaPlus size={10} /> Quick Restock
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>
                  All stock levels are healthy above {threshold} units! No alerts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Restock Modal */}
      {isRestockModalOpen && selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '380px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', position: 'relative' }}>
            <button 
              onClick={() => setIsRestockModalOpen(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem' }}
            >
              <FaTimes />
            </button>

            <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Restock Inventory</h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#64748b' }}>
              Product: <strong>{selectedProduct.name}</strong> (Current: {selectedProduct.stock || 0} Units)
            </p>

            <form onSubmit={handleRestockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '5px' }}>Units to Add *</label>
                <input 
                  type="number" 
                  min="1" 
                  value={addQuantity} 
                  onChange={(e) => setAddQuantity(e.target.value)} 
                  placeholder="e.g. 50" 
                  required 
                  autoFocus
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsRestockModalOpen(false)} 
                  disabled={restocking}
                  style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={restocking}
                  style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: restocking ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: restocking ? 0.7 : 1 }}
                >
                  {restocking ? 'Updating...' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}