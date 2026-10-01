import { useState, useEffect } from 'react';
import { FaShoppingCart, FaRupeeSign, FaExclamationCircle, FaUsers, FaArrowUp } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Dynamic API Base URL resolver:
// Automatically uses the current browser IP (e.g., 192.168.0.181) for port 5000
const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export default function Dashboard() {
  const [data, setData] = useState({
    stats: {
      totalOrders: 0,
      totalRevenue: 0,
      pendingDues: 0,
      pendingDueOrdersCount: 0,
      registeredUsers: 0
    },
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      const API_BASE_URL = getApiBaseUrl();

      try {
        const token = getToken();
        const headers = {
          'Accept': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
          method: 'GET',
          headers
        });

        const result = await res.json().catch(() => ({}));
        
        if (res.ok) {
          setData({
            stats: {
              totalOrders: result.stats?.totalOrders || 0,
              totalRevenue: result.stats?.totalRevenue || 0,
              pendingDues: result.stats?.pendingDues || 0,
              pendingDueOrdersCount: result.stats?.pendingDueOrdersCount || 0,
              registeredUsers: result.stats?.registeredUsers || 0
            },
            recentOrders: Array.isArray(result.recentOrders) ? result.recentOrders : []
          });
        } else {
          throw new Error(result.message || `Server responded with status ${res.status}`);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(`Unable to load data from ${API_BASE_URL}. (${err.message})`);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statsCards = [
    {
      title: 'Total Orders',
      value: data.stats.totalOrders.toLocaleString('en-IN'),
      change: 'Live order count',
      icon: <FaShoppingCart size={20} color="#4f46e5" />,
      bg: '#e0e7ff',
      color: '#4f46e5'
    },
    {
      title: 'Total Revenue (Paid)',
      value: formatPrice(data.stats.totalRevenue),
      change: 'Collected revenue',
      icon: <FaRupeeSign size={18} color="#059669" />,
      bg: '#d1fae5',
      color: '#059669'
    },
    {
      title: 'Pending Dues',
      value: formatPrice(data.stats.pendingDues),
      change: `${data.stats.pendingDueOrdersCount} orders with due balance`,
      icon: <FaExclamationCircle size={20} color="#dc2626" />,
      bg: '#fee2e2',
      color: '#dc2626'
    },
    {
      title: 'Registered Users',
      value: data.stats.registeredUsers.toLocaleString('en-IN'),
      change: 'Active system accounts',
      icon: <FaUsers size={20} color="#2563eb" />,
      bg: '#dbeafe',
      color: '#2563eb'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Welcome Greeting Banner */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', padding: '25px 30px', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 20px rgba(79, 70, 229, 0.15)' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.6rem' }}>Welcome to Your Dashboard!</h2>
        <p style={{ margin: 0, fontSize: '13.5px', opacity: 0.9 }}>Here is a quick overview of your business activities, live orders, and system performance today.</p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Statistics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {statsCards.map((stat, index) => (
          <div key={index} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{stat.title}</span>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
              {loading ? '...' : stat.value}
            </div>
            <div style={{ fontSize: '11.5px', color: stat.color, display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
              <FaArrowUp size={10} /> {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders Section */}
      <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #eaeaea' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h3 style={{ color: '#0f172a', fontSize: '1.2rem', margin: '0 0 4px 0' }}>Recent Orders Overview</h3>
            <p style={{ color: '#64748b', fontSize: '12.5px', margin: 0 }}>Latest transactions processed across the platform.</p>
          </div>
          <Link to="/admin/orders/all" style={{ fontSize: '13px', color: '#4f46e5', fontWeight: '600', textDecoration: 'none' }}>
            View All Orders →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '10px 12px' }}>Order ID</th>
                <th style={{ padding: '10px 12px' }}>Customer</th>
                <th style={{ padding: '10px 12px' }}>Total Amount</th>
                <th style={{ padding: '10px 12px' }}>Due Balance</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '25px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading recent orders...
                  </td>
                </tr>
              ) : data.recentOrders.length > 0 ? (
                data.recentOrders.map((order) => {
                  const orderId = order._id || order.id;
                  const orderNo = order.orderNumber || String(orderId).slice(-4);
                  const custName = order.customerName || order.customer?.name || 'Walk-in Customer';
                  const dueVal = Number(order.dueAmount || order.due || 0);

                  return (
                    <tr key={orderId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', color: '#4f46e5', fontWeight: 'bold' }}>#{orderNo}</td>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{custName}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>{formatPrice(order.totalAmount || order.total)}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: dueVal > 0 ? '#dc2626' : '#059669' }}>
                        {formatPrice(dueVal)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: 'bold', 
                          background: order.status === 'Completed' ? '#d1fae5' : order.status === 'Processing' ? '#e0e7ff' : '#fef3c7', 
                          color: order.status === 'Completed' ? '#059669' : order.status === 'Processing' ? '#4f46e5' : '#d97706' 
                        }}>
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>
                        {formatDate(order.createdAt || order.date)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '25px', textAlign: 'center', color: '#94a3b8' }}>
                    No recent orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}