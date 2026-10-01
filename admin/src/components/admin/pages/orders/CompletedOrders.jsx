import { useState, useEffect } from 'react';
import { FaSearch, FaEye, FaDownload, FaTimes, FaCheckCircle } from 'react-icons/fa';

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

export default function CompletedOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Bill/Invoice Modal State
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [selectedBillOrder, setSelectedBillOrder] = useState(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const formatPrice = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
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

  // Fetch Completed Orders from backend
  const fetchCompletedOrders = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders?status=Completed`, {
        headers: {
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setCompletedOrders(Array.isArray(data) ? data : data.orders || []);
      } else {
        throw new Error(data.message || `Failed to load completed orders (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Fetch completed orders error:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Error fetching completed orders.') 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  const handleViewBill = (order) => {
    setSelectedBillOrder(order);
    setIsBillModalOpen(true);
  };

  const handleDownloadBill = () => {
    window.print();
  };

  const filteredOrders = completedOrders.filter((o) => {
    const custName = o.customerName || o.customer?.name || o.customer || '';
    const phoneNum = o.customerPhone || o.customer?.phone || o.phone || '';
    const orderNo = (o.orderNumber || o.id || o._id || '').toString();
    const query = searchTerm.toLowerCase();

    return custName.toLowerCase().includes(query) || phoneNum.includes(query) || orderNo.includes(query);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 4px 0' }}>Completed Orders</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Successfully fulfilled and fully-paid customer orders.</p>
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
          placeholder="Search by customer name, phone, or order ID..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
        />
      </div>

      {/* Orders Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px' }}>Order ID</th>
              <th style={{ padding: '12px' }}>Customer Name</th>
              <th style={{ padding: '12px' }}>Items Summary</th>
              <th style={{ padding: '12px' }}>Total Amount</th>
              <th style={{ padding: '12px' }}>Fulfillment Date</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading completed orders...</td></tr>
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map((o) => {
                const orderId = o._id || o.id;
                const orderCode = o.orderNumber || String(orderId).slice(-4);
                const custName = o.customerName || o.customer?.name || o.customer || 'Walk-in Customer';
                const custPhone = o.customerPhone || o.customer?.phone || o.phone || '';

                const itemsSummary = o.items && Array.isArray(o.items)
                  ? o.items.map((i) => `${i.productName || i.name || 'Item'} (${i.quantity})`).join(', ')
                  : o.items || '-';

                return (
                  <tr key={orderId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: 'bold' }}>#{orderCode}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>
                      {custName} 
                      {custPhone && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>{custPhone}</div>}
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>{itemsSummary}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#059669' }}>
                      {formatPrice(o.totalAmount || o.total)}
                    </td>
                    <td style={{ padding: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(o.updatedAt || o.createdAt || o.date)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: '#d1fae5', color: '#059669' }}>
                        <FaCheckCircle size={10} /> Completed
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleViewBill(o)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                        title="View & Print Invoice"
                      >
                        <FaEye size={12} /> Invoice
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No completed orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tax Invoice Modal */}
      {isBillModalOpen && selectedBillOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', width: '750px', maxWidth: '95%', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', position: 'relative', maxHeight: '92vh', overflowY: 'auto' }}>
            <button onClick={() => setIsBillModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1e293b', fontSize: '0.9rem', zIndex: 10 }}><FaTimes /></button>
            
            <div id="printable-invoice" style={{ fontFamily: 'Arial, sans-serif', color: '#000', background: '#fceade', border: '1.5px solid #000', margin: '20px', padding: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #000', fontSize: '11px', fontWeight: 'bold' }}>
                <span>Page No. 1 of 1</span>
                <span>TAX INVOICE (PAID)</span>
                <span>Original Copy</span>
              </div>

              <div style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid #000' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: 'bold' }}>Dipali Enterprises / DSKART</h2>
                <p style={{ fontSize: '11px', margin: '0 0 2px 0' }}>West Bengal, India.</p>
                <p style={{ fontSize: '11px', margin: 0 }}>GSTIN - 19AAACH7409R1ZZ | Quality Candle Manufacturers</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #000', fontSize: '11.5px' }}>
                <div style={{ padding: '10px 12px', borderRight: '1px solid #000' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Billing Details</div>
                  <div><strong>Customer:</strong> {selectedBillOrder.customerName || selectedBillOrder.customer?.name || 'Walk-in Customer'}</div>
                  <div><strong>Phone:</strong> {selectedBillOrder.customerPhone || selectedBillOrder.customer?.phone || selectedBillOrder.phone || '-'}</div>
                  <div><strong>Address:</strong> {selectedBillOrder.customerAddress || 'Local Customer'}</div>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}><span>Invoice No:</span> <span>: #{selectedBillOrder.orderNumber || String(selectedBillOrder._id || selectedBillOrder.id).slice(-4)}</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}><span>Date:</span> <span>: {formatDate(selectedBillOrder.createdAt || selectedBillOrder.date)}</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}><span>Payment Mode:</span> <span>: {selectedBillOrder.paymentMethod || 'Cash'}</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}><span>Payment Status:</span> <span style={{ color: '#059669', fontWeight: 'bold' }}>: Fully Paid</span></div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000', background: 'transparent' }}>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #000', width: '35px' }}>Sr.</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #000' }}>Item Description</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #000', width: '80px' }}>HSN</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'center', width: '50px' }}>Qty</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'right', width: '75px' }}>Rate (₹)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '85px' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedBillOrder.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #000', height: '28px' }}>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #000' }}>{item.productName || item.name}</td>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #000' }}>{item.hsn || '07019000'}</td>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'center' }}>{item.quantity} {item.unit || 'Pcs.'}</td>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'right' }}>{Number(item.price || 0).toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{(Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #000', fontSize: '12px', fontWeight: 'bold' }}>
                <span>Grand Total (Paid)</span>
                <span>{formatPrice(selectedBillOrder.totalAmount || selectedBillOrder.total)}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', fontSize: '10.5px' }}>
                <div style={{ padding: '10px', borderRight: '1px solid #000' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Terms & Conditions:</div>
                  <div>1. Goods once sold will not be taken back.</div>
                  <div>2. Subject to local jurisdiction only.</div>
                </div>
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>For Dipali Enterprises</div>
                  <div style={{ marginTop: '40px', fontWeight: 'bold' }}>Authorized Signatory</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '15px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button onClick={() => setIsBillModalOpen(false)} style={{ padding: '8px 14px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#1e293b', fontWeight: '600' }}>Close</button>
              <button onClick={handleDownloadBill} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaDownload size={12} /> Print / Save Invoice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}