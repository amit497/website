const express = require('express');
const { createCategory , getCategories ,getUnifiedCategories, 
  deleteUnifiedCategory ,updateUnifiedCategory, 
  getCategoryTree} = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, upload.single('image'), createCategory);
router.get('/', getCategories);
router.get('/all-unified', protect, getUnifiedCategories);
router.delete('/unified/:type/:id', protect, deleteUnifiedCategory);
router.put('/unified/:type/:id', protect, upload.single('image'), updateUnifiedCategory);
router.get('/tree', protect, getCategoryTree);

module.exports = router;