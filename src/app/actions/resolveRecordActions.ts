import type { ResolvedAction, ActionContext } from "./types";
import { resolveMeetingActions } from "./resolvers/meetingActions";
import { resolveAgendaActions } from "./resolvers/agendaActions";
import { resolveDocumentActions } from "./resolvers/documentActions";
import { resolveBoardPackActions } from "./resolvers/boardPackActions";
import {
  resolveDecisionActions,
  resolveResolutionActions,
  resolveActionItemActions,
  resolveMinutesActions,
  resolveQuestionActions,
  resolveWorkflowActions,
  resolveNotificationActions,
} from "./resolvers/registerActions";
import {
  resolveGovernanceBodyActions,
  resolveUserActions,
} from "./resolvers/governanceActions";

/**
 * Central action resolver.
 *
 * Returns a sorted list of ResolvedAction[] for a given entity record and context.
 * Only `visible: true` actions are returned — callers filter on `enabled` for disabled-state UI.
 */
export function resolveRecordActions(ctx: ActionContext): ResolvedAction[] {
  let actions: ResolvedAction[];

  switch (ctx.entity) {
    case "meeting":
      actions = resolveMeetingActions(ctx);
      break;
    case "agenda_item":
      actions = resolveAgendaActions(ctx);
      break;
    case "document":
      actions = resolveDocumentActions(ctx);
      break;
    case "board_pack":
      actions = resolveBoardPackActions(ctx);
      break;
    case "decision":
      actions = resolveDecisionActions(ctx);
      break;
    case "resolution":
      actions = resolveResolutionActions(ctx);
      break;
    case "action_item":
      actions = resolveActionItemActions(ctx);
      break;
    case "minutes":
      actions = resolveMinutesActions(ctx);
      break;
    case "question":
      actions = resolveQuestionActions(ctx);
      break;
    case "governance_body":
      actions = resolveGovernanceBodyActions(ctx);
      break;
    case "user":
      actions = resolveUserActions(ctx);
      break;
    case "workflow":
      actions = resolveWorkflowActions(ctx);
      break;
    case "notification":
      actions = resolveNotificationActions(ctx);
      break;
    default:
      actions = [];
  }

  // Return only visible actions, sorted by priority
  return actions.filter(a => a.visible).sort((a, b) => a.priority - b.priority);
}
