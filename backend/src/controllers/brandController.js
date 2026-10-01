const Brand = require('../models/Brand');
const Product = require('../models/Product');

// @desc    Get all brands with live product counts
// @route   GET /api/brands
// @access  Public
const getBrands = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const brands = await Brand.find(filter)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('subChildCategory', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Attach product count dynamically
    const brandsWithCount = await Promise.all(
      brands.map(async (brand) => {
        const count = await Product.countDocuments({ brand: brand._id });
        return {
          ...brand,
          productsCount: count
        };
      })
    );

    return res.status(200).json(brandsWithCount);
  } catch (error) {
    console.error('Get brands error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving brands.' });
  }
};

// @desc    Create a new brand
// @route   POST /api/brands
// @access  Private
const createBrand = async (req, res) => {
  try {
    const { name, category, subCategory, subChildCategory, status } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: 'Brand name and Category are required.' });
    }

    const exists = await Brand.findOne({ name: name.trim() });
    if (exists) {
      return res.status(409).json({ message: 'Brand already exists.' });
    }

    const brand = await Brand.create({
      name: name.trim(),
      category,
      subCategory: subCategory || null,
      subChildCategory: subChildCategory || null,
      status: status || 'active',
      createdBy: req.user?.id
    });

    const populated = await brand.populate([
      { path: 'category', select: 'name' },
      { path: 'subCategory', select: 'name' },
      { path: 'subChildCategory', select: 'name' }
    ]);

    return res.status(201).json({
      message: 'Brand created successfully.',
      brand: populated
    });
  } catch (error) {
    console.error('Create brand error:', error.message);
    return res.status(500).json({ message: 'Server error creating brand.' });
  }
};

// @desc    Update a brand
// @route   PUT /api/brands/:id
// @access  Private
const updateBrand = async (req, res) => {
  try {
    const { name, status } = req.body;
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found.' });
    }

    if (name) brand.name = name.trim();
    if (status) brand.status = status;

    await brand.save();

    return res.status(200).json({ message: 'Brand updated successfully.', brand });
  } catch (error) {
    console.error('Update brand error:', error.message);
    return res.status(500).json({ message: 'Server error updating brand.' });
  }
};

// @desc    Delete a brand
// @route   DELETE /api/brands/:id
// @access  Private
const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found.' });
    }

    // Guard against deleting brands tied to existing catalog products
    const productCount = await Product.countDocuments({ brand: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${productCount} product(s) are currently attached to this brand.`
      });
    }

    await Brand.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Brand deleted successfully.' });
  } catch (error) {
    console.error('Delete brand error:', error.message);
    return res.status(500).json({ message: 'Server error deleting brand.' });
  }
};

module.exports = {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand
};