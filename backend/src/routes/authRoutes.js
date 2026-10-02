const express = require('express');
const { 
  registerUser, 
  loginUser, 
  getProfile, 
  changePassword 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public Routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Fallback handlers: ব্রাউজারে সরাসরি URL হিট করলে যাতে 404 না দিয়ে প্রপার মেসেজ দেয়
router.route('/login')
  .get((req, res) => {
    res.status(405).json({ 
      message: 'Method Not Allowed. Please send a POST request with credentials to login.' 
    });
  })
  .head((req, res) => {
    res.status(200).end();
  });

router.route('/register')
  .get((req, res) => {
    res.status(405).json({ 
      message: 'Method Not Allowed. Please send a POST request to register.' 
    });
  });

// Protected Routes
router.get('/profile', protect, getProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;