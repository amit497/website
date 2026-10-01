const express = require('express');
const {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getPurchases);
router.post('/', protect, createPurchase);
router.put('/:id', protect, updatePurchase);
router.delete('/:id', protect, deletePurchase);

module.exports = router;