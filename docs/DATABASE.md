# Database Overview

This document describes the database structure based only on the actual application code and migrations in the repository. It does not speculate beyond what the project contains.

## Migration timeline

- 20260810_add_contact_requests.sql — adds contact request storage and same-business RLS
- 20260810_add_quotes_reference.sql — adds quote reference column and uniqueness protection
- 20260811_add_pickup_schedule_fields.sql — adds scheduling and driver fields to pickup requests
- 20260812_add_pickup_customer_fields.sql — adds contact and logistics fields used by the pickup workflow
- 20260812_add_pickup_table_and_rls.sql — creates pickup_requests table and enforces same-business insert/select policy
- 20260812_fix_pickup_schedule_driver_text.sql — ensures driver field stays text-based rather than a user reference

## Table: businesses

Purpose:

- Represents the business account associated with a customer user.

Important columns:

- id
- name
- contact_name
- phone
- email
- address
- city
- state
- zip_code
- created_at

Relationships:

- users.business_id refers to businesses.id
- pickup_requests.business_id references businesses.id
- quotes.business_id references businesses.id
- contact_requests.business_id references businesses.id

Business association:

- Business data is the core tenant boundary in the app.

Frontend/backend usage:

- /js/client-auth.js
- /supabase/functions/avery-chat/tools.js
- /js/client-dashboard.js

RLS notes:

- The app expects business-scoped access and uses the current authenticated user's business_id to constrain queries.

## Table: users

Purpose:

- Stores the business-linked application user record.

Important columns:

- id
- business_id

Relationships:

- users.id matches Supabase Auth user IDs
- users.business_id points to a business record

Business association:

- This is the identity-to-business mapping used by the customer portal.

Frontend/backend usage:

- /js/client-auth.js
- /js/client-dashboard.js
- /supabase/functions/avery-chat/index.ts

RLS notes:

- The users table is used for business authorization and should not be treated as a public table.

## Table: pickup_requests

Purpose:

- Stores a pickup or logistics request from a customer.

Important columns:

- id
- business_id
- created_by_user_id
- tracking_number
- customer_name
- business_name
- email
- phone
- pickup_facility
- pickup_address
- pickup_contact
- pickup_phone
- delivery_facility
- delivery_address
- delivery_contact
- delivery_phone
- pickup_date
- pickup_time
- scheduled_pickup_date
- scheduled_pickup_time
- assigned_driver
- service_type
- priority
- package_type
- notes
- status
- created_at

Relationships:

- business_id -> businesses.id
- created_by_user_id -> users.id

Business association:

- pickup requests are strictly tied to the authenticated business

Customer association:

- The pickup record contains customer contact and route details

RLS policies:

- same-company select and insert enforcement in /supabase/migrations/20260812_add_pickup_table_and_rls.sql

Frontend/backend usage:

- /js/pickup.js
- /js/script.js
- /supabase/functions/avery-chat/tools.js
- /supabase/functions/avery-chat/index.ts

Notes:

- The app treats assigned_driver as a free-text name, not as a foreign key to a driver table.
- Scheduling and status are intentionally separate concerns.

## Table: quotes

Purpose:

- Stores quote requests and route details submitted by customers.

Important columns:

- id
- business_id
- created_by_user_id
- pickup_address
- delivery_address
- service_type
- mileage
- priority
- estimated_total
- requested_date
- notes
- reference
- status
- created_at

Relationships:

- business_id -> businesses.id
- created_by_user_id -> users.id

Business association:

- Quotes are attached to the authenticated business identity.

RLS notes:

- Business-scoped policy expectations are in the migration files and used by the client app logic.

Frontend/backend usage:

- /js/quote.js
- /js/script.js
- /supabase/functions/avery-chat/tools.js

## Table: contact_requests

Purpose:

- Stores customer contact and dispatch-support messages.

Important columns:

- id
- business_id
- created_by_user_id
- name
- phone
- email
- message
- request_type
- priority
- status
- created_at

Relationships:

- business_id -> businesses.id
- created_by_user_id -> users.id

Business association:

- Same-business access is required

RLS policies:

- /supabase/migrations/20260810_add_contact_requests.sql

Frontend/backend usage:

- /js/contact.js
- /supabase/functions/notify-request-email/index.ts

## Additional notes

- The project keeps request records operational and business-specific rather than global.
- The schema is intentionally small and focused on the MVP workflows.
- The AI layer reads business records but does not define new database access patterns without safety checks.
- No migration should be edited casually because the app relies on the current record structure and RLS assumptions.
