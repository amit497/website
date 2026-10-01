const express = require('express');
const {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  collectOrderPayment
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getOrders);
router.post('/', protect, createOrder);
router.put('/:id', protect, updateOrder);
router.delete('/:id', protect, deleteOrder);
router.post('/:id/payments', protect, collectOrderPayment);

module.exports = router;