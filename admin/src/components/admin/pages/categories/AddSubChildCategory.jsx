import { useState, useEffect, useRef } from 'react';
import { FaPlus, FaImage, FaTimes } from 'react-icons/fa';

// Dynamic API Base URL resolver:
// Automatically detects the current browser hostname (e.g. 192.168.0.181) for port 5000
const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export default function AddSubChildCategory() {
  const [parentCategories, setParentCategories] = useState([]);
  const [parentCategory, setParentCategory] = useState('');
  
  const [subCategories, setSubCategories] = useState([]);
  const [subCategory, setSubCategory] = useState('');

  const [subChildName, setSubChildName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [loadingParents, setLoadingParents] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fileInputRef = useRef(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // 1. Fetch Parent Categories on Component Mount
  useEffect(() => {
    const fetchParentCategories = async () => {
      setLoadingParents(true);
      const API_BASE_URL = getApiBaseUrl();
      try {
        const res = await fetch(`${API_BASE_URL}/api/categories?status=active`);
        const data = await res.json();
        if (res.ok) {
          setParentCategories(Array.isArray(data) ? data : data.categories || []);
        } else {
          throw new Error(data.message || 'Failed to fetch categories');
        }
      } catch (err) {
        setFeedback({ 
          type: 'error', 
          message: err.message?.includes('Failed to fetch') 
            ? `Cannot connect to server at ${API_BASE_URL}. Ensure port 5000 is open.`
            : 'Error loading parent categories.' 
        });
      } finally {
        setLoadingParents(false);
      }
    };

    fetchParentCategories();
  }, []);

  // 2. Fetch Sub-Categories whenever Parent Category changes
  useEffect(() => {
    if (!parentCategory) {
      setSubCategories([]);
      setSubCategory('');
      return;
    }

    const fetchSubCategories = async () => {
      setLoadingSubs(true);
      const API_BASE_URL = getApiBaseUrl();
      try {
        const res = await fetch(`${API_BASE_URL}/api/subcategories?categoryId=${parentCategory}&status=active`);
        const data = await res.json();
        if (res.ok) {
          setSubCategories(Array.isArray(data) ? data : data.subcategories || []);
        } else {
          throw new Error(data.message || 'Failed to fetch sub-categories');
        }
      } catch (err) {
        setFeedback({ 
          type: 'error', 
          message: err.message?.includes('Failed to fetch') 
            ? `Cannot connect to server at ${API_BASE_URL}.`
            : 'Error loading subcategories.' 
        });
      } finally {
        setLoadingSubs(false);
      }
    };

    fetchSubCategories();
  }, [parentCategory]);

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

    if (!parentCategory) {
      setFeedback({ type: 'error', message: 'Please select a parent category.' });
      return;
    }

    if (!subCategory) {
      setFeedback({ type: 'error', message: 'Please select a sub-category.' });
      return;
    }

    if (!subChildName.trim()) {
      setFeedback({ type: 'error', message: 'Sub-child category name is required.' });
      return;
    }

    const token = getToken();
    if (!token) {
      setFeedback({ type: 'error', message: 'Session expired. Please log in again.' });
      return;
    }

    const formData = new FormData();
    formData.append('categoryId', parentCategory);
    formData.append('subCategoryId', subCategory);
    formData.append('name', subChildName.trim());
    formData.append('description', description.trim());
    formData.append('status', status);
    if (image) {
      formData.append('image', image);
    }

    setSubmitting(true);
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/subchildcategories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to save sub-child category.');
      }

      setFeedback({ type: 'success', message: `Sub-child category "${subChildName}" added successfully!` });

      // Reset Form
      setParentCategory('');
      setSubCategory('');
      setSubChildName('');
      setDescription('');
      setStatus('active');
      clearImage();
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        message: err.message?.includes('Failed to fetch') 
          ? `Cannot connect to server at ${API_BASE_URL}. Check network connection.` 
          : (err.message || 'Server error occurred.') 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ marginBottom: '20px', color: '#333', fontSize: '1.5rem' }}>Add Sub Child Category</h2>

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
        
        {/* Parent Category Select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Select Parent Category *</label>
          <select 
            value={parentCategory} 
            onChange={(e) => {
              setParentCategory(e.target.value);
              setSubCategory('');
            }} 
            required 
            disabled={loadingParents || submitting}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', background: '#fff' }}
          >
            <option value="">
              {loadingParents ? '-- Loading parent categories... --' : '-- Choose Parent Category --'}
            </option>
            {parentCategories.map((cat) => (
              <option key={cat._id || cat.id} value={cat._id || cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sub Category Select (Dependent on Parent) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Select Sub Category *</label>
          <select 
            value={subCategory} 
            onChange={(e) => setSubCategory(e.target.value)} 
            required 
            disabled={!parentCategory || loadingSubs || submitting}
            style={{ 
              padding: '10px 12px', 
              border: '1px solid #ddd', 
              borderRadius: '6px', 
              fontSize: '14px', 
              outline: 'none', 
              background: parentCategory ? '#fff' : '#f5f5f5', 
              cursor: parentCategory ? 'pointer' : 'not-allowed' 
            }}
          >
            <option value="">
              {loadingSubs 
                ? '-- Loading subcategories... --' 
                : !parentCategory 
                ? '-- First select a Parent Category --' 
                : subCategories.length === 0 
                ? '-- No subcategories found --' 
                : '-- Choose Sub Category --'}
            </option>
            {subCategories.map((sub) => (
              <option key={sub._id || sub.id} value={sub._id || sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sub Child Category Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Sub Child Category Name *</label>
          <input 
            type="text" 
            value={subChildName} 
            onChange={(e) => setSubChildName(e.target.value)} 
            placeholder="e.g. Smartwatches, Bluetooth Earbuds" 
            required 
            disabled={submitting}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
          />
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Enter description (optional)" 
            rows="4"
            disabled={submitting}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', resize: 'vertical' }}
          />
        </div>

        {/* Status Select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)} 
            disabled={submitting}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', background: '#fff' }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Image Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Sub Child Category Image</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', border: '1px dashed #cbd5e1', padding: '15px', borderRadius: '6px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaImage style={{ fontSize: '1.5rem', color: '#64748b' }} />
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                disabled={submitting}
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
          disabled={submitting}
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
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            transition: 'background 0.2s'
          }}
        >
          <FaPlus /> {submitting ? 'Saving...' : 'Save Sub Child Category'}
        </button>

      </form>
    </div>
  );
}