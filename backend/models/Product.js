const mongoose = require('mongoose');

const specificationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
      maxlength: [160, 'Product name cannot exceed 160 characters'],
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'Please specify product brand'],
      trim: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please provide product category'],
      index: true,
    },
    categoryName: {
      type: String,
      trim: true,
    },
    subcategory: {
      type: String,
      trim: true,
      default: 'General',
    },
    description: {
      type: String,
      required: [true, 'Please provide detailed description'],
      maxlength: [4000, 'Description cannot exceed 4000 characters'],
    },
    image: {
      type: String,
      required: [true, 'Please provide primary product image URL'],
    },
    images: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: [true, 'Please provide selling price'],
      min: [0, 'Price cannot be negative'],
    },
    originalPrice: {
      type: Number,
      default: 0,
      min: [0, 'Original price cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [99, 'Discount cannot exceed 99%'],
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Discount percentage cannot be negative'],
      max: [99, 'Discount percentage cannot exceed 99%'],
    },
    finalPrice: {
      type: Number,
      min: [0, 'Final price cannot be negative'],
    },
    rating: {
      type: Number,
      default: 4.5,
      min: [0, 'Rating cannot be below 0'],
      max: [5, 'Rating cannot be above 5'],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Please specify stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 20,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPremium: {
      type: Boolean,
      default: false,
      index: true,
    },
    isTrending: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeal: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNew: {
      type: Boolean,
      default: false,
      index: true,
    },
    isLuxury: {
      type: Boolean,
      default: false,
      index: true,
    },
    whiteGloveEligible: {
      type: Boolean,
      default: false,
    },
    authenticityCertified: {
      type: Boolean,
      default: true,
    },
    proExclusivePrice: {
      type: Number,
      default: 0,
    },
    offerText: {
      type: String,
      default: '',
      trim: true,
    },
    flashDealExpiresAt: {
      type: Date,
      default: null,
    },
    specifications: [specificationSchema],
    deliveryTime: {
      type: String,
      default: 'Express Delivery in 2-4 Days',
    },
    returnPolicy: {
      type: String,
      default: '30 Days Free Doorstep Return & Exchange',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    suppressReservedKeysWarning: true,
  }
);

// Pre-insertMany hook for bulk inserts
productSchema.pre('insertMany', function (next, docs) {
  if (Array.isArray(docs)) {
    docs.forEach((doc) => {
      const activeDiscount = doc.discountPercentage || doc.discount || 0;
      doc.discount = activeDiscount;
      doc.discountPercentage = activeDiscount;
      if (!doc.originalPrice || doc.originalPrice <= doc.price) {
        if (activeDiscount > 0) {
          doc.originalPrice = Number((doc.price / (1 - activeDiscount / 100)).toFixed(2));
        } else {
          doc.originalPrice = doc.price;
        }
      }
      if (!doc.images || doc.images.length === 0) {
        doc.images = [doc.image];
      }
      if (!doc.sku) {
        doc.sku = `SHP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
    });
  }
  next();
});

// Pre-save hook: ensure price, originalPrice, discountPercentage, finalPrice, and images are synchronized
productSchema.pre('save', function (next) {
  // If originalPrice not set or less than price, set originalPrice to price
  if (!this.originalPrice || this.originalPrice <= this.price) {
    if (this.discount && this.discount > 0) {
      this.originalPrice = Number((this.price / (1 - this.discount / 100)).toFixed(2));
    } else {
      this.originalPrice = this.price;
    }
  }

  // Ensure discount and discountPercentage align
  const activeDiscount = this.discountPercentage || this.discount || 0;
  this.discount = activeDiscount;
  this.discountPercentage = activeDiscount;

  // Final selling price
  if (this.discount && this.discount > 0) {
    this.finalPrice = Number((this.originalPrice - (this.originalPrice * this.discount) / 100).toFixed(2));
    this.price = this.finalPrice;
  } else {
    this.finalPrice = this.price;
    this.originalPrice = this.price;
  }

  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  if (!this.images || this.images.length === 0) {
    this.images = [this.image];
  }

  if (!this.sku) {
    this.sku = `SHP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  this.isAvailable = this.stock > 0;

  next();
});

// Text indexing
productSchema.index({
  name: 'text',
  brand: 'text',
  description: 'text',
  sku: 'text',
  subcategory: 'text',
  categoryName: 'text',
});

module.exports = mongoose.model('Product', productSchema);
