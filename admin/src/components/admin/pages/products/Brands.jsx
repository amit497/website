import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaTag, FaSearch, FaTimes } from 'react-icons/fa';

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

export default function Brands() {
  const [searchTerm, setSearchTerm] = useState('');
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Form states
  const [brandName, setBrandName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [subChildCategory, setSubChildCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category dropdown data from backend
  const [parentCategories, setParentCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [subChildCategories, setSubChildCategories] = useState([]);

  // Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBrand, setCurrentBrand] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // 1. Fetch Brands & Parent Categories on Mount
  const fetchBrands = async () => {
    const API_BASE_URL = getApiBaseUrl();
    const token = getToken();
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/brands`, { headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const list = Array.isArray(data) ? data : data.brands || data.data || [];
        setBrands(list);
      } else {
        console.error('Failed to load brands:', data);
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();

    const fetchCategories = async () => {
      const API_BASE_URL = getApiBaseUrl();
      const token = getToken();
      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetch(`${API_BASE_URL}/api/categories?status=active`, { headers });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const list = Array.isArray(data) ? data : data.categories || data.data || [];
          setParentCategories(list);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };

    fetchCategories();
  }, []);

  // 2. Fetch Subcategories when Category changes
  useEffect(() => {
    if (!category) {
      setSubCategories([]);
      setSubCategory('');
      setSubChildCategories([]);
      setSubChildCategory('');
      return;
    }

    const fetchSubs = async () => {
      const API_BASE_URL = getApiBaseUrl();
      const token = getToken();
      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetch(`${API_BASE_URL}/api/subcategories?categoryId=${category}&status=active`, { headers });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const list = Array.isArray(data) ? data : data.subcategories || data.data || [];
          setSubCategories(list);
        }
      } catch (err) {
        console.error('Failed to load subcategories:', err);
      }
    };

    fetchSubs();
  }, [category]);

  // 3. Fetch Sub-Child Categories when SubCategory changes
  useEffect(() => {
    if (!subCategory) {
      setSubChildCategories([]);
      setSubChildCategory('');
      return;
    }

    const fetchSubChildren = async () => {
      const API_BASE_URL = getApiBaseUrl();
      const token = getToken();
      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetch(`${API_BASE_URL}/api/subchildcategories?subCategoryId=${subCategory}&status=active`, { headers });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const list = Array.isArray(data) ? data : data.subChildCategories || data.data || [];
          setSubChildCategories(list);
        }
      } catch (err) {
        console.error('Failed to load sub-child categories:', err);
      }
    };

    fetchSubChildren();
  }, [subCategory]);

  // Handle Add Brand
  const handleAddBrand = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!brandName.trim() || !category) {
      setFeedback({ type: 'error', message: 'Brand name and Category are required.' });
      return;
    }

    const token = getToken();
    if (!token) {
      setFeedback({ type: 'error', message: 'Please log in to add a brand.' });
      return;
    }

    setIsSubmitting(true);
    const API_BASE_URL = getApiBaseUrl();

    // Prepare payload without sending empty string ObjectIds
    const payload = {
      name: brandName.trim(),
      category
    };
    if (subCategory && subCategory.trim() !== '') {
      payload.subCategory = subCategory;
    }
    if (subChildCategory && subChildCategory.trim() !== '') {
      payload.subChildCategory = subChildCategory;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/brands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Failed to create brand (Status ${res.status}).`);
      }

      setFeedback({ type: 'success', message: 'Brand added successfully!' });
      setBrandName('');
      setCategory('');
      setSubCategory('');
      setSubChildCategory('');
      fetchBrands();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open in firewall.`
          : (err.message || 'Network error occurred.')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Brand
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;

    const token = getToken();
    if (!token) return;

    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/brands/${id}`, {
        method: 'DELETE',
        headers: { 
          'Accept': 'application/json',
          Authorization: `Bearer ${token}` 
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete brand.');

      setBrands((prev) => prev.filter((b) => (b._id || b.id) !== id));
      setFeedback({ type: 'success', message: 'Brand deleted successfully!' });
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Error deleting brand.') 
      });
    }
  };

  // Open Edit Modal
  const handleEditClick = (brand) => {
    setCurrentBrand({
      id: brand._id || brand.id,
      name: brand.name,
      status: brand.status || 'active'
    });
    setIsModalOpen(true);
  };

  // Handle Update Brand Submit
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    setIsUpdating(true);
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/brands/${currentBrand.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: currentBrand.name.trim(),
          status: currentBrand.status
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update brand.');

      setBrands((prev) =>
        prev.map((b) => ((b._id || b.id) === currentBrand.id ? { ...b, name: currentBrand.name.trim(), status: currentBrand.status } : b))
      );

      setIsModalOpen(false);
      setFeedback({ type: 'success', message: 'Brand updated successfully!' });
    } catch (err) {
      alert(
        err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.`
          : (err.message || 'Update failed.')
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredBrands = brands.filter((b) => {
    const nameMatch = b.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const catMatch = b.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                     (typeof b.category === 'string' && b.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return nameMatch || catMatch;
  });

  return (
    <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Left Column: Add Brand Form */}
      <div style={{ flex: 1, minWidth: '320px', background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginBottom: '15px', color: '#333', fontSize: '1.2rem' }}>Add New Brand</h3>

        {feedback.message && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '13px',
            color: feedback.type === 'error' ? '#b91c1c' : '#15803d',
            backgroundColor: feedback.type === 'error' ? '#fee2e2' : '#dcfce7',
            border: `1px solid ${feedback.type === 'error' ? '#fca5a5' : '#86efac'}`
          }}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleAddBrand} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div>
            <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Brand Name *</label>
            <input 
              type="text" 
              value={brandName} 
              onChange={(e) => setBrandName(e.target.value)} 
              placeholder="e.g. Apple, Sony, Nike" 
              required 
              disabled={isSubmitting}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }} 
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Parent Category *</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              required 
              disabled={isSubmitting}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none', background: '#fff', boxSizing: 'border-box', fontSize: '14px' }}
            >
              <option value="">-- Choose Category --</option>
              {parentCategories.map((cat) => (
                <option key={cat._id || cat.id} value={cat._id || cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Sub Category Dropdown */}
          <div>
            <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Sub Category (Optional)</label>
            <select 
              value={subCategory} 
              onChange={(e) => setSubCategory(e.target.value)} 
              disabled={!category || isSubmitting}
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                border: '1px solid #ddd', 
                borderRadius: '6px', 
                outline: 'none', 
                background: category ? '#fff' : '#f5f5f5', 
                boxSizing: 'border-box', 
                fontSize: '14px',
                cursor: category ? 'pointer' : 'not-allowed'
              }}
            >
              <option value="">-- Choose Sub Category --</option>
              {subCategories.map((sub) => (
                <option key={sub._id || sub.id} value={sub._id || sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          {/* Sub Child Category Dropdown */}
          <div>
            <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Sub Child Category (Optional)</label>
            <select 
              value={subChildCategory} 
              onChange={(e) => setSubChildCategory(e.target.value)} 
              disabled={!subCategory || isSubmitting}
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                border: '1px solid #ddd', 
                borderRadius: '6px', 
                outline: 'none', 
                background: subCategory ? '#fff' : '#f5f5f5', 
                boxSizing: 'border-box', 
                fontSize: '14px',
                cursor: subCategory ? 'pointer' : 'not-allowed'
              }}
            >
              <option value="">-- Choose Sub Child Category --</option>
              {subChildCategories.map((child) => (
                <option key={child._id || child.id} value={child._id || child.id}>{child.name}</option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '14px', marginTop: '5px', opacity: isSubmitting ? 0.7 : 1 }}
          >
            <FaPlus /> {isSubmitting ? 'Adding...' : 'Add Brand'}
          </button>
        </form>
      </div>

      {/* Right Column: All Brands Table */}
      <div style={{ flex: 2.5, minWidth: '400px', background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '1.2rem' }}>All Brands</h3>
          
          <div style={{ position: 'relative', width: '220px' }}>
            <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '12px' }} />
            <input 
              type="text" 
              placeholder="Search brand or category..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 8px 8px 30px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', color: '#555' }}>
                <th style={{ padding: '12px' }}>Brand Name</th>
                <th style={{ padding: '12px' }}>Products</th>
                <th style={{ padding: '12px' }}>Category</th>
                <th style={{ padding: '12px' }}>Sub Category</th>
                <th style={{ padding: '12px' }}>Sub Child Category</th>
                <th style={{ padding: '12px' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Loading brands...</td>
                </tr>
              ) : filteredBrands.length > 0 ? (
                filteredBrands.map((b) => (
                  <tr key={b._id || b.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }}>
                      <FaTag style={{ marginRight: '6px', color: '#4f46e5' }} />{b.name}
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>{b.productsCount || 0} Items</td>
                    <td style={{ padding: '12px', color: '#555' }}>{b.category?.name || (typeof b.category === 'string' ? b.category : '-')}</td>
                    <td style={{ padding: '12px', color: '#555' }}>{b.subCategory?.name || (typeof b.subCategory === 'string' ? b.subCategory : '-')}</td>
                    <td style={{ padding: '12px', color: '#555' }}>{b.subChildCategory?.name || (typeof b.subChildCategory === 'string' ? b.subChildCategory : '-')}</td>
                    <td style={{ padding: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                      {b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : b.creationDate || '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button 
                          onClick={() => handleEditClick(b)} 
                          style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(b._id || b.id)} 
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No brands found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Brand Modal Popup */}
      {isModalOpen && currentBrand && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '380px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', position: 'relative' }}>
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#888' }}
            >
              <FaTimes />
            </button>

            <h3 style={{ marginBottom: '18px', color: '#333' }}>Edit Brand</h3>

            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Brand Name</label>
                <input 
                  type="text" 
                  value={currentBrand.name} 
                  onChange={(e) => setCurrentBrand({ ...currentBrand, name: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>Status</label>
                <select 
                  value={currentBrand.status} 
                  onChange={(e) => setCurrentBrand({ ...currentBrand, status: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
                  style={{ padding: '8px 15px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
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