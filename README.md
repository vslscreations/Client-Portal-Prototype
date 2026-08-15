# DasherLab Client Portal MVP

## Overview

DasherLab is a customer-facing logistics and dispatch workflow for a medical courier business. This repository contains a lightweight web application that lets customers log in, manage their requests, request pickups and quotes, contact support, and interact with Ada, the customer-facing virtual dispatch coordinator.

This project is intentionally a static HTML/CSS/JavaScript application backed by Supabase for authentication, database storage, and server-side Edge Functions. It is designed to be a practical MVP rather than a full framework-based application.

## What this application does

- Customer login and authenticated client portal access
- Pickup request workflow
- Quote request workflow
- Contact/dispatch request workflow
- Tracking/status pages and route flows
- Owner dashboard for business-level review
- Ada/Avery AI assistance for customer and operational support
- Email notifications via Supabase Edge Functions

## Who uses it

- Customers submitting pickup and quote requests
- DasherLab business users and employees reviewing activity
- Support and operations staff using the owner dashboard
- Ada, which handles customer-facing and business-context assistant interactions

## High-level architecture

Customer
  ↓
Customer Portal / HTML pages
  ↓
Client-side JavaScript (auth, forms, route logic)
  ↓
Supabase Auth + Postgres + RLS
  ↓
Edge Functions for notifications and AI tool execution
  ↓
Business/customer data and request records

## Major directories

- /Avery — AI assistant logic, prompts, workflows, memory, tools, route logic
- /js — browser-side application logic, auth, dashboard, pickup, quote, contact behavior
- /css — shared styles
- /pages — request workflow pages
- /supabase/migrations — database schema and RLS migrations
- /supabase/functions — server-side Edge Functions
- /tests — automated validation for AI tools and Avery behavior
- /docs — project architecture and developer documentation
- /assets and /images — static content, branding, icons, and UI images

## Local development

This app is served as static files. A simple local server is enough.

Example:

```bash
cd /Users/jamman/Downloads/dasherlab-client-app-main
python3 -m http.server 8000
```

Then open:

- http://localhost:8000/
- http://localhost:8000/client-login.html
- http://localhost:8000/index.html

## Important runtime files

- /js/client-auth.js — customer authentication and business association checks
- /js/pickup.js — pickup workflow and request submission
- /js/quote.js — quote workflow and estimate logic
- /js/contact.js — contact/dispatch request sending
- /js/client-dashboard.js — authenticated portal dashboard data loading
- /Avery/tools.js — Avery client-side tool definitions and local workflow helpers
- /supabase/functions/avery-chat/tools.js — server-side read-only AI tool layer
- /supabase/functions/avery-chat/index.ts — Ada chat Edge Function
- /supabase/functions/notify-request-email/index.ts — server-side email notifications

## Supabase roles in the project

Supabase is used for:

- customer authentication
- business-to-user associations
- row-level security and request isolation
- persistent request storage for pickups, quotes, and contact dispatches
- secure server-side Edge Function execution
- email notification delivery via Resend

## Avery/Ada role

Ada is the customer-facing virtual dispatch coordinator. The project keeps AI behavior separate from the deterministic request flows. Customers can ask for general support, request a quote, or ask about a specific pickup; the application uses the current authenticated business context and controlled read-only tools to answer approved operational questions.

## Deployment notes

This repository is not a framework project. Deployment is a static site deployment plus Supabase project configuration and migration apply steps. The application expects the public Supabase URL and anon key to be available in the browser, while private configuration remains server-side in the Supabase environment.

See /docs/DEPLOYMENT.md for details.

## Database and migrations

Database schema and policy updates live in:

- /supabase/migrations

These migrations define the request tables and row-level security settings. Do not edit migration history casually.

## Tests

Automated tests live in:

- /tests/avery-chat-readonly-tools.test.js
- /tests/avery-tools.test.js

Run with:

```bash
node tests/avery-chat-readonly-tools.test.js
node tests/avery-tools.test.js
```

## Important development warnings

- Do not change business logic casually.
- Do not change authentication or Supabase security rules without review.
- Do not modify the existing request workflows without understanding the database and RLS model.
- Do not expose service-role or private credentials in frontend files.
- Do not delete or move live production files without a clear plan and review.
- Avery and client workflows are intentionally separated; treat them as different layers.

## Context for AI Coding Assistants

This project is a static customer portal and dispatch MVP built for DasherLab. The app uses plain HTML, CSS, and JavaScript, with Supabase for auth, Postgres, and Edge Functions. The customer-facing experience is centered on pickup requests, quote requests, and contact/dispatch operations. Avery/Ada is a separate AI layer that provides support and read-only business lookup within the current authenticated business context.

Important boundaries:

- Customer-facing app logic lives in /js and /pages
- AI logic lives in /Avery and /supabase/functions/avery-chat
- Database schema and security live in /supabase/migrations
- Server-side logic and email notification infrastructure live in /supabase/functions
- Tests live in /tests
- Documentation lives in /docs

Security boundaries:

- Frontend may contain public config only
- Private credentials stay in Supabase server-side environment settings
- Business isolation is enforced with auth and RLS
- AI tools are intentionally read-only and scoped to the current business

Files that should not be changed casually:

- /js/client-auth.js
- /js/pickup.js
- /js/quote.js
- /js/contact.js
- /supabase/functions/avery-chat/tools.js
- /supabase/functions/avery-chat/index.ts
- /supabase/functions/notify-request-email/index.ts
- /supabase/migrations/*

Current known limitations:

- This is an MVP and intentionally lightweight
- The app uses plain browser scripts rather than a modern frontend framework
- Browser automation and live regression coverage can be environment-limited
- Documentation and organization are meant to preserve project knowledge for future maintainers and AI assistants

---

This repository is best understood as a small but business-critical operational portal: customer requests flow into a business-scoped data model, while Avery/Ada participates as a structured support layer instead of a separate product system.
