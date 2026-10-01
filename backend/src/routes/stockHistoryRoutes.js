const express = require('express');
const { getStockHistory } = require('../controllers/stockHistoryController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getStockHistory);

module.exports = router;