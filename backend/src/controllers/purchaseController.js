const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc    Get all purchase orders
// @route   GET /api/purchases
// @access  Private
const getPurchases = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { orderNo: { $regex: search,$options: 'i' } },
        { supplier: { $regex: search,$options: 'i' } },
        { productName: { $regex: search,$options: 'i' } }
      ];
    }

    const purchases = await Purchase.find(filter)
      .populate('product', 'name stock price')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(purchases);
  } catch (error) {
    console.error('Get purchases error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving purchase orders.' });
  }
};

// @desc    Create new purchase order
// @route   POST /api/purchases
// @access  Private
const createPurchase = async (req, res) => {
  try {
    const { supplier, productId, productName, quantity, unit, perCost, status } = req.body;

    if (!supplier || !productId || !quantity || !perCost) {
      return res.status(400).json({ message: 'Supplier, product, quantity, and cost are required.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const qty = Number(quantity);
    const costPerUnit = Number(perCost);
    const totalCost = qty * costPerUnit;
    const poStatus = status || 'Pending';

    const newPurchase = await Purchase.create({
      supplier: supplier.trim(),
      product: product._id,
      productName: productName || product.name,
      quantity: qty,
      unit: unit || 'Pcs',
      perCost: costPerUnit,
      totalCost,
      status: poStatus,
      createdBy: req.user?.id
    });

    // If marked as 'Received' upon creation, increment stock & log Stock In immediately
    if (poStatus === 'Received') {
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
        reference: `Purchase Order (#${newPurchase.orderNo})`,
        handledBy: req.user?.name || 'Admin',
        user: req.user?.id || null
      });

      newPurchase.receivedAt = new Date();
      await newPurchase.save();
    }

    return res.status(201).json({
      message: 'Purchase order created successfully!',
      purchase: newPurchase
    });
  } catch (error) {
    console.error('Create purchase error:', error.message);
    return res.status(500).json({ message: 'Server error creating purchase order.' });
  }
};

// @desc    Update purchase order or toggle Received status
// @route   PUT /api/purchases/:id
// @access  Private
const updatePurchase = async (req, res) => {
  try {
    const { supplier, productId, productName, quantity, unit, perCost, status } = req.body;
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase order not found.' });
    }

    const previousStatus = purchase.status;
    const newStatus = status || purchase.status;

    if (supplier) purchase.supplier = supplier.trim();
    if (quantity !== undefined) purchase.quantity = Number(quantity);
    if (unit) purchase.unit = unit;
    if (perCost !== undefined) purchase.perCost = Number(perCost);
    purchase.totalCost = purchase.quantity * purchase.perCost;

    if (productId && productId !== purchase.product.toString()) {
      purchase.product = productId;
      purchase.productName = productName || purchase.productName;
    }

    // Inventory increment transition: When changing status from 'Pending' -> 'Received'
    if (previousStatus !== 'Received' && newStatus === 'Received') {
      const product = await Product.findById(purchase.product);
      if (product) {
        const prevStock = product.stock || 0;
        product.stock = prevStock + purchase.quantity;
        if (product.stock > 0 && product.status === 'out_of_stock') {
          product.status = 'active';
        }
        await product.save();

        await StockMovement.create({
          product: product._id,
          productName: product.name,
          type: 'Stock In',
          quantity: purchase.quantity,
          previousStock: prevStock,
          newStock: product.stock,
          reference: `Purchase Order (#${purchase.orderNo})`,
          handledBy: req.user?.name || 'Admin',
          user: req.user?.id || null
        });
      }
      purchase.receivedAt = new Date();
    }

    purchase.status = newStatus;
    await purchase.save();

    return res.status(200).json({
      message: 'Purchase order updated successfully.',
      purchase
    });
  } catch (error) {
    console.error('Update purchase error:', error.message);
    return res.status(500).json({ message: 'Server error updating purchase order.' });
  }
};

// @desc    Delete purchase order
// @route   DELETE /api/purchases/:id
// @access  Private
const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase order not found.' });
    }

    await Purchase.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Purchase order deleted successfully.' });
  } catch (error) {
    console.error('Delete purchase error:', error.message);
    return res.status(500).json({ message: 'Server error deleting purchase order.' });
  }
};

module.exports = {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase
};