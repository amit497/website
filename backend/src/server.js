const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 1. Load environment variables
dotenv.config();

const express = require('express');
const cors = require('cors');

// 2. Database connection
const connectDB = require('./config/db');
connectDB();

// 3. Import Routes
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

const app = express();

// 4. Ensure uploads directories exist (Local development support)
const uploadsDir = path.join(__dirname, 'uploads', 'categories');
const productUploadsDir = path.join(__dirname, 'uploads', 'products');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(productUploadsDir)) {
    fs.mkdirSync(productUploadsDir, { recursive: true });
  }
} catch (err) {
  console.log('Upload directory check skipped in read-only environment');
}

// 5. Global Middlewares & Dynamic CORS
// const allowedOrigins = [
//   'http://localhost:5173',
//   'http://localhost:3000',
//   'https://backend-3vhjsrpj9-amit497s-projects.vercel.app'
// ];

app.use(cors());

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 6. Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 7. Mount API Routes
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
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running smoothly on Vercel!' });
});

// 8. 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// 9. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

// 10. Local Server Runner & Vercel Export
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// এটি Vercel Serverless-এর জন্য বাধ্যতামূলক
module.exports = app;