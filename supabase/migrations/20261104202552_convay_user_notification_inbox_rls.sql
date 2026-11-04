-- HM-07 Notification access: durable, per-user inbox. No synthetic data.
CREATE TABLE public.convay_user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('approval','status','assignment','correction','payment','user-role','security','system')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 180),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  module text NOT NULL DEFAULT 'Board Meeting' CHECK (char_length(module) BETWEEN 1 AND 200),
  destination jsonb NOT NULL DEFAULT '{"main":"home","sub":"notifications"}'::jsonb
    CHECK (jsonb_typeof(destination) = 'object' AND jsonb_typeof(destination -> 'main') = 'string'),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX convay_user_notifications_owner_recent_idx
  ON public.convay_user_notifications(recipient_user_id,created_at DESC,id DESC);

ALTER TABLE public.convay_user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convay_user_notifications FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.convay_user_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.convay_user_notifications TO authenticated;
GRANT UPDATE (is_read) ON public.convay_user_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.convay_user_notifications TO service_role;

CREATE POLICY convay_notification_owner_read ON public.convay_user_notifications
FOR SELECT TO authenticated
USING (
  recipient_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.account_status = 'active'
  )
);

CREATE POLICY convay_notification_owner_read_receipt ON public.convay_user_notifications
FOR UPDATE TO authenticated
USING (
  recipient_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.account_status = 'active'
  )
)
WITH CHECK (
  recipient_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.account_status = 'active'
  )
);
