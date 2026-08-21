-- Reconcile the remote schema to the final client-private ownership model without
-- recreating tables, guessing legacy ownership, or backfilling unresolved rows.
--
-- This migration is intentionally defensive and idempotent. It preserves all
-- existing data, leaves legacy rows with client_user_id IS NULL alone, and only
-- adds missing ownership columns and final policies needed by the application.

-- Guardrail: the remote schema is already known to have the core table structure.
-- The migration may add only the missing ownership column and must not assume
-- unrelated columns exist or recreate tables.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pickup_requests'
      AND column_name = 'business_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pickup_requests'
      AND column_name = 'created_by_user_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_requests'
      AND column_name = 'business_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_requests'
      AND column_name = 'created_by_user_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'business_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quotes'
      AND column_name = 'created_by_user_id'
  ) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Required business_id/created_by_user_id columns are missing on request tables; aborting reconciliation migration.';
  END IF;
END $$;

ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.validate_request_client_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = NEW.client_user_id
        AND u.role = 'client'
        AND u.business_id = NEW.business_id
    ) THEN
      RAISE EXCEPTION 'client_user_id must reference a client user in the same business';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pickup_requests_validate_client_assignment ON public.pickup_requests;
CREATE TRIGGER pickup_requests_validate_client_assignment
BEFORE INSERT OR UPDATE OF business_id, client_user_id
ON public.pickup_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_request_client_assignment();

DROP TRIGGER IF EXISTS contact_requests_validate_client_assignment ON public.contact_requests;
CREATE TRIGGER contact_requests_validate_client_assignment
BEFORE INSERT OR UPDATE OF business_id, client_user_id
ON public.contact_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_request_client_assignment();

DROP TRIGGER IF EXISTS quotes_validate_client_assignment ON public.quotes;
CREATE TRIGGER quotes_validate_client_assignment
BEFORE INSERT OR UPDATE OF business_id, client_user_id
ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.validate_request_client_assignment();

DO $$
BEGIN
  -- Legacy broader policies that conflict with the final client-private model.
  DROP POLICY IF EXISTS "Users can access their business pickup requests" ON public.pickup_requests;
  DROP POLICY IF EXISTS pickup_requests_select_same_business ON public.pickup_requests;
  DROP POLICY IF EXISTS pickup_requests_insert_same_business ON public.pickup_requests;

  DROP POLICY IF EXISTS contact_requests_select_same_business ON public.contact_requests;
  DROP POLICY IF EXISTS contact_requests_insert_same_business ON public.contact_requests;

  DROP POLICY IF EXISTS "Users can access their business quotes" ON public.quotes;

  -- Final authoritative pickup policies.
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
            AND u.business_id = pickup_requests.business_id
        )
        AND pickup_requests.business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND pickup_requests.client_user_id = auth.uid()
        AND pickup_requests.created_by_user_id = auth.uid()
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
            AND u.business_id = pickup_requests.business_id
        )
        AND pickup_requests.created_by_user_id = auth.uid()
        AND pickup_requests.client_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.users target
          WHERE target.id = pickup_requests.client_user_id
            AND target.role = 'client'
            AND target.business_id = pickup_requests.business_id
        )
      );
  END IF;

  -- Final authoritative contact policy set.
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
            AND u.business_id = contact_requests.business_id
        )
        AND contact_requests.business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND contact_requests.client_user_id = auth.uid()
        AND contact_requests.created_by_user_id = auth.uid()
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
            AND u.business_id = contact_requests.business_id
        )
        AND contact_requests.created_by_user_id = auth.uid()
        AND contact_requests.client_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.users target
          WHERE target.id = contact_requests.client_user_id
            AND target.role = 'client'
            AND target.business_id = contact_requests.business_id
        )
      );
  END IF;

  -- Final authoritative quotes policies.
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
            AND u.business_id = quotes.business_id
        )
        AND quotes.business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND quotes.client_user_id = auth.uid()
        AND quotes.created_by_user_id = auth.uid()
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
            AND u.business_id = quotes.business_id
        )
        AND quotes.created_by_user_id = auth.uid()
        AND quotes.client_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.users target
          WHERE target.id = quotes.client_user_id
            AND target.role = 'client'
            AND target.business_id = quotes.business_id
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.pickup_requests.client_user_id IS 'Client owner identity for the record. Legacy rows with NULL remain unresolved and are not auto-assigned.';
COMMENT ON COLUMN public.contact_requests.client_user_id IS 'Client owner identity for the record. Legacy rows with NULL remain unresolved and are not auto-assigned.';
COMMENT ON COLUMN public.quotes.client_user_id IS 'Client owner identity for the record. Legacy rows with NULL remain unresolved and are not auto-assigned.';
