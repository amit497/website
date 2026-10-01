const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const SubChildCategory = require('../models/SubChildCategory');

// Helper to sanitize file paths into standard web forward-slash URLs
const formatImageUrl = (url) => {
  if (!url) return '';
  const clean = url.replace(/\\/g, '/');
  return clean.startsWith('/') ? clean : `/${clean}`;
};

// @desc    Create a new parent category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: 'Category name already exists.' });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = formatImageUrl(`/uploads/categories/${req.file.filename}`);
    }

    const category = await Category.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      status: status || 'active',
      imageUrl,
      createdBy: req.user?.id
    });

    return res.status(201).json({
      message: 'Category created successfully.',
      category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ message: 'Server error creating category.' });
  }
};

// @desc    Get all parent categories (dropdown lists / public use)
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const categories = await Category.find(filter)
      .select('_id name status imageUrl')
      .sort({ name: 1 })
      .lean();

    const formatted = categories.map((cat) => ({
      ...cat,
      imageUrl: formatImageUrl(cat.imageUrl)
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error retrieving categories:', error);
    return res.status(500).json({ message: 'Error retrieving categories.' });
  }
};

// @desc    Get unified list of all categories across all 3 tiers
// @route   GET /api/categories/all-unified
// @access  Private
const getUnifiedCategories = async (req, res) => {
  try {
    const [parents, subs, subChildren] = await Promise.all([
      Category.find({}).sort({ name: 1 }).lean(),
      SubCategory.find({}).populate('category', 'name').sort({ name: 1 }).lean(),
      SubChildCategory.find({})
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .sort({ name: 1 })
        .lean()
    ]);

    const formattedParents = parents.map((cat) => ({
      id: cat._id,
      name: cat.name,
      type: 'Parent',
      parentName: '-',
      status: cat.status || 'active',
      imageUrl: formatImageUrl(cat.imageUrl)
    }));

    const formattedSubs = subs.map((sub) => ({
      id: sub._id,
      name: sub.name,
      type: 'Sub',
      parentName: sub.category?.name || 'Unknown Parent',
      status: sub.status || 'active',
      imageUrl: formatImageUrl(sub.imageUrl)
    }));

    const formattedSubChildren = subChildren.map((child) => ({
      id: child._id,
      name: child.name,
      type: 'Sub Child',
      parentName: child.subCategory?.name || 'Unknown Subcategory',
      status: child.status || 'active',
      imageUrl: formatImageUrl(child.imageUrl)
    }));

    const unifiedList = [...formattedParents, ...formattedSubs, ...formattedSubChildren];

    return res.status(200).json(unifiedList);
  } catch (error) {
    console.error('Unified categories error:', error.message);
    return res.status(500).json({ message: 'Error retrieving categories hierarchy.' });
  }
};

// @desc    Delete any category tier safely with cascade prevention
// @route   DELETE /api/categories/unified/:type/:id
// @access  Private
const deleteUnifiedCategory = async (req, res) => {
  try {
    const { type, id } = req.params;

    if (type === 'Parent') {
      const hasChildren = await SubCategory.exists({ category: id });
      if (hasChildren) {
        return res.status(400).json({
          message: 'Cannot delete: this parent category has linked subcategories. Remove them first.'
        });
      }
      await Category.findByIdAndDelete(id);
    } else if (type === 'Sub') {
      const hasChildren = await SubChildCategory.exists({ subCategory: id });
      if (hasChildren) {
        return res.status(400).json({
          message: 'Cannot delete: this subcategory has linked sub-child categories. Remove them first.'
        });
      }
      await SubCategory.findByIdAndDelete(id);
    } else if (type === 'Sub Child') {
      await SubChildCategory.findByIdAndDelete(id);
    } else {
      return res.status(400).json({ message: 'Invalid category type specified.' });
    }

    return res.status(200).json({ message: `${type} category deleted successfully.` });
  } catch (error) {
    console.error('Delete unified error:', error.message);
    return res.status(500).json({ message: 'Error deleting category.' });
  }
};

// @desc    Update category tier details (name, status, image)
// @route   PUT /api/categories/unified/:type/:id
// @access  Private
const updateUnifiedCategory = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { name, status } = req.body;

    let Model;
    if (type === 'Parent') Model = Category;
    else if (type === 'Sub') Model = SubCategory;
    else if (type === 'Sub Child') Model = SubChildCategory;
    else {
      return res.status(400).json({ message: 'Invalid category type specified.' });
    }

    const item = await Model.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    if (name) item.name = name.trim();
    if (status) item.status = status;

    if (req.file) {
      item.imageUrl = formatImageUrl(`/uploads/categories/${req.file.filename}`);
    }

    await item.save();

    return res.status(200).json({
      message: `${type} updated successfully.`,
      imageUrl: item.imageUrl
    });
  } catch (error) {
    console.error('Update unified category error:', error);
    return res.status(500).json({ message: 'Error updating category.' });
  }
};

// GET /api/categories/tree (বা সাধারণ /api/categories)
const getCategoryTree = async (req, res) => {
  try {
    // Category মডেলের সাথে SubCategory এবং তার আন্ডারে SubChildCategory পপুলেট করা
    const categories = await Category.find()
      .populate({
        path: 'subcategories',
        populate: {
          path: 'subChildCategories', // যদি ৩য় লেভেল থাকে
          model: 'SubChildCategory'
        }
      })
      .lean();

    return res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories tree:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getUnifiedCategories,
  deleteUnifiedCategory,
  updateUnifiedCategory,
  getCategoryTree
};  


