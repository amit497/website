const express = require('express');
const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  removeProductImage,
  getLowStockProducts,
  restockProduct,
  adjustProductStock,
  getProductStockLedger
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const uploadProductImages = require('../middleware/productUploadMiddleware');

const router = express.Router();

// General Product Routes
router.get('/', getProducts);
router.post('/', protect, uploadProductImages.array('images', 5), createProduct);

// Low Stock Alert Route (Placed before /:id so Express doesn't match 'alerts' as an :id parameter)
router.get('/alerts/low-stock', protect, getLowStockProducts);

// Specific Product CRUD & Restock Operations
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.put('/:id/restock', protect, restockProduct);

// Image-Specific Routes
router.put('/:id/image', protect, uploadProductImages.single('image'), uploadProductImage);
router.delete('/:id/image', protect, removeProductImage);

// Add along with other product PUT endpoints:
router.get('/:id/stock-ledger', protect, getProductStockLedger);
router.put('/:id/adjust-stock', protect, adjustProductStock);

module.exports = router;