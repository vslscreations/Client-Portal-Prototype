# Developer Guide

## Local development

This project is a static web application served from the repository root.

Start a local server:

```bash
cd /Users/jamman/Downloads/dasherlab-client-app-main
python3 -m http.server 8000
```

Then open the app in a browser:

- http://localhost:8000/
- http://localhost:8000/client-login.html
- http://localhost:8000/index.html

## How the local server works

The app does not use a build system or JS framework. Files are served directly from disk. HTML pages reference JavaScript and CSS in the flat app layout and within /pages.

The important point is that relative paths and script includes are fragile if files are moved. Keep structure stable unless you have a clear migration plan.

## Important application files

- /index.html — home page and Ada shell
- /client-portal.html — dashboard shell for authenticated client portal
- /pages/pickup.html — pickup workflow
- /pages/quote.html — quote workflow
- /pages/contact.html — contact request page
- /js/client-auth.js — auth and session checks
- /js/pickup.js — pickup submission logic
- /js/quote.js — quote request logic
- /js/contact.js — contact request logic
- /js/client-dashboard.js — dashboard data loading
- /Avery/actions.js — Avery action registry
- /Avery/tools.js — local Avery capabilities
- /supabase/functions/avery-chat/tools.js — read-only AI tool layer
- /supabase/functions/avery-chat/index.ts — Ada server-side chat logic
- /supabase/migrations — database schema and policies

## How authentication works

Authentication is done with Supabase Auth. The browser calls Supabase sign-in APIs. After successful login, the app reads the authenticated user and finds the matching row in the users table. That record includes business_id, which binds the user to a business.

This is the main business isolation mechanism. Any logic that looks up or writes business-scoped data should use this business association.

## How customer workflows work

Each workflow is a plain browser form plus a JavaScript controller.

### Pickup

- UI in /pages/pickup.html
- validation and inserts in /js/pickup.js
- database table: pickup_requests
- business association: business_id + created_by_user_id

### Quote

- UI in /pages/quote.html
- logic in /js/quote.js
- database table: quotes

### Contact/dispatch

- UI in /pages/contact.html
- logic in /js/contact.js
- database table: contact_requests

## How to modify the UI safely

- Keep relative paths stable.
- Prefer editing existing files rather than creating duplicate pages.
- Do not change the login and auth flow unless you understand the Supabase business association model.
- Any form changes should be checked against the data insert payload in the JavaScript file that submits it.
- Keep server-side security in sync with any UI changes that change request fields.

## How to modify Supabase safely

- Do not edit migrations after they are applied unless there is a documented rollback plan.
- Add new schema changes as new migration files.
- Review RLS policies before changing business scoping.
- Keep public browser config restricted to public values only.
- Keep private secret configuration in the Supabase environment, not in HTML or JavaScript.

## How migrations are handled

Migration files live in /supabase/migrations. They define schema and policy changes. They should be treated as the system of record for database structure and RLS.

Before making a schema change:

- validate the business need
- inspect existing policy logic
- confirm how the app reads and writes the data
- create a new migration rather than editing existing ones

## How Avery tools are structured

There are two layers:

- client-side Avery helper layer in /Avery
- server-side read-only tool layer in /supabase/functions/avery-chat

The server-side layer is the more important security boundary. It defines allowed tables, allowed filters, and required business scoping. It must remain read-only and restricted to the authenticated business.

## How tests are run

Run the existing Node-based validations:

```bash
node tests/avery-chat-readonly-tools.test.js
node tests/avery-tools.test.js
```

These tests validate the AI tool definitions and read-only business scoping rules. They are not a substitute for browser QA, but they are useful guardrails.

## What not to modify casually

Active caution list:

- /js/client-auth.js
- /js/pickup.js
- /js/quote.js
- /js/contact.js
- /Avery/actions.js
- /Avery/tools.js
- /supabase/functions/avery-chat/tools.js
- /supabase/functions/avery-chat/index.ts
- /supabase/functions/notify-request-email/index.ts
- /supabase/migrations/*

These are the core business, authentication, AI, or database layers. Small changes here can create security or workflow regressions.

## Before changing code checklist

Before any change, check:

- Is this a runtime behavior change or just documentation cleanup?
- Does the change affect auth, customer identity, business scoping, or request workflow?
- Does the change require a migration?
- Are there relevant tests?
- Does the change touch AI tool boundaries or allowed tables?
- Will the change expose private keys, credentials, or sensitive config to the browser?
- Does the change require RLS review?
- Does the change affect customer workflows or existing dashboard logic?
- Is the change limited to the actual root cause, not a broad refactor?

## Safe change strategy

1. Understand the current file and schema path.
2. Validate the relevant behavior with a focused test or check.
3. Make the smallest possible change.
4. Confirm that no auth or business-isolation rules were weakened.
5. Document the result in /docs if the change affects architecture or developer understanding.

This repository rewards small, well-scoped modifications over broad rewrites.
