import { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaHistory, FaMoneyBillWave } from 'react-icons/fa';

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

export default function DueOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dueOrders, setDueOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Collection Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [collectionAmount, setCollectionAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  // 1. Fetch Orders with Pending Dues
  const fetchDueOrders = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders?status=Pending`, {
        headers: { 
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const orderList = Array.isArray(data) ? data : data.orders || [];
        // Keep only orders that have an actual pending due balance
        setDueOrders(orderList.filter((o) => Number(o.dueAmount || o.due || 0) > 0));
      } else {
        throw new Error(data.message || `Failed to fetch due orders (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Fetch due orders error:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Error loading due orders.') 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDueOrders();
  }, []);

  // Open Collection Modal
  const handleOpenModal = (order) => {
    setSelectedOrder(order);
    setCollectionAmount(order.dueAmount || order.due || '');
    setPaymentMethod('Cash');
    setNote('');
    setIsModalOpen(true);
  };

  // Handle Payment Collection Submission
  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    const payAmount = Number(collectionAmount);

    if (!payAmount || payAmount <= 0) {
      alert('Please enter a valid collection amount.');
      return;
    }

    const currentDue = Number(selectedOrder.dueAmount || selectedOrder.due || 0);
    if (payAmount > currentDue) {
      alert('Collection amount cannot exceed the remaining due balance.');
      return;
    }

    setSubmitting(true);
    const API_BASE_URL = getApiBaseUrl();
    const orderId = selectedOrder._id || selectedOrder.id;

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          amount: payAmount,
          paymentMethod,
          note: note.trim()
        })
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.message || 'Failed to record payment.');
      }

      setFeedback({
        type: 'success',
        message: `Successfully collected ${formatPrice(payAmount)} for Order #${selectedOrder.orderNumber || String(orderId).slice(-4)}!`
      });

      setIsModalOpen(false);
      fetchDueOrders();
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error collecting payment.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = dueOrders.filter((o) => {
    const custName = o.customerName || o.customer?.name || o.customer || '';
    const phoneNum = o.customerPhone || o.customer?.phone || o.phone || '';
    const orderNum = (o.orderNumber || o.id || o._id || '').toString();
    const query = searchTerm.toLowerCase();

    return custName.toLowerCase().includes(query) || phoneNum.includes(query) || orderNum.includes(query);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 4px 0' }}>Due Orders (Unpaid Balances)</h2>
      <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0' }}>Orders with pending payment balances linked to customer ledgers and payment logs.</p>

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

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px' }}>Order ID</th>
              <th style={{ padding: '12px' }}>Customer Name</th>
              <th style={{ padding: '12px' }}>Total Amount</th>
              <th style={{ padding: '12px', color: '#059669' }}>Paid</th>
              <th style={{ padding: '12px', color: '#dc2626' }}>Due Balance</th>
              <th style={{ padding: '12px' }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading due orders...</td></tr>
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map((o) => {
                const orderId = o._id || o.id;
                const orderCode = o.orderNumber || String(orderId).slice(-4);
                const custName = o.customerName || o.customer?.name || o.customer || 'Walk-in Customer';
                const custPhone = o.customerPhone || o.customer?.phone || o.phone || '';

                return (
                  <tr key={orderId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: 'bold' }}>#{orderCode}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>
                      {custName} 
                      {custPhone && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>{custPhone}</div>}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>{formatPrice(o.totalAmount || o.total)}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#059669' }}>{formatPrice(o.paidAmount || o.paid)}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#dc2626' }}>{formatPrice(o.dueAmount || o.due)}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>
                      {formatDate(o.createdAt || o.date)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleOpenModal(o)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                      >
                        <FaMoneyBillWave /> Collect Payment
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No pending due orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Collect Payment Modal Popup */}
      {isModalOpen && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '600px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><FaTimes /></button>
            
            <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>Collect Due Payment</h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 15px 0' }}>
              Order #{selectedOrder.orderNumber || String(selectedOrder._id || selectedOrder.id).slice(-4)} - {selectedOrder.customerName || selectedOrder.customer || 'Walk-in Customer'} {selectedOrder.customerPhone ? `(${selectedOrder.customerPhone})` : ''}
            </p>

            {/* Order Items Detail */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', color: '#1e293b', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Order Items</label>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '8px' }}>Product</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Rate</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || selectedOrder.rawItems || []).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', color: '#334155', fontWeight: '500' }}>{item.productName || item.name}</td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#475569' }}>{item.quantity} {item.unit || 'Pcs.'}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>{formatPrice(item.price)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{formatPrice(item.quantity * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment History Log Section */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <FaHistory size={11} color="#4f46e5" />
                <label style={{ fontSize: '12px', color: '#1e293b', fontWeight: 'bold' }}>Past Payment History Log</label>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', padding: '8px 12px', maxHeight: '120px', overflowY: 'auto' }}>
                {selectedOrder.paymentHistory && selectedOrder.paymentHistory.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '11.5px', color: '#334155' }}>
                    {selectedOrder.paymentHistory.map((hist, index) => (
                      <li key={index} style={{ marginBottom: '4px' }}>
                        Paid <strong style={{ color: '#059669' }}>{formatPrice(hist.amount)}</strong> via <em>{hist.method}</em> on{' '}
                        <strong>{formatDate(hist.date)}</strong> {hist.note ? `(${hist.note})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0, textAlign: 'center' }}>No prior partial payments recorded yet.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleCollectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>Current Outstanding Due:</span>
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#dc2626' }}>{formatPrice(selectedOrder.dueAmount || selectedOrder.due)}</span>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Collection Amount (₹) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  max={selectedOrder.dueAmount || selectedOrder.due} 
                  min="0.01" 
                  value={collectionAmount} 
                  onChange={(e) => setCollectionAmount(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Payment Method</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)} 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Note / Reference (Optional)</label>
                <input 
                  type="text" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  placeholder="e.g. Cleared via UPI transaction ID" 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '5px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting} style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Recording...' : 'Confirm & Collect'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}