-- Add the missing customer/contact fields used by the pickup submission flow.
ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS pickup_facility text,
  ADD COLUMN IF NOT EXISTS pickup_contact text,
  ADD COLUMN IF NOT EXISTS pickup_phone text,
  ADD COLUMN IF NOT EXISTS delivery_facility text,
  ADD COLUMN IF NOT EXISTS delivery_contact text,
  ADD COLUMN IF NOT EXISTS delivery_phone text;

CREATE INDEX IF NOT EXISTS pickup_requests_business_customer_name_idx
  ON public.pickup_requests (business_id, customer_name);

CREATE INDEX IF NOT EXISTS pickup_requests_business_email_idx
  ON public.pickup_requests (business_id, email);
