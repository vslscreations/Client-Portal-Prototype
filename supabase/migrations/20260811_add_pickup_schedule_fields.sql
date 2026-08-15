-- Add scheduling fields to pickup requests without altering the existing status workflow.
ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS scheduled_pickup_date date,
  ADD COLUMN IF NOT EXISTS scheduled_pickup_time time,
  ADD COLUMN IF NOT EXISTS assigned_driver text;

CREATE INDEX IF NOT EXISTS pickup_requests_business_scheduled_date_idx
  ON public.pickup_requests (business_id, scheduled_pickup_date);

CREATE INDEX IF NOT EXISTS pickup_requests_driver_scheduled_date_idx
  ON public.pickup_requests (assigned_driver, scheduled_pickup_date);
