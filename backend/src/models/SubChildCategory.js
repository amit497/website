const mongoose = require('mongoose');

const subChildCategorySchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Parent category ID is required']
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubCategory',
      required: [true, 'Subcategory ID is required']
    },
    name: {
      type: String,
      required: [true, 'Sub-child category name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    imageUrl: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Prevent duplicate names within the same subcategory
subChildCategorySchema.index({ subCategory: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('SubChildCategory', subChildCategorySchema);