const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { customerName: { $regex: search,$options: 'i' } },
        { customerPhone: { $regex: search,$options: 'i' } },
        { orderNumber: { $regex: search,$options: 'i' } }
      ];
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name phone address')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(orders);
  } catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving orders.' });
  }
};

// @desc    Create new order & automatically save new customer + log stock deductions
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const {
      customer: customerId,
      customerName,
      customerPhone,
      customerAddress,
      items,
      totalAmount,
      paidAmount,
      dueAmount,
      paymentMethod,
      status
    } = req.body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return res.status(400).json({ message: 'Customer name, phone number, and items are required.' });
    }

    const cleanPhone = customerPhone.trim();
    const cleanName = customerName.trim();
    const cleanAddress = customerAddress ? customerAddress.trim() : '';

    // 1. Locate existing customer or create a brand new one
    let customerDoc = null;

    if (customerId) {
      customerDoc = await Customer.findById(customerId);
    }

    // If not found by ID, lookup by phone number
    if (!customerDoc) {
      customerDoc = await Customer.findOne({ phone: cleanPhone });
    }

    // If customer doesn't exist, create and save to MongoDB
    if (!customerDoc) {
      customerDoc = await Customer.create({
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        status: 'Active',
        totalOrders: 1,
        totalSpent: Number(totalAmount) || 0,
        createdBy: req.user?.id
      });
    } else {
      // Update existing customer totals
      customerDoc.totalOrders = (customerDoc.totalOrders || 0) + 1;
      customerDoc.totalSpent = (customerDoc.totalSpent || 0) + (Number(totalAmount) || 0);
      if (!customerDoc.address && cleanAddress) {
        customerDoc.address = cleanAddress;
      }
      await customerDoc.save();
    }

    // 2. Create the Order document FIRST so orderNumber and _id exist for stock logs
    const order = await Order.create({
      customer: customerDoc._id,
      customerName: cleanName,
      customerPhone: cleanPhone,
      customerAddress: cleanAddress,
      items,
      totalAmount: Number(totalAmount),
      paidAmount: Number(paidAmount) || 0,
      dueAmount: Number(dueAmount) || 0,
      paymentMethod: paymentMethod || 'Cash',
      status: status || 'Pending',
      createdBy: req.user?.id
    });

    const orderRef = order.orderNumber || String(order._id).slice(-6);

    // 3. Deduct inventory stock and record StockMovement (Stock Out)
    for (const item of items) {
      if (item.product) {
        const prod = await Product.findById(item.product);
        if (prod) {
          const prevStock = prod.stock || 0;
          const orderQty = Number(item.quantity) || 0;
          prod.stock = Math.max(0, prevStock - orderQty);
          await prod.save();

          // Log Stock Movement (Stock Out)
          await StockMovement.create({
            product: prod._id,
            productName: prod.name,
            type: 'Stock Out',
            quantity: -orderQty,
            previousStock: prevStock,
            newStock: prod.stock,
            reference: `Order Placed (#${orderRef})`,
            handledBy: 'System',
            user: req.user?.id || null
          });
        }
      }
    }

    return res.status(201).json({
      message: 'Order created and customer profile synced successfully!',
      order,
      newCustomerCreated: !customerId
    });
  } catch (error) {
    console.error('Create order error:', error.message);
    return res.status(500).json({ message: 'Server error while creating order.' });
  }
};

// @desc    Delete an order
// @route   DELETE /api/orders/:id
// @access  Private
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    await Order.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Order deleted successfully.' });
  } catch (error) {
    console.error('Delete order error:', error.message);
    return res.status(500).json({ message: 'Server error deleting order.' });
  }
};

// @desc    Collect payment against a specific order and append to paymentHistory
// @route   POST /api/orders/:id/payments
// @access  Private
const collectOrderPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount.' });
    }

    if (payAmount > order.dueAmount) {
      return res.status(400).json({ message: 'Collection amount exceeds remaining due balance.' });
    }

    // Update monetary values
    order.paidAmount += payAmount;
    order.dueAmount -= payAmount;

    if (order.dueAmount === 0) {
      order.status = 'Completed';
    }

    // Append to audit trail log
    order.paymentHistory.push({
      amount: payAmount,
      method: paymentMethod || 'Cash',
      note: note || '',
      date: new Date()
    });

    await order.save();

    return res.status(200).json({
      message: 'Payment collected and recorded successfully.',
      order
    });
  } catch (error) {
    console.error('Error collecting order payment:', error);
    return res.status(500).json({ message: 'Server error collecting order payment.' });
  }
};

// @desc    Update order details (Status, Due Amount, Paid Amount)
// @route   PUT /api/orders/:id
// @access  Private
const updateOrder = async (req, res) => {
  try {
    const { status, dueAmount, paidAmount } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (status) order.status = status;
    if (dueAmount !== undefined) order.dueAmount = Number(dueAmount);
    if (paidAmount !== undefined) order.paidAmount = Number(paidAmount);

    await order.save();

    return res.status(200).json({
      message: 'Order updated successfully.',
      order
    });
  } catch (error) {
    console.error('Update order error:', error);
    return res.status(500).json({ message: 'Server error updating order.' });
  }
};

module.exports = {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  collectOrderPayment
};