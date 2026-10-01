import { useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaImage, FaSearch, FaCheckCircle, FaExclamationCircle, FaEdit, FaTimes } from 'react-icons/fa';

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

export default function ImageGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal State for Edit Action
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // Format image URLs safely avoiding Windows backslashes and localhost lock on mobile
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
          : (err.message || 'Error loading products.') 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle uploading/replacing image for a specific product
  const handleImageUpload = async (productId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    const token = getToken();
    if (!token) {
      alert('Authentication required. Please log in.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/image`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to upload image');

      setProducts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === productId
            ? { ...p, images: data.images || [data.imageUrl], imageUrl: data.imageUrl || data.images?.[0] }
            : p
        )
      );
      setFeedback({ type: 'success', message: 'Image uploaded successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Image upload failed')
      );
    }
  };

  // Handle removing the primary image
  const handleRemoveImage = async (productId) => {
    if (!window.confirm('Are you sure you want to remove this product image?')) return;

    const token = getToken();
    if (!token) return;

    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/image`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to remove image');

      setProducts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === productId
            ? { ...p, images: [], imageUrl: null }
            : p
        )
      );
      setFeedback({ type: 'success', message: 'Image removed successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Failed to remove image')
      );
    }
  };

  // Handle deleting a product
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    const token = getToken();
    if (!token) return;

    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete product');

      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));
      setFeedback({ type: 'success', message: 'Product deleted successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Delete operation failed')
      );
    }
  };

  // Handle Edit Click (Open Popup Modal)
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

  // Handle Update Submit from Popup Modal
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

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
          name: currentProduct.name,
          price: Number(currentProduct.price),
          stock: Number(currentProduct.stock),
          status: currentProduct.status
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update product');

      setProducts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === currentProduct.id
            ? { ...p, name: currentProduct.name, price: Number(currentProduct.price), stock: Number(currentProduct.stock), status: currentProduct.status }
            : p
        )
      );
      setIsModalOpen(false);
      setFeedback({ type: 'success', message: 'Product updated successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Update failed')
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter products by search term
  const filteredProducts = products.filter((p) => {
    const pName = p.name?.toLowerCase() || '';
    const catName = p.category?.name?.toLowerCase() || (typeof p.category === 'string' ? p.category.toLowerCase() : '');
    const subCatName = p.subCategory?.name?.toLowerCase() || (typeof p.subCategory === 'string' ? p.subCategory.toLowerCase() : '');
    const q = searchTerm.toLowerCase();

    return pName.includes(q) || catName.includes(q) || subCatName.includes(q);
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: '#333', fontSize: '1.5rem', margin: '0 0 5px 0' }}>Product Media & Table Management</h2>
          <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Manage product images, view details, and perform actions efficiently.</p>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '240px' }}>
          <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '12px' }} />
          <input 
            type="text" 
            placeholder="Search product or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 8px 8px 30px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
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

      {/* Table View */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', color: '#555' }}>
              <th style={{ padding: '12px' }}>Product Name</th>
              <th style={{ padding: '12px' }}>Image Preview</th>
              <th style={{ padding: '12px' }}>Category</th>
              <th style={{ padding: '12px' }}>Sub Category</th>
              <th style={{ padding: '12px' }}>Sub Child Category</th>
              <th style={{ padding: '12px' }}>Creation Date</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Upload Action</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: '#888' }}>Loading products...</td>
              </tr>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const prodId = product._id || product.id;
                const rawImg = product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null);
                const fullImgUrl = resolveImageUrl(rawImg);

                return (
                  <tr key={prodId} style={{ borderBottom: '1px solid #eee' }}>
                    
                    {/* Product Name */}
                    <td style={{ padding: '12px', fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }}>
                      {product.name}
                    </td>

                    {/* Image Preview / Thumbnail */}
                    <td style={{ padding: '12px' }}>
                      {fullImgUrl ? (
                        <img 
                          src={fullImgUrl} 
                          alt={product.name} 
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }
                          }}
                          style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd', display: 'block' }} 
                        />
                      ) : null}

                      <div style={{
                        width: '45px', 
                        height: '45px', 
                        background: '#f1f5f9', 
                        borderRadius: '6px', 
                        display: fullImgUrl ? 'none' : 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        border: '1px dashed #cbd5e1' 
                      }}>
                        <FaImage style={{ color: '#94a3b8', fontSize: '1rem' }} />
                      </div>
                    </td>

                    {/* Category Details */}
                    <td style={{ padding: '12px', color: '#555' }}>{product.category?.name || (typeof product.category === 'string' ? product.category : '-')}</td>
                    <td style={{ padding: '12px', color: '#555' }}>{product.subCategory?.name || (typeof product.subCategory === 'string' ? product.subCategory : '-')}</td>
                    <td style={{ padding: '12px', color: '#555' }}>{product.subChildCategory?.name || (typeof product.subChildCategory === 'string' ? product.subChildCategory : '-')}</td>
                    <td style={{ padding: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                      {product.createdAt ? new Date(product.createdAt).toISOString().split('T')[0] : product.creationDate || '-'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                      {fullImgUrl ? (
                        <span style={{ color: '#10b981', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <FaCheckCircle /> Has Image
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <FaExclamationCircle /> No Image
                        </span>
                      )}
                    </td>

                    {/* Upload/Remove Image Action */}
                    <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {fullImgUrl ? (
                        <button 
                          onClick={() => handleRemoveImage(prodId)} 
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '12px' }}
                          title="Remove Image"
                        >
                          Remove Image
                        </button>
                      ) : (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#4f46e5', color: '#fff', borderRadius: '4px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                          <FaPlus size={10} /> Add Image
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleImageUpload(prodId, e)} 
                            style={{ display: 'none' }} 
                          />
                        </label>
                      )}
                    </td>

                    {/* Edit & Delete Action Buttons */}
                    <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button 
                          onClick={() => handleEditClick(product)} 
                          style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Edit Product"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(prodId)} 
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Delete Product"
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
                <td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Popup Modal */}
      {isModalOpen && currentProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '380px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', position: 'relative' }}>
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#888' }}
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
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Price</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={currentProduct.price} 
                  onChange={(e) => setCurrentProduct({ ...currentProduct, price: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Stock</label>
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
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
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
                  style={{ padding: '8px 15px', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#333' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  style={{ padding: '8px 15px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
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