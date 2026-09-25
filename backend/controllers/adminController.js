const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const Review = require('../models/Review');

// @desc    Get dashboard analytics & summary
// @route   GET /api/admin/overview
// @access  Private/Admin
const getOverview = async (req, res, next) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalOrders = await Order.countDocuments();
    const activeDeals = await Product.countDocuments({ isDeal: true });
    const totalReviews = await Review.countDocuments();

    // Total revenue from non-cancelled orders
    const revenueAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'Cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
    ]);
    const totalRevenue = revenueAgg.length > 0 ? Number(revenueAgg[0].totalRevenue.toFixed(2)) : 0;

    // Order status counts
    const pendingOrders = await Order.countDocuments({
      orderStatus: { $in: ['Order Placed', 'Confirmed', 'Processing'] },
    });
    const shippedOrders = await Order.countDocuments({
      orderStatus: { $in: ['Packed', 'Shipped', 'Out for Delivery'] },
    });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'Delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'Cancelled' });

    // Low stock inventory (< 10 units)
    const lowStockProducts = await Product.find({ stock: { $lte: 10 } })
      .select('name brand stock price image sku categoryName')
      .limit(8);

    // Sales by Category
    const salesByCategory = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'Cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.brand',
          salesCount: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.finalPrice', '$items.quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]);

    // Recent 6 orders
    const recentOrders = await Order.find()
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalUsers,
        totalOrders,
        totalRevenue,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        activeDeals,
        totalReviews,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        salesByCategory,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders with search & status filters
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.orderStatus = status;
    }

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { orderNumber: regex },
        { 'shippingAddress.fullName': regex },
        { 'shippingAddress.phone': regex },
        { 'shippingAddress.city': regex },
      ];
    }

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status & append tracking history event
// @route   PUT /api/admin/orders/:id
// @access  Private/Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const status = req.body.status || req.body.orderStatus;
    const { message, location } = req.body;

    const validStatuses = [
      'Order Placed',
      'Confirmed',
      'Processing',
      'Packed',
      'Shipped',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
      'Returned',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.orderStatus = status;

    // Default status message generator
    let eventMessage = message;
    if (!eventMessage) {
      if (status === 'Confirmed') eventMessage = 'Order verified and confirmed by seller.';
      else if (status === 'Processing') eventMessage = 'Items gathered and preparing for boxing.';
      else if (status === 'Packed') eventMessage = 'Package sealed, labeled, and placed in outbound dispatch bay.';
      else if (status === 'Shipped') eventMessage = 'Dispatched from SHOPORA hub to destination regional sorting facility.';
      else if (status === 'Out for Delivery') eventMessage = 'Courier out for delivery. Expect delivery today.';
      else if (status === 'Delivered') eventMessage = 'Delivered to recipient address. Enjoy your products!';
      else if (status === 'Cancelled') eventMessage = 'Order was cancelled.';
      else eventMessage = `Status updated to ${status}.`;
    }

    order.trackingHistory.push({
      status,
      message: eventMessage,
      location: location || 'Regional Logistics Facility',
      timestamp: new Date(),
    });

    if (status === 'Delivered') {
      order.paymentStatus = 'Completed';
    }

    await order.save();

    // Create customer notification
    await Notification.create({
      user: order.user,
      title: `Order Update: ${status}`,
      message: `Your order #${order.orderNumber} is now ${status}. ${eventMessage}`,
      type: 'order',
      link: `/pages/order-tracking.html?id=${order._id}`,
    });

    // Real-time broadcast via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('order:status_updated', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        trackingHistory: order.trackingHistory,
        updatedAt: new Date(),
      });
    }

    res.json({
      success: true,
      data: order,
      message: `Order #${order.orderNumber} status updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users with order counts & status
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ user: user._id });
        const orders = await Order.find({ user: user._id, orderStatus: { $ne: 'Cancelled' } });
        const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive !== false,
          createdAt: user.createdAt,
          orderCount,
          totalSpent: Number(totalSpent.toFixed(2)),
          addressesCount: user.addresses ? user.addresses.length : 0,
        };
      })
    );

    res.json({
      success: true,
      count: usersWithStats.length,
      data: usersWithStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status or change role
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.body.isActive !== undefined) user.isActive = Boolean(req.body.isActive);
    if (req.body.role) user.role = req.body.role;

    await user.save();

    res.json({
      success: true,
      data: user,
      message: 'User account status updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product Premium status
// @route   PUT /api/admin/products/:id/toggle-premium
// @access  Private/Admin
const toggleProductPremium = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.isPremium = !product.isPremium;
    await product.save();

    res.json({
      success: true,
      data: product,
      message: `Product marked ${product.isPremium ? 'PREMIUM' : 'Standard'}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product Trending status
// @route   PUT /api/admin/products/:id/toggle-trending
// @access  Private/Admin
const toggleProductTrending = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.isTrending = !product.isTrending;
    await product.save();

    res.json({
      success: true,
      data: product,
      message: `Product marked ${product.isTrending ? 'TRENDING' : 'Standard'}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product Deal status
// @route   PUT /api/admin/products/:id/toggle-deal
// @access  Private/Admin
const toggleProductDeal = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.isDeal = !product.isDeal;
    if (req.body.discount !== undefined) {
      product.discount = Number(req.body.discount);
      product.discountPercentage = Number(req.body.discount);
    }
    if (req.body.offerText !== undefined) {
      product.offerText = req.body.offerText.trim();
    }
    await product.save();

    res.json({
      success: true,
      data: product,
      message: `Product marked ${product.isDeal ? 'DEAL OF THE DAY' : 'Regular'}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product inventory stock
// @route   PUT /api/admin/products/:id/stock
// @access  Private/Admin
const updateProductStock = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const stockVal = Number(req.body.stock);
    if (isNaN(stockVal) || stockVal < 0) {
      return res.status(400).json({ success: false, message: 'Invalid stock count' });
    }

    product.stock = stockVal;
    product.isAvailable = stockVal > 0;
    await product.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('stock:updated', { productId: product._id, stock: product.stock, isAvailable: product.isAvailable });
    }

    res.json({
      success: true,
      data: product,
      message: `Stock updated to ${product.stock}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all deal products for deals management
// @route   GET /api/admin/deals
// @access  Private/Admin
const getDealsAdmin = async (req, res, next) => {
  try {
    const deals = await Product.find({ isDeal: true }).sort({ updatedAt: -1 });
    res.json({ success: true, count: deals.length, data: deals });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews across products with populated data
// @route   GET /api/admin/reviews
// @access  Private/Admin
const getAllReviewsAdmin = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate('product', 'name brand image price')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  updateUserStatus,
  toggleProductPremium,
  toggleProductTrending,
  toggleProductDeal,
  updateProductStock,
  getDealsAdmin,
  getAllReviewsAdmin,
};
