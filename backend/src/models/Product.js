const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      default: null
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Parent category is required']
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubCategory',
      default: null
    },
    subChildCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubChildCategory',
      default: null
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    images: [
      {
        type: String
      }
    ],
    sku: {
  type: String,
  unique: true,
  sparse: true, // এটি নিশ্চিত করে একাধিক null মান থাকলেও duplicate error দেবে না
  trim: true
},
    status: {
      type: String,
      enum: ['active', 'inactive', 'out_of_stock'],
      default: 'active'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);