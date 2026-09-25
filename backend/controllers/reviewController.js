const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

// @desc    Get all reviews for a product
// @route   GET /api/reviews/:productId
// @access  Public
const getProductReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add review for a product
// @route   POST /api/reviews/:productId
// @access  Private
const createProductReview = async (req, res, next) => {
  try {
    const { rating, title, comment } = req.body;
    const productId = req.params.productId || req.body.productId;

    if (!rating || !title || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide rating, review title, and detailed feedback',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if user already reviewed this product
    const alreadyReviewed = await Review.findOne({
      product: productId,
      user: req.user._id,
    });

    if (alreadyReviewed) {
      alreadyReviewed.rating = Number(rating);
      alreadyReviewed.title = title.trim();
      alreadyReviewed.comment = comment.trim();
      await alreadyReviewed.save();

      const allReviews = await Review.find({ product: productId });
      const avgRating =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / (allReviews.length || 1);

      product.rating = Number(avgRating.toFixed(1));
      product.reviewCount = allReviews.length;
      await product.save();

      return res.status(201).json({
        success: true,
        data: alreadyReviewed,
        message: 'Your review has been updated!',
      });
    }

    // Check if user has a verified purchase of this product
    const verifiedOrder = await Order.findOne({
      user: req.user._id,
      'items.product': productId,
      orderStatus: { $in: ['Delivered', 'Shipped', 'Out for Delivery', 'Confirmed'] },
    });

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      userName: req.user.name,
      rating: Number(rating),
      title: title.trim(),
      comment: comment.trim(),
      isVerifiedPurchase: Boolean(verifiedOrder),
    });

    // Recalculate average rating & review count for the product
    const allReviews = await Review.find({ product: productId });
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / (allReviews.length || 1);

    product.rating = Number(avgRating.toFixed(1));
    product.reviewCount = allReviews.length;
    await product.save();

    res.status(201).json({
      success: true,
      data: review,
      message: 'Your review has been published!',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review (Admin)
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.id);

    // Recalculate product rating
    const allReviews = await Review.find({ product: productId });
    const product = await Product.findById(productId);
    if (product) {
      if (allReviews.length > 0) {
        const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
        product.rating = Number(avg.toFixed(1));
        product.reviewCount = allReviews.length;
      } else {
        product.rating = 4.5;
        product.reviewCount = 0;
      }
      await product.save();
    }

    res.json({ success: true, message: 'Review removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProductReviews,
  createProductReview,
  deleteReview,
};
