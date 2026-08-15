-- Corrective migration for the manual driver-name scheduling MVP.
-- This safely handles environments where the earlier UUID-based field may already exist.
ALTER TABLE public.pickup_requests
  DROP COLUMN IF EXISTS assigned_driver_id;

ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS assigned_driver text;

CREATE INDEX IF NOT EXISTS pickup_requests_business_scheduled_date_idx
  ON public.pickup_requests (business_id, scheduled_pickup_date);

CREATE INDEX IF NOT EXISTS pickup_requests_driver_scheduled_date_idx
  ON public.pickup_requests (assigned_driver, scheduled_pickup_date);
