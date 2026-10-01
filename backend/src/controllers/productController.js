const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// Helper to normalize slashes for web access
const formatImageUrl = (url) => {
  if (!url) return '';
  const clean = url.replace(/\\/g, '/');
  return clean.startsWith('/') ? clean : `/${clean}`;
};

// Helper to generate guaranteed unique SKU if not provided
const generateSKU = (name) => {
  const prefix = (name || 'PROD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix || 'SKU'}-${random}${timestamp}`;
};

// @desc    Create a new product with multiple images
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      subCategory,
      subChildCategory,
      price,
      stock,
      sku,
      description,
      status
    } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ message: 'Name, Category, and Price are required.' });
    }

    // Process uploaded images array
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        images.push(formatImageUrl(`/uploads/products/${file.filename}`));
      });
    }

    const initialStock = Number(stock) || 0;

    // Generate unique SKU if sku is null, empty string, or undefined
    const finalSKU = sku && sku.trim() !== '' ? sku.trim().toUpperCase() : generateSKU(name);

    // Clean optional ObjectIds to avoid Mongoose CastErrors
    const cleanBrand = brand && brand.trim() !== '' && brand !== 'null' && brand !== 'undefined' ? brand : null;
    const cleanSubCategory = subCategory && subCategory.trim() !== '' && subCategory !== 'null' && subCategory !== 'undefined' ? subCategory : null;
    const cleanSubChildCategory = subChildCategory && subChildCategory.trim() !== '' && subChildCategory !== 'null' && subChildCategory !== 'undefined' ? subChildCategory : null;

    const newProduct = await Product.create({
      name: name.trim(),
      sku: finalSKU,
      brand: cleanBrand,
      category,
      subCategory: cleanSubCategory,
      subChildCategory: cleanSubChildCategory,
      price: Number(price),
      stock: initialStock,
      description: description ? description.trim() : '',
      status: status || 'active',
      images,
      createdBy: req.user?.id || null
    });

    // Automatically record initial stock movement if stock > 0
    if (initialStock > 0) {
      await StockMovement.create({
        product: newProduct._id,
        productName: newProduct.name,
        type: 'Stock In',
        quantity: initialStock,
        previousStock: 0,
        newStock: initialStock,
        reference: 'Initial Stock Creation',
        handledBy: req.user?.name || 'Admin',
        user: req.user?.id || null
      });
    }

    const populatedProduct = await newProduct.populate([
      { path: 'category', select: 'name' },
      { path: 'subCategory', select: 'name' },
      { path: 'subChildCategory', select: 'name' },
      { path: 'brand', select: 'name' }
    ]);

    return res.status(201).json({
      message: 'Product created successfully!',
      product: populatedProduct
    });
  } catch (error) {
    console.error('Create product error:', error);

    // Handle MongoDB duplicate key errors specifically
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        message: `Duplicate entry detected for ${field}. Please use a unique value.`
      });
    }

    return res.status(500).json({ message: error.message || 'Server error while creating product.' });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { category, brand, search, status } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (search) {
      filter.name = { $regex: search,$options: 'i' };
    }

    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('subChildCategory', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (error) {
    console.error('Get products error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving products.' });
  }
};

// @desc    Upload / Replace single product image
// @route   PUT /api/products/:id/image
// @access  Private
const uploadProductImage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    const imageUrl = formatImageUrl(`/uploads/products/${req.file.filename}`);
    product.images = [imageUrl];
    await product.save();

    return res.status(200).json({
      message: 'Product image updated successfully',
      imageUrl,
      images: product.images
    });
  } catch (error) {
    console.error('Error updating product image:', error);
    return res.status(500).json({ message: 'Server error updating image' });
  }
};

// @desc    Remove product image
// @route   DELETE /api/products/:id/image
// @access  Private
const removeProductImage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.images = [];
    await product.save();

    return res.status(200).json({ message: 'Product image removed successfully' });
  } catch (error) {
    console.error('Error removing product image:', error);
    return res.status(500).json({ message: 'Server error removing image' });
  }
};

// @desc    Update product details (name, price, stock, status)
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const { name, price, stock, status } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (name) product.name = name.trim();
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (status) product.status = status;

    await product.save();

    return res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ message: 'Server error updating product' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: 'Server error deleting product' });
  }
};

// @desc    Get all products below low stock threshold
// @route   GET /api/products/alerts/low-stock
// @access  Private
const getLowStockProducts = async (req, res) => {
  try {
    const threshold = Number(req.query.threshold) || 15;

    const products = await Product.find({
      stock: { $lte: threshold }
    })
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .sort({ stock: 1 })
      .lean();

    return res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    return res.status(500).json({ message: 'Server error retrieving stock alerts.' });
  }
};

// @desc    Quick restock / increment stock for a product & log to StockMovement
// @route   PUT /api/products/:id/restock
// @access  Private
const restockProduct = async (req, res) => {
  try {
    const { addedStock } = req.body;
    const qty = Number(addedStock);

    if (!qty || qty <= 0) {
      return res.status(400).json({ message: 'Please provide a valid quantity to restock.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const prevStock = product.stock || 0;
    product.stock = prevStock + qty;

    if (product.stock > 0 && product.status === 'out_of_stock') {
      product.status = 'active';
    }

    await product.save();

    await StockMovement.create({
      product: product._id,
      productName: product.name,
      type: 'Stock In',
      quantity: qty,
      previousStock: prevStock,
      newStock: product.stock,
      reference: 'Manual Restock',
      handledBy: req.user?.name || 'Admin',
      user: req.user?.id || null
    });

    return res.status(200).json({
      message: `Stock updated successfully. New stock: ${product.stock}`,
      product
    });
  } catch (error) {
    console.error('Restock product error:', error);
    return res.status(500).json({ message: 'Server error updating stock.' });
  }
};

// @desc    Adjust or Add to product stock and log to StockMovement
// @route   PUT /api/products/:id/adjust-stock
// @access  Private
const adjustProductStock = async (req, res) => {
  try {
    const { addStock, newStock, reason } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const prevStock = product.stock || 0;
    let finalStock = prevStock;
    let qtyChange = 0;
    let movementType = 'Stock In';

    if (addStock !== undefined) {
      const qtyToAdd = Number(addStock);
      if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
        return res.status(400).json({ message: 'Quantity to add must be greater than 0.' });
      }
      qtyChange = qtyToAdd;
      finalStock = prevStock + qtyToAdd;
      movementType = 'Stock In';
    } else if (newStock !== undefined) {
      const target = Number(newStock);
      if (isNaN(target) || target < 0) {
        return res.status(400).json({ message: 'Target stock must be 0 or greater.' });
      }
      qtyChange = target - prevStock;
      finalStock = target;
      movementType = qtyChange >= 0 ? 'Stock In' : 'Stock Out';
    } else {
      return res.status(400).json({ message: 'Please provide addStock or newStock quantity.' });
    }

    product.stock = finalStock;
    if (finalStock > 0 && product.status === 'out_of_stock') {
      product.status = 'active';
    } else if (finalStock === 0) {
      product.status = 'out_of_stock';
    }

    await product.save();

    const movement = await StockMovement.create({
      product: product._id,
      productName: product.name,
      type: movementType,
      quantity: qtyChange,
      previousStock: prevStock,
      newStock: finalStock,
      reference: reason || 'Manual Stock Addition',
      handledBy: req.user?.name || 'Admin',
      user: req.user?.id || null
    });

    return res.status(200).json({
      message: `Stock successfully updated. Previous: ${prevStock}, Added: ${qtyChange}, New Stock: ${finalStock}`,
      product,
      movement
    });
  } catch (error) {
    console.error('Adjust stock error:', error);
    return res.status(500).json({ message: 'Server error adjusting stock.' });
  }
};

// @desc    Get complete Stock Ledger for a specific product
// @route   GET /api/products/:id/stock-ledger
// @access  Private
const getProductStockLedger = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const ledger = await StockMovement.find({ product: product._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      product,
      ledger
    });
  } catch (error) {
    console.error('Error fetching product stock ledger:', error);
    return res.status(500).json({ message: 'Server error retrieving stock ledger.' });
  }
};

module.exports = {
  createProduct,
  getProducts,
  uploadProductImage,
  removeProductImage,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  restockProduct,
  adjustProductStock,
  getProductStockLedger
};