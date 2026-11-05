import { useEffect, useState, startTransition } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store/store";
import { setIsDesktop } from "../store/uiSlice";
import { login, logout } from "../store/authSlice";
import { setCurrentUser } from "../store/currentUserSlice";
import { convayAuth, profileToCurrentUser } from "../services/supabase/convayAuth";
import { reloadAccessSnapshot, clearAccessSnapshot } from "../services/supabase/convayAccess";
import { clearEntityRegistryCache } from "../hooks/useEntityRegistry";
import { useAppearance } from "../hooks/useAppearance";
import { LoginPage } from "../pages/auth/LoginPage";
import { InvitationAcceptancePage } from "../pages/auth/InvitationAcceptancePage";
import { isSupabaseInvitationCallback } from "../services/supabase/invitationCallback";
import { AppShell } from "./AppShell";
import { HelpProvider } from "../context/HelpContext";
import { HelpDrawer } from "../components/help/HelpDrawer";

/**
 * Root route component — handles appearance side-effects, isDesktop sync,
 * and authentication gate. Renders AppShell (with <Outlet>) when authenticated.
 * HelpProvider wraps both login and app so the help drawer is available everywhere.
 */
export function AppRoot() {
  // If Supabase falls back to the configured Site URL, the invite token may
  // arrive at the application root instead of /invite/accept. Handle that
  // verified callback before the ordinary sign-in/session gate redirects it.
  const isInviteCallback = typeof window !== "undefined" &&
    isSupabaseInvitationCallback(window.location.search, window.location.hash);
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  // Defer the shell swap so lazy route components suspend inside a transition
  const [showShell, setShowShell] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    startTransition(() => setShowShell(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    if (isInviteCallback) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    void convayAuth.restore().then(async profile => {
      if (cancelled) return;
      if (profile) {
        await reloadAccessSnapshot();
        if (cancelled) return;
        dispatch(setCurrentUser(profileToCurrentUser(profile)));
        dispatch(login({ userId: profile.user_id }));
      } else {
        clearEntityRegistryCache();
        clearAccessSnapshot();
        dispatch(logout());
      }
    }).catch(() => {
      if (!cancelled) { clearEntityRegistryCache(); clearAccessSnapshot(); dispatch(logout()); }
    }).finally(() => {
      if (!cancelled) setChecking(false);
    });
    return () => { cancelled = true; };
  }, [dispatch, isInviteCallback]);

  useAppearance();

  useEffect(() => {
    const sync = () => dispatch(setIsDesktop(window.innerWidth >= 1024));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [dispatch]);

  return (
    <HelpProvider>
      {isInviteCallback ? <InvitationAcceptancePage /> : checking ? <div className="lp-root" role="status"><p>Verifying your session…</p></div> : showShell ? <AppShell /> : <LoginPage />}
      {!isInviteCallback && <HelpDrawer />}
    </HelpProvider>
  );
}
