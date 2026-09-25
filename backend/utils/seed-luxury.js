const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Product = require('../models/Product');
const Category = require('../models/Category');

const LUXURY_ITEMS = [
  {
    name: 'Rolex Submariner Date 41mm Oystersteel & Cerachrom',
    brand: 'Rolex',
    categorySlug: 'fashion-and-apparel',
    subcategory: 'Luxury Watches',
    price: 11450.00,
    originalPrice: 12500.00,
    discount: 8,
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80',
    stock: 3,
    sku: 'RLX-SUB-41MM',
    rating: 4.95,
    reviewCount: 48,
    isFeatured: true,
    isPremium: true,
    isLuxury: true,
    whiteGloveEligible: true,
    authenticityCertified: true,
    offerText: 'Includes Green Box, Physical Guarantee Card & 5-Year International Warranty',
    specifications: [
      { key: 'Case Diameter', value: '41 mm Oystersteel' },
      { key: 'Bezel', value: 'Unidirectional rotatable 60-minute graduated Cerachrom' },
      { key: 'Movement', value: 'Calibre 3235, Manufacture Rolex (70-hr reserve)' },
      { key: 'Water Resistance', value: '300 metres / 1,000 feet' },
      { key: 'White-Glove', value: 'Hand-delivered with Security PIN & Signature Seal' },
    ],
    description: 'The archetype of the diver’s watch. Unwavering precision, crafted from corrosion-resistant Oystersteel with black Cerachrom ceramic bezel and Luminescent Chromalight display.',
  },
  {
    name: 'Bang & Olufsen Beoplay H95 Flagship Titanium & Lambskin Headphones',
    brand: 'Bang & Olufsen',
    categorySlug: 'audio-and-headphones',
    subcategory: 'Audiophile Tech',
    price: 1099.00,
    originalPrice: 1249.00,
    discount: 12,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    stock: 8,
    sku: 'BO-H95-TITANIUM',
    rating: 4.92,
    reviewCount: 84,
    isFeatured: true,
    isPremium: true,
    isLuxury: true,
    whiteGloveEligible: true,
    authenticityCertified: true,
    offerText: 'Includes Custom Aluminum Flight Case & Handcrafted Leather Cord Wrap',
    specifications: [
      { key: 'Acoustic Driver', value: 'Custom 40mm Titanium Drivers with Neodymium magnets' },
      { key: 'Noise Cancellation', value: 'Adaptive Active Noise Cancellation (5 Levels)' },
      { key: 'Materials', value: 'Brushed Aluminum, Soft Lambskin, Memory Foam' },
      { key: 'Battery Life', value: 'Up to 38 hours continuous ANC playback' },
    ],
    description: 'Mastered for pure sound immersion. Celebrating 95 years of acoustic engineering, Beoplay H95 features custom titanium drivers and precision-crafted aluminum rotary dials.',
  },
  {
    name: 'Bottega Veneta Intrecciato Nappa Calfskin Duffle & Travel Bag',
    brand: 'Bottega Veneta',
    categorySlug: 'fashion-and-apparel',
    subcategory: 'Designer Leather',
    price: 3950.00,
    originalPrice: 4300.00,
    discount: 8,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    stock: 4,
    sku: 'BV-INTREC-DUF',
    rating: 4.88,
    reviewCount: 32,
    isFeatured: true,
    isPremium: true,
    isLuxury: true,
    whiteGloveEligible: true,
    authenticityCertified: true,
    offerText: 'Handcrafted in Montebello Vicentino, Italy with Certificate of Provenance',
    specifications: [
      { key: 'Material', value: '100% Hand-Woven Intrecciato Nappa Leather' },
      { key: 'Hardware', value: 'Matte Gunmetal Finish Solid Brass' },
      { key: 'Dimensions', value: '50cm x 28cm x 24cm (Cabin Size Compliant)' },
      { key: 'Lining', value: 'Bonded Suede Sfumato with Zip Pocket' },
    ],
    description: 'An iconic silhouette of quiet luxury. Hand-woven by Italian master artisans without extraneous logos, reflecting the pinnacle of understated modern elegance.',
  },
  {
    name: 'Leica Q3 Full-Frame 60MP Compact Camera (Summilux 28mm f/1.7)',
    brand: 'Leica',
    categorySlug: 'laptops-and-computing',
    subcategory: 'Audiophile Tech',
    price: 5995.00,
    originalPrice: 6495.00,
    discount: 8,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    stock: 5,
    sku: 'LCA-Q3-60MP',
    rating: 4.96,
    reviewCount: 51,
    isFeatured: true,
    isPremium: true,
    isLuxury: true,
    whiteGloveEligible: true,
    authenticityCertified: true,
    offerText: 'Made in Germany. Includes Leica Leather Strap & Metal Lens Hood',
    specifications: [
      { key: 'Sensor', value: '60.3 MP BSI CMOS Full-Frame (Triple Resolution Tech)' },
      { key: 'Lens', value: 'Fixed Leica Summilux 28mm f/1.7 ASPH. with Macro Mode' },
      { key: 'Viewfinder', value: '5.76 MP OLED EVF with 120 fps' },
      { key: 'Weather Sealing', value: 'IP52 Ingress Protection Certification' },
    ],
    description: 'The definitive creative tool for fine art and documentary photography. Unmatched optical brilliance engineered in Wetzlar, Germany with wireless high-speed transfer.',
  },
  {
    name: 'Maison Francis Kurkdjian Baccarat Rouge 540 Extrait de Parfum (200ml)',
    brand: 'Maison Francis Kurkdjian',
    categorySlug: 'beauty-and-personal-care',
    subcategory: 'Haute Parfumerie',
    price: 895.00,
    originalPrice: 975.00,
    discount: 8,
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80',
    stock: 12,
    sku: 'MFK-BR540-EXT-200',
    rating: 4.94,
    reviewCount: 165,
    isFeatured: true,
    isPremium: true,
    isLuxury: true,
    whiteGloveEligible: true,
    authenticityCertified: true,
    offerText: 'Hand-poured in Paris with 24K Red Flacon & Engraved Monogram Option',
    specifications: [
      { key: 'Concentration', value: 'Extrait de Parfum (Highest Perfume Oil Blend)' },
      { key: 'Top Notes', value: 'Bitter Almond from Morocco, Saffron' },
      { key: 'Heart Notes', value: 'Egyptian Jasmine Grandiflorum, Cedarwood' },
      { key: 'Base Notes', value: 'Ambergris, Woody Musks' },
    ],
    description: 'A poetic alchemy born from the encounter between crystal and heat. Luminous, intense, and intoxicating with radiant cedarwood and ambergris accords.',
  },
  {
    name: 'Cartier Santos de Cartier 18K Yellow Gold & Steel Timepiece',
    brand: 'Cartier',
    categorySlug: 'fashion-and-apparel',
    subcategory: 'Luxury Watches',
    price: 7850.00,
    originalPrice: 8400.00,
    discount: 7,
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80',
    stock: 4,
    sku: 'CRT-SNT-18K-LRG',
    rating: 4.93,
    reviewCount: 39,
    isFeatured: true,
    isPremium: true,
    isLuxury: true,
    whiteGloveEligible: true,
    authenticityCertified: true,
    offerText: 'Includes Red Box, Tool for QuickSwitch Bracelet & Cartier Certificate',
    specifications: [
      { key: 'Case', value: '39.8mm Steel with 18K Yellow Gold Bezel' },
      { key: 'Crown', value: '7-Sided Crown Set with Faceted Blue Synthetic Spinel' },
      { key: 'Movement', value: 'Calibre 1847 MC Automatic Mechanical' },
      { key: 'Bracelet', value: 'SmartLink resize system + interchangeable calfskin strap' },
    ],
    description: 'Designed in 1904 for aviator Alberto Santos-Dumont. The first modern wristwatch features rounded angles, seamless horn curves, and exposed screws that redefined watch design.',
  },
];

async function seedLuxury() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/novamart');
  console.log('[MongoDB] Connected for Luxury Seeding');

  const categories = await Category.find();
  const catMap = {};
  categories.forEach((c) => {
    catMap[c.slug] = c;
  });

  for (const item of LUXURY_ITEMS) {
    const cat = catMap[item.categorySlug] || categories[0];
    const existing = await Product.findOne({ sku: item.sku });
    const productPayload = {
      ...item,
      category: cat._id,
      categoryName: cat.name,
      proExclusivePrice: Math.round((item.price * 0.95) * 100) / 100,
    };

    if (existing) {
      await Product.findByIdAndUpdate(existing._id, productPayload);
      console.log(`Updated luxury product: ${item.name}`);
    } else {
      await Product.create(productPayload);
      console.log(`Created luxury product: ${item.name}`);
    }
  }

  console.log('🎉 Luxury products seeded successfully!');
  await mongoose.disconnect();
}

seedLuxury().catch(console.error);
