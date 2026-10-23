import { useState, useEffect } from "react";
import { LoginBrandPanel } from "../../components/auth/LoginBrandPanel";
import { LoginForm } from "../../components/auth/LoginForm";
import { ForgotPasswordModal } from "../../components/auth/ForgotPasswordModal";

export type SlidePreview = "prepare" | "run" | "track";

export interface SlideData {
  headline: string;
  text: string;
  preview: SlidePreview;
}

const SLIDES: SlideData[] = [
  {
    headline: "Prepare meetings with confidence",
    text: "Create agendas, invite participants, and publish secure board packs from one workspace.",
    preview: "prepare",
  },
  {
    headline: "Run focused board meetings",
    text: "Manage attendance, quorum, documents, voting, and decisions during the meeting.",
    preview: "run",
  },
  {
    headline: "Track every decision",
    text: "Turn resolutions into accountable actions and monitor progress after the meeting.",
    preview: "track",
  },
];

export function LoginPage() {
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="lp-root">
      {isDesktop && (
        <div className="lp-visual">
          <LoginBrandPanel slides={SLIDES} />
        </div>
      )}

      <div className="lp-auth">
        <LoginForm isDesktop={isDesktop} onForgotPassword={() => setForgotPasswordOpen(true)} />
      </div>

      <ForgotPasswordModal open={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)} />
    </div>
  );
}
