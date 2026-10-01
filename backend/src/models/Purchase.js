const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      unique: true
    },
    supplier: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      default: 'Pcs'
    },
    perCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['Pending', 'Received', 'Cancelled'],
      default: 'Pending'
    },
    receivedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Auto-generate PO number
purchaseSchema.pre('save', function (next) {
  if (!this.orderNo) {
    this.orderNo = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  }
  
});

module.exports = mongoose.model('Purchase', purchaseSchema);