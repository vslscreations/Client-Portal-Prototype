# Security Architecture

## Overview

The project uses a straightforward security model: public browser configuration is kept minimal, while identity, authorization, and sensitive server-side actions are enforced by Supabase and Edge Functions.

## CLIENT-SAFE

These values are acceptable in browser code because they are public or non-sensitive:

- Supabase project URL
- Supabase anon/public key
- non-sensitive business configuration visible to users
- static UI content
- route paths
- page markup and CSS

Examples:

- /js/supabase-config.js
- /Avery/supabase.js

## SERVER-ONLY

These values or behaviors are not meant for client-side code:

- Supabase service-role credentials
- OpenAI API keys
- Resend API keys
- backend email secrets
- private configuration variables
- any write-capable/admin-only functions exposed to the browser
- any logic that trusts browser-supplied business_id values

These must remain in the Supabase server environment and Edge Function configuration.

## Supabase authentication

The browser signs users in through Supabase Auth. The project relies on the authenticated session to determine whether a user can access the customer portal and business-scoped resources.

Key file:

- /js/client-auth.js

Authentication is not treated as decorative. It is the entry point to business association and protected routes.

## Client sessions

The frontend uses Supabase session state and stores a lightweight client context in sessionStorage. The local context is used to track business and user identity after sign-in, but it is not the sole security source.

The authoritative business relation is the database record in the users table.

## Protected routes

Protected pages and portal features should not be accessible without a valid session. The client auth logic checks the session and redirects users to the login page if the session is missing or invalid.

Important file:

- /js/client-auth.js

## Users table and business_id association

The core identity model is:

- Supabase Auth user
- users table row with the same user id
- users.business_id pointing to the correct business

This is important for all business-scoped read/write operations.

## RLS

Row-level security is enforced in the migration files. The application uses business-scoped checks so a user can only access records that belong to the same business.

Examples:

- /supabase/migrations/20260812_add_pickup_table_and_rls.sql
- /supabase/migrations/20260810_add_contact_requests.sql

## Pickup request policies

The pickup_requests table is protected by policies that ensure:

- reads are scoped to the current business
- inserts must be associated with the authenticated user and same business

This prevents cross-business pickup access.

## Quote security

The quotes table is also business-scoped. Quote request records are linked to business_id and should be retrieved and inserted within the same business context.

Important file:

- /supabase/migrations/20260810_add_quotes_reference.sql

## Contact request security

The contact_requests table has the same pattern:

- business_id enforced
- created_by_user_id verified against auth.uid()
- same-business insert policy

Important file:

- /supabase/migrations/20260810_add_contact_requests.sql

## Edge Function authorization

Edge Functions are not a free-for-all. The notification function verifies the Authorization header and checks the authenticated Supabase user before sending email.

Important file:

- /supabase/functions/notify-request-email/index.ts

This prevents anonymous or mismatched access from performing notification actions.

## Notification authorization

When the browser calls the notification function, it does not pass a service role or private key. Instead, the function itself uses the authenticated session to resolve the current user and then enforces checks before sending any message.

## AI tool security

The Avery/Ada tool layer is intentionally limited to read-only operations. Business ID is never accepted from the browser or from tool arguments. Instead, the server resolves it from the authenticated user.

Important file:

- /supabase/functions/avery-chat/tools.js

## Important security rule

The project explicitly avoids the dangerous pattern of accepting business_id from the browser and trusting it. Business scope must be derived server-side from the authenticated user session. This is a core architecture rule.

## Security summary

The project is not trying to be a heavy enterprise security system, but it does have the correct basic pattern for a web MVP:

- browser holds public data only
- Supabase Auth identifies the user
- database enforces business scoping via RLS
- server-side functions validate auth before privileged actions
- AI tools remain read-only and business-scoped

This is the right architecture for a small but business-critical operational app.
