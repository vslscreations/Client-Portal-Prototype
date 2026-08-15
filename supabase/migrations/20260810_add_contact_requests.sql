-- Create client contact/dispatch request storage.
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text NOT NULL,
  message text NOT NULL,
  request_type text NOT NULL DEFAULT 'contact_dispatch',
  priority text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'Needs Review',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_requests_business_created_idx
  ON public.contact_requests (business_id, created_at DESC);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_requests'
      AND policyname = 'contact_requests_select_same_business'
  ) THEN
    CREATE POLICY contact_requests_select_same_business
      ON public.contact_requests
      FOR SELECT
      USING (
        business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_requests'
      AND policyname = 'contact_requests_insert_same_business'
  ) THEN
    CREATE POLICY contact_requests_insert_same_business
      ON public.contact_requests
      FOR INSERT
      WITH CHECK (
        auth.uid() = created_by_user_id
        AND business_id = (
          SELECT u.business_id
          FROM public.users u
          WHERE u.id = auth.uid()
        )
      );
  END IF;
END
$$;