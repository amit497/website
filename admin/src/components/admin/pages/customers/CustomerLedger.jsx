import { useState, useEffect } from 'react';
import { 
  FaPhone, 
  FaEnvelope, 
  FaSearch, 
  FaShoppingBag, 
  FaFileInvoiceDollar, 
  FaEye, 
  FaMoneyBillWave,
  FaTimes 
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

export default function CustomerLedger() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [ledgerData, setLedgerData] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ledger');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Payment Recording Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const formatPrice = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // 1. Fetch all customers on Mount
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      setFeedback({ type: '', message: '' });
      const API_BASE_URL = getApiBaseUrl();

      try {
        const res = await fetch(`${API_BASE_URL}/api/customers`, {
          headers: { 
            'Accept': 'application/json',
            Authorization: `Bearer ${getToken()}` 
          }
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          const list = Array.isArray(data) ? data : data.customers || [];
          setCustomers(list);
          if (list.length > 0) {
            setSelectedCustomerId((prev) => prev || list[0]._id || list[0].id);
          }
        } else {
          throw new Error(data.message || `Failed to load customer list (Status ${res.status}).`);
        }
      } catch (err) {
        console.error('Error fetching customer directory:', err);
        setFeedback({
          type: 'error',
          message: err.message.includes('Failed to fetch')
            ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
            : (err.message || 'Error fetching customer directory.')
        });
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  // 2. Fetch Detailed Ledger whenever selected customer changes
  const fetchCustomerLedger = async (customerId) => {
    if (!customerId) return;
    setLoadingLedger(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/customers/${customerId}/ledger`, {
        headers: { 
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setLedgerData(data);
      } else {
        setLedgerData(null);
        throw new Error(data.message || `Failed to load customer ledger (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Error fetching ledger details:', err);
      setLedgerData(null);
      setFeedback({
        type: 'error',
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error loading ledger details.')
      });
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerLedger(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  // 3. Record Received Payment (Reduces Due Balance)
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setRecordingPayment(true);
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/customers/${selectedCustomerId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          amount,
          paymentMethod,
          note: paymentNote.trim()
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Payment recording failed.');

      alert('Payment recorded successfully!');
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNote('');
      setPaymentMethod('Cash');

      // Refresh Ledger
      fetchCustomerLedger(selectedCustomerId);
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error recording payment.')
      );
    } finally {
      setRecordingPayment(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const nameMatch = c.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = c.phone?.includes(searchTerm);
    return nameMatch || phoneMatch;
  });

  const currentCustomer = ledgerData?.customer;
  const transactions = ledgerData?.transactions || [];
  const purchasedProducts = ledgerData?.purchasedProducts || [];
  const totalDue = ledgerData?.currentDue || 0;

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Global Feedback Banner */}
      {feedback.message && (
        <div style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '6px',
          marginBottom: '4px',
          fontSize: '13px',
          color: feedback.type === 'error' ? '#b91c1c' : '#15803d',
          backgroundColor: feedback.type === 'error' ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${feedback.type === 'error' ? '#fca5a5' : '#86efac'}`
        }}>
          {feedback.message}
        </div>
      )}

      {/* Left Column: Customer Directory Selection Table */}
      <div style={{ flex: '1.2 1 320px', background: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700' }}>
          <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '8px', color: '#4f46e5' }}>
            <FaFileInvoiceDollar size={16} />
          </div>
          Customer Directory
        </h3>
        
        {/* Search Box */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '12px' }} />
          <input 
            type="text" 
            placeholder="Search name or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
          />
        </div>

        {/* Customer Table List */}
        <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '10px 12px', fontWeight: '600' }}>Name & Phone</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingCustomers ? (
                <tr><td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading customer list...</td></tr>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => {
                  const custId = cust._id || cust.id;
                  const isSelected = selectedCustomerId === custId;

                  return (
                    <tr 
                      key={custId}
                      onClick={() => setSelectedCustomerId(custId)}
                      style={{ 
                        background: isSelected ? '#eef2ff' : '#ffffff',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '600', color: isSelected ? '#4f46e5' : '#1e293b', fontSize: '13px' }}>{cust.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{cust.phone}</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button 
                          style={{ 
                            padding: '6px 10px', 
                            background: isSelected ? '#4f46e5' : '#f1f5f9', 
                            color: isSelected ? '#ffffff' : '#475569', 
                            border: 'none', 
                            borderRadius: '6px', 
                            fontSize: '11px', 
                            fontWeight: '600', 
                            cursor: 'pointer', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px' 
                          }}
                        >
                          <FaEye size={10} /> {isSelected ? 'Viewing' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Ledger Statements & Product Breakdowns */}
      <div style={{ flex: '2.5 1 480px', background: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea' }}>
        
        {loadingLedger ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading customer financial history...</div>
        ) : currentCustomer ? (
          <>
            {/* Customer Banner with Action Button */}
            <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '22px', borderRadius: '10px', marginBottom: '24px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>{currentCustomer.name}</div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaPhone color="#4f46e5" size={12} /> {currentCustomer.phone}</div>
                  {currentCustomer.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaEnvelope color="#4f46e5" size={12} /> {currentCustomer.email}</div>
                  )}
                  <div>
                    <strong>Outstanding Balance:</strong>{' '}
                    <span style={{ color: totalDue > 0 ? '#dc2626' : '#059669', fontWeight: '700', background: totalDue > 0 ? '#fee2e2' : '#d1fae5', padding: '2px 8px', borderRadius: '4px' }}>
                      {formatPrice(totalDue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Payment Button */}
              <button 
                onClick={() => setIsPaymentModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                <FaMoneyBillWave /> Receive Payment
              </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f1f5f9', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
              <button 
                onClick={() => setActiveTab('ledger')}
                style={{ padding: '8px 18px', background: activeTab === 'ledger' ? '#ffffff' : 'transparent', color: activeTab === 'ledger' ? '#4f46e5' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: activeTab === 'ledger' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
              >
                Ledger Statement
              </button>
              <button 
                onClick={() => setActiveTab('products')}
                style={{ padding: '8px 18px', background: activeTab === 'products' ? '#ffffff' : 'transparent', color: activeTab === 'products' ? '#4f46e5' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: activeTab === 'products' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
              >
                <FaShoppingBag size={12} /> Purchased Items ({purchasedProducts.length})
              </button>
            </div>

            {/* TAB 1: LEDGER STATEMENT */}
            {activeTab === 'ledger' && (
              <div>
                <h4 style={{ margin: '0 0 14px 0', color: '#334155', fontSize: '1rem', fontWeight: '600' }}>Transaction Ledger</h4>
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '12px 14px', fontWeight: '600' }}>Date</th>
                        <th style={{ padding: '12px 14px', fontWeight: '600' }}>Description</th>
                        <th style={{ padding: '12px 14px', color: '#dc2626', fontWeight: '600' }}>Debit (+)</th>
                        <th style={{ padding: '12px 14px', color: '#059669', fontWeight: '600' }}>Credit (-)</th>
                        <th style={{ padding: '12px 14px', fontWeight: '600' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length > 0 ? (
                        transactions.map((tx, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{tx.date}</td>
                            <td style={{ padding: '12px 14px', fontWeight: '500', color: '#1e293b' }}>{tx.description}</td>
                            <td style={{ padding: '12px 14px', color: tx.debit > 0 ? '#dc2626' : '#94a3b8', fontWeight: tx.debit > 0 ? '600' : '400', whiteSpace: 'nowrap' }}>
                              {tx.debit > 0 ? formatPrice(tx.debit) : '-'}
                            </td>
                            <td style={{ padding: '12px 14px', color: tx.credit > 0 ? '#059669' : '#94a3b8', fontWeight: tx.credit > 0 ? '600' : '400', whiteSpace: 'nowrap' }}>
                              {tx.credit > 0 ? formatPrice(tx.credit) : '-'}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                              {formatPrice(tx.balance)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No recorded transactions.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: ITEMIZED PURCHASED PRODUCTS */}
            {activeTab === 'products' && (
              <div>
                <h4 style={{ margin: '0 0 14px 0', color: '#334155', fontSize: '1rem', fontWeight: '600' }}>Itemized Purchase Breakdown</h4>
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '12px 10px', fontWeight: '600' }}>Order ID</th>
                        <th style={{ padding: '12px 10px', fontWeight: '600' }}>Product Name</th>
                        <th style={{ padding: '12px 10px', fontWeight: '600' }}>Category</th>
                        <th style={{ padding: '12px 10px', fontWeight: '600' }}>Sub Category</th>
                        <th style={{ padding: '12px 10px', fontWeight: '600' }}>Sub Child</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '600' }}>Qty</th>
                        <th style={{ padding: '12px 10px', fontWeight: '600' }}>Unit Rate</th>
                        <th style={{ padding: '12px 10px', fontWeight: '600' }}>Total</th>
                        <th style={{ padding: '12px 10px', fontWeight: '600' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchasedProducts.length > 0 ? (
                        purchasedProducts.map((prod, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 10px', color: '#4f46e5', fontWeight: '700', whiteSpace: 'nowrap' }}>#{prod.orderId}</td>
                            <td style={{ padding: '12px 10px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap' }}>{prod.productName}</td>
                            <td style={{ padding: '12px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{prod.category}</td>
                            <td style={{ padding: '12px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{prod.subCategory}</td>
                            <td style={{ padding: '12px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{prod.subChildCategory}</td>
                            <td style={{ padding: '12px 10px', fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>{prod.quantity}</td>
                            <td style={{ padding: '12px 10px', color: '#475569', whiteSpace: 'nowrap' }}>{formatPrice(prod.price)}</td>
                            <td style={{ padding: '12px 10px', color: '#059669', fontWeight: '700', whiteSpace: 'nowrap' }}>{formatPrice(prod.totalAmount)}</td>
                            <td style={{ padding: '12px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{prod.date}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No products recorded for this customer.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Please select a customer from the left directory.</div>
        )}

      </div>

      {/* Receive Payment Modal */}
      {isPaymentModalOpen && currentCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '26px', borderRadius: '10px', width: '400px', maxWidth: '92%', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', position: 'relative' }}>
            <button 
              onClick={() => setIsPaymentModalOpen(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}
            >
              <FaTimes />
            </button>

            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Record Payment Received</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Customer: <strong>{currentCustomer.name}</strong> (Current Due: {formatPrice(totalDue)})
            </p>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Payment Amount (₹) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="1" 
                  max={totalDue > 0 ? totalDue : undefined}
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(e.target.value)} 
                  placeholder="0.00" 
                  required 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Payment Method</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Note / Reference No.</label>
                <input 
                  type="text" 
                  value={paymentNote} 
                  onChange={(e) => setPaymentNote(e.target.value)} 
                  placeholder="e.g. UPI Ref #90212" 
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsPaymentModalOpen(false)} 
                  disabled={recordingPayment}
                  style={{ padding: '8px 15px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={recordingPayment}
                  style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: recordingPayment ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: recordingPayment ? 0.7 : 1 }}
                >
                  {recordingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}