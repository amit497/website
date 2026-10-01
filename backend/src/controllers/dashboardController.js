const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Get aggregated dashboard statistics and recent orders
// @route   GET /api/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const [orderMetrics, totalUsers, pendingDueOrdersCount, recentOrders] = await Promise.all([
      // 1. Calculate Total Orders, Total Revenue, and Total Pending Dues
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$paidAmount' },
            totalDues: { $sum: '$dueAmount' }
          }
        }
      ]),

      // 2. Count registered users
      User.countDocuments(),

      // 3. Count orders that have an outstanding due balance
      Order.countDocuments({ dueAmount: { $gt: 0 } }),

      // 4. Fetch the 5 most recent orders
      Order.find()
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const metrics = orderMetrics[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      totalDues: 0
    };

    return res.status(200).json({
      stats: {
        totalOrders: metrics.totalOrders,
        totalRevenue: metrics.totalRevenue,
        pendingDues: metrics.totalDues,
        pendingDueOrdersCount,
        registeredUsers: totalUsers
      },
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error.message);
    return res.status(500).json({ message: 'Server error retrieving dashboard statistics.' });
  }
};

module.exports = {
  getDashboardStats
};