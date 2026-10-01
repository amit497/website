const StockMovement = require('../models/StockMovement');

// @desc    Get all stock movement logs
// @route   GET /api/stock-history
// @access  Private
const getStockHistory = async (req, res) => {
  try {
    const { search, type } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { handledBy: { $regex: search, $options: 'i' } }
      ];
    }

    const history = await StockMovement.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    return res.status(500).json({ message: 'Server error retrieving stock history.' });
  }
};

module.exports = {
  getStockHistory
};