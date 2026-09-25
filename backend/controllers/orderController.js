const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Notification = require('../models/Notification');

// Generate unique order number
const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `SHP-${year}-${random}`;
};

// @desc    Create new order with server-side price recalculation, stock update & tracking initiation
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const items = req.body.items || req.body.orderItems;
    const { shippingAddress, paymentMethod, shippingMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart contains no items to order' });
    }

    const street = (shippingAddress?.addressLine1 || shippingAddress?.street || shippingAddress?.address || shippingAddress?.houseAddress || '').trim();
    const pincode = (shippingAddress?.pincode || shippingAddress?.postalCode || '').trim();

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !street ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !pincode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide complete delivery address details',
      });
    }

    const normalizedAddress = {
      fullName: shippingAddress.fullName.trim(),
      phone: shippingAddress.phone.trim(),
      addressLine1: street,
      addressLine2: shippingAddress.addressLine2 ? shippingAddress.addressLine2.trim() : '',
      city: shippingAddress.city.trim(),
      state: shippingAddress.state.trim(),
      pincode: pincode,
      country: shippingAddress.country ? shippingAddress.country.trim() : 'United States',
    };

    // Recalculate prices directly from the database
    const validatedItems = [];
    let calculatedSubtotal = 0;
    let totalDiscountSavings = 0;

    for (const item of items) {
      const productId = item.product || item._id;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} was not found in catalog`,
        });
      }

      const qty = Number(item.quantity) || 1;

      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Only ${product.stock} available.`,
        });
      }

      const originalPrice = product.price;
      const discount = product.discount || 0;
      const finalPrice = product.finalPrice || Number((originalPrice - (originalPrice * discount) / 100).toFixed(2));

      calculatedSubtotal += finalPrice * qty;
      totalDiscountSavings += (originalPrice - finalPrice) * qty;

      validatedItems.push({
        product: product._id,
        name: product.name,
        brand: product.brand || 'SHOPORA',
        price: originalPrice,
        discount,
        finalPrice,
        quantity: qty,
        image: product.image || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
      });

      // Decrement inventory
      product.stock -= qty;
      product.isAvailable = product.stock > 0;
      await product.save();

      // Real-time stock broadcast via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('stock:updated', {
          productId: product._id,
          stock: product.stock,
          isAvailable: product.isAvailable,
        });
        io.emit('stockUpdated', {
          productId: product._id,
          stock: product.stock,
          isAvailable: product.isAvailable,
        });
      }
    }

    // Pro Member privileges: Free Express Shipping & Extra 5% Member Savings
    const isPro = Boolean(req.user.isPro);
    let proSavings = 0;
    if (isPro) {
      proSavings = Number((calculatedSubtotal * 0.05).toFixed(2));
      totalDiscountSavings += proSavings;
      calculatedSubtotal = Math.max(0, calculatedSubtotal - proSavings);
    }

    const selectedShippingMethod = req.body.shippingMethod || req.body.deliverySpeed || 'standard';
    let calculatedShippingFee = 0;
    if (isPro) {
      calculatedShippingFee = 0; // 100% Free Shipping for Pro members on all speeds
    } else if (selectedShippingMethod === 'express') {
      calculatedShippingFee = 149; // Non-pro express delivery fee
    } else {
      calculatedShippingFee = calculatedSubtotal >= 500 ? 0 : 49;
    }

    const calculatedTotal = Number((calculatedSubtotal + calculatedShippingFee).toFixed(2));
    const orderNumber = generateOrderNumber();

    // Determine realistic payment status per payment method
    const chosenMethod = paymentMethod || 'Instant UPI';
    let initialPaymentStatus = 'Completed';
    const methodLower = chosenMethod.toLowerCase();
    if (methodLower.includes('cash') || methodLower.includes('cod') || methodLower.includes('delivery')) {
      initialPaymentStatus = 'Cash on Delivery (Pending)';
    } else if (methodLower.includes('upi') || methodLower.includes('qr')) {
      initialPaymentStatus = 'Completed (UPI)';
    } else if (methodLower.includes('card')) {
      initialPaymentStatus = 'Completed (Card)';
    } else if (methodLower.includes('net') || methodLower.includes('bank')) {
      initialPaymentStatus = 'Completed (Net Banking)';
    }

    const chosenCarrier = selectedShippingMethod === 'express' ? 'SHOPORA Lightning Express' : 'SHOPORA Ground Surface';

    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      items: validatedItems,
      shippingAddress: normalizedAddress,
      paymentMethod: chosenMethod,
      paymentStatus: initialPaymentStatus,
      shippingMethod: selectedShippingMethod,
      carrier: chosenCarrier,
      isProOrder: isPro,
      proDiscount: proSavings,
      subtotal: Number(calculatedSubtotal.toFixed(2)),
      discount: Number(totalDiscountSavings.toFixed(2)),
      shippingFee: calculatedShippingFee,
      total: calculatedTotal,
      orderStatus: 'Order Placed',
      trackingHistory: [
        {
          status: 'Order Placed',
          message: isPro
            ? '⚡ SHOPORA PRO Priority Express: Fast-tracked fulfillment initiated.'
            : `Order placed successfully with ${chosenMethod}. Dispatch preparation started.`,
          location: 'SHOPORA Primary Fulfillment Center (Hub #04)',
          timestamp: new Date(),
        },
      ],
    });

    // Clear user's database cart
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

    // Create user notification
    await Notification.create({
      user: req.user._id,
      title: 'Order Placed Successfully',
      message: `Your order #${orderNumber} for ₹${calculatedTotal} (${chosenMethod}) is now being processed.`,
      type: 'order',
      link: `/pages/order-tracking.html?orderId=${order._id}`,
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order placed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's orders
// @route   GET /api/orders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { orderNumber: req.params.id };
    const order = await Order.findOne(query).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer cancel order (if still in Order Placed or Confirmed state)
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
    }

    if (['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already ${order.orderStatus}`,
      });
    }

    order.orderStatus = 'Cancelled';
    order.trackingHistory.push({
      status: 'Cancelled',
      message: 'Order was cancelled by customer.',
      location: 'Customer Request',
      timestamp: new Date(),
    });

    // Restock products
    for (const item of order.items) {
      const p = await Product.findById(item.product);
      if (p) {
        p.stock += item.quantity;
        p.isAvailable = p.stock > 0;
        await p.save();
      }
    }

    await order.save();

    res.json({
      success: true,
      data: order,
      message: 'Order has been successfully cancelled and items restocked',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
};
