/
  README.md — project overview and startup guidance
  client-login.html — customer sign-in page
  index.html — customer portal home page
  client-portal.html — authenticated client dashboard shell
  dashboard.html — owner/business dashboard shell
  contact.html — legacy root-level contact page
  quote.html — legacy redirect to the quote page
  pickup.html — legacy pickup redirect page
  pickupold.html — older pickup prototype or backup artifact
  assistant.html — older or alternate assistant entry page
  manifest.json — web app manifest
  business-data.js — business-related client-side data helper
  login.html — alternate or legacy login page

/css
  style.css — shared customer-facing styling and layout

/js
  client-auth.js — customer auth, route guarding, session validation, business association
  client-dashboard.js — authenticated client dashboard data loading and activity rendering
  pickup.js — pickup form validation, review, and request submission
  quote.js — quote form workflow and estimate logic
  contact.js — contact/dispatch request submission and notifications
  script.js — portal/owner dashboard helper logic and Ada-related UI behavior
  navigation.js — path resolution and menu behavior
  supabase-config.js — public browser-safe Supabase configuration

/Avery
  actions.js — Avery action registry and navigation/logout behavior
  avery.js — Avery app bootstrap / initialization
  conversation.js — chat conversation state and message handling
  engine.js — runtime behavior for AI/message processing
  intents.js — intent detection and intent mapping
  knowledge.js — static knowledge used by assistant flows
  memory.js — local storage-based state tracking and saved route/customer memory
  prompts.js — prompt definitions or prompt storage area
  quotePricing.js — quote pricing logic and estimate helpers
  router.js — route handling and flow redirection
  scheduleInsights.js — scheduling-related analytics helpers
  supabase.js — Supabase client initialization for Avery context
  taskmodel.js — task model and pickup task initialization
  tracking.js — tracking/status logic
  workflowengine.js — workflow orchestration
  workflows.js — workflow definitions
  Responses.js — assistant response helpers
  tools.js — Avery browser helper tool layer

/supabase
  config.toml — Supabase project configuration
  /migrations
    20260810_add_contact_requests.sql — contact request table and RLS
    20260810_add_quotes_reference.sql — quote reference column and uniqueness handling
    20260811_add_pickup_schedule_fields.sql — scheduling and driver text fields
    20260812_add_pickup_customer_fields.sql — pickup customer contact fields
    20260812_add_pickup_table_and_rls.sql — pickup request table and same-business RLS
    20260812_fix_pickup_schedule_driver_text.sql — keeps assigned driver as text field
  /functions
    /avery-chat
      index.ts — Ada chat Edge Function and response generation
      tools.js — controlled read-only tool definitions and business scoping
      tools.cjs — CommonJS helper version used by Node tests
    /notify-request-email
      index.ts — authenticated email notification function

/tests
  avery-chat-readonly-tools.test.js — validates business-scoped read-only tool behavior
  avery-tools.test.js — validates Avery browser-side tool behavior

/assets and /images
  /assets/icons, /assets/images — app branding and UI assets
  /images — static image resources used in the frontend

/docs
  ARCHITECTURE.md — system architecture overview
  DEVELOPER_GUIDE.md — local setup and safe modification guidance
  FEATURES.md — existing customer-facing features
  SECURITY.md — auth and security model
  DATABASE.md — business data model and migrations
  AVERY.md — AI/Ada role and boundaries
  DEPLOYMENT.md — deployment and environment guidance
  FILE_MAP.md — repository map
  INVESTOR_OVERVIEW.md — non-technical overview for stakeholders
  FILE_CLEANUP_RECOMMENDATIONS.md — recommended cleanup list without deleting files

/backup_pre_reorg
  older project snapshot with older HTML, JS, and Avery files; likely historical backup and not the live app entrypoint

/Coding projects
  miscellaneous project or developer workspace artifacts; keep as historical context unless a cleaner reorganization is intentionally planned

/supabase/.temp
  temporary local Supabase metadata linked-project file
