const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');

// @desc    Create a new subcategory
// @route   POST /api/subcategories
// @access  Private
const createSubCategory = async (req, res) => {
  try {
    const { categoryId, name, description, status } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({ message: 'Category ID and SubCategory name are required.' });
    }

    // Verify parent category exists
    const parent = await Category.findById(categoryId);
    if (!parent) {
      return res.status(404).json({ message: 'Parent category not found.' });
    }

    // Check for duplicate name under the same category
    const existing = await SubCategory.findOne({ category: categoryId, name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: 'A subcategory with this name already exists in this category.' });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/categories/${req.file.filename}`;
    }

    const subCategory = await SubCategory.create({
      category: categoryId,
      name: name.trim(),
      description: description ? description.trim() : '',
      status: status || 'active',
      imageUrl,
      createdBy: req.user?.id
    });

    const populatedSubCategory = await subCategory.populate('category', 'name');

    return res.status(201).json({
      message: 'Subcategory created successfully.',
      subCategory: populatedSubCategory
    });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return res.status(500).json({ message: 'Server error creating subcategory.' });
  }
};

// @desc    Get all subcategories (optional category filter)
// @route   GET /api/subcategories
// @access  Public
const getSubCategories = async (req, res) => {
  try {
    const { categoryId, status } = req.query;
    const filter = {};

    if (categoryId) filter.category = categoryId;
    if (status) filter.status = status;

    const subcategories = await SubCategory.find(filter)
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return res.status(500).json({ message: 'Server error fetching subcategories.' });
  }
};

// বিকল্প: যদি মডেলে ref না থেকে subcategory তে categoryId থাকে
const getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.find().lean();
    const subcategories = await SubCategory.find().lean();
    const subChildCategories = await SubChildCategory.find().lean();

    // নেস্টেড ট্রি তৈরি
    const tree = categories.map((cat) => {
      const matchedSubs = subcategories.filter(
        (sub) => String(sub.category || sub.categoryId) === String(cat._id)
      );

      const subsWithChildren = matchedSubs.map((sub) => {
        const matchedChildren = subChildCategories.filter(
          (child) => String(child.subCategory || child.subCategoryId) === String(sub._id)
        );
        return { ...sub, subChildCategories: matchedChildren };
      });

      return {
        ...cat,
        subcategories: subsWithChildren
      };
    });

    return res.status(200).json({ success: true, categories: tree });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createSubCategory, getSubCategories, getCategoryTree };