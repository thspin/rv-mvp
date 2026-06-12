-- ============================================================================
-- MIGRATION 006: mora_months semantic fix + backfill
--
-- The cron job (checkUpcomingPaymentDues) used to assign
--   mora_months = min(99, abs(daysLeft))
-- i.e. it stored DAYS of debt in a column named _months_. An athlete 60
-- days past due had mora_months = 60, which read as 5 years of arrears.
--
-- Code now stores MONTHS (Math.floor(abs(daysLeft) / 30)). This migration
-- re-interprets the existing values as days and converts them to months.
-- After this runs, the new code's interpretation aligns with the data.
--
-- If your data was already in months (e.g. the cron was patched in dev
-- before the migration ran), pass MORA_INTERPRET_AS_DAYS=false in the
-- same SQL session to skip the backfill.
-- ============================================================================

DO $$
DECLARE
  interpret_as_days boolean := coalesce(current_setting('MORA_INTERPRET_AS_DAYS', true), 'true')::boolean;
  updated_rows integer;
BEGIN
  IF interpret_as_days THEN
    UPDATE athletes
       SET mora_months = LEAST(99, FLOOR(mora_months / 30.0)::int)
     WHERE mora_months > 0;
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RAISE NOTICE 'mora_months backfill: re-interpreted % rows as days and converted to months', updated_rows;
  ELSE
    RAISE NOTICE 'mora_months backfill: skipped (MORA_INTERPRET_AS_DAYS=false)';
  END IF;
END $$;

-- Same update for the schema.sql docs comment (manual, not applied here).
-- See schema.sql for the corrected comment.
