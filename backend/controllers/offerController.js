const Offer = require('../models/Offer');
const Product = require('../models/Product');

// @desc    Get active promotional offers
// @route   GET /api/offers/active
// @access  Public
const getActiveOffers = async (req, res, next) => {
  try {
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      endTime: { $gt: now },
      $or: [{ startTime: { $exists: false } }, { startTime: { $lte: now } }],
    })
      .sort({ priority: -1, createdAt: -1 })
      .populate({
        path: 'products',
        select:
          'name brand price originalPrice discountPercentage image rating ratingsCount stock badge isDeal isPremium isTrending categoryName subcategory',
      });

    // Filter out any populated product that might be null or deleted
    const sanitizedOffers = offers.map((offer) => {
      const obj = offer.toObject();
      obj.products = (obj.products || []).filter((p) => p !== null);
      return obj;
    });

    res.json({
      success: true,
      count: sanitizedOffers.length,
      data: sanitizedOffers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single offer by ID
// @route   GET /api/offers/:id
// @access  Public
const getOfferById = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: 'products',
      select:
        'name brand price originalPrice discountPercentage image rating ratingsCount stock badge isDeal isPremium isTrending categoryName subcategory',
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    res.json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all offers (Admin)
// @route   GET /api/offers
// @access  Private/Admin
const getAllOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find()
      .sort({ priority: -1, createdAt: -1 })
      .populate('products', 'name price image brand');

    res.json({
      success: true,
      count: offers.length,
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new offer
// @route   POST /api/offers
// @access  Private/Admin
const createOffer = async (req, res, next) => {
  try {
    const offer = await Offer.create(req.body);

    const io = req.app.get('io');
    if (io) {
      io.emit('offerUpdated', { action: 'create', offerId: offer._id });
      io.emit('offer:updated', { action: 'create', offerId: offer._id });
    }

    res.status(201).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update offer
// @route   PUT /api/offers/:id
// @access  Private/Admin
const updateOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('offerUpdated', { action: 'update', offerId: offer._id });
      io.emit('offer:updated', { action: 'update', offerId: offer._id });
    }

    res.json({
      success: true,
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete offer
// @route   DELETE /api/offers/:id
// @access  Private/Admin
const deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('offerUpdated', { action: 'delete', offerId: offer._id });
      io.emit('offer:updated', { action: 'delete', offerId: offer._id });
    }

    res.json({
      success: true,
      message: 'Offer removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveOffers,
  getOfferById,
  getAllOffers,
  createOffer,
  updateOffer,
  deleteOffer,
};
