const Customer = require('../models/Customer');
const Order = require('../models/Order');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search,$options: 'i' } },
        { phone: { $regex: search,$options: 'i' } },
        { email: { $regex: search,$options: 'i' } }
      ];
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json(customers);
  } catch (error) {
    console.error('Get customers error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving customers.' });
  }
};

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, status } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Customer name and phone number are required.' });
    }

    const cleanPhone = phone.trim();
    const existing = await Customer.findOne({ phone: cleanPhone });
    if (existing) {
      return res.status(409).json({ message: 'A customer with this phone number already exists.' });
    }

    const customer = await Customer.create({
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : '',
      phone: cleanPhone,
      address: address ? address.trim() : '',
      status: status || 'Active',
      createdBy: req.user?.id
    });

    return res.status(201).json({ message: 'Customer added successfully!', customer });
  } catch (error) {
    console.error('Create customer error:', error.message);
    return res.status(500).json({ message: 'Server error creating customer.' });
  }
};

// @desc    Update customer details
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, status } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    if (phone && phone.trim() !== customer.phone) {
      const duplicatePhone = await Customer.findOne({ phone: phone.trim() });
      if (duplicatePhone) {
        return res.status(409).json({ message: 'Phone number already registered to another customer.' });
      }
      customer.phone = phone.trim();
    }

    if (name) customer.name = name.trim();
    if (email !== undefined) customer.email = email.trim().toLowerCase();
    if (address !== undefined) customer.address = address.trim();
    if (status) customer.status = status;

    await customer.save();

    return res.status(200).json({ message: 'Customer updated successfully.', customer });
  } catch (error) {
    console.error('Update customer error:', error.message);
    return res.status(500).json({ message: 'Server error updating customer.' });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    await Customer.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Customer deleted successfully.' });
  } catch (error) {
    console.error('Delete customer error:', error.message);
    return res.status(500).json({ message: 'Server error deleting customer.' });
  }
};

// @desc    Get complete Customer Ledger, running balance, and itemized purchase breakdown
// @route   GET /api/customers/:id/ledger
// @access  Private
const getCustomerLedger = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Fetch all orders placed by this customer (or linked by phone)
    const orders = await Order.find({
      $or: [{ customer: customer._id }, { customerPhone: customer.phone }]
    })
      .populate({
        path: 'items.product',
        select: 'name category subCategory subChildCategory price',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'subCategory', select: 'name' },
          { path: 'subChildCategory', select: 'name' }
        ]
      })
      .sort({ createdAt: 1 })
      .lean();

    // Build ledger chronological transactions with running balance
    const transactions = [];
    let runningBalance = 0;
    const purchasedProducts = [];

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      const orderCode = order.orderNumber || String(order._id).slice(-4);

      // Order Placed -> Debit (+) (Customer owes money)
      runningBalance += order.totalAmount;
      transactions.push({
        date: orderDate,
        description: `Order Placed (#${orderCode})`,
        debit: order.totalAmount,
        credit: 0,
        balance: runningBalance
      });

      // Payment Made at time of Order -> Credit (-)
      if (order.paidAmount > 0) {
        runningBalance -= order.paidAmount;
        transactions.push({
          date: orderDate,
          description: `Payment Received (${order.paymentMethod})`,
          debit: 0,
          credit: order.paidAmount,
          balance: runningBalance
        });
      }

      // Extract purchased item rows with populated category trees
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          purchasedProducts.push({
            orderId: orderCode,
            productName: item.productName || item.product?.name || 'Item',
            category: item.product?.category?.name || 'General',
            subCategory: item.product?.subCategory?.name || '-',
            subChildCategory: item.product?.subChildCategory?.name || '-',
            quantity: item.quantity,
            price: item.price,
            totalAmount: item.quantity * item.price,
            date: orderDate
          });
        });
      }
    });

    return res.status(200).json({
      customer,
      currentDue: runningBalance,
      transactions,
      purchasedProducts
    });
  } catch (error) {
    console.error('Error fetching customer ledger:', error);
    return res.status(500).json({ message: 'Server error retrieving customer ledger.' });
  }
};

// @desc    Record external payment towards due balance
// @route   POST /api/customers/:id/payments
// @access  Private
const recordCustomerPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, note } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount.' });
    }

    // Find the oldest unpaid/pending orders and apply payment
    const pendingOrders = await Order.find({
      $or: [{ customer: customer._id }, { customerPhone: customer.phone }],
      dueAmount: { $gt: 0 }
    }).sort({ createdAt: 1 });

    let remainingPayment = payAmount;

    for (const order of pendingOrders) {
      if (remainingPayment <= 0) break;

      if (order.dueAmount <= remainingPayment) {
        remainingPayment -= order.dueAmount;
        order.paidAmount += order.dueAmount;
        order.dueAmount = 0;
        order.status = 'Completed';
      } else {
        order.paidAmount += remainingPayment;
        order.dueAmount -= remainingPayment;
        remainingPayment = 0;
      }
      await order.save();
    }

    return res.status(200).json({
      message: 'Payment recorded and applied to pending balances.'
    });
  } catch (error) {
    console.error('Record payment error:', error);
    return res.status(500).json({ message: 'Server error recording payment.' });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
  recordCustomerPayment
};