import type { EntityType, ResolvedAction } from "../../actions/types";

/**
 * One audited permission code for every contextual user action.
 * The UI can only expose an action when the SQL-backed snapshot includes its
 * grant; unknown action IDs are hidden by default rather than guessed.
 * Actual persisted business APIs must independently enforce these grants.
 */
const ACTIONS: Record<EntityType, Record<string, string>> = {
  meeting: {
    view: "mtg_view", view_record: "mtg_view", review_quorum: "mtg_view",
    continue_setup: "mtg_update", submit_for_approval: "mtg_update",
    approve: "mtg_approve", reject: "mtg_approve", request_revision: "mtg_approve",
    schedule_meeting: "mtg_update", publish_meeting: "mtg_update",
    publish: "mtg_update", edit: "mtg_update", delete: "mtg_cancel",
    manage_participants: "mtg_participants", start: "mtg_start",
    join: "mtg_join", rejoin: "mtg_join", continue_meeting: "mtg_start",
    manage_rsvp: "mtg_rsvp", reschedule_meeting: "mtg_postpone",
    cancel: "mtg_cancel", resume_meeting: "mtg_start",
    resume_break: "mtg_start", resume_adjourned: "mtg_start",
    prepare_minutes: "min_create", create_next_meeting: "mtg_create",
    archive: "mtg_update", resolve_readiness: "mtg_update",
  },
  agenda_item: {
    view: "agd_view", approve: "agd_approve", request_revision: "agd_review",
    reject: "agd_review", edit: "agd_submit", move_up: "agd_submit",
    move_down: "agd_submit", defer: "agd_review", delete: "agd_submit",
    attach_document: "doc_upload",
  },
  document: {
    view: "doc_view", edit: "doc_edit", approve: "doc_approve",
    delete: "doc_archive", request_revision: "doc_review",
    reject: "doc_review", publish: "doc_publish",
    download_document: "doc_download", version_history: "doc_manage_versions",
    archive: "doc_archive", lock_document: "doc_manage_versions",
    unlock_document: "doc_manage_versions",
  },
  board_pack: {
    view: "pack_view", edit: "pack_create", approve: "pack_publish",
    add_document: "pack_create", request_revision: "pack_publish",
    reject: "pack_publish", publish: "pack_publish",
    download_document: "doc_download", create_board_pack: "pack_create",
    version_history: "doc_manage_versions", archive: "doc_archive",
  },
  decision: {
    view: "dec_view", edit: "dec_record", approve: "dec_approve",
    mark_implemented: "dec_record", defer: "dec_approve",
    add_progress_update: "dec_record", flag_overdue: "dec_approve",
  },
  resolution: {
    view: "res_view", edit: "res_create", approve: "res_approve",
    request_signature: "res_approve", reject: "res_approve",
    print_resolution: "res_view", archive: "res_approve",
  },
  action_item: {
    view: "act_view", edit: "act_update", update_progress: "act_update",
    mark_complete: "act_close", request_extension: "act_update",
    reassign: "act_update", cancel: "act_close",
    add_progress_update: "act_update", flag_overdue: "act_update",
  },
  minutes: {
    view: "arc_view", edit: "min_create", approve: "min_approve",
    request_revision: "min_approve", print_minutes: "arc_view",
    download_document: "doc_download", supersede: "min_approve",
    archive: "arc_view",
  },
  question: {
    view: "mtg_view", assign_question: "mtg_participants",
    submit_response: "mtg_join", close_question: "mtg_update",
    escalate: "mtg_update", delete: "mtg_update",
  },
  governance_body: {
    view: "gov_body_view", edit: "gov_body_manage",
    manage_members: "gov_body_manage", add_member: "gov_body_manage",
    deactivate: "gov_body_manage", activate: "gov_body_manage",
    duplicate: "gov_body_manage", archive: "gov_body_manage",
  },
  user: {
    view: "admin_users", edit: "admin_users", assign_role: "admin_users_reassign",
    send_invite: "admin_users_add", reset_password: "admin_users",
    deactivate_user: "admin_users", activate_user: "admin_users",
    toggle_2fa: "admin_users", delete: "admin_users",
  },
  workflow: {
    view: "admin_workflows", edit: "admin_workflows",
    activate_workflow: "admin_workflows", deactivate_workflow: "admin_workflows",
    duplicate: "admin_workflows",
  },
  notification: {
    view: "home_notifications", resend_notification: "admin_notifications",
    delete: "admin_notifications",
  },
};
const LEGACY_ALIAS: Record<string, string> = {
  mtg_approve: "meeting_approve",
  agd_approve: "agenda_approve",
  doc_approve: "doc_approve",
  pack_publish: "board_pack_approve",
  dec_approve: "decision_approve",
  res_approve: "resolution_approve",
  act_close: "action_item_approve",
  min_approve: "minutes_approve",
  gov_body_manage: "governance_manage",
  admin_workflows: "workflow_manage",
  admin_notifications: "notification_manage",
};
export function permissionForAction(entity: EntityType, action: string): string | null {
  return ACTIONS[entity][action] ?? null;
}
export function actionGranted(
  entity: EntityType, action: string, permissions: readonly string[], isSuperAdmin: boolean,
): boolean {
  const required = permissionForAction(entity, action);
  return isSuperAdmin || (required !== null && permissions.includes(required));
}
export function filterActionsByAccess(
  entity: EntityType, actions: ResolvedAction[], permissions: string[], isSuperAdmin: boolean,
): ResolvedAction[] {
  return actions.filter(action =>
    action.visible && actionGranted(entity, action.id, permissions, isSuperAdmin));
}
export function withResolverAliases(grants: readonly string[]): string[] {
  return [...new Set([
    ...grants,
    ...grants.map(p => LEGACY_ALIAS[p]).filter((p): p is string => Boolean(p)),
  ])];
}
