import { useState, useEffect } from 'react';
import { FaSearch, FaPlus, FaTimes, FaTrash, FaEye, FaDownload, FaUserPlus } from 'react-icons/fa';

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

export default function NewOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Multi-Product Items State
  const [orderItems, setOrderItems] = useState([
    { productId: '', productName: '', hsn: '07019000', quantity: 1, unit: 'Pcs.', price: 0, disc: '0.00', tax: '5' }
  ]);

  // Payment Tracking States
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Bill View Modal State
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [selectedBillOrder, setSelectedBillOrder] = useState(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const formatPrice = (amt) => {
    const num = Number(amt || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 1. Fetch Orders, Products, and Customers
  const fetchOrders = async () => {
    setLoading(true);
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
          : (err.message || 'Error fetching orders.') 
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    const API_BASE_URL = getApiBaseUrl();
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products?status=active`, {
          headers: { 
            'Accept': 'application/json',
            Authorization: `Bearer ${getToken()}` 
          }
        }),
        fetch(`${API_BASE_URL}/api/customers`, {
          headers: { 
            'Accept': 'application/json',
            Authorization: `Bearer ${getToken()}` 
          }
        })
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json().catch(() => ({}));
        setAvailableProducts(Array.isArray(prodData) ? prodData : prodData.products || []);
      }

      if (custRes.ok) {
        const custData = await custRes.json().catch(() => ({}));
        setAvailableCustomers(Array.isArray(custData) ? custData : custData.customers || []);
      }
    } catch (err) {
      console.error('Failed to load dropdown items:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDropdownData();
  }, []);

  // Handle Customer Selection Dropdown
  const handleCustomerSelect = (custId) => {
    setSelectedCustomerId(custId);

    if (custId === 'new_manual') {
      setIsManualCustomer(true);
      setCustomerName('');
      setPhone('');
      setAddress('');
      return;
    }

    if (custId === '') {
      setIsManualCustomer(false);
      setCustomerName('');
      setPhone('');
      setAddress('');
      return;
    }

    setIsManualCustomer(false);
    const found = availableCustomers.find((c) => (c._id || c.id) === custId);
    if (found) {
      setCustomerName(found.name || '');
      setPhone(found.phone || '');
      setAddress(found.address || '');
    }
  };

  // Item Rows Management
  const handleAddItemRow = () => {
    setOrderItems([
      ...orderItems,
      { productId: '', productName: '', hsn: '07019000', quantity: 1, unit: 'Pcs.', price: 0, disc: '0.00', tax: '5' }
    ]);
  };

  const handleRemoveItemRow = (index) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const handleProductSelect = (index, productId) => {
    const foundProduct = availableProducts.find((p) => (p._id || p.id) === productId);
    const list = [...orderItems];
    list[index].productId = productId;
    if (foundProduct) {
      list[index].productName = foundProduct.name;
      list[index].price = foundProduct.price || 0;
      list[index].hsn = foundProduct.hsn || '07019000';
    } else {
      list[index].productName = '';
      list[index].price = 0;
    }
    setOrderItems(list);
  };

  const handleItemChange = (index, field, value) => {
    const list = [...orderItems];
    list[index][field] = value;
    setOrderItems(list);
  };

  const calculatedGrandTotal = orderItems.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.price) || 0);
  }, 0);

  const calculatedDueAmount = Math.max(0, calculatedGrandTotal - (Number(paidAmount) || 0));

  // 2. Submit Order to Backend
  const handleCreateOrder = async (e) => {
    e.preventDefault();

    const cleanName = customerName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanPhone || orderItems.length === 0) {
      alert('Please fill out customer name, phone number, and at least one item.');
      return;
    }

    const token = getToken();
    if (!token) {
      alert('Authentication required. Please log in.');
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    const payload = {
      customer: selectedCustomerId && selectedCustomerId !== 'new_manual' ? selectedCustomerId : null,
      customerName: cleanName,
      customerPhone: cleanPhone,
      customerAddress: address.trim(),
      items: orderItems.map((item) => ({
        product: item.productId || null,
        productName: item.productName,
        hsn: item.hsn,
        quantity: Number(item.quantity),
        unit: item.unit || 'Pcs.',
        price: Number(item.price),
        disc: item.disc || '0.00',
        tax: item.tax || '5'
      })),
      totalAmount: calculatedGrandTotal,
      paidAmount: Number(paidAmount) || 0,
      dueAmount: calculatedDueAmount,
      paymentMethod,
      status: calculatedDueAmount === 0 ? 'Completed' : 'Pending'
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Failed to create order (Status ${res.status}).`);

      setFeedback({ 
        type: 'success', 
        message: 'Order placed successfully! Customer record updated.' 
      });
      setIsModalOpen(false);

      // Reset Form
      setSelectedCustomerId('');
      setIsManualCustomer(false);
      setCustomerName('');
      setPhone('');
      setAddress('');
      setOrderItems([{ productId: '', productName: '', hsn: '07019000', quantity: 1, unit: 'Pcs.', price: 0, disc: '0.00', tax: '5' }]);
      setPaidAmount('');
      setPaymentMethod('Cash');

      // Refresh Orders and Customers Directory
      fetchOrders();
      fetchDropdownData();
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Server error creating order.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Delete Order
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    const token = getToken();
    if (!token) return;

    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
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

  const handleViewBill = (order) => {
    setSelectedBillOrder(order);
    setIsBillModalOpen(true);
  };

  const handleDownloadBill = () => {
    window.print();
  };

  const filteredOrders = orders.filter((o) => {
    const cName = o.customerName || o.customer?.name || '';
    const cPhone = o.customerPhone || o.customer?.phone || o.phone || '';
    const orderNo = (o.orderNumber || o.id || o._id || '').toString();
    const query = searchTerm.toLowerCase();
    return cName.toLowerCase().includes(query) || cPhone.includes(query) || orderNo.includes(query);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header & Create Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 4px 0' }}>New & Pending Orders</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Create manual orders with product selection and track payments.</p>
        </div>
        <button 
          onClick={() => {
            setIsModalOpen(true);
            fetchDropdownData();
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
        >
          <FaPlus /> Create New Order
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
              <th style={{ padding: '12px' }}>Customer Info</th>
              <th style={{ padding: '12px' }}>Items Summary</th>
              <th style={{ padding: '12px' }}>Total</th>
              <th style={{ padding: '12px' }}>Paid</th>
              <th style={{ padding: '12px' }}>Due</th>
              <th style={{ padding: '12px' }}>Method</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading orders...</td></tr>
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map((o) => {
                const orderId = o._id || o.id;
                const orderCode = o.orderNumber || String(orderId).slice(-4);
                const itemsSummary = o.items && Array.isArray(o.items)
                  ? o.items.map((i) => `${i.productName || 'Item'} (${i.quantity})`).join(', ')
                  : o.itemsSummary || '-';

                return (
                  <tr key={orderId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', color: '#4f46e5', fontWeight: 'bold' }}>#{orderCode}</td>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>
                      {o.customerName || o.customer?.name}
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                        {o.customerPhone || o.customer?.phone || o.phone}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>{itemsSummary}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>{formatPrice(o.totalAmount || o.total)}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#059669' }}>{formatPrice(o.paidAmount || o.paid)}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: Number(o.dueAmount || o.due) > 0 ? '#dc2626' : '#64748b' }}>
                      {formatPrice(o.dueAmount || o.due)}
                    </td>
                    <td style={{ padding: '12px', color: '#475569', fontWeight: '500' }}>{o.paymentMethod || 'Cash'}</td>
                    
                    <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button onClick={() => handleViewBill(o)} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }} title="View Bill">
                          <FaEye />
                        </button>
                        <button onClick={() => handleDelete(orderId)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }} title="Delete Order">
                          <FaTrash />
                        </button>
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

      {/* Tax Invoice Modal */}
      {isBillModalOpen && selectedBillOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', width: '750px', maxWidth: '95%', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', position: 'relative', maxHeight: '92vh', overflowY: 'auto' }}>
            <button onClick={() => setIsBillModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1e293b', fontSize: '0.9rem', zIndex: 10 }}><FaTimes /></button>
            
            <div id="printable-invoice" style={{ fontFamily: 'Arial, sans-serif', color: '#000', background: '#fceade', border: '1.5px solid #000', margin: '20px', padding: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #000', fontSize: '11px', fontWeight: 'bold' }}>
                <span>Page No. 1 of 1</span>
                <span>TAX INVOICE</span>
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
                  <div><strong>Customer:</strong> {selectedBillOrder.customerName || selectedBillOrder.customer?.name}</div>
                  <div><strong>Phone:</strong> {selectedBillOrder.customerPhone || selectedBillOrder.customer?.phone || selectedBillOrder.phone}</div>
                  <div><strong>Address:</strong> {selectedBillOrder.customerAddress || 'Local Customer'}</div>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}><span>Invoice No:</span> <span>: #{selectedBillOrder.orderNumber || String(selectedBillOrder._id || selectedBillOrder.id).slice(-4)}</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}><span>Date:</span> <span>: {selectedBillOrder.createdAt ? new Date(selectedBillOrder.createdAt).toISOString().split('T')[0] : selectedBillOrder.date}</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}><span>Payment Mode:</span> <span>: {selectedBillOrder.paymentMethod}</span></div>
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
                  {(selectedBillOrder.items || selectedBillOrder.rawItems || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #000', height: '28px' }}>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #000' }}>{item.productName || item.name}</td>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #000' }}>{item.hsn || '07019000'}</td>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'center' }}>{item.quantity} {item.unit || 'Pcs.'}</td>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'right' }}>{Number(item.price).toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #000', fontSize: '12px', fontWeight: 'bold' }}>
                <span>Grand Total</span>
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

      {/* Create Order Modal Popup */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '640px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><FaTimes /></button>
            <h3 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Create Multi-Item Order</h3>
            
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Customer Dropdown Selection */}
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  Select Customer Profile
                </label>
                <select 
                  value={selectedCustomerId} 
                  onChange={(e) => handleCustomerSelect(e.target.value)} 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#fff', boxSizing: 'border-box', fontSize: '13px' }}
                >
                  <option value="">-- Choose Existing Customer or Enter Manually --</option>
                  {availableCustomers.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                  <option value="new_manual" style={{ fontWeight: 'bold', color: '#4f46e5' }}>
                    + Add New Customer / Enter Manually
                  </option>
                </select>
              </div>

              {/* Notification Banner when adding a new customer */}
              {(!selectedCustomerId || isManualCustomer) && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1e40af' }}>
                  <FaUserPlus /> This customer will automatically be added to your Customer Directory upon saving.
                </div>
              )}

              {/* Customer Name & Phone Fields */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                    Customer Name *
                  </label>
                  <input 
                    type="text" 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)} 
                    placeholder="e.g. Ramesh Kumar" 
                    required 
                    readOnly={!isManualCustomer && selectedCustomerId !== ''}
                    style={{ 
                      width: '100%', 
                      padding: '9px 12px', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '6px', 
                      outline: 'none', 
                      boxSizing: 'border-box',
                      background: !isManualCustomer && selectedCustomerId ? '#f8fafc' : '#fff'
                    }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                    Phone Number *
                  </label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="+91 9XXXXXXXXX" 
                    required 
                    readOnly={!isManualCustomer && selectedCustomerId !== ''}
                    style={{ 
                      width: '100%', 
                      padding: '9px 12px', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '6px', 
                      outline: 'none', 
                      boxSizing: 'border-box',
                      background: !isManualCustomer && selectedCustomerId ? '#f8fafc' : '#fff'
                    }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  Delivery Address (Optional)
                </label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="Street, City, State, Pincode" 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>

              <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '5px 0' }} />

              {/* Items Table in Modal */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>Select Products / Items</label>
                  <button type="button" onClick={handleAddItemRow} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaPlus size={10} /> Add Item Row
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {orderItems.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <select 
                        value={item.productId} 
                        onChange={(e) => handleProductSelect(index, e.target.value)} 
                        required 
                        style={{ flex: 2.5, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', outline: 'none', background: '#fff' }}
                      >
                        <option value="">-- Choose Product --</option>
                        {availableProducts.map((p) => (
                          <option key={p._id || p.id} value={p._id || p.id}>
                            {p.name} (₹{p.price})
                          </option>
                        ))}
                      </select>

                      <input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                        placeholder="Qty" 
                        min="1" 
                        required 
                        style={{ flex: 1, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', outline: 'none' }} 
                      />

                      <input 
                        type="number" 
                        step="0.01" 
                        value={item.price} 
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                        placeholder="Rate ₹" 
                        required 
                        style={{ flex: 1.2, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', outline: 'none' }} 
                      />

                      {orderItems.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItemRow(index)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>
                          <FaTrash size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Info */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Grand Total Amount:</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{formatPrice(calculatedGrandTotal)}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Paid Amount (₹)</label>
                    <input type="number" step="0.01" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', outline: 'none', background: '#fff' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Payment Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', outline: 'none', background: '#fff' }}>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Card">Debit / Credit Card</option>
                      <option value="Due">Due / Credit</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>Calculated Due Amount:</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626' }}>{formatPrice(calculatedDueAmount)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Processing...' : 'Confirm & Save Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}