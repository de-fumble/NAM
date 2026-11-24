# Naija Auto Market

Nigeria's premium marketplace for everything cars: buy, sell, parts, services, rentals, finance and verification. The design takes its cues from Apple's product pages.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

Without Supabase configured, or before the migration is applied, the app runs in **local demo mode**: all data lives in the browser. Once the backend is set up it syncs automatically.

## Backend setup (Supabase)

1. **Environment.** Copy `.env.example` to `.env.local` and fill in the Supabase URL, publishable key, secret key and a random `SESSION_SECRET`. `.env.local` is git-ignored. The secret key is only ever read on the server.
2. **Schema.** Open the Supabase SQL Editor and run `supabase/migrations/20261121120000_marketplace_schema.sql`. It is idempotent, so it is safe to run again. The admin console's setup screen also has a **Copy SQL** button and a link straight to the editor. Databases created before email sign-in also need `supabase/migrations/20261123090000_email_auth.sql`; the admin console shows a banner with that SQL until it's applied.
3. **Admin account.** `npm run admin:create -- you@example.com [password]`. If you leave out the password, one is generated and printed. You can run it again for an existing user to promote them.
4. **Demo data.** Sign in at `/admin` and click **Load data**, or run `npm run db:seed`. Seeding never overwrites existing rows.
5. Restart `npm run dev`.

| Script | What it does |
| --- | --- |
| `npm run admin:create -- <email> [password]` | Create or promote a Supabase Auth user with `app_metadata.role = "admin"` |
| `npm run db:seed` | Insert the catalogue, demo businesses and demo activity (skips rows that already exist) |

## Admin console (`/admin`)

Sign in with a Supabase Auth admin account. Sessions last 12 hours, and logins are throttled per IP. The console gives control over the whole marketplace:

| Section | Controls |
| --- | --- |
| Overview | GMV, commission, signups and sales charts, engines that are paused or offline, users by role, items needing attention, recent activity |
| Users | Search and filter by role and status; suspend or reinstate (a suspended user is signed out and can't write) |
| Businesses | Verify or unverify (verification requests are flagged), suspend or reinstate (hides their listings, fleet and products everywhere) |
| Cars / Parts / Fleet | Edit prices, feature cars, remove or restore listings, hide products, pull vehicles |
| Orders | Per-seller fulfilment overrides and refunds |
| Bookings / Leads | Override booking status; view the lead pipeline |
| Messages | Read threads, hide abusive messages, delete threads |
| Requests | Close or reopen part requests, view quotes, delete |
| Engines | Switch, schedule and configure every feature: maintenance mode, the announcement, sign-ups, demo accounts, listings, messaging, offers, inspections, the parts shop, part requests, rentals, services, finance and VIN checks |
| Settings | **Data pipeline** (stock or live), platform fee %, sign-up and email-verification switches (with Supabase checks), manage admin accounts |
| Audit log | Every admin action (with before/after values and the reason given) and key user events |

### Data pipeline: stock or live

Admin → Settings → **Data pipeline** switches the whole system between two sources:

- **Stock.** The built-in sample catalogue (demo dealers, cars, parts, rental fleet, pros, testimonials and demo activity) plus anything real users create. Demo accounts work. Use it for demos and testing.
- **Live.** Only real data. Sample records are hidden on the marketplace, in dashboards and in the admin console's lists and stats. Demo accounts are signed out and refused, and sample listings can't be ordered, booked or messaged. Home-page sections with nothing real to show are hidden, or show an invitation to list.

Switching never deletes anything, and every switch is recorded in the audit log. "Stock" means records with `source = 'catalog'`, businesses from `lib/data/businesses.ts`, and the demo phone numbers. The rules are defined once in `lib/stock.ts` and shared by the client and the server.

### Engines

Admin → **Engines** is the control room. Every switchable part of the marketplace is an *engine*, defined once in `lib/engines.ts` and shared by the browser and the server. Each engine has:

- **A switch.** Pausing a feature stops new activity. Work already under way can still finish: sellers ship orders already placed, rental companies run trips already booked, and listings stay up.
- **A schedule.** A start and end time, and daily hours in Lagos time (they can wrap past midnight, for example 22:00–06:00). Outside them the engine behaves as switched off. Maintenance and the announcement work the other way round: they're active only inside their schedule.
- **A message.** What people see while it's paused. If you leave it empty, a default is used; for a schedule, it says when the feature opens.
- **Rules.** Each engine's own settings, for example:
  - **Parts shop:** delivery fees, the free-delivery threshold, VAT and the most of one item per order.
  - **Rentals:** chauffeur fee, self-drive deposit, longest booking, free-cancellation cut-off, blocking double bookings, and automatic confirmation.
  - **Inspections:** prices.
  - **Offers:** lowest offer as a share of the asking price.
  - **Car listings:** require a VIN, number of photos, and active listings per private seller.
  - **Messaging:** longest message.
  - **Part requests:** open requests per shopper.
  - **VIN check:** whether guests can use it, and checks per minute.
  - **Sign-ups:** email verification and whether business accounts are allowed.

**Enforcement.** The server enforces every engine:

- `/api/sync` returns status `423` while an engine is paused.
- `/api/auth` and `/api/session` refuse sign-up, sign-in and demo accounts as configured.
- `/api/vin` returns `PAUSED`.
- Maintenance mode returns `503` for every write and for sign-in, and the public site shows a maintenance screen. The admin console keeps working.

**Prices.** Prices and limits come from the same `lib/engines.ts` functions (`partsTotals`, `rentalQuote` and `inspectionPrice`) in both the browser and the server, so what a shopper sees is what the server charges.

**Storage and history.** Engines are stored as one row (`engines`) in the existing `settings` table, so no migration is needed. The sign-up, email-verification and announcement settings saved before engines existed are carried over automatically. Every change is recorded in the audit log as `engine.update`, with before and after values and the reason given.

**Rentals.** No car can be reserved for dates it's already held for (pending, confirmed or on trip), so double bookings are blocked. Search hides those cars too: the snapshot includes each car's booked date ranges, without any renter details.

## VIN checks (auto.dev)

VINs are decoded by [auto.dev](https://auto.dev). Set `AUTODEV_API_KEY` in `.env.local`; it's only read on the server.

- **`/verify`** decodes any VIN: year, make, model, trim, body, engine, drive, transmission, fuel, origin and check digit. `/verify?vin=…` runs the check straight away.
- **Sell wizard.** "Autofill from VIN" fills make, model, year, body, fuel and transmission. A listing's trim and engine come from the VIN when it matches.
- **Listings.** When a listing is saved, the server decodes its VIN again and sets `vinMatch` only if the make and year agree. The client's value is ignored. Matched listings show a **VIN matched** badge, and the admin car list shows each VIN.
- **Route.** `GET /api/vin/:vin` returns `{ ok, report }` or `{ ok: false, code, message }` with code `INVALID`, `NOT_FOUND`, `RATE_LIMITED` or `UNAVAILABLE`.
  - The route returns only vehicle fields. auto.dev's response also includes the account holder's name, email and IP, which never leave the server.
  - Results are cached for 7 days per VIN.
  - Each visitor gets 12 uncached lookups a minute.
  - The cache and the limit are kept in memory, per server instance.

The Free plan covers decoding only. Recalls, full specs and plate lookups need auto.dev's Growth or Scale plan. The check doesn't cover accident, customs or theft history, and the page says so.

## Architecture

- **Database.** Supabase Postgres. RLS is **enabled with no policies** on every table, so the public publishable key can't read or write anything. All access goes through Next.js route handlers that use the secret key (`lib/server/*`, guarded by `server-only`).
- **`/api/auth`.** Email + password accounts through Supabase Auth: sign up, sign in, resend confirmation, forgot and reset password, and the email-link landing. Supabase proves identity, then the server sets its own signed, httpOnly session cookie and discards the Supabase tokens. Suspended accounts and closed sign-ups are enforced here.
- **`/api/session`.** Demo accounts only, and only on stock data. It can't sign anyone in as a real account.
- **`/api/sync`.** `GET` returns a snapshot scoped to the session: public catalogue plus the caller's own leads, orders, threads and so on. `POST` runs one operation, and every operation checks ownership on the server. Order and booking totals are re-priced on the server, stock is decremented atomically, and photos are uploaded to the `listing-photos` storage bucket.
- **Client.** `lib/db.ts` stays the UI's store. Writes apply optimistically and are pushed through `lib/sync.ts`. A pull runs on focus and every 20 seconds, so admin actions reach users within seconds.
- **`/api/admin`.** Whitelisted entity operations (list, update, delete, plus domain actions). Every operation requires the admin cookie and writes to `audit_log`.

## What's inside

| Route | What it does |
| --- | --- |
| `/` | A dark hero with a search box that switches between Buy, Rent, Parts and Pros. Also: a rail of body types, featured cars, a bento grid of features, top pros, parts deals, dealers and testimonials. |
| `/cars` | Browse cars. Filters live in the URL: make, body, condition (new / tokunbo / Nigerian used), price, year, state, fuel, verified, inspected. Has sort, grid/list views, skeleton loading, a filter sheet on mobile and search that updates as you type. |
| `/cars/[id]` | Car detail page. Includes a gallery with swipe and a lightbox, a sticky purchase panel, chat with the seller (with simulated replies), WhatsApp and call, make an offer, book an inspection, the inspection report, a financing estimate, save/compare/share and similar cars. |
| `/sell` | A 5-step listing wizard: vehicle, details, photos (drag & drop), smart price estimate with boost plans, then review and publish. |
| `/parts` | An Amazon-style parts store with a "shop for my car" fitment filter, categories, quick view, a quantity stepper and delivery estimates. |
| `/cart` | Bag with a progress bar toward free delivery, then checkout: address, payment method (card / transfer / USSD / pay on delivery), then confirmation. |
| `/services` | An Upwork-style marketplace for pros: mechanics, inspectors, electricians, clearing agents and more. "Post a job" shows quotes arriving live. |
| `/services/[id]` | Pro profile with Basic, Standard and Premium packages, portfolio, reviews and a booking flow. |
| `/rentals` | Self-drive or chauffeured rentals, with city and date pickers and a price breakdown on the reservation. |
| `/finance` | Loan calculator with lender comparison and pre-qualification, insurance quotes, and an import duty / landed-cost estimator. |
| `/verify` | VIN or plate check with animated progress through each check, then a report. |
| `/compare`, `/saved` | Compare up to 3 cars side by side with the best values highlighted. Saved cars and recently viewed. |
| `/dashboard/*` | One dashboard per role (see below). |
| `/business` | "Sell on Naija Auto" landing page with dealer, rental and parts tracks and pricing. |
| `/store/[id]` | Public storefront for any dealer, rental company or parts seller, with their live inventory, fleet or products. |

## Accounts and dashboards

There are four account types. You pick one when you create an account with your email.

### Sign-up and sign-in

- **Accounts are email + password** (Supabase Auth). Sign-up asks for name, email, a Nigerian mobile number and a password. Business accounts also give a business name and location. The phone number is the contact number buyers and sellers see; you sign in with the email.
- **Pages.** `/signin`, `/signup`, `/auth/callback` (the confirmation link lands here) and `/auth/reset` (choose a new password). The same form also opens as a sheet anywhere on the site.
- **Email verification** is an admin switch: Admin → Settings → **Sign-up and sign-in** → *Require email verification* (the same switch as Engines → Sign-ups).
  - **On:** new accounts must click the link in the confirmation email before they can sign in. This needs **Confirm email** turned on in Supabase → Authentication → Sign In / Providers → Email. The admin panel warns you if it's off.
  - **Off:** accounts are confirmed straight away. Anyone who signed up while it was on and never clicked the link can sign in too.
- **Guests can only browse.** Saving, adding to the bag, checkout, chat, calls and WhatsApp, offers, inspections, rentals, hiring pros, finance and insurance applications, VIN checks and selling all ask you to sign in first. The server refuses writes and VIN lookups without a session as well.
- **Before launch:**
  - Add a custom SMTP provider in Supabase → Authentication → Emails. The built-in sender only reaches your Supabase team members, a few emails an hour.
  - Add your domain's `/auth/*` to Authentication → URL Configuration → Redirect URLs.
  - Set `NEXT_PUBLIC_SITE_URL` so email links point to your domain.
- **Old phone sign-ins** were never verified, so their cookies are ignored. The first email account created with the same phone number takes over that profile and its business.

| Role | Dashboard sections |
| --- | --- |
| **Customer** | Overview (order tracking, next trip, offers and enquiries, cars you're selling), Orders, Bookings (rentals and inspections), Messages, Part requests (post a request, compare quotes, accept), Saved, Account |
| **Car dealer** | Overview (views chart, latest leads, top listings), Inventory (inline price edit, pause, mark sold), Leads (kanban from New to Sold), Messages, Payouts, Storefront settings and verification |
| **Rental company** | Overview (utilisation, revenue, approvals), Bookings (14-day fleet calendar; approve, start trip, complete), Fleet (daily rates, maintenance toggle, add vehicle with photo), Messages, Payouts, Storefront |
| **Parts dealer** | Overview (sales, orders to fulfil, low-stock restock), Orders (pack → ship → deliver, per seller), Products (price, stock, listed toggle, add product), Part requests (send quotes), Messages, Payouts, Storefront |

The two sides are connected through `lib/db.ts`:
- A chat, offer or inspection booking on a car becomes a lead and a message thread for that dealer.
- Checkout creates an order that is split across each parts seller.
- A rental reservation creates a pending booking for the rental company.
- A part request is shown to every parts seller, who can quote on it.
- The sell wizard publishes a real listing, with compressed photos, under the dealer or private seller.
- Price, stock and status changes made in a dashboard show up immediately on the storefront.

**Demo accounts.** The sign-in sheet has one-tap demo accounts for each role, with seeded activity. To see both sides of the flow in one browser, act as a customer and then switch to the business. "Reset demo data" is under Account / Storefront.

Across the whole site: a ⌘K / `/` command palette, an email sign-in sheet, toasts, a floating compare tray, an iOS-style tab bar on mobile, page transitions, and reveal-on-scroll. It also respects `prefers-reduced-motion`.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion · Zustand (cart, saved, compare and user are saved to localStorage) · lucide-react icons.

## Notes

- **Still simulated:** payments, and customs and insurance reports. Phone numbers are collected at sign-up but not verified by SMS.
- Sign-in, sign-up and email throttles are in memory, per server instance.
- The admin login throttle is in memory, so it resets when the server restarts. Use a shared store (for example Redis) once you run more than one instance.
- Lender and insurer names are fictional placeholders. Duty, loan and insurance figures are illustrative estimates.
- Photos come from Unsplash (`images.unsplash.com`), resized on the fly.
- Design tokens live in `app/globals.css` (`@theme`). The shared UI primitives are in `components/ui.tsx`.
# NAM
