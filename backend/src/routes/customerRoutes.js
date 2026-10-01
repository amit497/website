const express = require('express');
const {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
  recordCustomerPayment
} = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// General customer CRUD routes
router.get('/', protect, getCustomers);
router.post('/', protect, createCustomer);
router.put('/:id', protect, updateCustomer);
router.delete('/:id', protect, deleteCustomer);

// Ledger & Payment Endpoints
router.get('/:id/ledger', protect, getCustomerLedger);
router.post('/:id/payments', protect, recordCustomerPayment);

module.exports = router;