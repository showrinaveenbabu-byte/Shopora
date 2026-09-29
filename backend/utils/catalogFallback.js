/**
 * SHOPORA — In-Memory Catalog Fallback Provider
 * Ensures high-availability when running on serverless (Vercel) before MongoDB Atlas is linked,
 * or during cold-starts/network partitions.
 */

let catalogData = null;
try {
  catalogData = require('../data/defaultCatalog.json');
} catch (e) {
  catalogData = { categories: [], products: [] };
}

const isDBConnected = (mongoose) => {
  return mongoose && mongoose.connection && mongoose.connection.readyState === 1;
};

const filterProducts = (query = {}) => {
  let products = [...(catalogData.products || [])];
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
  } = query;

  // Keyword Search
  if (search && search.trim() !== '') {
    const s = search.trim().toLowerCase();
    products = products.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.brand && p.brand.toLowerCase().includes(s)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(s)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(s)) ||
        (p.description && p.description.toLowerCase().includes(s)) ||
        (p.sku && p.sku.toLowerCase().includes(s))
    );
  }

  // Category Filter
  if (category && category !== 'All' && category.trim() !== '') {
    const catLower = category.trim().toLowerCase();
    products = products.filter(
      (p) =>
        (p.categoryName && p.categoryName.toLowerCase() === catLower) ||
        (p.category && String(p.category) === category) ||
        (p.subcategory && p.subcategory.toLowerCase() === catLower)
    );
  }

  // Brand Filter
  if (brand && brand.trim() !== '') {
    const brandsArr = brand.split(',').map((b) => b.trim().toLowerCase());
    products = products.filter((p) => p.brand && brandsArr.includes(p.brand.toLowerCase()));
  }

  // Price Range Filter
  if (minPrice) {
    products = products.filter((p) => (p.finalPrice || p.price) >= Number(minPrice));
  }
  if (maxPrice) {
    products = products.filter((p) => (p.finalPrice || p.price) <= Number(maxPrice));
  }

  // Rating Filter
  if (rating && Number(rating) > 0) {
    products = products.filter((p) => (p.rating || 0) >= Number(rating));
  }

  // Stock Filter
  if (inStock === 'true' || inStock === true) {
    products = products.filter((p) => (p.stock || 0) > 0);
  }

  // Discount Filter
  if (hasDiscount === 'true' || hasDiscount === true) {
    products = products.filter((p) => (p.discount || 0) > 0);
  }

  // Deals Filter
  if (isDeal === 'true' || isDeal === true || deal) {
    if (deal === 'flash') {
      products = products.filter((p) => p.isDeal || (p.discount || 0) >= 15);
    } else {
      products = products.filter((p) => p.isDeal || (p.discount || 0) > 0);
    }
  }

  // Premium Collection
  if (isPremium === 'true' || isPremium === true || premium === 'true' || premium === true) {
    products = products.filter((p) => p.isPremium || p.price >= 250);
  }

  // Trending
  if (isTrending === 'true' || isTrending === true || trending === 'true' || trending === true) {
    products = products.filter((p) => p.isTrending);
  }

  // New
  if (isNew === 'true' || isNew === true || newArrivals === 'true' || newArrivals === true || query.new === 'true') {
    products = products.filter((p) => p.isNew);
  }

  // Best Selling
  if (bestSelling === 'true' || bestSelling === true) {
    products = products.filter((p) => (p.rating || 0) >= 4.0);
  }

  // Subcategory
  if (subcategory && subcategory.trim() !== '') {
    const subLower = subcategory.trim().toLowerCase();
    products = products.filter((p) => p.subcategory && p.subcategory.toLowerCase() === subLower);
  }

  // Sorting
  if (sort === 'price-asc') {
    products.sort((a, b) => (a.finalPrice || a.price) - (b.finalPrice || b.price));
  } else if (sort === 'price-desc') {
    products.sort((a, b) => (b.finalPrice || b.price) - (a.finalPrice || a.price));
  } else if (sort === 'rating') {
    products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sort === 'popular') {
    products.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
  } else if (sort === 'discount') {
    products.sort((a, b) => (b.discount || 0) - (a.discount || 0));
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 12;
  const skip = (pageNum - 1) * limitNum;
  const paginated = products.slice(skip, skip + limitNum);

  return {
    success: true,
    count: paginated.length,
    total: products.length,
    totalPages: Math.ceil(products.length / limitNum) || 1,
    currentPage: pageNum,
    data: paginated,
  };
};

const getCategoriesFallback = () => {
  const categories = catalogData.categories || [];
  const products = catalogData.products || [];

  return categories.map((cat) => {
    const productCount = products.filter(
      (p) =>
        (p.category && String(p.category) === String(cat._id)) ||
        (p.categoryName && p.categoryName.toLowerCase() === cat.name.toLowerCase())
    ).length;

    return {
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      icon: cat.icon,
      isActive: cat.isActive !== false,
      displayOrder: cat.displayOrder || 0,
      productCount,
    };
  });
};

const getBrandsFallback = () => {
  const products = catalogData.products || [];
  const brandCountMap = {};
  products.forEach((p) => {
    if (p.brand) {
      brandCountMap[p.brand] = (brandCountMap[p.brand] || 0) + 1;
    }
  });

  return Object.keys(brandCountMap)
    .sort()
    .map((name) => ({ name, count: brandCountMap[name] }));
};

const getDealsFallback = (limit = 16) => {
  const products = catalogData.products || [];
  let deals = products.filter((p) => p.isDeal);
  if (deals.length < 6) {
    deals = products.filter((p) => (p.discount || 0) >= 15);
  }
  return deals.slice(0, limit);
};

const getFlashDealsFallback = (limit = 16) => {
  const products = catalogData.products || [];
  let deals = products.filter((p) => p.isDeal && (p.discount || 0) >= 20);
  if (deals.length < 6) {
    deals = products.filter((p) => (p.discount || 0) > 0);
  }
  return deals.slice(0, limit);
};

const getPremiumFallback = (limit = 16) => {
  const products = catalogData.products || [];
  let prods = products.filter((p) => p.isPremium);
  if (prods.length < 6) {
    prods = products.filter((p) => (p.price || 0) >= 150);
  }
  return prods.slice(0, limit);
};

const getFeaturedFallback = (limit = 16) => {
  const products = catalogData.products || [];
  let prods = products.filter((p) => p.isFeatured);
  if (prods.length < 6) {
    prods = [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  return prods.slice(0, limit);
};

const getProductByIdFallback = (idOrSlug) => {
  const products = catalogData.products || [];
  const product = products.find(
    (p) => String(p._id) === String(idOrSlug) || (p.slug && p.slug === idOrSlug) || p.sku === idOrSlug
  );
  if (!product) return null;

  const related = products
    .filter(
      (p) =>
        String(p._id) !== String(product._id) &&
        (p.categoryName === product.categoryName || p.brand === product.brand)
    )
    .slice(0, 4);

  return { product, related };
};

const getSuggestionsFallback = (q) => {
  if (!q || q.trim().length < 1) return [];
  const s = q.trim().toLowerCase();
  const products = catalogData.products || [];
  return products
    .filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.brand && p.brand.toLowerCase().includes(s)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(s))
    )
    .slice(0, 6)
    .map((p) => ({
      name: p.name,
      brand: p.brand,
      image: p.image,
      price: p.price,
      finalPrice: p.finalPrice,
      categoryName: p.categoryName,
    }));
};

const getOffersFallback = () => {
  const products = catalogData.products || [];
  const flashProducts = products.filter((p) => p.isDeal || (p.discount || 0) >= 15).slice(0, 8);
  const techProducts = products.filter((p) => p.categoryName === 'Laptops & Computing' || p.categoryName === 'Mobiles & Tablets').slice(0, 8);
  const selectProducts = products.filter((p) => p.isPremium || p.price >= 500).slice(0, 8);

  return [
    {
      _id: '66fa00000000000000000001',
      title: '⚡ Flash Sale — Up to 40% OFF',
      subtitle: 'Save more on your everyday flagship tech & smart accessories',
      type: 'FLASH DEAL',
      badgeText: 'FLASH DEAL',
      bannerImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1400&auto=format&fit=crop&q=80',
      discountType: 'percentage',
      discountValue: 40,
      tagline: 'Expires in limited hours',
      ctaText: 'SHOP FLASH SALE',
      ctaLink: '/pages/products.html?deal=flash',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(Date.now() + 24 * 3600 * 1000),
      category: 'Electronics',
      products: flashProducts,
      isActive: true,
      priority: 10,
    },
    {
      _id: '66fa00000000000000000002',
      title: '🔥 Deals of the Day',
      subtitle: 'Exclusive 24-hour markdowns on workstations & computing power',
      type: 'DEAL OF THE DAY',
      badgeText: 'DEAL OF THE DAY',
      bannerImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1400&auto=format&fit=crop&q=80',
      discountType: 'percentage',
      discountValue: 25,
      tagline: 'Limited time daily drop',
      ctaText: 'EXPLORE DEALS',
      ctaLink: '/pages/products.html?deal=today',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(Date.now() + 18 * 3600 * 1000),
      category: 'Computing',
      products: techProducts,
      isActive: true,
      priority: 9,
    },
    {
      _id: '66fa00000000000000000003',
      title: '✨ SHOPORA SELECT — Luxury & Flagship',
      subtitle: 'Hand-picked premium electronics and designer essentials',
      type: 'PREMIUM OFFER',
      badgeText: 'SHOPORA SELECT',
      bannerImage: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1400&auto=format&fit=crop&q=80',
      discountType: 'percentage',
      discountValue: 15,
      tagline: 'Authenticity certified',
      ctaText: 'EXPLORE SELECT',
      ctaLink: '/pages/products.html?isPremium=true',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(Date.now() + 72 * 3600 * 1000),
      category: 'Premium',
      products: selectProducts,
      isActive: true,
      priority: 8,
    },
  ];
};

const getOfferByIdFallback = (id) => {
  const offers = getOffersFallback();
  return offers.find((o) => String(o._id) === String(id)) || offers[0] || null;
};

module.exports = {
  catalogData,
  isDBConnected,
  filterProducts,
  getCategoriesFallback,
  getBrandsFallback,
  getDealsFallback,
  getFlashDealsFallback,
  getPremiumFallback,
  getFeaturedFallback,
  getProductByIdFallback,
  getSuggestionsFallback,
  getOffersFallback,
  getOfferByIdFallback,
};

