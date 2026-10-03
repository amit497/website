const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');

dotenv.config();

// 1. Connect Database
const connectDB = require('./config/db');
connectDB().catch((err) => console.error('MongoDB connection error:', err.message));

const app = express();

// 2. CORS Setup
// const allowedOrigins = [
//   'https://admin-five-rho-30.vercel.app',
//   'https://admin-nine-beta-31.vercel.app',
//   'http://localhost:5173'
// ];

app.use(cors());

// Express 4/5-এ preflight হ্যান্ডেল করার সঠিক উপায়:
app.options('*', cors());
// Backend-এর app.js বা server.js-এ
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'unload=*');
  next();
});

// Express parses JSON & form data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Static Uploads (Local development only; Vercel filesystem is read-only)
if (!process.env.VERCEL) {
  try {
    const categoriesDir = path.join(__dirname, 'uploads', 'categories');
    const productsDir = path.join(__dirname, 'uploads', 'products');
    if (!fs.existsSync(categoriesDir)) fs.mkdirSync(categoriesDir, { recursive: true });
    if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });
  } catch (err) {
    console.warn('Upload folder skipped:', err.message);
  }
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/subcategories', require('./routes/subCategoryRoutes'));
app.use('/api/subchildcategories', require('./routes/subChildCategoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/brands', require('./routes/brandRoutes'));
app.use('/api/stock-history', require('./routes/stockHistoryRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// 5. Health Check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running smoothly!' });
});

// 6. 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// 7. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

// 8. Local Server Listener
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;