import { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaTimes, FaImage } from 'react-icons/fa';
import { Link } from 'react-router-dom';

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

export default function AllProducts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal State for Edit Action
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // Format price into Indian Rupee style (e.g. ₹1,25,000.00)
  const formatIndianPrice = (price) => {
    const num = Number(price || 0);
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Format image URLs safely (converts Windows backslashes and prevents localhost routing on mobile)
  const resolveImageUrl = (path) => {
    if (!path || typeof path !== 'string' || path === 'null' || path === 'undefined') {
      return null;
    }
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    const API_BASE_URL = getApiBaseUrl();
    const clean = path.replace(/\\/g, '/');
    const normalized = clean.startsWith('/') ? clean : `/${clean}`;
    return `${API_BASE_URL}${normalized}`;
  };

  // Fetch all products from the backend
  const fetchProducts = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();
    const token = getToken();
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, { headers });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setProducts(Array.isArray(data) ? data : data.products || data.data || []);
      } else {
        throw new Error(data.message || `Failed to load products (Status ${res.status}).`);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Error fetching products.') 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Delete product from backend
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    const token = getToken();
    if (!token) {
      alert('Authentication required. Please log in.');
      return;
    }

    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Delete operation failed.');

      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));
      setFeedback({ type: 'success', message: 'Product deleted successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error deleting product.')
      );
    }
  };

  // Open Edit Modal with selected product data
  const handleEditClick = (product) => {
    setCurrentProduct({
      id: product._id || product.id,
      name: product.name,
      price: product.price || 0,
      stock: product.stock || 0,
      status: product.status || 'active'
    });
    setIsModalOpen(true);
  };

  // Save changes to backend
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
      const res = await fetch(`${API_BASE_URL}/api/products/${currentProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: currentProduct.name.trim(),
          price: Number(currentProduct.price),
          stock: Number(currentProduct.stock),
          status: currentProduct.status
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update product.');

      setProducts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === currentProduct.id
            ? {
                ...p,
                name: currentProduct.name.trim(),
                price: Number(currentProduct.price),
                stock: Number(currentProduct.stock),
                status: currentProduct.status
              }
            : p
        )
      );

      setIsModalOpen(false);
      setFeedback({ type: 'success', message: 'Product updated successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Failed to update product.')
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter products by search term
  const filteredProducts = products.filter((p) => {
    const pName = p.name?.toLowerCase() || '';
    const brandName = p.brand?.name?.toLowerCase() || (typeof p.brand === 'string' ? p.brand.toLowerCase() : '');
    const catName = p.category?.name?.toLowerCase() || (typeof p.category === 'string' ? p.category.toLowerCase() : '');
    const q = searchTerm.toLowerCase();

    return pName.includes(q) || brandName.includes(q) || catName.includes(q);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: '#333', fontSize: '1.5rem', margin: 0 }}>All Products</h2>
        <Link 
          to="/admin/product/add" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#4f46e5', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px' }}
        >
          <FaPlus /> Add Product
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
          placeholder="Search by product name, brand, or category..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Products Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', color: '#555' }}>
              <th style={{ padding: '12px' }}>Image</th>
              <th style={{ padding: '12px' }}>Product Name</th>
              <th style={{ padding: '12px' }}>Brand</th>
              <th style={{ padding: '12px' }}>Category</th>
              <th style={{ padding: '12px' }}>Sub Category</th>
              <th style={{ padding: '12px' }}>Price</th>
              <th style={{ padding: '12px' }}>Stock</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                  Loading products from database...
                </td>
              </tr>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const prodId = p._id || p.id;
                const rawImg = p.images && p.images.length > 0 ? p.images[0] : p.imageUrl;
                const imgUrl = resolveImageUrl(rawImg);

                return (
                  <tr key={prodId} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px' }}>
                      {imgUrl ? (
                        <img 
                          src={imgUrl} 
                          alt={p.name} 
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }
                          }}
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'block' }} 
                        />
                      ) : null}
                      <div style={{
                        width: '40px', 
                        height: '40px', 
                        background: '#f1f5f9', 
                        borderRadius: '4px', 
                        display: imgUrl ? 'none' : 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        border: '1px solid #cbd5e1'
                      }}>
                        <FaImage style={{ color: '#94a3b8', fontSize: '0.9rem' }} />
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }}>{p.name}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{p.brand?.name || (typeof p.brand === 'string' ? p.brand : '-')}</td>
                    <td style={{ padding: '12px', color: '#555' }}>{p.category?.name || (typeof p.category === 'string' ? p.category : '-')}</td>
                    <td style={{ padding: '12px', color: '#555' }}>{p.subCategory?.name || (typeof p.subCategory === 'string' ? p.subCategory : '-')}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#4f46e5' }}>
                      {formatIndianPrice(p.price)}
                    </td>
                    <td style={{ padding: '12px', color: p.stock < 20 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                      {p.stock}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        color: (p.status || '').toLowerCase() === 'active' ? '#10b981' : '#ef4444', 
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        ● {p.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button 
                          onClick={() => handleEditClick(p)} 
                          style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(prodId)} 
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
                <td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Popup Modal */}
      {isModalOpen && currentProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '420px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', position: 'relative' }}>
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}
            >
              <FaTimes />
            </button>

            <h3 style={{ marginBottom: '18px', color: '#333' }}>Edit Product</h3>

            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Product Name</label>
                <input 
                  type="text" 
                  value={currentProduct.name} 
                  onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Price (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={currentProduct.price} 
                  onChange={(e) => setCurrentProduct({ ...currentProduct, price: e.target.value })} 
                  required 
                  placeholder="₹ 0.00"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Stock Quantity</label>
                <input 
                  type="number" 
                  min="0" 
                  value={currentProduct.stock} 
                  onChange={(e) => setCurrentProduct({ ...currentProduct, stock: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Status</label>
                <select 
                  value={currentProduct.status} 
                  onChange={(e) => setCurrentProduct({ ...currentProduct, status: e.target.value })} 
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="out_of_stock">Out of Stock</option>
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