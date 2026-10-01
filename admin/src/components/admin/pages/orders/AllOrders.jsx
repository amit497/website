import { useState, useEffect } from 'react';
import { FaSearch, FaEdit, FaTrash, FaTimes, FaEye } from 'react-icons/fa';

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

export default function AllOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal State for Edit Action
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  // Modal State for View Action
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // Format currency with Indian Rupee (₹)
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

  // 1. Fetch all orders from backend
  const fetchOrders = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: {
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setOrders(Array.isArray(data) ? data : data.orders || []);
      } else {
        throw new Error(data.message || `Failed to load orders (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Error fetching orders from server.') 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Open View Modal
  const handleViewClick = (order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  // Open Edit Modal
  const handleEditClick = (order) => {
    setCurrentOrder({
      id: order._id || order.id,
      orderNumber: order.orderNumber || String(order._id || order.id).slice(-4),
      customerName: order.customerName || order.customer?.name || order.customer || '',
      phone: order.customerPhone || order.customer?.phone || order.phone || '',
      totalAmount: Number(order.totalAmount || order.total || 0),
      paidAmount: Number(order.paidAmount || order.paid || 0),
      dueAmount: Number(order.dueAmount || order.due || 0),
      status: order.status || 'Pending'
    });
    setIsModalOpen(true);
  };

  // 2. Submit Update (Status and Due/Paid Adjustments)
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      alert('Authentication required. Please log in.');
      return;
    }

    setIsUpdating(true);
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${currentOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: currentOrder.status,
          dueAmount: Number(currentOrder.dueAmount),
          paidAmount: Number(currentOrder.paidAmount)
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update order.');

      // Update state locally
      setOrders((prev) =>
        prev.map((o) =>
          (o._id || o.id) === currentOrder.id
            ? {
                ...o,
                status: currentOrder.status,
                dueAmount: Number(currentOrder.dueAmount),
                paidAmount: Number(currentOrder.paidAmount)
              }
            : o
        )
      );

      setIsModalOpen(false);
      setFeedback({ type: 'success', message: 'Order updated successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error updating order.')
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. Delete Order
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    const token = getToken();
    if (!token) {
      alert('Authentication required.');
      return;
    }

    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete order.');

      setOrders((prev) => prev.filter((o) => (o._id || o.id) !== id));
      setFeedback({ type: 'success', message: 'Order deleted successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error deleting order.')
      );
    }
  };

  // Filter orders by search term
  const filteredOrders = orders.filter((o) => {
    const custName = o.customerName || o.customer?.name || o.customer || '';
    const phone = o.customerPhone || o.customer?.phone || o.phone || '';
    const orderNo = (o.orderNumber || o.id || o._id || '').toString();
    const query = searchTerm.toLowerCase();

    return custName.toLowerCase().includes(query) || phone.includes(query) || orderNo.includes(query);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 4px 0' }}>All Orders</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Comprehensive list of all customer transactions and fulfillment statuses.</p>
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
          placeholder="Search by Order ID, customer name, or phone..." 
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
              <th style={{ padding: '12px' }}>Customer Info</th>
              <th style={{ padding: '12px' }}>Items Summary</th>
              <th style={{ padding: '12px' }}>Total Amount</th>
              <th style={{ padding: '12px' }}>Due Amount</th>
              <th style={{ padding: '12px' }}>Order Date</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading orders...</td>
              </tr>
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map((o) => {
                const orderId = o._id || o.id;
                const orderCode = o.orderNumber || String(orderId).slice(-4);
                const custName = o.customerName || o.customer?.name || o.customer || 'Walk-in Customer';
                const custPhone = o.customerPhone || o.customer?.phone || o.phone || '';

                const itemsSummary = o.items && Array.isArray(o.items)
                  ? o.items.map((i) => `${i.productName || i.name || 'Item'} (${i.quantity})`).join(', ')
                  : o.items || '-';

                const dueValue = Number(o.dueAmount || o.due || 0);

                return (
                  <tr key={orderId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: 'bold' }}>#{orderCode}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>
                      {custName}
                      {custPhone && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>{custPhone}</div>}
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>{itemsSummary}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>
                      {formatPrice(o.totalAmount || o.total)}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '700', color: dueValue > 0 ? '#dc2626' : '#059669' }}>
                      {formatPrice(dueValue)}
                    </td>
                    <td style={{ padding: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(o.createdAt || o.date)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', 
                        background: o.status === 'Completed' ? '#d1fae5' : o.status === 'Processing' ? '#e0e7ff' : o.status === 'Cancelled' ? '#fee2e2' : '#fef3c7', 
                        color: o.status === 'Completed' ? '#059669' : o.status === 'Processing' ? '#4f46e5' : o.status === 'Cancelled' ? '#dc2626' : '#d97706' 
                      }}>
                        {o.status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button onClick={() => handleViewClick(o)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }} title="View Order Details"><FaEye /></button>
                        <button onClick={() => handleEditClick(o)} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }} title="Edit"><FaEdit /></button>
                        <button onClick={() => handleDelete(orderId)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }} title="Delete"><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {isViewModalOpen && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '450px', maxWidth: '92%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative' }}>
            <button onClick={() => setIsViewModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem' }}><FaTimes /></button>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Order #{selectedOrder.orderNumber || String(selectedOrder._id || selectedOrder.id).slice(-4)}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155' }}>
              <div><strong>Customer:</strong> {selectedOrder.customerName || selectedOrder.customer?.name || 'Walk-in Customer'}</div>
              <div><strong>Phone:</strong> {selectedOrder.customerPhone || selectedOrder.customer?.phone || selectedOrder.phone || '-'}</div>
              <div><strong>Order Date:</strong> {formatDate(selectedOrder.createdAt || selectedOrder.date)}</div>
              <div><strong>Status:</strong> {selectedOrder.status || 'Pending'}</div>
              <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
              <div><strong>Total Amount:</strong> {formatPrice(selectedOrder.totalAmount || selectedOrder.total)}</div>
              <div><strong>Paid Amount:</strong> {formatPrice(selectedOrder.paidAmount || selectedOrder.paid)}</div>
              <div><strong>Due Balance:</strong> <span style={{ color: Number(selectedOrder.dueAmount || selectedOrder.due || 0) > 0 ? '#dc2626' : '#059669', fontWeight: 'bold' }}>{formatPrice(selectedOrder.dueAmount || selectedOrder.due)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && currentOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '28px', borderRadius: '12px', width: '420px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem' }}><FaTimes /></button>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Edit Order #{currentOrder.orderNumber}</h3>
            
            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Customer Name</label>
                <input type="text" value={`${currentOrder.customerName}${currentOrder.phone ? ` (${currentOrder.phone})` : ''}`} disabled style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Total Amount</label>
                <input type="text" value={formatPrice(currentOrder.totalAmount)} disabled style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9', boxSizing: 'border-box', fontWeight: 'bold' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Due Amount (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  max={currentOrder.totalAmount} 
                  value={currentOrder.dueAmount} 
                  onChange={(e) => {
                    const newDue = Number(e.target.value) || 0;
                    setCurrentOrder({
                      ...currentOrder,
                      dueAmount: newDue,
                      paidAmount: Math.max(0, currentOrder.totalAmount - newDue)
                    });
                  }} 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Status</label>
                <select 
                  value={currentOrder.status} 
                  onChange={(e) => setCurrentOrder({ ...currentOrder, status: e.target.value })} 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isUpdating} style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}>Cancel</button>
                <button type="submit" disabled={isUpdating} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: isUpdating ? 0.7 : 1 }}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}