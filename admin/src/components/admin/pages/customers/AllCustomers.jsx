import { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Dynamic API Base URL resolver:
// Automatically uses the current browser hostname (e.g., 192.168.0.181) for port 5000
const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export default function AllCustomers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal State for Edit Action
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // Format currency in Indian Rupees
  const formatIndianPrice = (amount) => {
    const num = Number(amount || 0);
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Fetch customers from backend
  const fetchCustomers = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setCustomers(Array.isArray(data) ? data : data.customers || []);
      } else {
        throw new Error(data.message || `Failed to fetch customers (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Network error fetching customers.') 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Delete Customer
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;

    const token = getToken();
    if (!token) {
      alert('Authentication required.');
      return;
    }

    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Delete operation failed.');

      setCustomers((prev) => prev.filter((c) => (c._id || c.id) !== id));
      setFeedback({ type: 'success', message: 'Customer deleted successfully!' });
    } catch (err) {
      alert(err.message || 'Error deleting customer.');
    }
  };

  // Open Edit Modal
  const handleEditClick = (customer) => {
    setCurrentCustomer({
      id: customer._id || customer.id,
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      status: customer.status || 'Active'
    });
    setIsModalOpen(true);
  };

  // Save Customer Changes
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      alert('Authentication required.');
      return;
    }

    setIsUpdating(true);
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: currentCustomer.name.trim(),
          email: currentCustomer.email.trim().toLowerCase(),
          phone: currentCustomer.phone.trim(),
          address: currentCustomer.address.trim(),
          status: currentCustomer.status
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update customer.');

      setCustomers((prev) =>
        prev.map((c) =>
          (c._id || c.id) === currentCustomer.id
            ? {
                ...c,
                name: currentCustomer.name.trim(),
                email: currentCustomer.email.trim().toLowerCase(),
                phone: currentCustomer.phone.trim(),
                address: currentCustomer.address.trim(),
                status: currentCustomer.status
              }
            : c
        )
      );

      setIsModalOpen(false);
      setFeedback({ type: 'success', message: 'Customer updated successfully!' });
    } catch (err) {
      alert(err.message || 'Error updating customer.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const nameMatch = c.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = c.phone?.includes(searchTerm);
    return nameMatch || emailMatch || phoneMatch;
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: '#333', fontSize: '1.5rem', margin: 0 }}>All Customers</h2>
        <Link 
          to="/admin/customer/add" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#4f46e5', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px' }}
        >
          <FaPlus /> Add Customer
        </Link>
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
        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
        <input 
          type="text" 
          placeholder="Search by name, email, or phone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Customers Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', color: '#555' }}>
              <th style={{ padding: '12px' }}>Customer Name</th>
              <th style={{ padding: '12px' }}>Phone</th>
              <th style={{ padding: '12px' }}>Email</th>
              <th style={{ padding: '12px' }}>Address</th>
              <th style={{ padding: '12px' }}>Total Orders</th>
              <th style={{ padding: '12px' }}>Total Spent</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                  Loading customers from database...
                </td>
              </tr>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((c) => {
                const customerId = c._id || c.id;

                return (
                  <tr key={customerId} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{c.name}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{c.phone}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{c.email || '-'}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{c.address || '-'}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#4f46e5' }}>
                      {c.totalOrders || c.orders || 0}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#10b981' }}>
                      {formatIndianPrice(c.totalSpent || c.totalAmount || 0)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        color: c.status === 'Active' ? '#10b981' : '#ef4444', 
                        fontWeight: '500' 
                      }}>
                        ● {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button 
                          onClick={() => handleEditClick(c)} 
                          style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(customerId)} 
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Popup Modal */}
      {isModalOpen && currentCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '420px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', position: 'relative' }}>
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}
            >
              <FaTimes />
            </button>

            <h3 style={{ marginBottom: '18px', color: '#333' }}>Edit Customer</h3>

            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Customer Name</label>
                <input 
                  type="text" 
                  value={currentCustomer.name} 
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, name: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={currentCustomer.phone} 
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, phone: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Email</label>
                <input 
                  type="email" 
                  value={currentCustomer.email} 
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, email: e.target.value })} 
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Address</label>
                <textarea 
                  value={currentCustomer.address} 
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, address: e.target.value })} 
                  rows="2"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Status</label>
                <select 
                  value={currentCustomer.status} 
                  onChange={(e) => setCurrentCustomer({ ...currentCustomer, status: e.target.value })} 
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isUpdating}
                  style={{ padding: '8px 15px', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#333' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  style={{ padding: '8px 15px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isUpdating ? 0.7 : 1 }}
                >
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