# Food Flow Server — Bug & Issue Report

**Reviewed:** 2026-09-17 · branch `sourav-nath`
**Scope:** entire `src/` tree, `api/index.js`, and build/deploy config
**Result:** `npx tsc --noEmit` passes cleanly — every issue below is a runtime, logic, security, or design defect, not a type error.

Severity key:
- 🔴 **Critical** — exploitable now, causes data loss, money loss, or full account takeover
- 🟠 **High** — real bug users will hit, or a serious security weakness
- 🟡 **Medium** — incorrect behaviour in edge cases, performance, or data integrity
- 🔵 **Low** — cleanup, dead code, maintainability

---

## 1. Authentication & Authorization

### 🔴 B-01 — There is no authentication anywhere in the backend
**Files:** every `*.route.ts`; `src/app/modules/cart/cart.auth.ts`, `src/app/modules/address/address.auth.ts`

`jsonwebtoken` is in `package.json` but is never imported. The only "auth" in the project is `cart.auth.ts` / `address.auth.ts`, which read `x-user-email` / `x-user-id` **request headers** and look the user up in Mongo. Headers are attacker-controlled: anyone who knows (or guesses) a victim's email can send `x-user-email: victim@example.com` and act as them.

```
curl -H "x-user-email: victim@example.com" https://<host>/api/cart/anything
```

Everything the middleware then does — `req.params.userId = req.authedUser.id` (`cart.auth.ts:98`), the customer-role check — is defeated by that one header. Fix: verify a signed JWT (or Better Auth session cookie) and derive identity from the verified token only.

### 🔴 B-02 — Every admin endpoint is completely unprotected
**Files:** `src/app/modules/admin/admin.route.ts:7-26`, `src/app/modules/settings/settings.route.ts:7`, `src/app/modules/coupon/coupon.route.ts:10-13`, `src/app/modules/category/category.route.ts:10-12`, `src/app/modules/contact/contact.route.ts:10-15`

No middleware guards any of these. An anonymous request can:

| Endpoint | Impact |
|---|---|
| `GET /api/admin/users` | Dump every user: name, email, phone, role, status |
| `PATCH /api/admin/users/:id/role` `{"role":"admin"}` | **Self-promote to admin** |
| `DELETE /api/admin/users/:id` | Delete any account |
| `PATCH /api/admin/restaurants/:id/status` | Approve or suspend any restaurant |
| `PUT /api/settings` | Set commission/VAT to 0, or to 10000% |
| `POST /api/coupons/admin` | Mint a 100%-off coupon |
| `GET /api/contacts` | Dump every support ticket (names, emails, phones) |

`PATCH /api/admin/users/:id/role` is full privilege escalation and is reachable with a single unauthenticated request.

### 🔴 B-03 — Any caller can edit, close, or hijack any restaurant
**File:** `src/app/modules/restaurant/restaurant.service.ts:162-225`, `restaurant.controller.ts:66-129`

`updateMyRestaurantProfile` and `toggleRestaurantStatus` identify the restaurant purely from a caller-supplied `?ownerEmail=` / `x-user-email` / `req.body.ownerEmail`. No check that the caller *is* that owner. Sending a competitor's owner email lets you rewrite their menu prices, description, delivery fee, or mark them closed.

### 🔴 B-04 — Omitting the owner email mutates *the most recently created restaurant*
**File:** `src/app/modules/restaurant/restaurant.service.ts:175-178` and `209-212`

```ts
if (!query) {
  const latest = await restaurantCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
  if (latest?.[0]) query = { _id: latest[0]._id };
}
```

A `PATCH /api/restaurants/my-profile` with **no** identifier at all silently updates whichever restaurant signed up last. `getMyRestaurantProfile` has the same fallback (`:151-154`) and leaks that restaurant's profile. This is a footgun even for legitimate clients: a frontend bug that drops the email header corrupts an unrelated tenant's data.

### 🔴 B-05 — Restaurants can self-approve and set their own rating
**File:** `src/app/modules/restaurant/restaurant.service.ts:54-122`

`restaurantDoc` starts with `...payload`, so every field in the request body lands in the document before the defaults are applied. `status`, `isFeatured`, and `rating` are all overridable:

```json
POST /api/restaurants  {"restaurantName":"X","status":"active","isFeatured":true,"rating":5}
```

`status: payload.status || 'pending'` (`:117`) explicitly honours a client-supplied status, so the admin approval gate in `addFoodItem` (`:368`) is bypassed at signup. `updateMyRestaurantProfile` correctly strips `status` (`:184`) — create does not.

### 🔴 B-06 — Creating a rider profile rewrites another user's role
**File:** `src/app/modules/rider/profile/rider.profile.service.ts:84-94`

```ts
await usersCollection.updateOne(
  { email: email.trim().toLowerCase() },
  { $set: { role: 'Delivery Partner', updatedAt: now } }
);
```

The email comes straight from the unauthenticated request body. `POST /api/rider/profile {"name":"x","email":"victim@example.com"}` flips the victim's account role to Delivery Partner, which locks them out of the cart and address APIs (both reject non-customers). The same call also accepts `status: "active"` (`:75`), skipping admin approval, plus `rating`, `totalEarnings`, and `totalDeliveries`.

### 🔴 B-07 — Rider PII is served to the public
**File:** `src/app/modules/rider/rider.route.ts:29` → `rider.profile.service.ts:195-198`

`GET /api/rider/all` returns `riderCollection.find({})` with no filter, no projection, and no auth — including `nidNumber` (national ID), `drivingLicenseNumber`, `phone`, home `address`, and `emergencyContact`. `GET /api/admin/riders` (B-02) exposes the same data and also lets you search by NID.

### 🟠 B-08 — Orders have no ownership checks (IDOR)
**File:** `src/app/modules/order/order.controller.ts:34-98`, `order.route.ts:6-9`

- `GET /api/orders/:id` — any order by id; order IDs are `FF-<6 digits>-<4 digits>` and enumerable.
- `GET /api/orders?userId=<x>` — read any user's full order history, addresses included.
- `PATCH /api/orders/:id` — **any anonymous caller can set an order to `Delivered`**, which flips `paymentStatus` to `Paid` (`order.service.ts:139-148`) and writes a payout record.

### 🟠 B-09 — Food items can be edited or deleted by anyone
**File:** `src/app/modules/restaurant/routes/add-food.ts:17-33` → `restaurant.service.ts:335-515`

`addFoodItem` verifies the restaurant exists and is active, but never that the caller owns it. `updateFoodItem`, `toggleFoodAvailability`, and `deleteFoodItem` look the item up by `_id` alone with no restaurant scoping at all — a single `DELETE /api/restaurants/food/:foodId` wipes a competitor's menu item, and `PATCH` can set their prices to 0.

### 🟠 B-10 — `x-user-id` lookups silently fail against ObjectId `_id`s
**File:** `cart.auth.ts:71`, `address.auth.ts:68`

```ts
await usersCollection.findOne({ _id: String(userId) as any })
```

If the `user` collection stores `_id` as an `ObjectId` (the Mongo default), a string `_id` never matches, so every id-only request 401s with "User not found". The code needs the same `ObjectId.isValid()` / `$or` handling used everywhere else in the project.

---

## 2. Money, Orders & Coupons

### 🔴 B-11 — The order total is taken from the client
**File:** `src/app/modules/order/order.service.ts:16-49`

`subtotal`, `deliveryFee`, `discount`, and `totalAmount` all come from `payload`. The server computes `calculatedTotal` and then throws it away:

```ts
const finalTotalAmount = payload.totalAmount ? Number(payload.totalAmount) : Math.max(0, calculatedTotal);
```

`{"subtotal":2000,"totalAmount":1}` is accepted and stored as a ৳1 order. The server must price the order from the cart lines and the food collection, and ignore client totals entirely.

### 🔴 B-12 — Coupon discounts are never validated at order time
**File:** `src/app/modules/order/order.service.ts:18-35`

`createOrder` only looks the coupon up to check `isFirstOrderOnly`. It never verifies that the coupon exists, is active, is unexpired, meets `minOrderValue`, or that `discount` matches `discountValue`/`maxDiscountAmount`. A client can send `{"couponCode":"ANYTHING","discount":9999}` — and since the discount is subtracted from the platform's commission (`adminNetProfit`, `:41`), the platform absorbs the entire fabricated amount as a negative balance. `CouponService.applyCoupon` does all the right checks, but it is an advisory endpoint the client can simply skip.

### 🟠 B-13 — `applyCoupon` first-order check is opt-in
**File:** `src/app/modules/coupon/coupon.service.ts:95`

```ts
if (coupon.isFirstOrderOnly && userId) {
```

`userId` comes from the request body. Omit it and the welcome-coupon restriction is skipped entirely.

### 🟠 B-14 — Coupon `usageCount` is never incremented
**Files:** `coupon.service.ts:26` (initialised to 0), `order.service.ts`

`usageCount` is written once at creation and never updated, and there is no `maxUsage` / per-user usage cap anywhere. Every coupon is effectively unlimited-use.

### 🟠 B-15 — `PATCH /api/orders/:id` is an unfiltered mass-assignment sink
**File:** `src/app/modules/order/order.service.ts:129-151`

```ts
const updateDoc: any = { ...updates, updatedAt: new Date().toISOString() };
await ordersCollection.updateOne({ $or: queryConditions }, { $set: updateDoc });
```

The whole request body is written to the order. A client can rewrite `subtotal`, `totalAmount`, `restaurantPayout`, `adminNetProfit`, `paymentStatus`, or `userId`. Sending `_id` makes Mongo throw *"would modify the immutable field '_id'"*, surfacing as a 500. Whitelist the fields that are actually allowed to change.

### 🟠 B-16 — Delivery OTP verification is skipped when no OTP exists
**File:** `src/app/modules/order/order.service.ts:122-127`

```ts
if (updates.orderStatus === 'Delivered' && order.deliveryOtp) { ...verify... }
```

The OTP is only generated when an order passes through `Out for Delivery` (`:134`). Jumping straight from `Placed` to `Delivered` leaves `order.deliveryOtp` undefined, so the guard is skipped and the order is marked Paid + Delivered with no verification. There is also no expiry check on `deliveryOtpCreatedAt`, and the OTP is generated with `Math.random()` rather than `crypto.randomInt`.

### 🟠 B-17 — Only one cart line is cleared after checkout
**File:** `src/app/modules/order/order.service.ts:82-85`

```ts
await cartCollection.deleteOne({ userId });
```

The cart stores **one document per line item** (`cart.service.ts:82`, and `clearCart` correctly uses `deleteMany` at `:148`). `deleteOne` removes a single arbitrary item, so after checkout the customer still sees the rest of their cart and can re-order it. Should be `deleteMany({ userId })`.

### 🟡 B-18 — Non-COD orders never clear the cart and never reach a payment provider
**File:** `src/app/modules/order/order.service.ts:82`

The cart clear is gated on `paymentMethod === 'COD'`. `stripe@17` is a dependency and `order.service.ts:95` queries a `stripeSessionId` field, but no Stripe code exists anywhere in `src/`. Any non-COD order is created with `paymentStatus: 'Pending'` and no payment is ever collected.

### 🟡 B-19 — Order IDs can collide
**File:** `src/app/modules/order/order.service.ts:6-8`

`FF-<last 6 digits of ms>-<4 random digits>` with no uniqueness index or retry. Two orders in the same millisecond collide with probability 1/9000, and `getOrderById` (`:100`) would then return the wrong one. The same pattern in `contact.service.ts:10` is worse — `FF-<4 digits>` gives only 9000 possible ticket IDs, so collisions are near-certain and `getContactMessageById` will return another customer's ticket.

### 🟡 B-20 — Financial fields accept `NaN`
**Files:** `settings.service.ts:38-52`, `coupon.service.ts:20-22`

`Math.max(0, Number(payload.vatPercentage))` returns `NaN` for a non-numeric input, and `NaN` is persisted. Every subsequent order then computes `vatAmount = NaN`. Also: `vatPercentage` and `restaurantCommissionPercentage` have no upper bound (only `riderCommissionPercentage` is clamped to 100, `:48`), and `discountValue` for a `percentage` coupon is never capped at 100.

### 🟡 B-21 — Rounding is applied per-line, so totals can drift
**File:** `src/app/modules/order/order.service.ts:38-48`

`vatAmount`, `adminGrossCommission`, `restaurantPayout`, and `riderPayout` are each rounded to 2dp independently, then summed. `subtotal - adminGrossCommission` (restaurant payout) plus the commission will not always reconcile to `subtotal`. Money should be stored in integer minor units (poisha), not floats.

### 🟡 B-22 — Cart trusts client-supplied prices
**File:** `src/app/modules/cart/cart.service.ts:29-57`

`addToCart` writes `price` and `discountPrice` from the request body without ever reading the food document. `Number.isNaN(Number(payload.price))` passes for `null` (→ 0) and for negatives. Combined with B-11 this is a second independent price-manipulation path. Look the food item up by `foodId` and copy the authoritative price.

---

## 3. Injection & Input Validation

### 🟠 B-23 — Unescaped user input compiled into regular expressions (NoSQL injection / ReDoS)
**Files:**
- `admin.service.ts:75, 81, 86, 435, 439, 543, 547` — `role`, `status`, `search` query params
- `restaurant.service.ts:31-32, 138-139, 169-170, 203-204` — `ownerEmail`
- `restaurant.utils.ts:74, 90` — public `search` / `category`
- `food.utils.ts:84` — public food `search`
- `category.service.ts:89, 139` — category name
- `contact.service.ts:51, 55` — `category`, `search`

Two distinct problems:

1. **Over-matching.** `new RegExp('^' + ownerEmail + '$', 'i')` with `ownerEmail=".*"` matches *every* restaurant. Because `updateMyRestaurantProfile` uses `findOneAndUpdate`, that writes to an arbitrary restaurant. Even benign input breaks: a real address like `a+b@x.com` has `+` and `.` as metacharacters and will match the wrong rows.
2. **ReDoS.** `?search=(a+)+$` on the public `GET /api/restaurants` endpoint hands a catastrophically-backtracking pattern to the database.

`buildLocationRegex` (`restaurant.utils.ts:44`) and `buildCategoryMatchRegex` (`food.utils.ts:12`) *do* escape correctly — apply that same escaping everywhere, and prefer exact/`$eq` matches for emails.

### 🟠 B-24 — `sortBy` and `limit` are unvalidated
**Files:** `admin.service.ts:119-126`, `contact.service.ts:66-71`, `restaurant.service.ts:239-240`, `food.service.ts:56-57`

`sortBy` is interpolated straight into the sort object (`{ [sortBy]: dir }`), letting a caller sort on any field including unindexed ones. `limit` has a `Math.max(1, ...)` floor but **no ceiling** — `GET /api/food?limit=1000000` will try to materialise the whole collection. Clamp to e.g. 100 and allowlist sort keys.

### 🟡 B-25 — Contact form has no validation and no rate limit
**File:** `src/app/modules/contact/contact.service.ts:8-28`

`name`, `email`, `subject`, and `message` all default to `''`. `POST /api/contacts` with an empty body succeeds and creates a ticket. No email-format check, no length caps, no captcha, no rate limiting — the endpoint is a spam sink. `updateContactStatus` also accepts any string rather than validating against `TContactStatus`.

### 🟡 B-26 — `createCategory` throws a TypeError on a missing name
**File:** `src/app/modules/category/category.service.ts:82`

`payload.name.trim()` runs before any existence check, so `POST /api/categories {}` returns `400 "Cannot read properties of undefined (reading 'trim')"` instead of a useful message. Check `payload.name` first.

### 🟡 B-27 — `admin.updateUser` is a mass-assignment sink
**File:** `src/app/modules/admin/admin.service.ts:373-384`

Only `_id` and `id` are stripped; every other body field is `$set` onto the user document, including `email`, `emailVerified`, and any auth-provider fields Better Auth keeps on that collection.

---

## 4. Correctness Bugs

### 🟠 B-28 — `category.updateCategory` always takes the fallback path
**File:** `src/app/modules/category/category.service.ts:160`

```ts
if (!result || !result.value) { /* re-fetch */ }
```

The installed driver is **mongodb 6.21**, where `findOneAndUpdate` returns the document directly unless `includeResultMetadata: true` is passed. `result.value` is therefore always `undefined`, so the "retry" branch runs on every single call, issuing a redundant `findOne`. The rest of the codebase (`restaurant.service.ts:187`, `contact.service.ts:139`, `order` etc.) correctly treats the result as the document — this one file is inconsistent. Drop the `.value` branch.

### 🟠 B-29 — Every admin write is executed twice
**File:** `src/app/modules/admin/admin.service.ts:297-308, 340-351, 387-390, 414-417`

```ts
const fallbackUsers = db.collection('users');
if (fallbackUsers !== collection) { await fallbackUsers.updateOne(...) }
```

`db.collection()` returns a **new object on every call**, so `fallbackUsers !== collection` is always `true` — even when `collection` *is* `db.collection('users')`. The guard never fires, so every role change, status change, profile update, and delete runs twice against the same collection, and `deleteUser` issues a second delete against the other collection name too. Compare `collection.collectionName` instead.

### 🟠 B-30 — `cors({ origin: '*', credentials: true })` is an invalid combination
**File:** `src/app.ts:12-17`

Browsers reject a credentialed cross-origin request when `Access-Control-Allow-Origin` is `*`. Any fetch with `credentials: 'include'` fails in the browser. Additionally `*` means any website can call this API on a visitor's behalf. Set an explicit allowlist of frontend origins.

### 🟠 B-31 — `normalizeRestaurantDoc` invents a new random slug on every response
**File:** `src/app/modules/restaurant/restaurant.utils.ts:307` → `generateSlug` (`:7-16`)

`generateSlug` appends `Math.random().toString(36).substring(2,6)`. When a restaurant document has no stored `slug`, the normaliser generates a **different** slug on every request. The frontend builds links from it, so those links 404, and the value is never persisted. Either persist a slug at creation or return `''`.

### 🟡 B-32 — `DEFAULT_SETTINGS` is mutated by `insertOne`
**File:** `src/app/modules/settings/settings.service.ts:4-19`

`insertOne(DEFAULT_SETTINGS as any)` mutates the module-level constant by adding `_id` to it. If the settings document is later deleted and `getPlatformSettings` runs again in the same process, the insert retries with the already-used `_id` and fails with a duplicate-key error. Also `updatedAt` is frozen at module load. Pass `{ ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() }`.

### 🟡 B-33 — Cart line lookup by `_id` can never match
**File:** `src/app/modules/cart/cart.service.ts:91-97`

```ts
$or: [{ foodId: foodIdTrim }, { _id: foodIdTrim }]
```

`_id` is an `ObjectId`; comparing it to a string never matches. The documented behaviour — "update/remove work regardless of which id the client sends" — silently doesn't work for cart-line ids, and the caller gets "Cart item not found." Wrap with `ObjectId.isValid()` / `new ObjectId()`.

### 🟡 B-34 — `freeDelivery` flag computed with a strict compare against a possibly-string value
**File:** `src/app/modules/restaurant/restaurant.service.ts:97`

`freeDelivery: payload.deliveryFee === 0` is `false` when the JSON body sends `"0"` (a common form-submission shape), while the very next lines coerce with `Number(...)` everywhere else. Use `Number(payload.deliveryFee) === 0`.

### 🟡 B-35 — Address id coercion is too permissive
**File:** `src/app/modules/address/address.service.ts:9-25`

`toObjectId` falls back to returning the raw string on failure, so `userAddressQuery` can build `{ userId, _id: "<string>" }`, which matches nothing and reports "Address not found." More subtly, any 12-character string is a *valid* ObjectId input to the constructor, so `/api/addresses/aaaaaaaaaaaa` is coerced rather than rejected. Validate with `ObjectId.isValid()` and 400 on failure.

### 🟡 B-36 — Customer count is derived by subtraction
**File:** `src/app/modules/admin/admin.service.ts:191`

`customers = totalUsers - (restaurants + riders + admins)` lumps every unrecognised or malformed role into "customers". Count the customer pattern directly like the other three.

### 🟡 B-37 — `getRestaurantCoordinates` matches area keys as bare substrings
**File:** `src/app/utils/location.utils.ts:70-74`

`combinedStr.includes(key)` with keys like `gec` matches any address containing that letter sequence. Object iteration order also decides which key wins. Match on word boundaries against normalised address fields instead.

### 🔵 B-38 — Fabricated fallback values presented as real data
**Files:** `location.utils.ts:89` (`return 2.5` km), `:114` (`|| 1.8` km), `restaurant.service.ts:108` (`rating: ... || 4.5`), `rider.profile.service.ts:77` (`rating: 5.0`)

Missing coordinates yield a hardcoded "2.5 km away", and new restaurants/riders are seeded with a 4.5 / 5.0 star rating before anyone has reviewed them. Return `null` and let the UI say "distance unavailable" / "no ratings yet".

---

## 5. Deployment & Runtime

### 🟠 B-39 — `process.exit(1)` inside the serverless request path
**Files:** `src/app/config/db.ts:5-8` and `:34-37`, `api/index.js:10-14`

`connectDB()` calls `process.exit(1)` on a connection failure. On Vercel that kills the function mid-request, so the `catch` in `api/index.js` never runs and the client gets a hard 500 with no body. The module-level `process.exit(1)` when `MONGODB_URI` is missing crashes at import time. In a serverless handler, throw and return a 503 instead; reserve `process.exit` for `server.ts`.

### 🟠 B-40 — `isConnected` is only set on success but never reset
**File:** `api/index.js:4-16`

If `connectDB()` throws (assuming B-39 is fixed), `isConnected` stays `false` and every subsequent invocation on that warm instance retries the connection on the request path. Conversely there is no health re-check if the pool later drops. Cache the connection *promise* rather than a boolean.

### 🟠 B-41 — `dns.setServers()` is called globally at import time
**File:** `src/app.ts:1-3`

```js
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
```

This overrides DNS resolution for the **entire process**, not just MongoDB, and runs unconditionally despite the comment saying "Optional: uncomment if you face network/DNS issues". In a serverless/VPC environment this can break resolution of internal hostnames, and it forces all lookups through a third party. Remove it, or gate it behind an env flag. It is also the only CommonJS `require` in an otherwise ESM-style TypeScript file, placed above the imports.

### 🟡 B-42 — The Vercel build contract is implicit and fragile
**Files:** `vercel.json`, `api/index.js:1-2`, `.gitignore`

`api/index.js` does `require('../dist/app')`, but `dist/` is gitignored and `vercel.json` declares no `buildCommand`. The deploy only works if Vercel happens to run `npm run build` (`tsc`) before bundling the function, and if its file tracer follows the require into `dist/`. Make it explicit — add `"buildCommand": "npm run build"` (or migrate to `vercel.ts`), and verify the deployed function actually resolves `dist/app.js`.

### 🟡 B-43 — No security middleware and no rate limiting
**File:** `src/app.ts`

No `helmet`, no `express-rate-limit`, no request-size sanity beyond the `50mb` JSON limit (`:18`) — which is itself very large for an API that accepts no file uploads and makes the service trivially easy to exhaust. The AI, contact, and auth-adjacent endpoints all need rate limits.

### 🟡 B-44 — The global error handler is effectively dead code
**File:** `src/app.ts:47-55`

Every controller wraps its body in `try/catch` and responds directly, so `next(err)` is never called. The handler only ever sees body-parser failures, which it reports as `500` when malformed JSON should be a `400`. It also echoes `err.message` to the client, which can leak driver internals.

### 🟡 B-45 — No database indexes are ever created
**Files:** `src/app/config/db.ts`, all services

`grep -c createIndex src/` → 0. Every lookup by `userId`, `email`, `ownerEmail`, `slug`, `orderId`, `restaurantId`, and `code` is a collection scan, and there is no unique index enforcing `coupons.code`, `restaurant.slug`, `orders.orderId`, or `rider.email` — so the application-level duplicate checks (`coupon.service.ts:12`, `rider.profile.service.ts:40`) are racy. Add an index bootstrap on startup.

### 🟡 B-46 — `$lookup` on `$toString: "$_id"` cannot use an index
**File:** `src/app/modules/food/food.service.ts:67-98`

The join converts every restaurant `_id` to a string inside `$expr`, forcing a full scan of the `restaurant` collection for each food batch. The `$sort` before `$facet` (`:193`) also runs over the whole matched set with no `allowDiskUse`, so it will hit the 100 MB in-memory sort limit as the catalogue grows. Store `restaurantId` consistently (always ObjectId, or always string) and join on the raw field.

### 🟡 B-47 — Explore-by-distance loads the entire matching set into memory
**File:** `src/app/modules/restaurant/restaurant.service.ts:246`

```ts
const rawItems = await restaurantCollection.find(mongoQuery).toArray();
```

When coordinates are supplied, every matching restaurant is fetched, mapped, and sorted in Node before pagination is applied in JS (`:264`). Use a `2dsphere` index and `$geoNear` instead.

### 🟡 B-48 — `seedInitialCategories` runs on every category request
**File:** `src/app/modules/category/category.service.ts:34-57`

`getAllCategories` calls the seeder first, so every `GET /api/categories` pays an extra `countDocuments`. Two concurrent cold requests on an empty collection both see `count === 0` and both `insertMany`, producing duplicate categories (there is no unique index — see B-45). Move seeding to a one-time startup/migration step.

---

## 6. AI Module

### 🟠 B-49 — The Gemini endpoint is unauthenticated and uncapped
**File:** `src/app/modules/ai/ai.controller.ts:49-108`, `ai.route.ts:6`

`POST /api/ai/chat` is public. `chatHistory` is passed through `map(normalizeContent)` with no length or size limit (`:69-74`), so a single request can carry an arbitrarily large context. Anyone can burn the project's Gemini quota. Needs auth, a per-user rate limit, and a cap on history length and message size.

### 🟡 B-50 — `chatHistory` roles come from the client
**File:** `src/app/modules/ai/ai.controller.ts:44-47`

`normalizeContent` maps anything that isn't `'assistant'` to `'user'`, and the client supplies the entire history. A caller can forge prior "model" turns to steer the assistant past its system instruction. Persist conversations server-side and reconstruct history from storage.

### 🟡 B-51 — Hardcoded model name with a narrow fallback
**File:** `src/app/modules/ai/ai.controller.ts:87-95`

`gemini-3.6-flash` is the primary model and the fallback to `gemini-1.5-flash` only triggers on a 404 (matched partly by string-sniffing `err.message.includes('404')`). A 400 for an unknown model, or any other error shape, propagates as a 500. Put the model id in config and broaden the fallback condition.

### 🔵 B-52 — The AI module bypasses the config layer
**File:** `src/app/modules/ai/ai.controller.ts:5-9`

Reads `process.env.GEMINI_API_KEY` directly at module scope even though `config.gemini_api_key` exists (`config/index.ts:12`) and is never used. This works today only because some other import chain happens to call `dotenv.config()` first — reorder the imports in `routes/index.ts` and the key silently becomes `''`.

---

## 7. Dead Code & Housekeeping

### 🔵 B-53 — Three unused dependencies
**File:** `package.json`

`stripe@^17.7.0`, `jsonwebtoken@^9.0.2` (+ `@types/jsonwebtoken`), and `mongoose@^8.10.1` are installed but never imported anywhere in `src/`. The project uses the raw `mongodb` driver. Either wire up payments and JWT auth (B-01, B-18) or remove the packages — shipping an unused `mongoose` inflates the serverless bundle.

### 🔵 B-54 — `ai.service.ts` is an empty stub
**File:** `src/app/modules/ai/ai.service.ts`

Exports `{}` and imports two types it doesn't use. All logic lives in the controller, breaking the controller/service split every other module follows.

### 🔵 B-55 — `buildLocationRegex` is duplicated verbatim
**Files:** `src/app/modules/restaurant/restaurant.utils.ts:18-46` and `src/app/modules/food/food.service.ts:13-41`

Two identical 28-line copies. Move it to `src/app/utils/`.

### 🔵 B-56 — The contact router is mounted twice
**File:** `src/app/routes/index.ts:52-59`

`/contacts` and `/contact` both point at `ContactRoutes`. Combined with `app.use('/api', router)` **and** `app.use('/api/v1', router)` (`app.ts:40-41`), every contact endpoint has four public URLs. Pick one and redirect the rest.

### 🔵 B-57 — `.env.example` was deleted
`git log` shows `.env.example` was added and later removed; only the gitignored `.env` remains. New contributors have no way to know which variables are required (`PORT`, `MONGODB_URI`, `DB_NAME`, `GEMINI_API_KEY`, `NEXT_PUBLIC_IMGBB_API_KEY`). Restore it with placeholder values.

### 🔵 B-58 — US defaults on a Bangladesh-focused platform
**Files:** `restaurant.service.ts:72-79`, `restaurant.utils.ts:323-328`

Restaurants with no address default to `city: 'Manhattan', state: 'NY', country: 'USA'`, while `location.utils.ts` is entirely Bangladeshi coordinates and prices are rendered in `৳` (`coupon.service.ts:90`). These defaults will land in real documents and break the location filters.

### 🔵 B-59 — `server.ts` re-exports a non-existent consumer
**File:** `src/server.ts:3-5`

```ts
import { connectDB, client, db, restaurantCollection } from "./app/config/db";
export { client, db, restaurantCollection };
```

Declared "for backward compatibility" but nothing imports from `server.ts`. It's dead surface that keeps the DB client reachable from the process entry point.

### 🔵 B-60 — `npm test` is a stub
**File:** `package.json:14`

`"test": "echo \"Error: no test specified\" && exit 1"`. There is no test suite, no linter, and no CI for a codebase handling payments and PII.

---

## Suggested Fix Order

1. **Stop the bleeding (B-01, B-02).** Add JWT/session verification plus `requireRole('admin')` middleware, and apply it to the admin, settings, coupon, category, and contact routers. Nothing else matters until identity is trustworthy.
2. **Lock down ownership (B-03, B-04, B-05, B-06, B-08, B-09).** Derive `ownerEmail` / `userId` from the verified token only; delete the "fall back to the latest restaurant" branches; scope every food and order mutation by owner.
3. **Fix the money path (B-11, B-12, B-15, B-16, B-17).** Price orders server-side from the cart and food collections, validate coupons at order time, whitelist order updates, and switch to `deleteMany` for the cart.
4. **Close the PII leaks (B-07, plus the contact/user dumps in B-02).** Add projections and auth to `GET /api/rider/all` and the contact listing endpoints.
5. **Harden inputs (B-23, B-24, B-25).** Escape every regex, clamp `limit`, allowlist `sortBy`, and add a validation layer (Zod is already the project's stated choice) plus `helmet` and `express-rate-limit`.
6. **Correctness pass (B-28, B-29, B-30, B-31, B-33).** These are small, isolated, and each one is a live bug today.
7. **Infrastructure (B-39 – B-48).** Indexes, the serverless connection lifecycle, the explicit Vercel build command, and the DNS override.
