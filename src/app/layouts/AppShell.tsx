import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { preloadAllRoutes } from "../routes";
import type { AppDispatch } from "../store/store";
import { logout } from "../store/authSlice";
import { convayAuth } from "../services/supabase/convayAuth";
import { clearAccessSnapshot, reloadAccessSnapshot, useAccessSnapshot } from "../services/supabase/convayAccess";
import { getVisibleNav } from "../data/navigation";
import { mayVisitPath } from "../services/supabase/convayAccess";
import { redirectDeniedDefaultDashboard } from "./permissionAwareLanding";
import { workspaceAccessState } from "./accountAccessState";
import { Button } from "../components/buttons/Button";
import { clearEntityRegistryCache } from "../hooks/useEntityRegistry";
import { useSettings } from "../hooks/useSettings";
import { FONTS } from "../data/fonts";
import { useNavigation } from "../hooks/useNavigation";
import { useUIState, useUIDispatch } from "../hooks/useUI";
import { SignOutModal } from "../components/modals/SignOutModal";
import { MuiProvider } from "../components/ui/MuiProvider";
import { SidebarShell } from "./SidebarShell";
import { MainShell } from "./MainShell";
import { MobileBackdrop } from "./MobileBackdrop";
export function AppShell() {
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [retryingAccess, setRetryingAccess] = useState(false);
  const [retryError, setRetryError] = useState("");
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();

  const { fontId } = useSettings();
  const access = useAccessSnapshot();
  const visibleNavigation = getVisibleNav();
  const accessState = workspaceAccessState(access, visibleNavigation.length);
  const firstAccessibleRedirect = redirectDeniedDefaultDashboard(
    location.pathname, mayVisitPath("/home/overview", access), visibleNavigation,
  );
  const fontFamily = FONTS[fontId].family;
  const { mobileDrawerOpen } = useUIState();
  const { setMobileDrawerOpen } = useUIDispatch();

  const {
    handleLogoClick,
    handleMainNavClick,
    handleSubNavClick,
    handleThirdNavClick,
    handleMenuToggle,
  } = useNavigation();

  // Warm all route chunks in the background so first-click navigation is instant
  useEffect(() => { preloadAllRoutes(); }, []);

  // The post-login default route assumes the dashboard is permitted. Users
  // with Meeting Participant or other limited roles must land on a route they
  // are actually authorized to open. Do not alter explicitly requested links.
  useEffect(() => {
    if (accessState === "ready" && firstAccessibleRedirect) {
      navigate(firstAccessibleRedirect, { replace: true });
    }
  }, [accessState, firstAccessibleRedirect, navigate]);

  const handleConfirmSignOut = () => {
    setSignOutOpen(false);
    clearEntityRegistryCache();
    clearAccessSnapshot();
    void convayAuth.signOut();
    dispatch(logout());
  };

  // A verified invitation may activate Auth before a Super Admin assigns a role.
  // The server-returned effective grants remain authoritative; never grant
  // even a default dashboard permission to conceal missing assignments.
  if (accessState !== "ready") {
    const awaitingRole = accessState === "awaiting_permissions";
    const verificationFailed = accessState === "verification_failed";
    const retry = async () => {
      if (retryingAccess) return;
      setRetryingAccess(true);
      setRetryError("");
      try {
        await reloadAccessSnapshot();
      } catch (error) {
        setRetryError(error instanceof Error ? error.message : "Unable to check your access.");
      } finally {
        setRetryingAccess(false);
      }
    };
    return (
      <MuiProvider>
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
                <h1 className="lp-form__heading">
                  {awaitingRole ? "Account active — access pending" :
                    verificationFailed ? "Unable to verify access" : "Checking your access…"}
                </h1>
                <p className="lp-form__subheading">
                  {awaitingRole
                    ? "Your account has been activated, but no accessible workspace role is assigned. Ask your Convay Super Admin to open User Management, choose your account, and assign an active role with the required permissions."
                    : "Convay must verify your permissions before opening the workspace. No access is granted until verification succeeds."}
                </p>
              </div>
              {(retryError || access.error) && (
                <p role="alert" className="text-red-600 text-sm">{retryError || access.error}</p>
              )}
              <div className="flex flex-col gap-3">
                <Button variant="primary" size="lg" fullWidth loading={retryingAccess}
                  onClick={() => { void retry(); }}>Check access again</Button>
                <Button variant="secondary" size="lg" fullWidth
                  disabled={retryingAccess} onClick={handleConfirmSignOut}>Sign out</Button>
              </div>
            </div>
          </section>
        </main>
      </MuiProvider>
    );
  }

  return (
    <MuiProvider>
    <div className="app-shell" style={{ fontFamily }}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <MobileBackdrop
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      <SidebarShell
        onLogoClick={handleLogoClick}
        onMainNavClick={handleMainNavClick}
        onSubNavClick={handleSubNavClick}
        onThirdNavClick={handleThirdNavClick}
      />

      <MainShell
        onMenuToggle={handleMenuToggle}
        onSignOut={() => setSignOutOpen(true)}
      />

      {signOutOpen && (
        <SignOutModal
          onConfirm={handleConfirmSignOut}
          onCancel={() => setSignOutOpen(false)}
        />
      )}
    </div>
    </MuiProvider>
  );
}
