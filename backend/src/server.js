const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 1. Load environment variables first before any route or config loads
dotenv.config();

const express = require('express');
const cors = require('cors');

// 2. Database connection
const connectDB = require('./config/db');

// Call DB connection
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

// 4. Ensure the uploads directory exists on server start
const uploadsDir = path.join(__dirname, 'uploads', 'categories');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 5. Global Middlewares

const allowedOrigins = [
  'http://localhost:5173',
  'https://candle-7jh2.onrender.com'
];
// 5. Global Middlewares
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  credentials: true
}));
// Set CORP header BEFORE static route so browser doesn't block cross-port asset loading
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 6. Serve static uploads folder
// app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const productUploadsDir = path.join(__dirname, 'uploads', 'products');
if (!fs.existsSync(productUploadsDir)) {
  fs.mkdirSync(productUploadsDir, { recursive: true });
}

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
  res.send('API is running smoothly...');
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Local Access:   http://localhost:${PORT}`);
  console.log(`Network Access: http://192.168.0.181:${PORT}`);
});