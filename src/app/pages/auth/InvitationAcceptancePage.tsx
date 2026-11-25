import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../store/store";
import { login } from "../../store/authSlice";
import { setCurrentUser } from "../../store/currentUserSlice";
import { AppPasswordField } from "../../components/forms/AppPasswordField";
import { AppTextField } from "../../components/forms/AppTextField";
import { Button } from "../../components/buttons/Button";
import { convayAuth, profileToCurrentUser } from "../../services/supabase/convayAuth";
import { reloadAccessSnapshot, clearAccessSnapshot } from "../../services/supabase/convayAccess";
import { clearEntityRegistryCache } from "../../hooks/useEntityRegistry";
import { readSupabaseInvitationCallback } from "../../services/supabase/invitationCallback";

export function InvitationAcceptancePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [callback] = useState(() => readSupabaseInvitationCallback(window.location.search, window.location.hash));
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Supabase delivers short-lived bearer tokens in the URL fragment. Remove them
    // from the address bar and history as soon as the callback is read.
    window.history.replaceState({}, document.title, window.location.pathname);
    void (async () => {
      try {
        if (callback.error) throw new Error("This invitation link could not be verified. Ask the Convay administrator to send a new invitation.");
        if (callback.type !== "invite" || !callback.accessToken) {
          throw new Error("This invitation link is invalid or expired. Ask the Convay administrator to send a new invitation.");
        }
        const identity = await convayAuth.verifyInvitation(callback.accessToken);
        if (!cancelled) setEmail(identity.email);
      } catch (error) {
        if (!cancelled) setLinkError(error instanceof Error ? error.message : "Unable to verify this invitation.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [callback]);

  const complete = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setFormError("");
    if (password.length < 8) {
      setFormError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setFormError("The passwords do not match.");
      return;
    }
    setSubmitting(true);
    let activatedOnServer = false;
    try {
      const profile = await convayAuth.completeInvitation(callback.accessToken, email, password);
      if (profile.account_status !== "active") throw new Error("Convay did not confirm the account activation.");
      activatedOnServer = true;
      // A fresh, server-authorized permissions snapshot is required before
      // entering the shell. Never reuse the previous account's entity/cache grants.
      clearEntityRegistryCache();
      clearAccessSnapshot();
      await reloadAccessSnapshot();
      dispatch(setCurrentUser(profileToCurrentUser(profile)));
      dispatch(login({ userId: profile.user_id }));
      navigate("/home/overview", { replace: true });
    } catch (error) {
      if (activatedOnServer) {
        // Activation is irreversible; do not ask the user to consume an already
        // accepted invitation a second time. Recover through ordinary sign-in.
        await convayAuth.signOut().catch(() => undefined);
        clearEntityRegistryCache();
        clearAccessSnapshot();
        setActivated(true);
        setFormError("Your account was activated, but workspace access could not be verified. Sign in again to continue.");
      } else {
        setFormError(error instanceof Error ? error.message : "Unable to complete this invitation.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="lp-root">
      <section className="lp-auth" style={{ flex: "1 1 100%", width: "100%" }}>
        <div className="lp-form lp-form--mobile" style={{ maxWidth: 480 }}>
          <div className="lp-form__brand">
            <div className="lp-form__brand-text">
              <span className="lp-form__brand-name">Convay</span>
              <span className="lp-form__brand-product">Board Meeting Solution</span>
            </div>
          </div>
          <div className="lp-form__heading-block">
            <h1 className="lp-form__heading">Complete your account</h1>
            <p className="lp-form__subheading">
              Verify your invitation and choose a password to activate your Convay account.
            </p>
          </div>
          {checking ? (
            <p role="status">Verifying your invitation…</p>
          ) : linkError ? (
            <div className="flex flex-col gap-4">
              <p role="alert" className="text-red-600 text-sm">{linkError}</p>
              <Button variant="secondary" size="lg" fullWidth onClick={() => navigate("/", { replace: true })}>
                Return to sign in
              </Button>
            </div>
          ) : activated ? (
            <div className="flex flex-col gap-4">
              <p role="status">Your invited account is now active.</p>
              {formError && <p role="alert" className="text-red-600 text-sm">{formError}</p>}
              <Button variant="primary" size="lg" fullWidth
                onClick={() => navigate("/", { replace: true })}>
                Sign in to continue
              </Button>
            </div>
          ) : (
            <form onSubmit={complete} className="flex flex-col gap-4">
              <AppTextField id="invite-email" label="Verified email address" value={email}
                onChange={() => undefined} readOnly autoComplete="email" />
              <AppPasswordField id="invite-password" label="Create password" value={password}
                onChange={setPassword} autoComplete="new-password" placeholder="At least 8 characters" />
              <AppPasswordField id="invite-password-confirm" label="Confirm password" value={confirmation}
                onChange={setConfirmation} autoComplete="new-password" placeholder="Enter the password again" />
              {formError && <p role="alert" className="text-red-600 text-sm">{formError}</p>}
              <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
                Verify and activate account
              </Button>
              <Button type="button" variant="secondary" size="lg" fullWidth disabled={submitting}
                onClick={() => navigate("/", { replace: true })}>
                Return to sign in
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
