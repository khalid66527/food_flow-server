<div align="center">

# 🚀 Food Flow — Backend REST API & Real-time Server

[![Live Client](https://img.shields.io/badge/Live_Client-fooddeliveryplatform.vercel.app-FF4B2B?style=for-the-badge&logo=vercel&logoColor=white)](https://fooddeliveryplatform.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js_18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js_4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose_8-880000?style=for-the-badge&logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

<p align="center">
  <b>Food Flow Server</b> is the high-performance, scalable backend engine powering the Food Flow multi-vendor food delivery platform. Built with Node.js, Express, TypeScript, and MongoDB, it features real-time WebSocket communication, Stripe payments, multi-role RBAC, and AI integration via Google Gemini and AgentRouter.
</p>

[🌐 Live Client](https://fooddeliveryplatform.vercel.app) • [🖥️ Client Repository](https://github.com/khalid66527/food_flow-client.git) • [⚙️ Server Repository](https://github.com/khalid66527/food_flow-server.git)

---

</div>

## 📌 Table of Contents

- [🌟 System Features](#-system-features)
- [🏗️ Architectural Overview](#️-architectural-overview)
- [🛠️ Tech Stack](#️-tech-stack)
- [📡 Comprehensive API Endpoints](#-comprehensive-api-endpoints)
- [⚡ Real-time WebSocket Events](#-real-time-websocket-events)
- [🤖 AI Integration Architecture](#-ai-integration-architecture)
- [🚀 Quickstart & Setup Guide](#-quickstart--setup-guide)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Server](#running-the-server)
- [🧪 NPM Scripts](#-npm-scripts)
- [🛡️ Security & Best Practices](#️-security--best-practices)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🌟 System Features

- **Role-Based Access Control (RBAC):** Granular authorization for `Admin`, `Restaurant`, `Rider`, and `Customer`.
- **Real-Time WebSocket Engine:** Socket.io server managing order dispatching, restaurant alerts, rider tracking, and customer status feeds.
- **Payment Processing:** Full Stripe API integration for secure card payment intents and confirmation.
- **AI Processing Pipeline:** 
  - Google Gemini API integration for AI food image generation & enhancement.
  - AgentRouter / DeepSeek integration for interactive food recommendations and customer support chatbots.
- **Robust Order Lifecycle Pipeline:** Structured transitions (`Pending` ➔ `Accepted` ➔ `Preparing` ➔ `Ready` ➔ `Picked Up` ➔ `Delivered` ➔ `Cancelled`).
- **Comprehensive Platform Analytics:** Aggregated statistics for revenues, order counts, user growth, top dishes, and performance metrics.
- **Coupons & Zone Logic:** Dynamic coupon validation, expiration, and location-based delivery zones.

---

## 🏗️ Architectural Overview

The server follows a clean, modular layer architecture (**Controller-Service-Model-Route** pattern) ensuring maintainability, type safety, and scalability:

```
food_flow-server/
├── src/
│   ├── app.ts                  # Express application setup, middlewares & error handlers
│   ├── server.ts               # HTTP & Socket.io server bootstrap & MongoDB connection
│   └── app/
│       ├── config/             # Environment configuration constants
│       ├── middlewares/        # Auth verification, RBAC, validateRequest
│       ├── routes/             # Centralized routing registry
│       ├── socket.ts           # Socket.io connection and event handlers
│       ├── sockets/            # Specific socket room handlers
│       ├── utils/              # Helper utilities, catchAsync, sendResponse
│       └── modules/            # Modular Feature Packages
│           ├── address/        # Customer delivery addresses
│           ├── admin/          # Admin oversight, approvals & users
│           ├── ai/             # Gemini & AgentRouter AI endpoints
│           ├── auth/           # Authentication, JWT & verification
│           ├── cart/           # Persistent cart storage
│           ├── category/       # Food category CRUD
│           ├── contact/        # Contact inquiries & support
│           ├── coupon/         # Promo codes & discount logic
│           ├── favorite/       # User wishlist & favorites
│           ├── food/           # Food items, ingredients & addons
│           ├── order/          # Order placement, status & Stripe payments
│           ├── restaurant/     # Restaurant profiles & onboarding
│           ├── review/         # Ratings & customer reviews
│           ├── rider/          # Rider profile, delivery status & earnings
│           ├── settings/       # Global system configurations
│           ├── stats/          # Admin, vendor & platform analytics
│           └── zone/           # Delivery zones & geofencing
├── .env.example                # Sample environment file
├── tsconfig.json               # TypeScript compiler config
└── package.json                # Project dependencies & scripts
```

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Runtime Environment** | [Node.js (v18+)](https://nodejs.org/) |
| **Framework** | [Express.js](https://expressjs.com/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database & ODM** | [MongoDB](https://www.mongodb.com/) via [Mongoose 8](https://mongoosejs.com/) |
| **Execution Engine** | [TSX](https://github.com/privatenumber/tsx) (Fast TypeScript execution) |
| **Realtime Engine** | [Socket.io 4](https://socket.io/) |
| **Payment Gateway** | [Stripe](https://stripe.com/) |
| **AI Models & SDKs** | [Google GenAI (@google/genai)](https://www.npmjs.com/package/@google/genai), [AgentRouter (DeepSeek-v4-flash)](https://agentrouter.ai/) |
| **Security & Auth** | [JSON Web Token (JWT)](https://jwt.io/), [CORS](https://www.npmjs.com/package/cors), [Dotenv](https://www.npmjs.com/package/dotenv) |

---

## 📡 Comprehensive API Endpoints

All API routes are mounted under `/api` and `/api/v1`.

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user (Customer, Vendor, Rider) |
| `POST` | `/api/auth/login` | User login & JWT issuance |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |

### 🍔 Food & Menus (`/api/food`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/food` | Get all food items (supports search, category & pricing filters) |
| `GET` | `/api/food/:id` | Get single dish details with addons & reviews |
| `POST` | `/api/food` | Create new dish *(Restaurant / Admin)* |
| `PUT` | `/api/food/:id` | Update dish details *(Restaurant / Admin)* |
| `DELETE` | `/api/food/:id` | Remove dish *(Restaurant / Admin)* |

### 🏪 Restaurants (`/api/restaurants`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/restaurants` | List all verified restaurants |
| `GET` | `/api/restaurants/:id` | Get restaurant profile and menu |
| `POST` | `/api/restaurants` | Onboard new restaurant |
| `PUT` | `/api/restaurants/:id` | Update restaurant information & operating hours |

### 📦 Orders & Payments (`/api/orders`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/orders` | Get user orders with pagination |
| `GET` | `/api/orders/:id` | Get full order details & tracking status |
| `POST` | `/api/orders` | Place a new order (COD or Stripe) |
| `PATCH` | `/api/orders/:id/status` | Update order stage (`Accepted`, `Preparing`, `Delivered`, etc.) |
| `POST` | `/api/orders/create-payment-intent` | Generate Stripe payment intent |

### 🚴 Rider Operations (`/api/rider`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/rider/available-orders` | Fetch pending orders ready for pickup |
| `PATCH` | `/api/rider/accept-order/:id` | Rider accepts delivery assignment |
| `PATCH` | `/api/rider/update-location` | Update rider real-time GPS coordinates |
| `GET` | `/api/rider/earnings` | Fetch rider earnings and delivery history |

### 🤖 AI Endpoints (`/api/ai`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ai/generate-food-image` | Generate or edit food photos via Google Gemini |
| `POST` | `/api/ai/chat` | Conversational food recommendations via DeepSeek / AgentRouter |

### 👑 Admin Management (`/api/admin`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/users` | List and filter all platform users |
| `PATCH` | `/api/admin/users/:id/role` | Update user roles & permissions |
| `PATCH` | `/api/admin/restaurants/:id/verify` | Approve or reject restaurant partners |
| `GET` | `/api/admin/overview` | Platform-wide financial and order summary |

### 🎟️ Coupons, Categories, Reviews, Favorites & Zones
- `/api/coupons` — Create, validate, and apply discount promo codes.
- `/api/categories` — Browse and manage food categories.
- `/api/reviews` — Submit and view customer dish/restaurant ratings.
- `/api/favorites` — Save and retrieve favorite dishes and eateries.
- `/api/zones` — Manage geographic delivery zones and operational boundaries.
- `/api/stats` — Detailed analytics for admins and restaurant vendors.

---

## ⚡ Real-time WebSocket Events

The server utilizes **Socket.io** for instantaneous bidirectional updates:

```
[Customer] <======== Order Placed Event ========> [Server]
                                                      ||
[Restaurant] <==== Incoming Order Notification ======||
                                                      ||
[Rider] <======== New Delivery Request Dispatched ===||
                                                      ||
[Customer] <======= Live Tracking Coordinates ======= [Rider]
```

### Key Events:
- `join_room` — Join user, restaurant, or order-specific rooms.
- `new_order` — Broadcasted to restaurants upon successful order placement.
- `order_status_update` — Notifies customers & riders of stage transitions.
- `rider_location_update` — Pushes live coordinates to customer tracking maps.

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- **Node.js** (`>= 18.x`)
- **MongoDB Atlas** cluster or local MongoDB instance
- **npm** or **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/khalid66527/food_flow-server.git
   cd food_flow-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000

# MongoDB Database Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/food-delivery-platform?retryWrites=true&w=majority
DB_NAME=food-delivery-platform

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Stripe Online Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Image Hosting
NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_api_key

# Google Gemini AI (Image Generation & Processing)
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_API_KEYS=key1,key2,key3

# AgentRouter / DeepSeek AI (Chat Assistant & Recommendations)
AGENTROUTER_API_KEY=your_agentrouter_api_key
AGENTROUTER_BASE_URL=https://agentrouter.ai/v1
AGENTROUTER_MODEL=deepseek-v4-flash
```

### Running the Server

- **Development Mode (with auto-reload via `tsx`):**
  ```bash
  npm run dev
  ```
- **Production Build:**
  ```bash
  npm run build
  npm start
  ```

Once started, the API will be live at `http://localhost:5000` with the health check available at `http://localhost:5000/health`.

---

## 🧪 NPM Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts server with live reload via `tsx watch src/server.ts` |
| `npm run build` | Compiles TypeScript into JavaScript (`dist/`) |
| `npm run start` | Executes compiled production code (`dist/server.js`) |

---

## 🛡️ Security & Best Practices

- **Sanitized Inputs:** Strict schema validation on all incoming payload requests.
- **CORS Protection:** Configured cross-origin resource sharing for secure web clients.
- **Encrypted Payloads:** JWT token expiration and role checking middleware.
- **Rate Limit & Error Handlers:** Centralized error-handling middleware preventing internal leakages.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to open a Pull Request or report an Issue.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

<div align="center">
  <sub>Built with ❤️ by <b>Khalid</b> & the Food Flow Engineering Team</sub>
</div>
