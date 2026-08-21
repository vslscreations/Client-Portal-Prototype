-- Finalize the client-private request ownership model without rewriting migration history.
-- This migration is additive and safe for both:
--   1) a fresh database applying migrations in order, and
--   2) a database where 20260813_add_client_user_id_to_requests.sql and
--      20260820_fix_client_request_ownership_rls.sql were already applied.
--
-- The goal is to remove legacy broader policies that would allow a client to see
-- all same-business rows or to insert a request with unresolved ownership, then
-- ensure the final authoritative policies remain in effect.
--
-- Legacy rows with client_user_id IS NULL remain unresolved and are not auto-assigned.
-- Owners may still read their business's records; clients may only read their own.

DO $$
BEGIN
  DROP POLICY IF EXISTS pickup_requests_select_same_business ON public.pickup_requests;
  DROP POLICY IF EXISTS pickup_requests_insert_same_business ON public.pickup_requests;
  DROP POLICY IF EXISTS pickup_requests_select_same_business_client ON public.pickup_requests;
  DROP POLICY IF EXISTS pickup_requests_insert_same_business_client ON public.pickup_requests;

  DROP POLICY IF EXISTS contact_requests_select_same_business ON public.contact_requests;
  DROP POLICY IF EXISTS contact_requests_insert_same_business ON public.contact_requests;
  DROP POLICY IF EXISTS contact_requests_select_same_business_client ON public.contact_requests;
  DROP POLICY IF EXISTS contact_requests_insert_same_business_client ON public.contact_requests;

  DROP POLICY IF EXISTS quotes_select_same_business_client ON public.quotes;
  DROP POLICY IF EXISTS quotes_insert_same_business_client ON public.quotes;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pickup_requests'
      AND policyname = 'pickup_requests_owner_select_business'
  ) THEN
    CREATE POLICY pickup_requests_owner_select_business
      ON public.pickup_requests
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'owner'
            AND u.business_id = pickup_requests.business_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pickup_requests'
      AND policyname = 'pickup_requests_client_select_own_records'
  ) THEN
    CREATE POLICY pickup_requests_client_select_own_records
      ON public.pickup_requests
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'client'
            AND u.business_id = pickup_requests.business_id
        )
        AND pickup_requests.client_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pickup_requests'
      AND policyname = 'pickup_requests_client_insert_own_records'
  ) THEN
    CREATE POLICY pickup_requests_client_insert_own_records
      ON public.pickup_requests
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'client'
            AND u.business_id = NEW.business_id
        )
        AND NEW.business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND NEW.client_user_id = auth.uid()
        AND NEW.created_by_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pickup_requests'
      AND policyname = 'pickup_requests_owner_insert_business_client'
  ) THEN
    CREATE POLICY pickup_requests_owner_insert_business_client
      ON public.pickup_requests
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'owner'
            AND u.business_id = NEW.business_id
        )
        AND NEW.created_by_user_id = auth.uid()
        AND NEW.client_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.users target
          WHERE target.id = NEW.client_user_id
            AND target.role = 'client'
            AND target.business_id = NEW.business_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_requests'
      AND policyname = 'contact_requests_owner_select_business'
  ) THEN
    CREATE POLICY contact_requests_owner_select_business
      ON public.contact_requests
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'owner'
            AND u.business_id = contact_requests.business_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_requests'
      AND policyname = 'contact_requests_client_select_own_records'
  ) THEN
    CREATE POLICY contact_requests_client_select_own_records
      ON public.contact_requests
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'client'
            AND u.business_id = contact_requests.business_id
        )
        AND contact_requests.client_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_requests'
      AND policyname = 'contact_requests_client_insert_own_records'
  ) THEN
    CREATE POLICY contact_requests_client_insert_own_records
      ON public.contact_requests
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'client'
            AND u.business_id = NEW.business_id
        )
        AND NEW.business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND NEW.client_user_id = auth.uid()
        AND NEW.created_by_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_requests'
      AND policyname = 'contact_requests_owner_insert_business_client'
  ) THEN
    CREATE POLICY contact_requests_owner_insert_business_client
      ON public.contact_requests
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'owner'
            AND u.business_id = NEW.business_id
        )
        AND NEW.created_by_user_id = auth.uid()
        AND NEW.client_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.users target
          WHERE target.id = NEW.client_user_id
            AND target.role = 'client'
            AND target.business_id = NEW.business_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_owner_select_business'
  ) THEN
    CREATE POLICY quotes_owner_select_business
      ON public.quotes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'owner'
            AND u.business_id = quotes.business_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_client_select_own_records'
  ) THEN
    CREATE POLICY quotes_client_select_own_records
      ON public.quotes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'client'
            AND u.business_id = quotes.business_id
        )
        AND quotes.client_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_client_insert_own_records'
  ) THEN
    CREATE POLICY quotes_client_insert_own_records
      ON public.quotes
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'client'
            AND u.business_id = NEW.business_id
        )
        AND NEW.business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND NEW.client_user_id = auth.uid()
        AND NEW.created_by_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_owner_insert_business_client'
  ) THEN
    CREATE POLICY quotes_owner_insert_business_client
      ON public.quotes
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'owner'
            AND u.business_id = NEW.business_id
        )
        AND NEW.created_by_user_id = auth.uid()
        AND NEW.client_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.users target
          WHERE target.id = NEW.client_user_id
            AND target.role = 'client'
            AND target.business_id = NEW.business_id
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.pickup_requests.client_user_id IS 'Client owner identity for the record. NULL means legacy/unresolved ownership and must not be auto-assigned.';
COMMENT ON COLUMN public.contact_requests.client_user_id IS 'Client owner identity for the record. NULL means legacy/unresolved ownership and must not be auto-assigned.';
COMMENT ON COLUMN public.quotes.client_user_id IS 'Client owner identity for the record. NULL means legacy/unresolved ownership and must not be auto-assigned.';
