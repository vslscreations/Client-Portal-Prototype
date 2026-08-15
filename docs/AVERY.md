# Avery / Ada System Documentation

## Role

Avery is the AI employee layer for the DasherLab portal. The project positions Avery/Ada as a customer-facing virtual dispatch coordinator and an operational assistant within the current authenticated business context.

Avery is not the authoritative source of record for pickup or quote data. That remains in the request forms and database tables.

## System prompt and persona

The core persona is defined in the server-side Ada chat function and the read-only tool layer:

- /supabase/functions/avery-chat/index.ts
- /supabase/functions/avery-chat/tools.js

The system prompt frames Ada as a professional, friendly, confident dispatch coordinator for Dasher Lab. It is customer-facing and designed to give helpful, limited responses based on known business context, sample pricing, and specific lookup results.

## Tools

Avery uses a tool system with a clear separation between:

- general customer support and business information
- lookup of specific records tied to the authenticated business
- operational read-only queries for owner/employee context

Important tool definitions live in:

- /supabase/functions/avery-chat/tools.js

The server-side tool model includes:

- lookup_pickup
- lookup_quote
- get_business_info
- list_scheduled_pickups
- list_pickups_by_status
- list_pickups_by_driver
- get_next_pickup
- list_unscheduled_pickups

The important rules are:

- read-only only
- no write operations
- no browser-supplied business_id values
- business is resolved from the authenticated user session

## Read-only tools and business scoping

The AI layer deliberately limits itself:

- It cannot create or update records.
- It cannot use a business_id supplied by the user or browser.
- It should only operate within the currently authenticated business.

This architecture is important because the project treats AI as a bounded support tool, not a privileged admin layer.

## Customer tools

For customer-facing use, Ada is allowed to do general business information and lookup work relevant to the current authenticated customer account. It can answer questions about service areas, pricing samples, same-day requests, and specific pickup records that belong to the current business.

The customer-facing system prompt is designed to keep the assistant inside the business context and to avoid exposing internal dispatch details.

## Workflow routing

Avery also contains client-side workflow files that manage app navigation and route handling. Examples:

- /Avery/actions.js — action registry
- /Avery/router.js — route logic
- /Avery/workflowengine.js — workflow orchestration
- /Avery/workflows.js — workflow definitions

The AI layer is integrated with the app shell and customer portal but does not replace the actual request forms.

## Pickup-related capabilities

Pickup-related logic belongs to both the deterministic form workflow and the AI support layer:

- /pages/pickup.html
- /js/pickup.js
- /supabase/functions/avery-chat/tools.js

Important notes:

- Pickup requests are stored in the pickup_requests table.
- The AI tool lookup is restricted to business-scoped records.
- The assigned_driver field is a manually entered text field, not a user or driver table reference.
- Scheduling and status remain separate conceptually.

## Quote-related capabilities

Quote-related support is tied to the quotes table and quote workflow:

- /pages/quote.html
- /js/quote.js
- /supabase/migrations/20260810_add_quotes_reference.sql

The AI layer can look up a quote by reference within the authenticated business context, but it does not own the quote workflow itself.

## Tracking and help capabilities

The AI and page logic also support tracking and customer-help flows:

- /Avery/tracking.js
- /pages/tracking-status.html
- /js/script.js

These support general customer check-ins and request-status context.

## Edge Function architecture

The Edge Function architecture is intentionally split:

- /supabase/functions/avery-chat/index.ts — chat and tool orchestration
- /supabase/functions/avery-chat/tools.js — controlled capabilities and business scoping
- /supabase/functions/notify-request-email/index.ts — email notifications

This is a good separation of concerns because the AI layer remains focused on business-aware lookup and response generation, while the email function remains a server-only notification channel.

## Where the important files live

- /Avery — browser-side AI workflow logic and helper files
- /supabase/functions/avery-chat — server-side AI and business-scoped tool layer
- /supabase/functions/notify-request-email — server-side notification logic
- /tests/avery-tools.test.js — Avery helper validation
- /tests/avery-chat-readonly-tools.test.js — tool-scoping validation

## How to add a new Avery capability safely

A developer should follow these rules:

1. Decide whether it is a deterministic app workflow or an AI capability.
2. Keep the capability read-only unless there is an explicit product requirement and a full security review.
3. Add the tool definition in /supabase/functions/avery-chat/tools.js.
4. Keep the business_id server-side and never accept it from the browser.
5. Ensure the capability is listed in the allowed tool list for the correct context.
6. Update tests if the capability changes guardrail behavior.
7. Avoid mixing AI logic into the browser-only form workflow.

## AI behavior vs deterministic workflow

Deterministic workflow examples:

- pickup form validation
- quote form submission
- contact form submission
- dashboard load and row filters

AI behavior examples:

- answer generation
- business lookup
- read-only operational summaries
- route and support guidance

The pattern is clean: the application does the request work; Ada provides support within boundaries.
