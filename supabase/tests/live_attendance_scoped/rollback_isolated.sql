-- Non-destructive operator rollback REHEARSAL. No schema/table drops,
-- no legacy release switch change, no deletion of any receipts/history.
-- Never run against hosted data before WS0 native recovery and owner review.
begin;
update convay_private.live_attendance_company_gate set enabled=false where singleton=true;
commit;
