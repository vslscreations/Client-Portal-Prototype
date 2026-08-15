-- Add persistent quote reference to quote requests.
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS reference text;

-- Enforce uniqueness for non-null references when it is safe to do so.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'quotes_reference_unique_idx'
  ) THEN
    IF EXISTS (
      SELECT reference
      FROM public.quotes
      WHERE reference IS NOT NULL
      GROUP BY reference
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'Skipped creating quotes_reference_unique_idx because duplicate reference values already exist.';
    ELSE
      CREATE UNIQUE INDEX quotes_reference_unique_idx
        ON public.quotes (reference)
        WHERE reference IS NOT NULL;
    END IF;
  END IF;
END
$$;