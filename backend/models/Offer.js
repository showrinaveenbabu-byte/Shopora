const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Offer title is required'],
      trim: true,
      maxlength: [140, 'Offer title cannot exceed 140 characters'],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [200, 'Offer subtitle cannot exceed 200 characters'],
    },
    type: {
      type: String,
      required: [true, 'Offer type is required'],
      enum: [
        'FLASH DEAL',
        'DEAL OF THE DAY',
        'WEEKEND OFFER',
        'BANK OFFER',
        'NEW USER OFFER',
        'PREMIUM OFFER',
        'CATEGORY OFFER',
        'CLEARANCE',
      ],
      default: 'FLASH DEAL',
      index: true,
    },
    badgeText: {
      type: String,
      trim: true,
      default: function () {
        return this.type;
      },
    },
    bannerImage: {
      type: String,
      required: [true, 'Banner image URL is required'],
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: 0,
    },
    tagline: {
      type: String,
      trim: true,
    },
    ctaText: {
      type: String,
      default: 'SHOP NOW',
      trim: true,
    },
    ctaLink: {
      type: String,
      default: '/pages/products.html',
      trim: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: [true, 'Offer end time is required'],
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

offerSchema.index({ isActive: 1, endTime: 1, priority: -1 });

module.exports = mongoose.model('Offer', offerSchema);
