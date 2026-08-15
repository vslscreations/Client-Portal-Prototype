# Architecture Overview

## Plain-English view

DasherLab is a customer portal for a medical courier business. The customer-facing app lets people log in, submit pickup and quote requests, and ask Ada for basic support. Those requests are stored in Supabase Postgres tables. The project uses Supabase Auth to identify the logged-in user, then matches that user to a business record and restricts access by row-level security.

The AI layer, Avery/Ada, is a separate support assistant. It is not the source of truth for requests. The authoritative request collection remains in the web forms and the database.

## High-level flow

```text
Customer
  ↓
Customer Portal (HTML + JavaScript)
  ↓
Client-side auth + route checks + form workflows
  ↓
Supabase Auth / Postgres / RLS
  ↓
Business and customer records
  ↓
Edge Functions (AI, email notifications)
```

## Frontend

The frontend is a static HTML/CSS/JavaScript application. The main customer workflow files are:

- /index.html and /client-portal.html — portal/home dashboard shell
- /pages/pickup.html — pickup request form
- /pages/quote.html — quote request form
- /pages/contact.html — contact/dispatch request form
- /pages/tracking-status.html — tracking/status page
- /js/client-auth.js — login and session checks
- /js/pickup.js — pickup validation and submission logic
- /js/quote.js — quote validation and estimate logic
- /js/contact.js — dispatch request logic
- /js/navigation.js — navigation helpers
- /css/style.css — shared styling

## Authentication

Authentication happens through Supabase Auth. The browser loads the Supabase JS client and signs in using email/password. After log in, the app looks up the authenticated user in the users table and reads the associated business_id. The app then uses that business_id to scope dashboard data and ensure the user is tied to the correct business.

Key logic:

- /js/client-auth.js
- /Avery/supabase.js
- /js/supabase-config.js

## Customer/business association

The key relationship is:

- user -> business_id
- business_id -> business records and request records

This prevents an authenticated user from accessing records outside their own business. The browser never needs to hand in a raw business_id when making a request; the server-side logic resolves it from the authenticated session or user context.

## Database

The app stores structured request data in Postgres tables managed by Supabase:

- pickup_requests
- quotes
- contact_requests
- users
- businesses
- customers

The migrations in /supabase/migrations define the schema and security updates. The request tables hold the operational records that the portal and AI layer read.

## RLS (row-level security)

RLS is the main security boundary. Policies are defined in the migrations and gate access so users can only read and insert records for their own business. This is especially important for pickup and quote data because they are business-specific operational records.

The key principles are:

- the authenticated user is resolved from Supabase Auth
- business_id is derived from that user's record
- policies compare the current auth.uid() to the business association
- reads and inserts are restricted to the same business

## Edge Functions

The project contains server-side Edge Functions in /supabase/functions.

- /supabase/functions/avery-chat/index.ts — handles Ada/Avery chat and business-scoped lookup logic
- /supabase/functions/avery-chat/tools.js — controlled read-only tool definitions
- /supabase/functions/notify-request-email/index.ts — sends request emails via Resend

These functions are important because they keep privileged behavior off the browser and allow the app to enforce additional checks such as authentication and authorization before contacting email or database services.

## Notifications

The notification flow is:

- customer request saved in the app
- browser triggers a notification call to the Supabase function
- the Edge Function verifies the authenticated user/session
- the function sends owner and customer email messages using Resend

This keeps secret configuration and email logic in the server-side environment instead of the browser.

## Avery / Ada

Avery is the AI layer used by the application. There are two important distinctions:

1. Deterministic app workflow — pickup form, quote form, contact form, dashboard logic
2. AI assistant workflow — Ada answer generation, business lookup, tool use, route guidance

The AI layer is designed to be a support system, not the primary source of truth for pickup and quote data. It can answer customer questions and read records in the authenticated business context, but it does not own the request workflow.

## Request workflows

### Pickup request workflow

- Customer goes through the pickup wizard in /pages/pickup.html
- Form data is validated in /js/pickup.js
- The browser loads the current authenticated business context
- The request is inserted into pickup_requests with a business_id and the current user context
- The request enters the normal business workflow using status fields and tracking numbers

### Quote request workflow

- Customer fills out quote form fields in /pages/quote.html
- Quote logic is maintained in /js/quote.js
- Quote requests are stored in the quotes table with business association and user metadata

### Contact/dispatch workflow

- Customer fills in a contact form in /pages/contact.html
- Logic in /js/contact.js validates and stores the request in contact_requests
- Notifications are sent through the server-side email function

## Security model summary

The architecture intentionally keeps the following separated:

- browser-safe public config
- server-side private configuration
- framework-free frontend behavior
- business-scoped database access via Supabase
- AI tools limited to read-only behavior

## Architectural principle

The application is built on a simple rule: the browser collects and submits user intent, while the server-side and database layers enforce identity, security, and business ownership.
