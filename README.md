# SHOPORA — Everything You Need. Delivered Simply.

> **CodeAlpha Internship — Task 1: Complete Production E-Commerce Platform Transformation**

SHOPORA is a full-stack commercial e-commerce web application engineered with **Node.js, Express.js, MongoDB (Mongoose), and modern Vanilla HTML5 / CSS3 / JavaScript**. Inspired by the depth and reliability of leading e-commerce platforms such as Amazon and Flipkart, SHOPORA provides completely original branding, an intuitive design system, database-driven product catalog with multi-faceted filtering, a 4-step checkout, real-time order milestone tracking, verified customer reviews, multi-address management, and an executive administration console.

---

## 🌟 Key Capabilities & Features

### 🛍️ Customer Experience
- **Amazon & Flipkart Inspired Navigation**:
  - Sticky header with SHOPORA branding, category departments ribbon, and delivery location snippet.
  - Search bar with debounced live suggestions querying the MongoDB backend.
  - Real-time cart count and wishlist badges synchronized with the database.
- **Dynamic Database-Driven Homepage**:
  - Promotional hero showcase banner ("Everything You Need. Delivered Simply.").
  - Dynamic category cards strip loaded from MongoDB (`/api/categories`).
  - Deals of the Day and Trending Innovations showcase.
  - Value pillars highlighting 100% Genuine Guarantee, Express Delivery, and 30-Day Easy Returns.
- **Product Catalog & Search (`/pages/products.html`)**:
  - Dynamic multi-brand checklist dynamically aggregated from database products (`/api/products/brands`).
  - Multi-faceted filtering by Category, Brand, Price Range (Min/Max), Customer Rating (4★, 4.5★, 4.8★), In Stock Only, Deals of the Day, and Discounted Items.
  - Multi-field sorting (Price: Low to High, High to Low, Newest, Avg Customer Review, Popularity).
  - Clean server-backed pagination with seamless URL query parameter synchronization.
- **Product Details & Verified Reviews (`/pages/product-details.html`)**:
  - Multi-image gallery with interactive thumbnail switcher and zoom viewport.
  - Price, discount percentage, SKU, and availability indicator.
  - Technical specifications table, delivery time estimator, and return policy details.
  - Quantity steppers with Add to Cart, Buy Now, and Wishlist toggling.
  - Verified customer review list with star breakdown and modal form for verified purchasers.
- **Persistent Shopping Cart (`/pages/cart.html`)**:
  - Dual-persistence (instant client responsiveness + automatic server synchronization for authenticated users).
  - Free delivery threshold progress meter ($50 threshold).
  - Quantity adjustments, item removal, and "Save for later" (move to wishlist).
  - Sticky order summary calculation.
- **Multi-Step Checkout (`/pages/checkout.html`)**:
  - Step 1: Delivery Address (select from saved user addresses loaded from `/api/auth/addresses` or enter a new address).
  - Step 2: Payment method selection (Cash on Delivery / Transparent Sandbox Demo Card).
  - Real-time server-side price recalculation from MongoDB before order persistence.
- **Verified Order Tracking Timeline (`/pages/order-tracking.html`)**:
  - Real milestone fulfillment progress timeline:
    `Order Placed` &rarr; `Confirmed` &rarr; `Processing` &rarr; `Packed` &rarr; `Shipped` &rarr; `Out for Delivery` &rarr; `Delivered`.
  - Displays timestamps, carrier name, fulfillment center location, and status event logs.
  - Package contents table and shipping address details.
- **Customer Account Center (`/pages/profile.html`)**:
  - Profile settings: Display name and password updates.
  - Multi-Address Manager: Add, edit, delete, and set default shipping addresses.
  - Notifications inbox: Real-time alerts for orders and delivery transitions.
  - Order history (`/pages/orders.html`) with printable tax invoice modal.
  - Personal Wishlist (`/pages/wishlist.html`) with 1-click move to cart.

---

### 🛡️ Administrator Operations Console (`/pages/admin.html`)
- **Executive Overview & Analytics**:
  - Aggregated real-time metrics: Gross Revenue, Total Orders, Active Catalog Items, Registered Customers, Low Stock Alerts, and Delivered Orders.
  - Recent transactions table with direct links to milestone tracking.
- **Product Management (Full CRUD)**:
  - Create new products with specifications, brand, category, SKU, pricing, discounts, stock, and deal flags.
  - Live modal editing and permanent deletion with confirmation dialogs.
- **Category Taxonomy Management**:
  - Create, edit, and delete store categories with custom icons and banner images.
- **Order Fulfillment & Tracking Event Logger**:
  - Filter orders by status (*Order Placed*, *Confirmed*, *Processing*, *Packed*, *Shipped*, *Out for Delivery*, *Delivered*, *Cancelled*).
  - Status transitions automatically append verified events into the customer's tracking timeline.
- **User Account Management**:
  - Search customer accounts, view order counts, toggle account status (Active / Suspended), and promote/demote administrator roles.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Modular architecture with zero heavy framework bloat; fast load times |
| **Design System** | Custom Vanilla CSS (SHOPORA Design Tokens) | Modern dark navy palette (`#0a0d18`), indigo/amber accents, accessible contrast |
| **Backend** | Node.js + Express.js | Modular REST API with structured controllers, routes, and middleware |
| **Database** | MongoDB + Mongoose | Robust models with indexing, subdocument arrays, validation, and relationships |
| **Security** | JWT + Bcrypt.js | Password hashing, Bearer token authorization, role-based access control |
| **Testing** | Automated Node.js Test Suite | Complete API suite (21 tests) and 4 Critical End-to-End User Journeys (16 checkpoints) |

---

## 📁 Project Architecture

```
Ecommers/
├── package.json               # Node.js configuration & test scripts
├── .env                       # Environment variables
├── .env.example               # Environment variables template
├── README.md                  # Complete documentation & run instructions
├── backend/
│   ├── server.js              # Server entry point, API route mounting, static file server
│   ├── config/
│   │   └── db.js              # MongoDB Mongoose connection handler
│   ├── models/
│   │   ├── User.js            # User model with phone, addresses array, role
│   │   ├── Product.js         # Product schema with brand, SKU, discount, specs, text search
│   │   ├── Category.js        # Categories schema with slugs, icons, display order
│   │   ├── Cart.js            # Persistent user cart schema
│   │   ├── Order.js           # Order schema with items, trackingHistory milestones
│   │   ├── Review.js          # Product reviews with verified purchase flags
│   │   ├── Wishlist.js        # User wishlist array
│   │   └── Notification.js    # User notification alerts
│   ├── controllers/
│   │   ├── authController.js  # Registration, login, profile, address CRUD
│   │   ├── productController.js # Catalog, brands, search suggestions, deals, CRUD
│   │   ├── categoryController.js # Categories listing with product counts, CRUD
│   │   ├── cartController.js  # Cart sync, add, update, remove
│   │   ├── orderController.js # Price recalculation, order creation, tracking history
│   │   ├── reviewController.js # Customer reviews, verified purchases, ratings calc
│   │   ├── wishlistController.js # Wishlist toggle, fetch, move to cart
│   │   ├── notificationController.js # User notifications and read status
│   │   └── adminController.js # Analytics, low-stock alerts, order workflow, user status
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT Bearer token authentication
│   │   ├── adminMiddleware.js # Role-based access control
│   │   └── errorMiddleware.js # Global error handler
│   ├── utils/
│   │   └── seed.js            # Database seeder (8 categories, 28 products, demo accounts)
│   └── tests/
│       ├── api-test.js        # Automated 21-checkpoint REST API test suite
│       └── flows-test.js      # 4 critical end-to-end user journeys simulation
└── frontend/
    ├── index.html             # Flagship SHOPORA Homepage
    ├── css/
    │   └── styles.css         # Complete SHOPORA design system (colors, navbar, timeline, cards)
    ├── pages/
    │   ├── products.html      # Product catalog with dynamic brand & category filters
    │   ├── product-details.html # Gallery, specs, delivery pills, verified reviews
    │   ├── cart.html          # Shopping cart with free delivery progress meter
    │   ├── checkout.html      # 4-step checkout with saved address picker
    │   ├── order-tracking.html # Real-time shipment milestone tracking timeline
    │   ├── orders.html        # Order history with printable tax invoice modal
    │   ├── wishlist.html      # Personal wishlist with 1-click move to cart
    │   ├── profile.html       # Account settings, address manager, notifications
    │   ├── login.html         # Sign in with instant 1-click demo buttons
    │   ├── register.html      # Account registration with phone & password verification
    │   └── admin.html         # Administrative Operations Console
    └── js/
        ├── api.js             # Centralized Fetch wrapper with auth header injection
        ├── auth.js            # Authentication state manager
        ├── cart.js            # Cart state management and database synchronization
        ├── wishlist.js        # Wishlist state management
        ├── components.js      # Global header, search suggestions, footer, toast & modals
        ├── utils.js           # Price formatting, star rendering, debouncing
        ├── home.js            # Homepage controller
        ├── products.js        # Catalog controller (brands, categories, filters, sort)
        ├── product-details.js # Product details & review submission controller
        ├── checkout.js        # Multi-step checkout controller
        ├── order-tracking.js  # Order milestone tracking controller
        ├── orders.js          # Order list & invoice controller
        ├── wishlist-page.js   # Wishlist page controller
        ├── profile.js         # Account center & address CRUD controller
        └── admin.js           # Admin console controller (products, categories, orders, users)
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ installed (`node -v`)
- **MongoDB**: Local MongoDB instance running on port 27017 (or MongoDB Atlas URI)

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Verify your `.env` file configuration:
```env
PORT=5050
MONGO_URI=mongodb://127.0.0.1:27017/novamart
JWT_SECRET=shopora_super_secret_jwt_key_987654321_production_secure
NODE_ENV=development
```

### 4. Seed Database
Populate 8 categories, 28 genuine products across top brands (Apple, Samsung, Sony, Bose, Dell, Nike, Philips, Dyson), verified reviews, saved addresses, and pre-configured demo accounts:
```bash
npm run seed
```

### 5. Launch Application
Start the SHOPORA server:
```bash
npm start
```
Then visit **[http://localhost:5050](http://localhost:5050)** in your web browser.

---

## 🔑 Demo Credentials

| Role | Email | Password | Privileges |
|---|---|---|---|
| **Administrator** | `admin@shopora.com` | `Admin@12345` | Full access to Admin Operations, Catalog CRUD, Order Tracking Transitions, User Roles |
| **Customer** | `user@shopora.com` | `User@12345` | Browse catalog, persistent cart, wishlist, checkout, view tracking, account settings |

*Tip: The login page includes 1-click **Customer Demo** and **Admin Demo** buttons for instant testing without manual typing.*

---

## 🧪 Automated Testing

### 1. Complete REST API Suite (21 Checkpoints)
Validates all endpoints, category listing, catalog search, brand aggregation, deals, authentication, address CRUD, wishlist sync, cart persistence, order creation, order tracking timeline, verified reviews, and admin status updates:
```bash
npm run test:api
```

### 2. End-to-End User Journeys Simulation (16 Checkpoints)
Simulates 4 comprehensive customer and administrator workflows:
1. Complete Customer Purchase Journey: Browse &rarr; Filter &rarr; Product Details &rarr; Add to Cart &rarr; Address Selection &rarr; Checkout &rarr; Tracking Timeline
2. Wishlist Management & Cart Transfer: Add to wishlist &rarr; View wishlist &rarr; Move item directly to cart
3. Verified Customer Reviews: Submit review &rarr; Verify persistence & rating recalculation
4. Admin Fulfillment Workflow: View metrics &rarr; Update order status &rarr; Customer inspects updated tracking timeline
```bash
npm run test:flows
```

---

## 📡 REST API Reference

### Authentication & Address System (`/api/auth`)
- `POST /api/auth/register` — Register customer account with name, email, phone, password
- `POST /api/auth/login` — Authenticate and receive JWT token
- `GET /api/auth/me` — Current authenticated user profile
- `PUT /api/auth/profile` — Update display name, phone, and password
- `GET /api/auth/addresses` — List saved delivery addresses
- `POST /api/auth/addresses` — Add new delivery address
- `PUT /api/auth/addresses/:id/default` — Set address as default
- `DELETE /api/auth/addresses/:id` — Remove saved address

### Products & Search (`/api/products`)
- `GET /api/products` — Filter by category, brand, price range, rating, stock, deals; sort and paginate
- `GET /api/products/brands` — Aggregated list of all available brands
- `GET /api/products/deals` — Current "Deals of the Day"
- `GET /api/products/featured` — Featured products for homepage
- `GET /api/products/suggestions` — Live debounced search suggestions
- `GET /api/products/:id` — Product details with specifications and related items
- `POST /api/products` — *[Admin]* Add new product
- `PUT /api/products/:id` — *[Admin]* Edit product
- `DELETE /api/products/:id` — *[Admin]* Delete product

### Categories (`/api/categories`)
- `GET /api/categories` — List all categories with product counts
- `POST /api/categories` — *[Admin]* Create new category
- `PUT /api/categories/:id` — *[Admin]* Edit category
- `DELETE /api/categories/:id` — *[Admin]* Delete category

### Shopping Cart (`/api/cart`)
- `GET /api/cart` — Fetch user's persistent cart
- `POST /api/cart` — Add product to cart
- `PUT /api/cart/:productId` — Update item quantity
- `DELETE /api/cart/:productId` — Remove specific item
- `DELETE /api/cart` — Clear cart

### Wishlist (`/api/wishlist`)
- `GET /api/wishlist` — Fetch user's wishlist
- `POST /api/wishlist` or `POST /api/wishlist/toggle` — Toggle item in wishlist
- `POST /api/wishlist/move-to-cart` — Move item from wishlist to cart
- `DELETE /api/wishlist/:productId` — Remove item from wishlist

### Orders & Tracking (`/api/orders`)
- `POST /api/orders` — Create new order with server recalculated prices and inventory decrement
- `GET /api/orders` — Get authenticated user's orders
- `GET /api/orders/:id` — Order details with verified milestone tracking history
- `PUT /api/orders/:id/cancel` — Cancel order (if in Placed/Confirmed stage)

### Customer Reviews (`/api/reviews`)
- `GET /api/reviews/:productId` — Get reviews for product
- `POST /api/reviews` — Submit verified customer review

### Notifications (`/api/notifications`)
- `GET /api/notifications` — Fetch user notifications
- `PUT /api/notifications/read-all` — Mark all notifications as read

### Admin Operations (`/api/admin`)
- `GET /api/admin/overview` — Dashboard statistics (Revenue, Orders, Products, Users, Low Stock)
- `GET /api/admin/orders` — View and filter all customer orders
- `PUT /api/admin/orders/:id/status` — Transition order fulfillment status and log tracking event
- `GET /api/admin/users` — List registered users and order counts
- `PUT /api/admin/users/:id/status` — Toggle user account active/suspended
- `PUT /api/admin/users/:id/role` — Promote/demote user roles

---

## 🔒 Security & Architecture Integrity
- Passwords cryptographically hashed using **bcryptjs** (salt rounds: 10).
- **JWT (JSON Web Tokens)** with Bearer authentication and 30-day expiration.
- **Server-side price recalculation**: All line item prices, discounts, and order totals are computed from database values, preventing client-side price tampering.
- **Role-based authorization middleware**: Admin endpoints strictly verify `user.role === 'admin'` on the server.
- **Dedicated Task Isolation**: Task 1 is strictly standalone e-commerce (no social features or cross-task dependencies).

---

## 📄 License
Created for CodeAlpha Internship — Task 1: E-Commerce Website. Free to use for educational, demonstration, and evaluation purposes.
