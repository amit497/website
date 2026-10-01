import { useState, useEffect } from 'react';
import { 
  FaSearch, 
  FaTimes, 
  FaBoxes, 
  FaPlus, 
  FaHistory, 
  FaArrowUp, 
  FaArrowDown, 
  FaFileExcel, 
  FaPrint 
} from 'react-icons/fa';

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

export default function StockManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [addQty, setAddQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [updating, setUpdating] = useState(false);

  // Product Stock Ledger History State
  const [stockLedger, setStockLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

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

  const formatDate = (isoDate) => {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  // Compute badge status based on stock count
  const getStockStatus = (stock) => {
    const qty = Number(stock || 0);
    if (qty <= 0) return { label: 'Out of Stock', bg: '#fee2e2', color: '#dc2626' };
    if (qty <= 15) return { label: 'Low Stock', bg: '#fef3c7', color: '#d97706' };
    return { label: 'In Stock', bg: '#d1fae5', color: '#059669' };
  };

  // 1. Fetch live product stocks
  const fetchProductStocks = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        headers: {
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStocks(Array.isArray(data) ? data : data.products || []);
      } else {
        throw new Error(data.message || `Failed to fetch inventory (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Error fetching stocks:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Error loading stock data.') 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductStocks();
  }, []);

  // 2. Fetch specific product's stock additions ledger
  const fetchProductLedger = async (productId) => {
    setLoadingLedger(true);
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/stock-ledger`, {
        headers: { 
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStockLedger(data.ledger || []);
      } else {
        setStockLedger([]);
      }
    } catch (err) {
      console.error('Failed to load stock ledger:', err);
      setStockLedger([]);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Open modal for adding stock & load product ledger
  const handleOpenEditModal = (item) => {
    setCurrentItem(item);
    setAddQty('');
    setAdjustmentReason('Inventory Addition / Restock');
    setIsModalOpen(true);
    fetchProductLedger(item._id || item.id);
  };

  // Calculate live preview of updated stock
  const currentOldStock = Number(currentItem?.stock || 0);
  const enteredQty = Number(addQty) || 0;
  const calculatedNewStock = currentOldStock + enteredQty;

  // 3. Submit Stock Addition to Backend
  const handleUpdateStock = async (e) => {
    e.preventDefault();
    const qtyToAdd = Number(addQty);

    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      alert('Please enter a valid stock quantity to add (greater than 0).');
      return;
    }

    setUpdating(true);
    const API_BASE_URL = getApiBaseUrl();
    const prodId = currentItem._id || currentItem.id;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${prodId}/adjust-stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          addStock: qtyToAdd,
          reason: adjustmentReason.trim() || 'Manual Stock Addition'
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update stock');

      const updatedTotal = data.product?.stock !== undefined ? data.product.stock : calculatedNewStock;

      setFeedback({
        type: 'success',
        message: `Successfully added ${qtyToAdd} units to "${currentItem.name}". Total Stock is now ${updatedTotal} units!`
      });

      // Update state locally
      setStocks((prev) =>
        prev.map((p) => ((p._id || p.id) === prodId ? { ...p, stock: updatedTotal } : p))
      );

      // Reset form and reload product ledger history
      setCurrentItem((prev) => ({ ...prev, stock: updatedTotal }));
      setAddQty('');
      fetchProductLedger(prodId);
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error saving stock addition.')
      );
    } finally {
      setUpdating(false);
    }
  };

  // 4. Download Ledger as Excel/CSV
  const handleDownloadCSV = () => {
    if (!stockLedger || stockLedger.length === 0) {
      alert('No stock movement records available to download.');
      return;
    }

    const headers = ['Date & Time', 'Product Name', 'Movement Type', 'Quantity', 'Previous Stock', 'New Stock', 'Reference', 'Handled By'];

    const rows = stockLedger.map((log) => {
      const formattedDate = `"${formatDateTime(log.createdAt || log.date)}"`;
      const pName = `"${(currentItem.name || log.productName || '').replace(/"/g, '""')}"`;
      const type = `"${log.type || ''}"`;
      const qty = log.quantity || 0;
      const prev = log.previousStock !== undefined ? log.previousStock : '-';
      const newStk = log.newStock !== undefined ? log.newStock : '-';
      const ref = `"${(log.reference || '').replace(/"/g, '""')}"`;
      const user = `"${(log.handledBy || 'System').replace(/"/g, '""')}"`;

      return [formattedDate, pName, type, qty, prev, newStk, ref, user].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fileName = `${currentItem.name.replace(/[^a-zA-Z0-9]/g, '_')}_Stock_Ledger.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 5. Print / Save Ledger as PDF
  const handlePrintLedger = () => {
    window.print();
  };

  const filteredStocks = stocks.filter((item) => {
    const name = item.name?.toLowerCase() || '';
    const sku = (item.sku || '').toLowerCase();
    const cat = (item.category?.name || item.category || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    return name.includes(query) || sku.includes(query) || cat.includes(query);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '8px', color: '#4f46e5' }}>
            <FaBoxes size={20} />
          </div>
          <div>
            <h2 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 4px 0' }}>Stock Management</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Add inventory units and audit/download complete historical stock addition ledgers.</p>
          </div>
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

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '12px' }} />
        <input 
          type="text" 
          placeholder="Search by product name, SKU, or category..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
        />
      </div>

      {/* Stock Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px' }}>SKU</th>
              <th style={{ padding: '12px' }}>Product Name</th>
              <th style={{ padding: '12px' }}>Category</th>
              <th style={{ padding: '12px' }}>Current Stock</th>
              <th style={{ padding: '12px' }}>Date</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading product inventory...</td>
              </tr>
            ) : filteredStocks.length > 0 ? (
              filteredStocks.map((item) => {
                const prodId = item._id || item.id;
                const statusMeta = getStockStatus(item.stock);
                const skuCode = item.sku || `SKU-${String(prodId).slice(-4).toUpperCase()}`;

                return (
                  <tr key={prodId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: 'bold' }}>{skuCode}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{item.name}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{item.category?.name || item.category || '-'}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>{item.stock || 0} Units</td>
                    <td style={{ padding: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(item.updatedAt || item.createdAt || item.date)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: '700',
                        background: statusMeta.bg,
                        color: statusMeta.color
                      }}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleOpenEditModal(item)}
                        style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <FaPlus size={10} /> Add Stock & Ledger
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No inventory items found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add to Stock & Historical Ledger Modal */}
      {isModalOpen && currentItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '28px', borderRadius: '12px', width: '680px', maxWidth: '94%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative', maxHeight: '92vh', overflowY: 'auto' }}>
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem' }}
            >
              <FaTimes />
            </button>
            <h3 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>Add Stock Units & Ledger</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Product: <strong>{currentItem.name}</strong>
            </p>

            {/* Addition Form */}
            <form onSubmit={handleUpdateStock} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
              
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>Current Existing Stock:</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{currentOldStock} Units</span>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  Quantity to Add (+) *
                </label>
                <input 
                  type="number" 
                  min="1" 
                  value={addQty} 
                  onChange={(e) => setAddQty(e.target.value)} 
                  placeholder="Enter units to add (e.g. 25)" 
                  required 
                  autoFocus
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }} 
                />
              </div>

              {enteredQty > 0 && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#065f46', fontWeight: '600' }}>
                    New Total Will Be:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#059669' }}>
                    {currentOldStock} + {enteredQty} = {calculatedNewStock} Units
                  </span>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  Reason / Reference (Optional)
                </label>
                <input 
                  type="text" 
                  value={adjustmentReason} 
                  onChange={(e) => setAdjustmentReason(e.target.value)} 
                  placeholder="e.g. Production Restock, Factory Batch received" 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box', fontSize: '13px' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={updating}
                  style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  disabled={updating}
                  style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: updating ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: updating ? 0.7 : 1 }}
                >
                  {updating ? 'Adding...' : 'Add to Stock'}
                </button>
              </div>
            </form>

            <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0 0 16px 0' }} />

            {/* Historical Additions & Movements Ledger Header with Download Options */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaHistory color="#4f46e5" size={13} />
                  <h4 style={{ margin: 0, fontSize: '13px', color: '#1e293b', fontWeight: '700' }}>
                    Stock Addition & Movement Ledger
                  </h4>
                </div>

                {/* Download Actions */}
                {stockLedger.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleDownloadCSV}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                      title="Download Excel/CSV Spreadsheet"
                    >
                      <FaFileExcel size={12} /> Download Excel/CSV
                    </button>
                    <button
                      onClick={handlePrintLedger}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#e0e7ff',
                        color: '#4f46e5',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                      title="Print / Save PDF"
                    >
                      <FaPrint size={12} /> Print / PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Printable Area Wrapper */}
              <div id="printable-stock-ledger" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', maxHeight: '220px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '8px 10px' }}>Date & Time</th>
                      <th style={{ padding: '8px 10px' }}>Type</th>
                      <th style={{ padding: '8px 10px' }}>Units Added / Removed</th>
                      <th style={{ padding: '8px 10px' }}>Previous → New</th>
                      <th style={{ padding: '8px 10px' }}>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLedger ? (
                      <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>Loading product ledger history...</td></tr>
                    ) : stockLedger.length > 0 ? (
                      stockLedger.map((log) => {
                        const isStockIn = log.type === 'Stock In';
                        const qtyNum = Number(log.quantity);
                        const displayQty = isStockIn ? `+${Math.abs(qtyNum)}` : `-${Math.abs(qtyNum)}`;

                        return (
                          <tr key={log._id || log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {formatDateTime(log.createdAt || log.date)}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: '700',
                                background: isStockIn ? '#d1fae5' : '#fee2e2',
                                color: isStockIn ? '#059669' : '#dc2626'
                              }}>
                                {isStockIn ? <FaArrowUp size={8} /> : <FaArrowDown size={8} />} {log.type}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: '700', color: isStockIn ? '#059669' : '#dc2626', whiteSpace: 'nowrap' }}>
                              {displayQty} Units
                            </td>
                            <td style={{ padding: '8px 10px', color: '#475569', whiteSpace: 'nowrap' }}>
                              {log.previousStock !== undefined && log.newStock !== undefined
                                ? `${log.previousStock} → ${log.newStock}` 
                                : '-'}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#4f46e5', fontWeight: '500' }}>
                              {log.reference || '-'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No prior stock additions logged for this product.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}