# AgriMart - Product Requirements Document

## Original Problem Statement
> Build me complete e commerce platform website for agriculture industry where I sell : seeds, sprayers, machinery, tools etc. And I want to what are requirements do you need like Website domain, Payment, And the customer can login through phone number or mail id

## User Personas
- **Farmer / Customer** – browses categories, adds to cart, checks out with COD/online payment, tracks orders.
- **Admin (store owner)** – manages product catalog, fulfils orders, monitors revenue.

## Architecture
- **Backend**: FastAPI (Python) + Motor async MongoDB. JWT Bearer auth, bcrypt password hashing. All routes prefixed `/api`.
- **Frontend**: React 19 + Tailwind + Shadcn primitives + @phosphor-icons/react. Outfit (display) + Manrope (body) fonts. Light "Organic & Earthy" theme (forest green + ochre).
- **State**: AuthContext (token in localStorage), CartContext (server-synced via /api/cart).

## Implemented (Feb 2026 — MVP v1)
- Email/password JWT auth, register/login/me, admin role + auto-seed on startup
- 17 sample products across 5 categories (seeds, sprayers, machinery, tools, fertilizers)
- Product catalog with category filter, search query, price sort
- Product detail page with quantity selector
- Server-side cart (per-user) with add/update/remove/clear
- Checkout with delivery address + payment method (COD / Online demo)
- Order placement, order confirmation, order history
- Admin panel: dashboard stats, products CRUD, orders list with status updates
- Bento-grid home with hero, category showcase, featured products, value-prop section
- Sticky glass header with search, cart badge, mobile menu
- Toast notifications via Sonner

## Implemented (Feb 2026 — v1.1)
- **Rebrand AgriMart → Seed & Spray** across header, footer, login, HTML title, admin seed email (`admin@seedandspray.in`)
- **Razorpay payment integration (TEST keys live)** — backend creates Razorpay order with `/api/orders/{id}/payment/create-razorpay`, frontend opens Razorpay JS checkout, success path verifies HMAC SHA256 signature server-side and flips order to `payment_status=paid`. Razorpay JS SDK loaded from CDN in `index.html`. Test card `4111 1111 1111 1111` works.

## Implemented (Feb 2026 — v2.0 "Rythu Shubham")
- **Final brand: Rythu Shubham** (రైతుల కోసం ఉత్తమ పరిష్కారాలు = "best solutions for farmers"). Logo from user attachment integrated into header + footer.
- **Phone OTP login (Twilio)** — `/api/auth/otp/send` + `/api/auth/otp/verify`. Auto-creates customer on first verify. Falls back to console-mode logging when `TWILIO_FROM_NUMBER` not set so dev/UAT works.
- **Shiprocket integration** — token cached for 9 days, `/api/admin/orders/{id}/ship` creates adhoc order + auto-assigns AWB; `/api/orders/{id}/tracking` for customer tracking. Pickup location: `Primary` (Mahabubabad).
- **Site config endpoint** `/api/site-config` returning brand, logo, business details (Sri Laxmi Ganesh Seeds and Sprayers, GSTIN 36AKAPC6623R1ZX, Mahabubabad address) — frontend Footer is now dynamic.
- **Admin Orders** — "Ship via Shiprocket" button per order; once shipped shows AWB + courier link to Shiprocket tracking.
- **Login screen** — Email/Password tab + Phone OTP tab.

## Mocked / Pending
- **Online payment** is demo-only — orders are auto-marked paid. Real Stripe/Razorpay integration deferred.
- **Phone OTP login** not implemented (would need Twilio).
- **Domain & deployment**: TBD by user.

## Backlog (Prioritised)
- **P0**
  - Real payment gateway (Stripe Checkout or Razorpay) and webhook order-confirmation
  - Phone OTP login (Twilio SMS)
- **P1**
  - Product image upload via object storage (currently URL-only)
  - Order status emails (Resend / SendGrid)
  - Customer reviews & ratings
  - Wishlist
- **P2**
  - Coupon / promo codes
  - Inventory alerts
  - Bulk import CSV for products
  - Multilingual (Hindi)
  - Analytics dashboard charts

## Test Credentials
See `/app/memory/test_credentials.md`
