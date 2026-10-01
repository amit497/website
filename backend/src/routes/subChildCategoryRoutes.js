const express = require('express');
const { 
  createSubChildCategory, 
  getSubChildCategories 
} = require('../controllers/subChildCategoryController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getSubChildCategories);
router.post('/', protect, upload.single('image'), createSubChildCategory);

module.exports = router;