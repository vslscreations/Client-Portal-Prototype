-- Safe client ownership enforcement for request tables.
--
-- This migration is intentionally additive and does not guess legacy ownership.
-- Existing rows whose owner cannot be proven remain client_user_id = NULL and are
-- treated as unresolved legacy data. Those records are visible only to owners of
-- the same business, never to clients, until a separate deterministic backfill is
-- performed with explicit business/client evidence.

ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pickup_requests_business_client_idx
  ON public.pickup_requests (business_id, client_user_id);

CREATE INDEX IF NOT EXISTS contact_requests_business_client_idx
  ON public.contact_requests (business_id, client_user_id);

CREATE INDEX IF NOT EXISTS quotes_business_client_idx
  ON public.quotes (business_id, client_user_id);

CREATE OR REPLACE FUNCTION public.validate_request_client_assignment()
RETURNS trigger
LANGUAGE plpgsql
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

ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

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
END
$$;

COMMENT ON COLUMN public.pickup_requests.client_user_id IS 'Client owner identity for the record. NULL means legacy/unresolved ownership and must not be auto-assigned.';
COMMENT ON COLUMN public.contact_requests.client_user_id IS 'Client owner identity for the record. NULL means legacy/unresolved ownership and must not be auto-assigned.';
COMMENT ON COLUMN public.quotes.client_user_id IS 'Client owner identity for the record. NULL means legacy/unresolved ownership and must not be auto-assigned.';
