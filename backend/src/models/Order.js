const mongoose = require('mongoose');

// Sub-schema for items inside an order
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  hsn: {
    type: String,
    default: '07019000'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    default: 'Pcs.'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  disc: {
    type: String,
    default: '0.00'
  },
  tax: {
    type: String,
    default: '5'
  }
});

// Sub-schema for audit trail logs of partial/full payments
const paymentHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  method: {
    type: String,
    default: 'Cash'
  },
  note: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true
    },
    customerAddress: {
      type: String,
      default: '',
      trim: true
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Due'],
      default: 'Cash'
    },
    paymentHistory: [paymentHistorySchema],
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Cancelled'],
      default: 'Pending'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Pre-save middleware to auto-generate unique order/invoice number
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `${Date.now().toString().slice(-6)}`;
  }
  
});

module.exports = mongoose.model('Order', orderSchema);