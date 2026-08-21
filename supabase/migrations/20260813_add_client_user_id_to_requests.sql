-- Add client ownership tracking to request tables while preserving business-scope access.
ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pickup_requests_business_client_idx
  ON public.pickup_requests (business_id, client_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS contact_requests_business_client_idx
  ON public.contact_requests (business_id, client_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS quotes_business_client_idx
  ON public.quotes (business_id, client_user_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pickup_requests'
      AND policyname = 'pickup_requests_select_same_business_client'
  ) THEN
    CREATE POLICY pickup_requests_select_same_business_client
      ON public.pickup_requests
      FOR SELECT
      USING (
        business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND (
          auth.uid() = client_user_id
          OR auth.uid() = created_by_user_id
          OR (
            EXISTS (
              SELECT 1
              FROM public.users owner
              WHERE owner.id = auth.uid()
                AND owner.business_id = pickup_requests.business_id
                AND owner.role = 'owner'
            )
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pickup_requests'
      AND policyname = 'pickup_requests_insert_same_business_client'
  ) THEN
    CREATE POLICY pickup_requests_insert_same_business_client
      ON public.pickup_requests
      FOR INSERT
      WITH CHECK (
        auth.uid() = created_by_user_id
        AND business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND (
          client_user_id IS NULL
          OR auth.uid() = client_user_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_requests'
      AND policyname = 'contact_requests_select_same_business_client'
  ) THEN
    CREATE POLICY contact_requests_select_same_business_client
      ON public.contact_requests
      FOR SELECT
      USING (
        business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND (
          auth.uid() = client_user_id
          OR auth.uid() = created_by_user_id
          OR (
            EXISTS (
              SELECT 1
              FROM public.users owner
              WHERE owner.id = auth.uid()
                AND owner.business_id = contact_requests.business_id
                AND owner.role = 'owner'
            )
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_requests'
      AND policyname = 'contact_requests_insert_same_business_client'
  ) THEN
    CREATE POLICY contact_requests_insert_same_business_client
      ON public.contact_requests
      FOR INSERT
      WITH CHECK (
        auth.uid() = created_by_user_id
        AND business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND (
          client_user_id IS NULL
          OR auth.uid() = client_user_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_select_same_business_client'
  ) THEN
    CREATE POLICY quotes_select_same_business_client
      ON public.quotes
      FOR SELECT
      USING (
        business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND (
          auth.uid() = client_user_id
          OR auth.uid() = created_by_user_id
          OR (
            EXISTS (
              SELECT 1
              FROM public.users owner
              WHERE owner.id = auth.uid()
                AND owner.business_id = quotes.business_id
                AND owner.role = 'owner'
            )
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_insert_same_business_client'
  ) THEN
    CREATE POLICY quotes_insert_same_business_client
      ON public.quotes
      FOR INSERT
      WITH CHECK (
        auth.uid() = created_by_user_id
        AND business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
        AND (
          client_user_id IS NULL
          OR auth.uid() = client_user_id
        )
      );
  END IF;
END
$$;
