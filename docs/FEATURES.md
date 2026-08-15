# Existing Features

This document describes the features that are actually present in the repository. It does not describe aspirational future features.

## 1. Client login

Purpose:

- Authenticate a customer and ensure the user is associated with a valid business.

Primary files:

- /client-login.html
- /js/client-auth.js
- /Avery/supabase.js
- /js/supabase-config.js

Backend dependencies:

- Supabase Auth
- users table
- businesses table
- RLS policies

Security considerations:

- The browser should not store sensitive credentials
- Business association must be resolved from the authenticated user
- Protected routes should enforce authenticated session and business_id presence

## 2. Customer portal

Purpose:

- Provide a portal homepage and navigation for authenticated customers.

Primary files:

- /index.html
- /client-portal.html
- /js/navigation.js
- /js/client-dashboard.js

Backend dependencies:

- Supabase user session
- business-scoped queries

Security considerations:

- Portal content should only be visible after authenticated session validation
- Dashboard and activity queries must remain business-scoped

## 3. Avery / Ada assistant

Purpose:

- Assist customers and employees with business-related questions and read-only lookups.

Primary files:

- /Avery/actions.js
- /Avery/engine.js
- /Avery/router.js
- /Avery/conversation.js
- /Avery/memory.js
- /Avery/workflows.js
- /Avery/tools.js
- /Avery/prompts.js
- /supabase/functions/avery-chat/index.ts
- /supabase/functions/avery-chat/tools.js

Backend dependencies:

- OpenAI model environment variable on server side
- Supabase Auth and business-scoped user context
- read-only database access via tool layer

Security considerations:

- AI tools are limited to read-only operations
- The business_id is resolved server-side rather than supplied by the browser
- The AI layer is not allowed to write or change request workflows directly

## 4. Pickup requests

Purpose:

- Allow customers to submit a pickup request with full route details and scheduling information.

Primary files:

- /pages/pickup.html
- /js/pickup.js
- /supabase/migrations/20260812_add_pickup_table_and_rls.sql
- /supabase/migrations/20260811_add_pickup_schedule_fields.sql
- /supabase/migrations/20260812_add_pickup_customer_fields.sql

Backend dependencies:

- pickup_requests table
- users and businesses linkage
- RLS enforcement

Security considerations:

- Ensure the current authenticated business and user are used for inserts
- Pickup status workflow remains separate from scheduling
- Manually typed assigned_driver is treated as a text field, not a user reference

## 5. Quote requests

Purpose:

- Assist customers with route-based estimate generation and quote request submission.

Primary files:

- /pages/quote.html
- /js/quote.js
- /supabase/migrations/20260810_add_quotes_reference.sql

Backend dependencies:

- quotes table
- business association and user metadata
- quote estimate logic

Security considerations:

- Quote records must remain tied to the authenticated business
- Reference values are a non-sensitive quote identifier, not a security boundary

## 6. Contact / dispatch request

Purpose:

- Allow customers to submit support or dispatch questions to the business.

Primary files:

- /pages/contact.html
- /js/contact.js
- /supabase/migrations/20260810_add_contact_requests.sql

Backend dependencies:

- contact_requests table
- customer email contact
- notification Edge Function

Security considerations:

- Insert is restricted to the same business and current user
- Email notifications are server-side and authenticated

## 7. Tracking

Purpose:

- Provide status and tracking context for requests.

Primary files:

- /pages/tracking-status.html
- /js/script.js
- /Avery/tracking.js

Backend dependencies:

- pickup_requests and quote data
- business-scoped reads

Security considerations:

- Tracking pages should only display data available to the current authenticated business/user context

## 8. Dashboard

Purpose:

- Provide owner or business-level operational visibility into recent pickups, quote requests, and customer contact activity.

Primary files:

- /dashboard.html
- /client-portal.html
- /js/client-dashboard.js
- /js/script.js

Backend dependencies:

- queries against pickup_requests, quotes, and customers tables
- business_id filtering

Security considerations:

- Dashboard activity must remain within the same authenticated business
- Business-level views should not reflect unrelated customer records

## 9. Navigation

Purpose:

- Provide portal navigation between home, pickup, quote, contact, and dashboard views.

Primary files:

- /js/navigation.js
- /index.html
- /client-portal.html
- /pages/*.html

Security considerations:

- Navigation should not bypass authentication or route protection

## 10. Notifications

Purpose:

- Send email notices after request submission.

Primary files:

- /js/supabase-config.js
- /supabase/functions/notify-request-email/index.ts

Backend dependencies:

- Supabase function invocation
- Resend API
- valid authenticated Supabase session

Security considerations:

- Email triggers must not be callable anonymously
- Browser should not hold private API credentials
- Email content should be generated server-side

## Feature summary

The live app is centered on a narrow but operationally meaningful set of features:

- customer login
- portal home
- pickup scheduling
- quote requests
- dispatch/contact requests
- tracking and status support
- business dashboard visibility
- AI assistant support through Ada
- server-side email notifications

The repository is not a general SaaS platform yet; it is a focused MVP business workflow application for a logistics dispatch operation.
