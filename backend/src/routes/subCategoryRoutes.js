const express = require('express');
const { createSubCategory, getSubCategories, getCategoryTree } = require('../controllers/subCategoryController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Reuse your multer instance

const router = express.Router();

router.get('/', getSubCategories);
router.post('/', protect, upload.single('image'), createSubCategory);
router.get('/tree', protect, getCategoryTree);

module.exports = router;