# Deployment Guide

## Local development

This repository is meant to run as a static site. Use a local server such as:

```bash
cd /Users/jamman/Downloads/dasherlab-client-app-main
python3 -m http.server 8000
```

Then visit the relevant pages in a browser.

## Production hosting

The project is not a framework-based app and does not require a build step before deployment. It can be served as static HTML/CSS/JavaScript from a web host or static hosting platform.

The essential deployment requirement is that the frontend can reach the configured Supabase project and that the environment variables for server-side functions are present.

## Supabase configuration

The browser client uses a public configuration object:

- /js/supabase-config.js

This contains only the public URL and anon key, which are safe for browser use.

Private settings should remain in the Supabase project environment and are not committed into code.

## Required production configuration

The following should exist in the Supabase environment for server-side use:

- OpenAI API key
- OpenAI model selection
- Supabase URL
- Supabase anon key (public)
- Supabase service-role key (server-only, never used in browser code)
- Resend API key
- sender email address
- owner notification email

None of the secret values should be exposed in frontend files or documentation.

## Migrations

Database structure and policies are managed through:

- /supabase/migrations

A deployment process should apply migrations in order and validate the resulting schema before launch. Do not edit an old migration file casually; add new migrations for any schema or policy changes.

## Edge Functions

The Edge Functions live in:

- /supabase/functions/avery-chat
- /supabase/functions/notify-request-email

These functions should be deployed as part of the Supabase project configuration. They require correct environment variables and valid authentication checks.

## Frontend deployment

- Host the repository as static files
- Keep relative paths intact
- Ensure the public Supabase config points to the correct project
- Confirm the portal pages and request pages are reachable

## Post-deployment smoke tests

After deployment, the minimum checks should include:

- customer login works
- business association resolves correctly
- pickup request submission succeeds within the authenticated business
- quote submission works
- contact request submission works
- notification function is called and authorized
- Ada chat can answer approved business-scoped queries
- no unexpected cross-business access is possible

## Rollback considerations

- Keep database migration history intact
- Keep static frontend versioning controlled
- If a deployment breaks auth or business scoping, revert to the last known good static release and review the migration history
- Avoid deleting or rewriting migration files after they have been applied in a live environment

## Deployment safety note

This task does not deploy anything. The repository is documented and organized for the next phase, but no production or hosting changes were made.
