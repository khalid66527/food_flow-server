# Project Scope — Food Delivery Platform

**Type:** Multi-vendor food delivery platform
**Roles:** Customer • Restaurant • Delivery Rider • Admin

---

## 1. Objective

Build a premium, multi-vendor food delivery platform consisting of a public
marketing/ordering website and four role-based dashboards (Customer,
Restaurant, Delivery Rider, Admin), sharing a single design system and
backend.

---

## 2. Design Direction

- Premium food-tech + modern SaaS dashboard aesthetic
- Clean layouts, high-quality food photography, rounded cards, soft shadows, subtle gradients
- Glassmorphism reserved for floating/overlay elements only
- Full Dark/Light mode support
- Smooth micro-interactions and scroll animations (lightweight on mobile)
- Fully responsive; Rider dashboard is mobile-first

**Design tokens**

| Token | Value |
|---|---|
| Primary | #FF6B35 |
| Secondary | #FFB703 |
| Dark | #111827 |
| Background | #FFFDF8 |
| Success | #22C55E |
| Error | #EF4444 |
| Muted | #6B7280 |
| Heading Font | Plus Jakarta Sans / Poppins |
| Body Font | Inter |
| Card Radius | 18–24px |
| Button Radius | 10–14px |
| Dashboard Widget Radius | 16–20px |

---

## 3. Tech Stack

| Area | Recommended |
|---|---|
| Frontend | React / Next.js + TypeScript |
| UI | Tailwind CSS + shadcn/ui or DaisyUI |
| Animation | Motion / Framer Motion |
| Icons | Lucide React |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack Query |
| Backend | Node.js + Express.js |
| Database | MongoDB |
| Realtime | Socket.io |
| Auth | JWT / Firebase Authentication |
| Storage | Cloudinary |
| Payments | Stripe / SSLCommerz |
| Maps | Google Maps API |

---

## 4. In-Scope Deliverables

### 4.1 Public Website (9 pages)
Home, Restaurant List, Restaurant Details, Food Details, Cart, Checkout,
Order Success, Live Order Tracking, Offers.

### 4.2 Customer Dashboard (8 pages)
Overview, My Orders, Favorites, Addresses, Payment Methods, Reviews,
Profile, Settings.
Mobile nav: Home • Search • Orders • Cart • Profile.

### 4.3 Restaurant Dashboard (12 pages)
Overview, Orders, Menu, Add Food, Categories, Inventory, Offers, Customers,
Reviews, Analytics, Profile, Settings.

### 4.4 Rider Dashboard — Mobile First (8 pages)
Home, Delivery Details, Active Delivery, Rider Map, Earnings, History,
Profile, Settings.
Mobile nav: Home • Deliveries • Map • Earnings • Profile.

### 4.5 Admin Dashboard (14 pages)
Overview, Users, Restaurants, Riders, Orders, Foods, Categories, Payments,
Promotions, Reviews, Reports, Analytics, Settings.

### 4.6 Authentication (4 pages)
Login, Register (role selection: Customer / Restaurant Partner / Delivery
Partner — Admin registration is not public), Forgot Password, Reset
Password. Role-based routing after auth; route protection by
role/permission.

**Total page inventory: ~39 unique screens** (some reused/shared as
components across roles).

---

## 5. Global Functional Features

- Authentication & role-based authorization
- Restaurant onboarding and verification
- Food/menu CRUD
- Search, filter, sort, pagination
- Cart and checkout
- Coupon/discount system
- Payment and transaction management
- Order lifecycle management
- Real-time order status (Socket.io)
- Rider assignment and delivery tracking
- Map/navigation integration
- Reviews and ratings
- Notifications
- Image upload and optimization
- Analytics and reporting
- Dark/Light mode
- Responsive design across all breakpoints

---

## 6. Core User Flows

- **Customer:** Home → Restaurant → Food → Cart → Checkout → Payment → Order Confirmed → Restaurant Accepts → Rider Assigned → Pickup → Live Tracking → Delivered → Review
- **Restaurant:** Login → Dashboard → New Order → Accept → Preparing → Ready → Rider Pickup → Completed
- **Rider:** Online → Available Order → Accept → Navigate to Restaurant → Pickup → Navigate to Customer → Deliver → Earnings Updated
- **Admin:** Login → Overview → Monitor Users/Restaurants/Riders/Orders/Payments → Analytics → Promotions/Reviews → Settings

---

## 7. Dashboard Role Permission Matrix

| Feature | Customer | Restaurant | Rider | Admin |
|---|---|---|---|---|
| Browse Food | ✓ | ✓ | — | ✓ |
| Place Order | ✓ | — | — | — |
| Manage Menu | — | ✓ | — | ✓ |
| Accept Order | — | ✓ | — | ✓ |
| Deliver Order | — | — | ✓ | ✓ |
| Track Order | ✓ | ✓ | ✓ | ✓ |
| Manage Users | — | — | — | ✓ |
| Payments | ✓ | ✓ | — | ✓ |
| Analytics | Personal | Restaurant | Earnings | Platform |
| Reviews | Write/View | Reply | View | Moderate |

---

## 8. Non-Functional / Quality Requirements

- Every page needs loading, empty, error, and success states
- Consistent spacing, typography, button hierarchy, status colors
- Accessible labels, keyboard navigation, sufficient contrast
- Animation used sparingly — prioritize speed and clarity
- Client-side validation with clear error messages on all forms
- Destructive actions require confirmation
- Realtime states update without manual refresh where applicable
- Images optimized and lazy-loaded
- Dashboard tables degrade to mobile-friendly card/list views
- Shared, reusable components across all roles (no duplicated UI)

---

## 9. Out of Scope (assumed unless stated otherwise)

- Native mobile apps (web is responsive/mobile-first, not native iOS/Android)
- Multi-language / i18n support
- Third-party marketplace integrations beyond payments & maps
- Advanced fraud detection / ML-based recommendations
- Multi-currency support

*(Adjust this section based on actual client/stakeholder confirmation.)*

---

## 10. High-Level Project Structure

**Frontend:** `app/` routes split into `(public)`, `auth`, `customer`,
`restaurant`, `rider`, `admin`, plus shared `components/`, `features/`,
`hooks/`, `lib/`, `services/`, `store/`, `types/`, `validations/`.

**Backend:** `server/src/` with `models` (User, Restaurant, Food, Category,
Order, Delivery, Payment, Review, Coupon, Notification), `controllers`,
`routes`, `services`, `middleware`, `validators`, `sockets`, `utils`.

---

## 11. Suggested Milestones

1. **Foundation** — design system, shared components, auth, role-based routing
2. **Public Website** — discovery, ordering, cart, checkout, tracking
3. **Customer Dashboard**
4. **Restaurant Dashboard** — menu, orders, inventory, offers, analytics
5. **Rider Dashboard** — mobile-first delivery flow
6. **Admin Dashboard** — platform management, moderation, analytics
7. **Realtime & Payments integration** (Socket.io, Stripe/SSLCommerz)
8. **QA, accessibility pass, performance optimization**
9. **Launch**

---

*Source: Food_Delivery_Platform_UI_UX_Requirements.docx*
