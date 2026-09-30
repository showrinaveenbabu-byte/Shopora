const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { resolveProduct } = require('../utils/productResolver');

// @desc    Get current user cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name price originalPrice image stock category',
    });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Filter out any items where product might have been deleted from database
    const validItems = cart.items.filter((item) => item.product !== null);
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart or increment quantity
// @route   POST /api/cart
// @access  Private
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await resolveProduct(productId, req.body);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, message: 'Product is currently out of stock' });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [{ product: product._id, quantity: Math.min(Number(quantity), product.stock) }],
      });
    } else {
      const existingItemIndex = cart.items.findIndex(
        (item) => item.product && item.product.toString() === product._id.toString()
      );

      if (existingItemIndex > -1) {
        const newQty = cart.items[existingItemIndex].quantity + Number(quantity);
        cart.items[existingItemIndex].quantity = Math.min(newQty, product.stock);
      } else {
        cart.items.push({
          product: product._id,
          quantity: Math.min(Number(quantity), product.stock),
        });
      }

      await cart.save();
    }

    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price originalPrice image stock category',
    });

    res.json({
      success: true,
      data: cart,
      message: 'Item added to cart',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update item quantity in cart
// @route   PUT /api/cart/:productId
// @access  Private
const updateCartItemQuantity = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required' });
    }

    const numQty = Number(quantity);
    if (numQty <= 0) {
      return removeFromCart(req, res, next);
    }

    const product = await resolveProduct(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const targetIdStr = product._id.toString();
    const itemIndex = cart.items.findIndex(
      (item) => item.product && (item.product.toString() === targetIdStr || item.product.toString() === productId)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
    }

    const desiredQty = Math.min(numQty, product.stock !== undefined ? product.stock : 99);
    cart.items[itemIndex].quantity = desiredQty;

    await cart.save();

    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price originalPrice image stock category',
    });

    res.json({
      success: true,
      data: cart,
      message: 'Cart updated',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.json({
        success: true,
        data: { user: req.user._id, items: [] },
        message: 'Item removed from cart',
      });
    }

    const resolved = await resolveProduct(productId).catch(() => null);
    const resolvedId = resolved ? resolved._id.toString() : null;
    const targetIdStr = String(productId).trim();

    cart.items = cart.items.filter((item) => {
      if (!item || !item.product) return false;
      const pIdStr = (item.product._id || item.product).toString();
      const itemIdStr = item._id ? item._id.toString() : '';

      const isMatch =
        pIdStr === targetIdStr ||
        (resolvedId && pIdStr === resolvedId) ||
        itemIdStr === targetIdStr;

      return !isMatch;
    });

    await cart.save();

    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price originalPrice image stock category',
    });

    res.json({
      success: true,
      data: cart,
      message: 'Item removed from cart',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.json({
      success: true,
      message: 'Cart cleared',
      data: { items: [] },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
};
