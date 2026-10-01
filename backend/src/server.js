const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');

// 1. Load environment variables
dotenv.config();

// 2. Database connection
const connectDB = require('./config/db');

(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to initialize database connection:', err.message);
  }
})();

// 3. Initialize Express app (ONLY ONCE)
const app = express();

// 4. Import Routes
const categoryRoutes = require('./routes/categoryRoutes');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const subChildCategoryRoutes = require('./routes/subChildCategoryRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const brandRoutes = require('./routes/brandRoutes');
const stockhistoryRoutes = require('./routes/stockHistoryRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const usersRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// 5. Ensure uploads directories exist (Local development only; Vercel is read-only)
if (!process.env.VERCEL) {
  try {
    const uploadsDir = path.join(__dirname, 'uploads', 'categories');
    const productUploadsDir = path.join(__dirname, 'uploads', 'products');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(productUploadsDir)) {
      fs.mkdirSync(productUploadsDir, { recursive: true });
    }
  } catch (err) {
    console.warn('Upload directory creation skipped:', err.message);
  }
}

const allowedOrigins = [
  'https://admin-five-rho-30.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Instantly resolve browser preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 7. Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 8. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/subchildcategories', subChildCategoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/stock-history', stockhistoryRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Root route for health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running smoothly!' });
});

// 9. 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// 10. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

// 11. Local Server Runner
const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export app for local tests and Vercel handler
module.exports = app;