const SubChildCategory = require('../models/SubChildCategory');
const SubCategory = require('../models/SubCategory');

// @desc    Create a new sub-child category
// @route   POST /api/subchildcategories
// @access  Private
const createSubChildCategory = async (req, res) => {
  try {
    const { categoryId, subCategoryId, name, description, status } = req.body;

    if (!categoryId || !subCategoryId || !name) {
      return res.status(400).json({ 
        message: 'Parent category, subcategory, and name are required.' 
      });
    }

    // Verify subcategory exists
    const subCat = await SubCategory.findById(subCategoryId);
    if (!subCat) {
      return res.status(404).json({ message: 'Subcategory not found.' });
    }

    // Check duplicate name inside the subcategory
    const existing = await SubChildCategory.findOne({
      subCategory: subCategoryId,
      name: name.trim()
    });

    if (existing) {
      return res.status(409).json({
        message: 'A sub-child category with this name already exists in this subcategory.'
      });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/categories/${req.file.filename}`;
    }

    const subChildCategory = await SubChildCategory.create({
      category: categoryId,
      subCategory: subCategoryId,
      name: name.trim(),
      description: description ? description.trim() : '',
      status: status || 'active',
      imageUrl,
      createdBy: req.user?.id
    });

    const populated = await subChildCategory.populate([
      { path: 'category', select: 'name' },
      { path: 'subCategory', select: 'name' }
    ]);

    return res.status(201).json({
      message: 'Sub-child category created successfully.',
      subChildCategory: populated
    });
  } catch (error) {
    console.error('Error creating sub-child category:', error);
    return res.status(500).json({ message: 'Server error creating sub-child category.' });
  }
};

// @desc    Get all sub-child categories (filtered by subCategoryId or categoryId)
// @route   GET /api/subchildcategories
// @access  Public
const getSubChildCategories = async (req, res) => {
  try {
    const { categoryId, subCategoryId, status } = req.query;
    const filter = {};

    if (categoryId) filter.category = categoryId;
    if (subCategoryId) filter.subCategory = subCategoryId;
    if (status) filter.status = status;

    const items = await SubChildCategory.find(filter)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching sub-child categories:', error);
    return res.status(500).json({ message: 'Server error fetching sub-child categories.' });
  }
};

module.exports = { createSubChildCategory, getSubChildCategories };