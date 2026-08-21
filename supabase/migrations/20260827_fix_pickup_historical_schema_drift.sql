-- Conservative historical schema reconciliation for the live remote pickup_requests table.
--
-- Purpose:
--   Add only the missing indexes that are explicitly confirmed to be absent remotely
--   from the 20260806-20260809 historical migration sequence.
--
-- Safety rules:
--   - Do not recreate or modify historical migration files.
--   - Do not alter 20260826_reconcile_client_request_ownership.sql.
--   - Do not modify the existing pickup_requests table shape beyond the missing indexes.
--   - Do not enforce NOT NULL or type changes for business_id, tracking_number,
--     pickup_address, delivery_address, status, created_at, or pickup_time because
--     the current remote data must be preserved and those historical constraints were
--     not safely verifiable for all existing rows.
--   - Do not touch the legacy policy "Users can access their business pickup requests"
--     or the existing same-business policies. The final ownership policy transition is
--     handled by 20260826_reconcile_client_request_ownership.sql.
--   - Nothing in this migration mutates application data or ownership.
--
-- The read-only audits showed all of the following candidate historical constraints
-- to be currently safe to leave as-is and not enforce in production:
--   - business_id nullable remotely, but historically NOT NULL
--   - tracking_number nullable remotely, but historically NOT NULL
--   - pickup_address nullable remotely, but historically NOT NULL
--   - delivery_address nullable remotely, but historically NOT NULL
--   - status nullable remotely, but historically NOT NULL DEFAULT 'Awaiting Dispatch'
--   - created_at nullable remotely, but historically NOT NULL DEFAULT now()
--   - pickup_time text remotely, while the historical migration expected time
--
-- For the nullability and type candidates, the live production data was checked and
-- no nulls or non-castable values were found, but these differences were still kept
-- intentionally conservative because the historical migration sequence is not the live
-- source of truth for a production schema that already exists in the remote database.
-- The migration therefore resolves only the confirmed missing-index drift.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pickup_requests'
      AND column_name = 'customer_name'
  ) THEN
    RAISE EXCEPTION 'pickup_requests.customer_name is missing; historical reconciliation aborted';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pickup_requests'
      AND column_name = 'email'
  ) THEN
    RAISE EXCEPTION 'pickup_requests.email is missing; historical reconciliation aborted';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS pickup_requests_business_customer_name_idx
  ON public.pickup_requests (business_id, customer_name);

CREATE INDEX IF NOT EXISTS pickup_requests_business_email_idx
  ON public.pickup_requests (business_id, email);

COMMENT ON INDEX public.pickup_requests_business_customer_name_idx IS 'Historical reconciliation: add missing 20260808 customer-name index without altering existing schema.';
COMMENT ON INDEX public.pickup_requests_business_email_idx IS 'Historical reconciliation: add missing 20260808 email index without altering existing schema.';
