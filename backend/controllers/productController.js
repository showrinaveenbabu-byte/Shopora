const Product = require('../models/Product');
const Category = require('../models/Category');
const Offer = require('../models/Offer');

// @desc    Get all products with multi-filter, search, brand, sorting & pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      inStock,
      hasDiscount,
      isDeal,
      deal,
      offer,
      isPremium,
      premium,
      isTrending,
      trending,
      isNew,
      newArrivals,
      bestSelling,
      subcategory,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const query = {};

    // Keyword Search
    if (search && search.trim() !== '') {
      const term = search.trim();
      const searchRegex = new RegExp(term, 'i');
      query.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { categoryName: searchRegex },
        { subcategory: searchRegex },
        { description: searchRegex },
        { sku: searchRegex },
      ];
    }

    // Category Filter
    if (category && category !== 'All' && category.trim() !== '') {
      // Check if it's an ObjectId or category name / slug
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        const foundCat = await Category.findOne({
          $or: [{ name: new RegExp(`^${category}$`, 'i') }, { slug: category.toLowerCase() }],
        });
        if (foundCat) {
          query.$or = [{ category: foundCat._id }, { categoryName: foundCat.name }];
        } else {
          query.categoryName = new RegExp(`^${category}$`, 'i');
        }
      }
    }

    // Brand Filter (supports comma-separated list e.g. "Apple,Samsung")
    if (brand && brand.trim() !== '') {
      const brandsArr = brand.split(',').map((b) => new RegExp(`^${b.trim()}$`, 'i'));
      query.brand = { $in: brandsArr };
    }

    // Price Range Filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Rating Filter
    if (rating && Number(rating) > 0) {
      query.rating = { $gte: Number(rating) };
    }

    // Stock Filter
    if (inStock === 'true' || inStock === true) {
      query.stock = { $gt: 0 };
    }

    // Discount Filter
    if (hasDiscount === 'true' || hasDiscount === true) {
      query.discount = { $gt: 0 };
    }

    // Offer Filter
    if (offer && offer.trim() !== '') {
      const offerTrimmed = offer.trim();
      if (offerTrimmed.match(/^[0-9a-fA-F]{24}$/)) {
        const foundOffer = await Offer.findById(offerTrimmed);
        if (foundOffer && foundOffer.products && foundOffer.products.length > 0) {
          query._id = { $in: foundOffer.products };
        }
      } else {
        const foundOffer = await Offer.findOne({
          $or: [
            { title: new RegExp(offerTrimmed, 'i') },
            { type: new RegExp(offerTrimmed.replace(/-/g, ' '), 'i') },
            { category: new RegExp(offerTrimmed, 'i') },
          ],
        });
        if (foundOffer && foundOffer.products && foundOffer.products.length > 0) {
          query._id = { $in: foundOffer.products };
        } else if (offerTrimmed.toLowerCase() === 'electronics') {
          query.$or = [{ categoryName: /electronics|mobiles/i }, { subcategory: /electronics/i }];
        }
      }
    }

    // Deals of the day
    if (isDeal === 'true' || isDeal === true || deal) {
      if (deal && deal !== 'true' && typeof deal === 'string' && deal.trim() !== '') {
        const d = deal.trim().toLowerCase();
        if (d === 'electronics') {
          query.$or = [
            { categoryName: /mobiles|tablets|laptops|computing|audio|headphones|smart/i },
            { subcategory: /electronics|gadgets|accessories/i },
          ];
        } else if (d === 'flash') {
          query.$or = [{ isDeal: true }, { discount: { $gte: 15 } }];
        } else if (d === 'today' || d === 'deals' || d === 'day') {
          query.$or = [{ isDeal: true }, { discount: { $gte: 10 } }];
        } else {
          query.$or = [
            { categoryName: new RegExp(deal.trim(), 'i') },
            { subcategory: new RegExp(deal.trim(), 'i') },
            { brand: new RegExp(deal.trim(), 'i') },
          ];
        }
      } else {
        query.isDeal = true;
      }
    }

    // Premium Collection
    if (isPremium === 'true' || isPremium === true || premium === 'true' || premium === true) {
      query.isPremium = true;
    }

    // Trending Products
    if (isTrending === 'true' || isTrending === true || trending === 'true' || trending === true) {
      query.isTrending = true;
    }

    // New Arrivals
    if (
      isNew === 'true' ||
      isNew === true ||
      newArrivals === 'true' ||
      newArrivals === true ||
      req.query.new === 'true'
    ) {
      query.isNew = true;
    }

    // Best Selling Flag
    if (bestSelling === 'true' || bestSelling === true) {
      // Prioritize products with reviews or high rating
      query.rating = { $gte: 4.0 };
    }

    // Subcategory
    if (subcategory && subcategory.trim() !== '') {
      query.subcategory = new RegExp(`^${subcategory.trim()}$`, 'i');
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') {
      sortOption = { finalPrice: 1, price: 1 };
    } else if (sort === 'price-desc') {
      sortOption = { finalPrice: -1, price: -1 };
    } else if (sort === 'rating') {
      sortOption = { rating: -1, reviewCount: -1 };
    } else if (sort === 'popular') {
      sortOption = { reviewCount: -1, rating: -1 };
    } else if (sort === 'discount') {
      sortOption = { discount: -1 };
    } else if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug icon')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Live search suggestions
// @route   GET /api/products/suggestions
// @access  Public
const getSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(q.trim(), 'i');

    const products = await Product.find({
      $or: [{ name: regex }, { brand: regex }, { categoryName: regex }],
    })
      .select('name brand image price finalPrice categoryName')
      .limit(6);

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all distinct brands with product counts
// @route   GET /api/products/brands
// @access  Public
const getBrands = async (req, res, next) => {
  try {
    const brands = await Product.aggregate([
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $project: { name: '$_id', count: 1, _id: 0 } },
      { $sort: { name: 1 } },
    ]);

    res.json({
      success: true,
      data: brands,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Deals of the Day (12-16 items)
// @route   GET /api/products/deals
// @access  Public
const getDeals = async (req, res, next) => {
  try {
    let deals = await Product.find({ isDeal: true }).populate('category', 'name slug').limit(16);
    if (deals.length < 6) {
      deals = await Product.find({ discount: { $gte: 15 } })
        .sort({ discount: -1 })
        .limit(16)
        .populate('category', 'name slug');
    }

    res.json({
      success: true,
      data: deals,
      count: deals.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Flash Deals with countdown timers
// @route   GET /api/products/flash-deals
// @access  Public
const getFlashDeals = async (req, res, next) => {
  try {
    let deals = await Product.find({ isDeal: true, discount: { $gte: 20 } })
      .populate('category', 'name slug')
      .limit(16);
    if (deals.length < 6) {
      deals = await Product.find({ discount: { $gt: 0 } })
        .sort({ discount: -1 })
        .limit(16)
        .populate('category', 'name slug');
    }
    res.json({
      success: true,
      data: deals,
      count: deals.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Premium Collection
// @route   GET /api/products/premium
// @access  Public
const getPremiumProducts = async (req, res, next) => {
  try {
    let products = await Product.find({ isPremium: true }).populate('category', 'name slug').limit(16);
    if (products.length < 6) {
      products = await Product.find({ price: { $gte: 150 } })
        .sort({ rating: -1, price: -1 })
        .limit(16)
        .populate('category', 'name slug');
    }
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Curated Amazon Luxury Products for SHOPORA PRO
// @route   GET /api/products/luxury
// @access  Public
const getLuxuryProducts = async (req, res, next) => {
  try {
    const { category, sort } = req.query;
    let query = {
      $or: [
        { isLuxury: true },
        { isPremium: true },
        { price: { $gte: 250 } },
      ],
    };

    if (category && category !== 'all') {
      query.$or = [
        { subcategory: new RegExp(category, 'i') },
        { categoryName: new RegExp(category, 'i') },
        { brand: new RegExp(category, 'i') },
      ];
    }

    let sortOption = { price: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    if (sort === 'rating') sortOption = { rating: -1, reviewCount: -1 };

    let products = await Product.find(query).sort(sortOption).populate('category', 'name slug').limit(24);

    // Compute dynamic PRO member price (save 5% to 15%) and white glove flags
    const enriched = products.map((p) => {
      const obj = p.toObject();
      obj.whiteGloveEligible = true;
      obj.authenticityCertified = true;
      const proSavings = Math.round(obj.price * 0.05 * 100) / 100;
      obj.proExclusivePrice = Math.round((obj.price - proSavings) * 100) / 100;
      obj.proSavings = proSavings;
      return obj;
    });

    res.json({
      success: true,
      data: enriched,
      count: enriched.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Trending Products
// @route   GET /api/products/trending
// @access  Public
const getTrendingProducts = async (req, res, next) => {
  try {
    let products = await Product.find({ isTrending: true }).populate('category', 'name slug').limit(16);
    if (products.length < 6) {
      products = await Product.find()
        .sort({ reviewCount: -1, rating: -1 })
        .limit(16)
        .populate('category', 'name slug');
    }
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get New Arrivals
// @route   GET /api/products/new-arrivals
// @access  Public
const getNewArrivals = async (req, res, next) => {
  try {
    let products = await Product.find({ isNew: true }).populate('category', 'name slug').limit(16);
    if (products.length < 6) {
      products = await Product.find()
        .sort({ createdAt: -1 })
        .limit(16)
        .populate('category', 'name slug');
    }
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res, next) => {
  try {
    let products = await Product.find({ isFeatured: true }).populate('category', 'name slug').limit(16);
    if (products.length < 6) {
      products = await Product.find().sort({ rating: -1, reviewCount: -1 }).limit(16).populate('category', 'name slug');
    }
    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID or Slug
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    let product;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(req.params.id).populate('category', 'name slug icon');
    } else {
      product = await Product.findOne({ slug: req.params.id }).populate('category', 'name slug icon');
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Fetch related products in the same category or brand
    const related = await Product.find({
      $or: [{ category: product.category }, { brand: product.brand }],
      _id: { $ne: product._id },
    })
      .limit(4)
      .populate('category', 'name slug');

    res.json({
      success: true,
      data: product,
      related,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      brand,
      category,
      subcategory,
      price,
      discount,
      image,
      images,
      stock,
      sku,
      rating,
      reviewCount,
      description,
      isFeatured,
      isDeal,
      specifications,
      returnPolicy,
      deliveryTime,
    } = req.body;

    if (!name || !brand || !category || price === undefined || !image) {
      return res.status(400).json({
        success: false,
        message: 'Name, brand, category, price, and primary image URL are required',
      });
    }

    // Resolve category name
    let catDoc = null;
    if (category.match(/^[0-9a-fA-F]{24}$/)) {
      catDoc = await Category.findById(category);
    } else {
      catDoc = await Category.findOne({ name: category });
    }

    const catId = catDoc ? catDoc._id : category;
    const catName = catDoc ? catDoc.name : '';

    const product = await Product.create({
      name,
      brand,
      category: catId,
      categoryName: catName,
      subcategory: subcategory || 'General',
      price: Number(price),
      discount: discount !== undefined ? Number(discount) : 0,
      image,
      images: Array.isArray(images) && images.length > 0 ? images : [image],
      stock: stock !== undefined ? Number(stock) : 15,
      sku: sku || undefined,
      rating: rating !== undefined ? Number(rating) : 4.5,
      reviewCount: reviewCount !== undefined ? Number(reviewCount) : 0,
      description,
      isFeatured: Boolean(isFeatured),
      isDeal: Boolean(isDeal),
      specifications: Array.isArray(specifications) ? specifications : [],
      returnPolicy: returnPolicy || '30 Days Hassle-Free Replacement or Refund',
      deliveryTime: deliveryTime || 'Fast Delivery in 2-4 Business Days',
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updateData = { ...req.body };
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.discount !== undefined) updateData.discount = Number(updateData.discount);
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);

    // Calculate finalPrice
    const priceVal = updateData.price !== undefined ? updateData.price : product.price;
    const discVal = updateData.discount !== undefined ? updateData.discount : product.discount;
    updateData.finalPrice = Number((priceVal - (priceVal * discVal) / 100).toFixed(2));
    if (updateData.stock !== undefined) {
      updateData.isAvailable = updateData.stock > 0;
    }

    product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    const io = req.app.get('io');
    if (io) {
      io.emit('product:updated', { productId: product._id, product });
      if (updateData.stock !== undefined) {
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

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getSearchSuggestions,
  getBrands,
  getDeals,
  getFlashDeals,
  getPremiumProducts,
  getLuxuryProducts,
  getTrendingProducts,
  getNewArrivals,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
