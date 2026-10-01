import { useState, useEffect, useRef } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaImage, FaTimes, FaSave } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Dynamic API Base URL resolver:
// 1. Checks VITE_API_URL from .env
// 2. If missing, dynamically uses the current browser hostname (e.g. 192.168.0.181) with port 5000
const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export default function AllCategories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingCategory, setEditingCategory] = useState({
    id: '',
    name: '',
    type: '',
    status: 'active',
    currentImageUrl: '',
    newImageFile: null,
    previewUrl: ''
  });

  const fileInputRef = useRef(null);
  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const fetchAllCategories = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const API_BASE_URL = getApiBaseUrl();

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/all-unified`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });
      const data = await response.json().catch(() => ([]));

      if (!response.ok) {
        throw new Error(data.message || `Failed with status ${response.status}`);
      }

      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error fetching categories.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCategories();
  }, []);

  // Format image URLs safely avoiding double-slashes, Windows backslashes, and wrong local IP
  const resolveImageUrl = (path) => {
    if (!path || typeof path !== 'string' || path.trim() === '' || path === 'null' || path === 'undefined') {
      return null;
    }
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    
    const API_BASE_URL = getApiBaseUrl();
    const normalized = path.replace(/\\/g, '/');
    const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return `${API_BASE_URL}${cleanPath}`;
  };

  const openEditModal = (cat) => {
    setEditingCategory({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      status: cat.status?.toLowerCase() || 'active',
      currentImageUrl: cat.imageUrl || '',
      newImageFile: null,
      previewUrl: ''
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (editingCategory.previewUrl) {
      URL.revokeObjectURL(editingCategory.previewUrl);
    }
    setEditModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setEditingCategory((prev) => ({
        ...prev,
        newImageFile: file,
        previewUrl: URL.createObjectURL(file)
      }));
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingCategory.name.trim()) {
      alert('Category name is required.');
      return;
    }

    setUpdating(true);
    const API_BASE_URL = getApiBaseUrl();
    const formData = new FormData();
    formData.append('name', editingCategory.name.trim());
    formData.append('status', editingCategory.status);

    if (editingCategory.newImageFile) {
      formData.append('image', editingCategory.newImageFile);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/categories/unified/${editingCategory.type}/${editingCategory.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${getToken()}`
          },
          body: formData
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update category.');
      }

      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.id === editingCategory.id && cat.type === editingCategory.type) {
            return {
              ...cat,
              name: editingCategory.name.trim(),
              status: editingCategory.status,
              imageUrl: result.imageUrl || cat.imageUrl
            };
          }
          return cat;
        })
      );

      setFeedback({ type: 'success', message: `${editingCategory.name} updated successfully!` });
      closeEditModal();
    } catch (err) {
      alert(err.message || 'Error updating category.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    const API_BASE_URL = getApiBaseUrl();

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/unified/${item.type}/${item.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Delete operation failed.');
      }

      setCategories((prev) => prev.filter((cat) => !(cat.id === item.id && cat.type === item.type)));
      setFeedback({ type: 'success', message: `${item.name} deleted successfully.` });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete category.' });
    }
  };

  const filteredCategories = categories.filter((cat) => {
    const matchesSearch =
      cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.parentName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All' || cat.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      
      {/* Header section with Title and Add Links */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: '#333', fontSize: '1.5rem', margin: 0 }}>All Categories Hierarchy</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link 
            to="/admin/category/add" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#4f46e5', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}
          >
            <FaPlus /> Parent
          </Link>
          <Link 
            to="/admin/category/sub" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#d97706', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}
          >
            <FaPlus /> Sub
          </Link>
          <Link 
            to="/admin/category/child" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#16a34a', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}
          >
            <FaPlus /> Sub-Child
          </Link>
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

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input 
            type="text" 
            placeholder="Search category or parent name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', background: '#fff', outline: 'none' }}
        >
          <option value="All">All Tiers</option>
          <option value="Parent">Parent Only</option>
          <option value="Sub">Sub Category Only</option>
          <option value="Sub Child">Sub Child Only</option>
        </select>
      </div>

      {/* Categories Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', color: '#555' }}>
              <th style={{ padding: '12px' }}>Image</th>
              <th style={{ padding: '12px' }}>Category Name</th>
              <th style={{ padding: '12px' }}>Tier</th>
              <th style={{ padding: '12px' }}>Parent Name</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                  Loading categories from database...
                </td>
              </tr>
            ) : filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => {
                const fullImageUrl = resolveImageUrl(cat.imageUrl);

                return (
                  <tr key={`${cat.type}-${cat.id}`} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: '44px', height: '44px', position: 'relative' }}>
                        {fullImageUrl ? (
                          <img 
                            src={fullImageUrl} 
                            alt={cat.name}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback-icon');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                            style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'block' }} 
                          />
                        ) : null}

                        <div 
                          className="image-fallback-icon"
                          style={{ 
                            width: '44px', 
                            height: '44px', 
                            borderRadius: '6px', 
                            background: '#f1f5f9', 
                            display: fullImageUrl ? 'none' : 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: '#94a3b8', 
                            fontSize: '18px', 
                            border: '1px solid #e2e8f0' 
                          }}
                        >
                          <FaImage />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>{cat.name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        background: cat.type === 'Parent' ? '#eef2ff' : cat.type === 'Sub' ? '#fef3c7' : '#f0fdf4', 
                        color: cat.type === 'Parent' ? '#4f46e5' : cat.type === 'Sub' ? '#d97706' : '#16a34a' 
                      }}>
                        {cat.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>{cat.parentName}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        color: cat.status?.toLowerCase() === 'active' ? '#10b981' : '#ef4444', 
                        fontWeight: '500' 
                      }}>
                        ● {cat.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button 
                          onClick={() => openEditModal(cat)}
                          style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(cat)}
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
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
                <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  No categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Category Modal Popup */}
      {editModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '10px',
            width: '450px',
            maxWidth: '92%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>
                Edit {editingCategory.type}
              </h3>
              <button 
                onClick={closeEditModal}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '18px' }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Category Name
                </label>
                <input 
                  type="text" 
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Status
                </label>
                <select 
                  value={editingCategory.status}
                  onChange={(e) => setEditingCategory({ ...editingCategory, status: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Image Preview & Change */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Category Image
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                  {editingCategory.previewUrl || resolveImageUrl(editingCategory.currentImageUrl) ? (
                    <img 
                      src={editingCategory.previewUrl || resolveImageUrl(editingCategory.currentImageUrl)}
                      alt="Thumbnail" 
                      crossOrigin="anonymous"
                      style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>
                      <FaImage />
                    </div>
                  )}

                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={closeEditModal}
                  disabled={updating}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={updating}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '8px 16px', 
                    background: '#4f46e5', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: updating ? 'not-allowed' : 'pointer', 
                    fontWeight: '600', 
                    fontSize: '13px',
                    opacity: updating ? 0.7 : 1
                  }}
                >
                  <FaSave /> {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}