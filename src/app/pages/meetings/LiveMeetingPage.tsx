import { useParams, useNavigate, useSearchParams } from "react-router";
import { FullScreenWorkspaceShell } from "../../components/shared/FullScreenWorkspaceShell";
import { LiveMeetingWorkspace } from "./LiveMeetingWorkspace";

type EntryAction = "start_meeting" | "join_meeting" | "resume_meeting";

/**
 * Route entry point for /meetings/:meetingId/live.
 * Reads ?entry=start_meeting|join_meeting|resume_meeting from the URL so the
 * workspace knows whether the user is starting, joining, or resuming.
 */
export function LiveMeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const raw = searchParams.get("entry");
  const entryAction: EntryAction =
    raw === "start_meeting" ? "start_meeting"
    : raw === "resume_meeting" ? "resume_meeting"
    : "join_meeting";

  const handleClose = () => navigate(-1);

  return (
    <FullScreenWorkspaceShell
      open={true}
      title="Live Meeting"
      onClose={handleClose}
      confirmOnClose="Leave the live meeting session?"
    >
      <LiveMeetingWorkspace
        meetingId={meetingId ?? ""}
        entryAction={entryAction}
        onClose={handleClose}
      />
    </FullScreenWorkspaceShell>
  );
}
