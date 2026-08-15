# Investor Overview

## What the platform does

DasherLab is a customer portal and dispatch operations application for a medical courier business. It lets customers submit service requests, receive status information, and interact with a virtual dispatch coordinator. The product is designed to connect customer demand with business operations in a simple, manageable workflow.

## Customer experience

The customer experience is centered around a portal where users can:

- log in securely
- request a pickup
- request a quote
- contact support or dispatch
- check status information
- interact with a virtual assistant for common support tasks

The design is intentionally practical and easy to understand rather than a large enterprise platform.

## Avery's role

Avery, also represented as Ada, is the virtual dispatch coordinator. It helps customers with common support questions and can look up approved business information in a controlled, read-only way. Its purpose is not to replace the business workflow, but to support it with better customer guidance and faster information retrieval.

## Why the architecture matters

The system separates three distinct layers:

1. Customer-facing web experience
2. Business-scoped data and authentication model
3. AI support layer with strict access limits

This matters because business operations require a clear boundary between customer-facing workflows and internal operational data. The architecture keeps those concerns separate, which is important for reliability, trust, and future growth.

## How security works at a high level

The platform uses Supabase for identity and database access. The user logs in through Supabase Auth, and the application uses the authenticated user to determine the relevant business. That business association becomes the main boundary for what the user can access.

This makes the system easier to reason about and safer to extend. It does not rely on untrusted browser values for core authorization.

## How requests connect to business operations

When a customer submits a pickup, quote, or contact request, the data is stored in a business-scoped database record. That means the request is associated with the correct business and can be reviewed in the dashboard or by an employee using the same business context.

The app is designed to keep operational data tied to a real business account rather than a loose or global system state.

## Why the architecture can scale

The current design is modular enough to be reused across similar businesses or service workflows:

- authentication and user associations are reusable
- request tables are structured around business ownership
- AI tools are scoped and read-only
- notification functions are externalized to server-side infrastructure
- the customer-facing UI can remain lightweight and static

This means the system is not locked to one hardcoded workflow. It is built to support more business-specific operational patterns without turning the front end into a monolithic product layer.

## Reusable vs DasherLab-specific components

Reusable components:

- Supabase authentication pattern
- business-scoped request tables and row-level security pattern
- AI read-only tool architecture
- notification function pattern
- static HTML/CSS/JS portal approach

DasherLab-specific components:

- business branding and business context
- the specific pickup and quote workflow fields
- the medical courier and dispatch use case
- the DasherLab support and operations vocabulary

## Summary

The project is best understood as a focused operational platform: a customer portal plus business-aware request handling plus a support assistant that respects the same business boundaries. The architecture is intentionally simple, controlled, and extensible rather than a broad, highly abstracted product layer.

This is a practical business system architecture that supports early product development while preserving the ability to grow safely in the future.
