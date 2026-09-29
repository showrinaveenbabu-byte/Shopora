const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { type: String, required: true },
  brand: { type: String, default: '' },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  finalPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, required: true },
});

const trackingEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  message: { type: String, required: true },
  description: { type: String, default: function () { return this.message; } },
  location: { type: String, default: 'SHOPORA Fulfillment Hub' },
  timestamp: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    isProOrder: {
      type: Boolean,
      default: false,
    },
    proDiscount: {
      type: Number,
      default: 0,
    },
    shippingMethod: {
      type: String,
      default: 'standard',
    },
    carrier: {
      type: String,
      default: 'SHOPORA Prime Express',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'United States' },
    },
    paymentMethod: {
      type: String,
      required: true,
      default: 'Cash on Delivery',
    },
    paymentStatus: {
      type: String,
      required: true,
      default: 'Cash on Delivery',
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0.0,
    },
    discount: {
      type: Number,
      default: 0.0,
    },
    shippingFee: {
      type: Number,
      required: true,
      default: 0.0,
    },
    total: {
      type: Number,
      required: true,
      default: 0.0,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: [
        'Order Placed',
        'Confirmed',
        'Processing',
        'Packed',
        'Shipped',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
        'Returned',
      ],
      default: 'Order Placed',
    },
    trackingHistory: [trackingEventSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for shippingPrice alias
orderSchema.virtual('shippingPrice').get(function () {
  return this.shippingFee;
});

module.exports = mongoose.model('Order', orderSchema);
