-- Ensure the pickup request table exists with the fields this app uses.
CREATE TABLE IF NOT EXISTS public.pickup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tracking_number text NOT NULL,
  customer_name text,
  business_name text,
  email text,
  phone text,
  pickup_facility text,
  pickup_address text NOT NULL,
  pickup_contact text,
  pickup_phone text,
  delivery_facility text,
  delivery_address text NOT NULL,
  delivery_contact text,
  delivery_phone text,
  pickup_date date,
  pickup_time time,
  scheduled_pickup_date date,
  scheduled_pickup_time time,
  assigned_driver text,
  service_type text,
  priority text,
  package_type text,
  notes text,
  status text NOT NULL DEFAULT 'Awaiting Dispatch',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS tracking_number text;

CREATE INDEX IF NOT EXISTS pickup_requests_business_created_idx
  ON public.pickup_requests (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pickup_requests_tracking_idx
  ON public.pickup_requests (tracking_number);

ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pickup_requests'
      AND policyname = 'pickup_requests_select_same_business'
  ) THEN
    CREATE POLICY pickup_requests_select_same_business
      ON public.pickup_requests
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
      AND tablename = 'pickup_requests'
      AND policyname = 'pickup_requests_insert_same_business'
  ) THEN
    CREATE POLICY pickup_requests_insert_same_business
      ON public.pickup_requests
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
