const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please select a rating between 1 and 5'],
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: [true, 'Please provide review title'],
      trim: true,
      maxlength: 120,
    },
    comment: {
      type: String,
      required: [true, 'Please write your review feedback'],
      maxlength: 1500,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate review for the same product by the same user
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
