const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
      path: 'products',
      select: 'name brand price discount finalPrice image stock rating reviewCount isAvailable categoryName',
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [] });
    }

    // Filter out deleted products if any
    const validProducts = wishlist.products.filter((p) => p !== null);
    if (validProducts.length !== wishlist.products.length) {
      wishlist.products = validProducts;
      await wishlist.save();
    }

    res.json({
      success: true,
      data: wishlist.products,
      count: wishlist.products.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product in wishlist (Add if absent, Remove if present)
// @route   POST /api/wishlist
// @access  Private
const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [] });
    }

    const index = wishlist.products.findIndex((p) => p.toString() === productId);
    let isAdded = false;

    if (index > -1) {
      wishlist.products.splice(index, 1);
      isAdded = false;
    } else {
      wishlist.products.push(productId);
      isAdded = true;
    }

    await wishlist.save();

    res.json({
      success: true,
      isAdded,
      message: isAdded ? 'Added to your Wishlist' : 'Removed from your Wishlist',
      count: wishlist.products.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (wishlist) {
      wishlist.products = wishlist.products.filter((p) => p.toString() !== productId);
      await wishlist.save();
    }

    res.json({
      success: true,
      message: 'Product removed from wishlist',
      count: wishlist ? wishlist.products.length : 0,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Move item from wishlist to cart
// @route   POST /api/wishlist/:productId/move-to-cart
// @access  Private
const moveToCart = async (req, res, next) => {
  try {
    const productId = req.params.productId || req.body.productId;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Add to cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const cartIndex = cart.items.findIndex((item) => item.product.toString() === productId);
    if (cartIndex > -1) {
      cart.items[cartIndex].quantity += 1;
    } else {
      cart.items.push({ product: productId, quantity: 1 });
    }
    await cart.save();

    // Remove from wishlist
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (wishlist) {
      wishlist.products = wishlist.products.filter((p) => p.toString() !== productId);
      await wishlist.save();
    }

    res.json({
      success: true,
      message: 'Moved product to your shopping cart',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
  moveToCart,
};
