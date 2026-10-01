import { useState, useEffect, useRef } from 'react';
import { FaPlus, FaImage, FaTimes } from 'react-icons/fa';

// Dynamic API Base URL resolver for Desktop and Mobile (e.g. 192.168.0.181:5000)
const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export default function AddProduct() {
  const [productName, setProductName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [subChildCategory, setSubChildCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [description, setDescription] = useState('');

  // Dropdown options loaded from backend
  const [brands, setBrands] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [subChildCategories, setSubChildCategories] = useState([]);

  // Image upload states
  const [images, setImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fileInputRef = useRef(null);
  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // 1. Fetch initial Brands & Parent Categories on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      const API_BASE_URL = getApiBaseUrl();
      const token = getToken();
      const headers = { Accept: 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Fetch Brands
      setLoadingBrands(true);
      try {
        const brandRes = await fetch(`${API_BASE_URL}/api/brands`, { headers });
        const brandData = await brandRes.json().catch(() => ([]));

        if (brandRes.ok) {
          // Normalize possible response shapes: [...] or { brands: [...] } or { data: [...] }
          let list = [];
          if (Array.isArray(brandData)) {
            list = brandData;
          } else if (Array.isArray(brandData.brands)) {
            list = brandData.brands;
          } else if (Array.isArray(brandData.data)) {
            list = brandData.data;
          }
          setBrands(list);
        } else {
          console.error('Brand fetch error response:', brandData);
        }
      } catch (err) {
        console.error('Network error fetching brands from:', API_BASE_URL, err);
      } finally {
        setLoadingBrands(false);
      }

      // Fetch Categories
      try {
        const catRes = await fetch(`${API_BASE_URL}/api/categories?status=active`, { headers });
        const catData = await catRes.json().catch(() => ([]));

        if (catRes.ok) {
          let list = [];
          if (Array.isArray(catData)) {
            list = catData;
          } else if (Array.isArray(catData.categories)) {
            list = catData.categories;
          } else if (Array.isArray(catData.data)) {
            list = catData.data;
          }
          setParentCategories(list);
        }
      } catch (err) {
        console.error('Network error fetching categories:', err);
      }
    };

    fetchInitialData();
  }, []);

  // 2. Fetch Sub-Categories when Parent Category changes
  useEffect(() => {
    if (!parentCategory) {
      setSubCategories([]);
      setSubCategory('');
      setSubChildCategories([]);
      setSubChildCategory('');
      return;
    }

    const fetchSubCategories = async () => {
      setLoadingSubs(true);
      const API_BASE_URL = getApiBaseUrl();
      const token = getToken();
      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetch(`${API_BASE_URL}/api/subcategories?categoryId=${parentCategory}&status=active`, { headers });
        if (res.ok) {
          const data = await res.json().catch(() => ([]));
          setSubCategories(Array.isArray(data) ? data : data.subcategories || data.data || []);
        }
      } catch (err) {
        console.error('Failed to load subcategories:', err);
      } finally {
        setLoadingSubs(false);
      }
    };

    fetchSubCategories();
  }, [parentCategory]);

  // 3. Fetch Sub-Child Categories when Sub Category changes
  useEffect(() => {
    if (!subCategory) {
      setSubChildCategories([]);
      setSubChildCategory('');
      return;
    }

    const fetchSubChildCategories = async () => {
      setLoadingChildren(true);
      const API_BASE_URL = getApiBaseUrl();
      const token = getToken();
      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetch(`${API_BASE_URL}/api/subchildcategories?subCategoryId=${subCategory}&status=active`, { headers });
        if (res.ok) {
          const data = await res.json().catch(() => ([]));
          setSubChildCategories(Array.isArray(data) ? data : data.subChildCategories || data.data || []);
        }
      } catch (err) {
        console.error('Failed to load sub child categories:', err);
      } finally {
        setLoadingChildren(false);
      }
    };

    fetchSubChildCategories();
  }, [subCategory]);

  // Handle Multi-image File Input
  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const validFiles = selectedFiles.filter((file) => file.size <= 5 * 1024 * 1024);
    if (validFiles.length < selectedFiles.length) {
      alert('Some images were skipped because they exceed 5MB.');
    }

    setImages((prev) => [...prev, ...validFiles]);

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (indexToRemove) => {
    if (previewUrls[indexToRemove]) {
      URL.revokeObjectURL(previewUrls[indexToRemove]);
    }
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!productName.trim() || !parentCategory || !price) {
      setFeedback({ type: 'error', message: 'Product Name, Parent Category, and Price are required.' });
      return;
    }

    const token = getToken();
    if (!token) {
      setFeedback({ type: 'error', message: 'Session expired. Please log in again.' });
      return;
    }

    const formData = new FormData();
    formData.append('name', productName.trim());
    formData.append('price', String(Number(price)));
    formData.append('stock', String(Number(stock || 0)));
    formData.append('description', description.trim());
    formData.append('category', parentCategory);

    // CRITICAL: Avoid passing empty strings "" as MongoDB ObjectId
    if (selectedBrand && selectedBrand.trim() !== '') {
      formData.append('brand', selectedBrand);
    }
    if (subCategory && subCategory.trim() !== '') {
      formData.append('subCategory', subCategory);
    }
    if (subChildCategory && subChildCategory.trim() !== '') {
      formData.append('subChildCategory', subChildCategory);
    }

    images.forEach((imgFile) => {
      formData.append('images', imgFile);
    });

    setLoading(true);
    const API_BASE_URL = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Server responded with status ${res.status}`);
      }

      setFeedback({ type: 'success', message: `Product "${productName}" added successfully!` });

      // Reset Form
      setProductName('');
      setSelectedBrand('');
      setParentCategory('');
      setSubCategory('');
      setSubChildCategory('');
      setPrice('');
      setStock('10');
      setDescription('');
      setImages([]);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Product creation error:', err);
      setFeedback({ 
        type: 'error', 
        message: err.message.includes('Failed to fetch')
          ? `Cannot connect to server at ${API_BASE_URL}. Check if port 5000 is open in firewall.`
          : (err.message || 'Server error occurred while creating product.') 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ marginBottom: '20px', color: '#333', fontSize: '1.5rem' }}>Add New Product</h2>

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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Product Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Product Name *</label>
          <input 
            type="text" 
            value={productName} 
            onChange={(e) => setProductName(e.target.value)} 
            placeholder="e.g. Scented Soy Candle 250g" 
            required 
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none' }} 
          />
        </div>

        {/* Brand Selection Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Select Brand</label>
          <select 
            value={selectedBrand} 
            onChange={(e) => setSelectedBrand(e.target.value)} 
            disabled={loading || loadingBrands}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', background: '#fff' }}
          >
            <option value="">
              {loadingBrands ? '-- Loading brands... --' : brands.length === 0 ? '-- No brands found in database --' : '-- Choose Brand (Optional) --'}
            </option>
            {brands.map((b) => {
              const brandId = b._id || b.id || (typeof b === 'string' ? b : '');
              const brandName = b.name || (typeof b === 'string' ? b : 'Unnamed Brand');
              return (
                <option key={brandId} value={brandId}>
                  {brandName}
                </option>
              );
            })}
          </select>
        </div>

        {/* 1. Parent Category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Parent Category *</label>
          <select 
            value={parentCategory} 
            onChange={(e) => {
              setParentCategory(e.target.value);
              setSubCategory('');
              setSubChildCategory('');
            }} 
            required 
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', background: '#fff' }}
          >
            <option value="">-- Choose Parent Category --</option>
            {parentCategories.map((cat) => (
              <option key={cat._id || cat.id} value={cat._id || cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Sub Category (Dependent) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Sub Category</label>
          <select 
            value={subCategory} 
            onChange={(e) => {
              setSubCategory(e.target.value);
              setSubChildCategory('');
            }} 
            disabled={!parentCategory || loadingSubs || loading}
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
                ? '-- Loading Subcategories... --' 
                : !parentCategory 
                ? '-- First select Parent Category --' 
                : subCategories.length === 0 
                ? '-- No Subcategories Available --' 
                : '-- Choose Sub Category --'}
            </option>
            {subCategories.map((sub) => (
              <option key={sub._id || sub.id} value={sub._id || sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Sub Child Category (Dependent) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Sub Child Category</label>
          <select 
            value={subChildCategory} 
            onChange={(e) => setSubChildCategory(e.target.value)} 
            disabled={!subCategory || loadingChildren || loading}
            style={{ 
              padding: '10px 12px', 
              border: '1px solid #ddd', 
              borderRadius: '6px', 
              fontSize: '14px', 
              outline: 'none', 
              background: subCategory ? '#fff' : '#f5f5f5',
              cursor: subCategory ? 'pointer' : 'not-allowed'
            }}
          >
            <option value="">
              {loadingChildren 
                ? '-- Loading Sub-Child Categories... --' 
                : !subCategory 
                ? '-- First select Sub Category --' 
                : subChildCategories.length === 0 
                ? '-- No Sub-Child Categories Available --' 
                : '-- Choose Sub Child Category --'}
            </option>
            {subChildCategories.map((child) => (
              <option key={child._id || child.id} value={child._id || child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>

        {/* Price and Stock Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '500', color: '#555' }}>Price (₹) *</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              value={price} 
              onChange={(e) => setPrice(e.target.value)} 
              placeholder="0.00" 
              required 
              disabled={loading}
              style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '500', color: '#555' }}>Stock Quantity</label>
            <input 
              type="number" 
              min="0"
              value={stock} 
              onChange={(e) => setStock(e.target.value)} 
              placeholder="10" 
              disabled={loading}
              style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none' }} 
            />
          </div>
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Write details about the product..." 
            rows="3" 
            disabled={loading}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', resize: 'vertical' }} 
          />
        </div>

        {/* Multi-Product Images */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Product Images (Multiple allowed)</label>
          <div style={{ border: '1px dashed #cbd5e1', padding: '15px', borderRadius: '6px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaImage style={{ fontSize: '1.5rem', color: '#64748b' }} />
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleImageChange}
                disabled={loading}
                style={{ fontSize: '14px' }} 
              />
            </div>

            {/* Thumbnail Previews */}
            {previewUrls.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                {previewUrls.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                    <img src={url} alt={`preview-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: '#fff', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <FaTimes style={{ fontSize: '9px' }} />
                    </button>
                  </div>
                ))}
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
            transition: 'background 0.2s',
            marginTop: '6px'
          }}
        >
          <FaPlus /> {loading ? 'Saving Product...' : 'Save Product'}
        </button>
      </form>
    </div>
  );
}