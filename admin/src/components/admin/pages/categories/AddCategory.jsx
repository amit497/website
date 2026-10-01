import { useState, useRef } from 'react';
import { FaPlus, FaImage, FaTimes } from 'react-icons/fa';

// Dynamic API Base URL resolver:
// Automatically uses current browser hostname (e.g., 192.168.0.181) for port 5000
const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export default function AddCategory() {
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'Image must be less than 5 MB.' });
        return;
      }
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFeedback({ type: '', message: '' });
    }
  };

  const clearImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImage(null);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!categoryName.trim()) {
      setFeedback({ type: 'error', message: 'Category name is required.' });
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setFeedback({ type: 'error', message: 'Authentication required. Please log in again.' });
      return;
    }

    // Build multipart/form-data
    const data = new FormData();
    data.append('name', categoryName.trim());
    data.append('description', description.trim());
    data.append('status', status);
    if (image) {
      data.append('image', image);
    }

    setLoading(true);
    const API_BASE_URL = getApiBaseUrl();

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || `Failed to create category (Status ${response.status}).`);
      }

      setFeedback({ type: 'success', message: `Category "${categoryName}" added successfully!` });

      // Reset form
      setCategoryName('');
      setDescription('');
      setStatus('active');
      clearImage();
    } catch (err) {
      console.error('Create category error:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch') 
          ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open.` 
          : (err.message || 'Server error occurred.') 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ marginBottom: '20px', color: '#333', fontSize: '1.5rem' }}>Add New Category</h2>

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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Category Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Category Name *</label>
          <input 
            type="text" 
            value={categoryName} 
            onChange={(e) => setCategoryName(e.target.value)} 
            placeholder="e.g., Electronics, Fashion, Grocery" 
            required 
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
          />
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Enter category description (optional)" 
            rows="4"
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', resize: 'vertical' }}
          />
        </div>

        {/* Status Select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)} 
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', background: '#fff' }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Category Image Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Category Image</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', border: '1px dashed #cbd5e1', padding: '15px', borderRadius: '6px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaImage style={{ fontSize: '1.5rem', color: '#64748b' }} />
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                disabled={loading}
                style={{ fontSize: '14px' }}
              />
            </div>

            {/* Thumbnail Preview */}
            {previewUrl && (
              <div style={{ position: 'relative', width: '120px', height: '90px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={clearImage}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: '#fff', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <FaTimes style={{ fontSize: '10px' }} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            padding: '12px 20px', 
            background: '#4f46e5', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '6px', 
            fontWeight: 'bold', 
            fontSize: '15px', 
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background 0.2s'
          }}
        >
          <FaPlus /> {loading ? 'Saving...' : 'Save Category'}
        </button>

      </form>
    </div>
  );
}