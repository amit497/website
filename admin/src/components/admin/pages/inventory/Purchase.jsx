import { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaTimes, FaEdit, FaTrash, FaBoxes } from 'react-icons/fa';

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

export default function Purchase() {
  const [searchTerm, setSearchTerm] = useState('');
  const [purchases, setPurchases] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [supplier, setSupplier] = useState('');
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [perCost, setPerCost] = useState('');
  const [status, setStatus] = useState('Pending');

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const formatPrice = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Auto calculate total cost
  const totalCalculatedCost = (Number(qty) || 0) * (Number(perCost) || 0);

  // 1. Fetch Purchases and Products
  const fetchPurchases = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchases`, {
        headers: { 
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setPurchases(Array.isArray(data) ? data : data.purchases || []);
      } else {
        throw new Error(data.message || `Failed to load purchases (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Error fetching purchases.') 
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const API_BASE_URL = getApiBaseUrl();
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?status=active`, {
        headers: { 
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAvailableProducts(Array.isArray(data) ? data : data.products || []);
      }
    } catch (err) {
      console.error('Error fetching products list:', err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
  }, []);

  // Modal open handlers
  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setSupplier('');
    setProductId('');
    setProductName('');
    setQty('');
    setUnit('Pcs');
    setPerCost('');
    setStatus('Pending');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setIsEditMode(true);
    setCurrentId(p._id || p.id);
    setSupplier(p.supplier || '');
    setProductId(p.product?._id || p.product || '');
    setProductName(p.productName || '');
    setQty(p.quantity || '');
    setUnit(p.unit || 'Pcs');
    setPerCost(p.perCost || '');
    setStatus(p.status || 'Pending');
    setIsModalOpen(true);
  };

  const handleProductSelect = (selectedId) => {
    setProductId(selectedId);
    const prod = availableProducts.find((p) => (p._id || p.id) === selectedId);
    if (prod) {
      setProductName(prod.name);
    } else {
      setProductName('');
    }
  };

  // Direct status update from table dropdown
  const handleStatusChange = async (purchaseId, newStatus) => {
    const API_BASE_URL = getApiBaseUrl();
    try {
      const res = await fetch(`${API_BASE_URL}/api/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Status update failed.');

      setPurchases((prev) =>
        prev.map((p) => ((p._id || p.id) === purchaseId ? { ...p, status: newStatus } : p))
      );

      setFeedback({
        type: 'success',
        message: newStatus === 'Received' 
          ? 'Purchase marked as Received. Inventory stock incremented!' 
          : 'Purchase status updated.'
      });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error updating status.')
      );
    }
  };

  // Delete Purchase Order
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) return;

    const API_BASE_URL = getApiBaseUrl();
    try {
      const res = await fetch(`${API_BASE_URL}/api/purchases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete purchase order.');

      setPurchases((prev) => prev.filter((p) => (p._id || p.id) !== id));
      setFeedback({ type: 'success', message: 'Purchase order deleted successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error deleting purchase order.')
      );
    }
  };

  // Submit Add or Edit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplier.trim() || !productId || !qty || !perCost) {
      alert('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    const API_BASE_URL = getApiBaseUrl();
    const payload = {
      supplier: supplier.trim(),
      productId,
      productName,
      quantity: Number(qty),
      unit,
      perCost: Number(perCost),
      status
    };

    try {
      let res;
      if (isEditMode) {
        res = await fetch(`${API_BASE_URL}/api/purchases/${currentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE_URL}/api/purchases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to save purchase order.');

      setFeedback({
        type: 'success',
        message: isEditMode 
          ? 'Purchase order updated successfully!' 
          : 'Purchase order created successfully!'
      });

      setIsModalOpen(false);
      fetchPurchases();
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error processing request.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const supp = p.supplier?.toLowerCase() || '';
    const poNum = p.orderNo?.toLowerCase() || '';
    const prod = p.productName?.toLowerCase() || '';
    const q = searchTerm.toLowerCase();

    return supp.includes(q) || poNum.includes(q) || prod.includes(q);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '8px', color: '#4f46e5' }}>
            <FaBoxes size={20} />
          </div>
          <div>
            <h2 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 4px 0' }}>Purchase & Restock Management</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Manage supplier purchase orders and incoming inventory.</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAddModal}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
        >
          <FaPlus /> New Purchase Order
        </button>
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
          placeholder="Search by PO number, supplier, or product..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
        />
      </div>

      {/* Purchase Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px' }}>PO Number</th>
              <th style={{ padding: '12px' }}>Supplier Name</th>
              <th style={{ padding: '12px' }}>Product Name</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Quantity</th>
              <th style={{ padding: '12px' }}>Cost / Unit</th>
              <th style={{ padding: '12px' }}>Total Cost</th>
              <th style={{ padding: '12px' }}>Date</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading purchase records...</td></tr>
            ) : filteredPurchases.length > 0 ? (
              filteredPurchases.map((p) => {
                const poId = p._id || p.id;
                const isReceived = p.status === 'Received';

                return (
                  <tr key={poId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: 'bold' }}>{p.orderNo}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{p.supplier}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{p.productName}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>
                      {p.quantity} {p.unit || 'Pcs'}
                    </td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{formatPrice(p.perCost)}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#059669' }}>
                      {formatPrice(p.totalCost)}
                    </td>
                    <td style={{ padding: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : p.date || '-'}
                    </td>
                    
                    {/* Status Dropdown inside Table */}
                    <td style={{ padding: '12px' }}>
                      <select 
                        value={p.status} 
                        onChange={(e) => handleStatusChange(poId, e.target.value)}
                        style={{ 
                          padding: '5px 8px', 
                          borderRadius: '6px', 
                          fontSize: '12px', 
                          fontWeight: '700', 
                          border: '1px solid #cbd5e1',
                          background: isReceived ? '#d1fae5' : '#fef3c7', 
                          color: isReceived ? '#059669' : '#d97706', 
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Received">Received</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>

                    <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button 
                          onClick={() => handleOpenEditModal(p)} 
                          style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Edit PO"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(poId)} 
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Delete PO"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No purchase records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Purchase Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '28px', borderRadius: '12px', width: '420px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
            >
              <FaTimes />
            </button>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>
              {isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Supplier Name *</label>
                <input 
                  type="text" 
                  value={supplier} 
                  onChange={(e) => setSupplier(e.target.value)} 
                  placeholder="e.g. Parakh Wax Corp" 
                  required 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Select Product *</label>
                <select 
                  value={productId} 
                  onChange={(e) => handleProductSelect(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">-- Choose Catalog Product --</option>
                  {availableProducts.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} (Current Stock: {p.stock || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Quantity *</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={qty} 
                    onChange={(e) => setQty(e.target.value)} 
                    placeholder="0" 
                    required 
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} 
                  />
                </div>
                <div style={{ flex: 1.2 }}>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Unit</label>
                  <select 
                    value={unit} 
                    onChange={(e) => setUnit(e.target.value)} 
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Gram">Gram</option>
                    <option value="Box">Box</option>
                    <option value="Packet">Packet</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Cost / Unit (₹) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={perCost} 
                  onChange={(e) => setPerCost(e.target.value)} 
                  placeholder="0.00" 
                  required 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Order Status</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)} 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Received">Received (Instantly increments stock)</option>
                </select>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Calculated Total Cost:</span>
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#059669' }}>{formatPrice(totalCalculatedCost)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={submitting} 
                  style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Processing...' : (isEditMode ? 'Update PO' : 'Save PO')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}