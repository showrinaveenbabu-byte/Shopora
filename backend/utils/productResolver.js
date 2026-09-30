const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const fallback = require('./catalogFallback');

let defaultCatalogData = null;
try {
  defaultCatalogData = require('../data/defaultCatalog.json');
} catch (e) {
  defaultCatalogData = { categories: [], products: [] };
}

let isSeeding = false;

/**
 * Ensures category exists in MongoDB matching the fallback catalog definition.
 */
const ensureCategoryInDB = async (catIdOrName) => {
  if (!catIdOrName) return null;

  // 1. Direct ID lookup if valid ObjectId
  if (mongoose.Types.ObjectId.isValid(catIdOrName)) {
    const existing = await Category.findById(catIdOrName);
    if (existing) return existing;
  }

  // 2. Name or Slug lookup
  const nameOrSlugRegex = new RegExp(`^${String(catIdOrName).trim()}$`, 'i');
  let existing = await Category.findOne({
    $or: [{ name: nameOrSlugRegex }, { slug: String(catIdOrName).toLowerCase() }],
  });
  if (existing) return existing;

  // 3. Find definition in defaultCatalog
  const catDef = (defaultCatalogData.categories || []).find(
    (c) =>
      String(c._id) === String(catIdOrName) ||
      (c.name && c.name.toLowerCase() === String(catIdOrName).toLowerCase()) ||
      (c.slug && c.slug === String(catIdOrName).toLowerCase())
  );

  const newCatPayload = {
    name: catDef ? catDef.name : String(catIdOrName).trim(),
    slug: catDef ? catDef.slug : String(catIdOrName).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    icon: catDef ? catDef.icon : '🏷️',
    image: catDef ? catDef.image : 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
    description: catDef ? catDef.description : '',
    displayOrder: catDef ? catDef.displayOrder || 1 : 1,
    isActive: true,
  };

  if (catDef && mongoose.Types.ObjectId.isValid(catDef._id)) {
    newCatPayload._id = catDef._id;
  }

  try {
    return await Category.create(newCatPayload);
  } catch (err) {
    if (err.code === 11000) {
      return await Category.findOne({
        $or: [{ name: newCatPayload.name }, { slug: newCatPayload.slug }],
      });
    }
    throw err;
  }
};

/**
 * Persists a product from fallback catalog into MongoDB.
 */
const persistFallbackProduct = async (fbProduct) => {
  if (!fbProduct) return null;

  // Check if product already exists in DB by ID, SKU, or Name
  const searchOr = [];
  if (fbProduct._id && mongoose.Types.ObjectId.isValid(fbProduct._id)) {
    searchOr.push({ _id: fbProduct._id });
  }
  if (fbProduct.sku) {
    searchOr.push({ sku: fbProduct.sku });
  }
  if (fbProduct.name) {
    searchOr.push({ name: fbProduct.name });
  }

  if (searchOr.length > 0) {
    const existing = await Product.findOne({ $or: searchOr });
    if (existing) return existing;
  }

  // Ensure category is present in MongoDB
  const categoryDoc = await ensureCategoryInDB(fbProduct.category || fbProduct.categoryName);
  const categoryId = categoryDoc ? categoryDoc._id : undefined;

  const productPayload = {
    name: fbProduct.name,
    brand: fbProduct.brand || 'SHOPORA',
    category: categoryId,
    categoryName: fbProduct.categoryName || (categoryDoc ? categoryDoc.name : 'General'),
    subcategory: fbProduct.subcategory || 'General',
    description: fbProduct.description || fbProduct.name,
    image: fbProduct.image,
    images: fbProduct.images && fbProduct.images.length > 0 ? fbProduct.images : [fbProduct.image],
    price: fbProduct.price,
    originalPrice: fbProduct.originalPrice || fbProduct.price,
    discount: fbProduct.discount || 0,
    discountPercentage: fbProduct.discountPercentage || fbProduct.discount || 0,
    finalPrice: fbProduct.finalPrice || fbProduct.price,
    stock: fbProduct.stock !== undefined ? fbProduct.stock : 50,
    sku: fbProduct.sku || `SKU-${Date.now()}`,
    rating: fbProduct.rating || 4.5,
    reviewCount: fbProduct.reviewCount || 10,
    isFeatured: Boolean(fbProduct.isFeatured),
    isPremium: Boolean(fbProduct.isPremium),
    isTrending: Boolean(fbProduct.isTrending),
    isDeal: Boolean(fbProduct.isDeal),
    isNew: Boolean(fbProduct.isNew),
    isAvailable: (fbProduct.stock !== undefined ? fbProduct.stock : 50) > 0,
    specifications: fbProduct.specifications || [],
  };

  if (fbProduct._id && mongoose.Types.ObjectId.isValid(fbProduct._id)) {
    productPayload._id = fbProduct._id;
  }

  try {
    return await Product.create(productPayload);
  } catch (err) {
    if (err.code === 11000) {
      return await Product.findOne({
        $or: [
          ...(productPayload._id ? [{ _id: productPayload._id }] : []),
          { sku: productPayload.sku },
          { name: productPayload.name },
        ],
      });
    }
    throw err;
  }
};

/**
 * Resolves a product by ID, fallback catalog, or SKU/name.
 * If the product is found in the fallback catalog but not in MongoDB,
 * it automatically persists it to MongoDB so orders, carts, and inventory tracking succeed.
 */
const resolveProduct = async (productId, itemData = {}) => {
  if (!productId && !itemData.sku && !itemData.name) {
    return null;
  }

  const isDBReady = mongoose && mongoose.connection && mongoose.connection.readyState === 1;
  if (!isDBReady) {
    const fallbackItem = fallback.getProductByIdFallback(productId || itemData.sku || itemData.name);
    return fallbackItem ? fallbackItem.product : null;
  }

  let product = null;

  // 1. Direct MongoDB lookup by _id if valid ObjectId
  if (productId && mongoose.Types.ObjectId.isValid(productId)) {
    product = await Product.findById(productId);
  }

  // 2. Direct lookup in fallback catalog by ID or slug/sku
  if (!product && productId) {
    const fallbackItem = fallback.getProductByIdFallback(productId);
    if (fallbackItem && fallbackItem.product) {
      product = await persistFallbackProduct(fallbackItem.product);
    }
  }

  // 3. Lookup by SKU or Name in MongoDB
  if (!product && (itemData.sku || itemData.name || (typeof productId === 'string' && !mongoose.Types.ObjectId.isValid(productId)))) {
    const searchConditions = [];
    if (itemData.sku) searchConditions.push({ sku: itemData.sku });
    if (itemData.name) searchConditions.push({ name: itemData.name });
    if (typeof productId === 'string' && !mongoose.Types.ObjectId.isValid(productId)) {
      searchConditions.push({ sku: productId });
      searchConditions.push({ name: productId });
      searchConditions.push({ slug: productId });
    }

    if (searchConditions.length > 0) {
      product = await Product.findOne({ $or: searchConditions });
    }
  }

  // 4. Lookup by SKU or Name in fallback catalog
  if (!product && (itemData.sku || itemData.name || (typeof productId === 'string' && !mongoose.Types.ObjectId.isValid(productId)))) {
    const fallbackItem = fallback.getProductByIdFallback(itemData.sku || itemData.name || productId);
    if (fallbackItem && fallbackItem.product) {
      product = await persistFallbackProduct(fallbackItem.product);
    }
  }

  return product;
};

/**
 * Automatically seeds the default catalog if MongoDB is empty.
 * Runs non-blockingly or on-demand without interfering with connections.
 */
const ensureDefaultCatalog = async () => {
  const isDBReady = mongoose && mongoose.connection && mongoose.connection.readyState === 1;
  if (!isDBReady || isSeeding) return;

  try {
    isSeeding = true;
    const productCount = await Product.estimatedDocumentCount();
    if (productCount > 0) {
      isSeeding = false;
      return;
    }

    console.log('[ProductResolver] Empty database detected. Populating default catalog from defaultCatalog.json...');

    // 1. Upsert Categories
    const categories = defaultCatalogData.categories || [];
    for (const cat of categories) {
      await Category.updateOne(
        { _id: cat._id },
        {
          $setOnInsert: {
            _id: cat._id,
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon || '🏷️',
            image: cat.image,
            description: cat.description || '',
            displayOrder: cat.displayOrder || 1,
            isActive: true,
          },
        },
        { upsert: true }
      );
    }

    // 2. Upsert Products
    const products = defaultCatalogData.products || [];
    for (const p of products) {
      await Product.updateOne(
        { _id: p._id },
        {
          $setOnInsert: {
            _id: p._id,
            name: p.name,
            brand: p.brand || 'SHOPORA',
            category: p.category,
            categoryName: p.categoryName,
            subcategory: p.subcategory || 'General',
            description: p.description || p.name,
            image: p.image,
            images: p.images && p.images.length > 0 ? p.images : [p.image],
            price: p.price,
            originalPrice: p.originalPrice || p.price,
            discount: p.discount || 0,
            discountPercentage: p.discountPercentage || p.discount || 0,
            finalPrice: p.finalPrice || p.price,
            stock: p.stock !== undefined ? p.stock : 50,
            sku: p.sku || `SKU-${Date.now()}`,
            rating: p.rating || 4.5,
            reviewCount: p.reviewCount || 10,
            isFeatured: Boolean(p.isFeatured),
            isPremium: Boolean(p.isPremium),
            isTrending: Boolean(p.isTrending),
            isDeal: Boolean(p.isDeal),
            isNew: Boolean(p.isNew),
            isAvailable: (p.stock !== undefined ? p.stock : 50) > 0,
            specifications: p.specifications || [],
          },
        },
        { upsert: true }
      );
    }

    console.log(`[ProductResolver] Successfully populated ${products.length} products and ${categories.length} categories.`);
  } catch (err) {
    console.warn('[ProductResolver] Auto-seed warning:', err.message);
  } finally {
    isSeeding = false;
  }
};

module.exports = {
  resolveProduct,
  ensureDefaultCatalog,
  persistFallbackProduct,
  ensureCategoryInDB,
};
