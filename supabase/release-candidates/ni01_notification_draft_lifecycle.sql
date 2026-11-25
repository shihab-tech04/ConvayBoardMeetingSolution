-- Reviewed candidate only. Not an applied migration. Generate the migration through the authorized Supabase workflow after recovery verification.
CREATE FUNCTION convay_private.enforce_notification_draft_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.entity_key = 'bms.notifyrules' THEN
      RAISE EXCEPTION 'Notification rule deletion requires an approved lifecycle' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.entity_key = 'bms.notifyrules' OR NEW.entity_key = 'bms.notifyrules' THEN
      IF OLD.entity_key IS DISTINCT FROM NEW.entity_key
         OR OLD.record_id IS DISTINCT FROM NEW.record_id
         OR OLD.tenant_id IS DISTINCT FROM NEW.tenant_id
         OR OLD.payload->>'id' IS DISTINCT FROM NEW.payload->>'id'
         OR OLD.payload->>'rule_id' IS DISTINCT FROM NEW.payload->>'rule_id'
         OR OLD.payload->>'status' IS DISTINCT FROM NEW.payload->>'status'
         OR COALESCE(OLD.payload->>'status','') NOT IN ('Draft','Inactive') THEN
        RAISE EXCEPTION 'Notification rule identity and lifecycle are immutable in draft-only mode' USING ERRCODE = '23514';
      END IF;
    END IF;
  ELSIF NEW.entity_key = 'bms.notifyrules' AND NEW.payload->>'status' IS DISTINCT FROM 'Draft' THEN
    RAISE EXCEPTION 'Only Draft notification rules may be created' USING ERRCODE = '23514';
  END IF;
  IF NEW.entity_key = 'bms.notifyrules' THEN
    IF NEW.payload->>'id' IS DISTINCT FROM NEW.record_id
       OR COALESCE(btrim(NEW.payload->>'rule_id'),'') = ''
       OR EXISTS (
         SELECT 1 FROM unnest(ARRAY['rule_name','trigger_event','channels','recipients','timing','template','entity_type']) AS field(name)
         WHERE jsonb_typeof(NEW.payload->field.name) IS DISTINCT FROM 'string'
            OR COALESCE(length(btrim(NEW.payload->>field.name)),0) NOT BETWEEN 1 AND 180
       ) THEN
      RAISE EXCEPTION 'Notification rule payload is incomplete or invalid' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION convay_private.enforce_notification_draft_lifecycle() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER convay_notification_draft_lifecycle
BEFORE INSERT OR UPDATE OR DELETE ON public.convay_entity_records
FOR EACH ROW EXECUTE FUNCTION convay_private.enforce_notification_draft_lifecycle();
