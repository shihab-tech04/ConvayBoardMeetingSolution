import { useRef, useState, useEffect, startTransition } from "react";
import { Menu, Bell } from "lucide-react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router";
import type { AppDispatch } from "../../store/store";
import { useSettings } from "../../hooks/useSettings";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useNotificationsState } from "../../hooks/useNotificationsState";
import { setAssessmentYear } from "../../store/settingsSlice";
import { ASSESSMENT_YEARS } from "../../data/navigation";
import { NotificationDropdown } from "../dropdowns/NotificationDropdown";
import { UserProfileDropdown } from "../dropdowns/UserProfileDropdown";
import { AppSelectField } from "../forms/AppSelectField";

interface MobileTopbarProps {
  onMenuToggle: () => void;
  onSignOut: () => void;
}

export function MobileTopbar({ onMenuToggle, onSignOut }: MobileTopbarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHomePage = pathname.startsWith("/home");

  const { assessmentYear } = useSettings();
  const currentUser = useCurrentUser();
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationsState();

  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationPanelOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    if (notificationPanelOpen || profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [notificationPanelOpen, profileDropdownOpen]);

  return (
    <header className="mobile-topbar">
      {/* Left: Hamburger */}
      <button
        onClick={onMenuToggle}
        className="mobile-topbar__menu-btn"
        aria-label="Toggle navigation"
      >
        <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* Center: System name or FY selector */}
      <div className="mobile-topbar__center">
        {!isHomePage ? (
          <div className="mobile-topbar__assessment-year-wrapper">
            <AppSelectField
              id="mobile-topbar-assessment-year"
              label=""
              value={assessmentYear}
              onChange={(v) => dispatch(setAssessmentYear(v))}
              options={ASSESSMENT_YEARS.map(y => ({ value: y, label: `FY ${y}` }))}
              compact
            />
          </div>
        ) : (
          <span className="mobile-topbar__system-name">Convay Board Meeting</span>
        )}
      </div>

      {/* Right: Notification + User icons side by side */}
      <div className="mobile-topbar__right-group">
        {/* Notification bell */}
        <div className="mobile-topbar__notification-wrapper" ref={notificationRef}>
          <button
            onClick={() => setNotificationPanelOpen((o) => !o)}
            className="mobile-topbar__notification-button"
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread notifications`
                : "Notifications"
            }
          >
            <Bell size={18} strokeWidth={1.75} className="mobile-topbar__notification-button-icon" aria-hidden="true" />
            {unreadCount > 0 && (
              unreadCount > 9 ? (
                <span className="mobile-topbar__notification-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : (
                <span className="mobile-topbar__notification-dot" aria-hidden="true" />
              )
            )}
          </button>
          {notificationPanelOpen && (
            <NotificationDropdown
              notifications={notifications}
              onClose={() => setNotificationPanelOpen(false)}
              onNotificationClick={(n) => {
                markRead(n.id);
                const { main, sub, third } = n.destination;
                const path = third ? `/${main}/${sub}/${third}` : sub ? `/${main}/${sub}` : `/${main}`;
                startTransition(() => navigate(path));
                setNotificationPanelOpen(false);
              }}
              onMarkAllRead={markAllRead}
              forceBottomSheet
            />
          )}
        </div>

        {/* User profile */}
        <div className="mobile-topbar__profile-wrapper" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen((o) => !o)}
            className="mobile-topbar__profile-button"
            aria-label={`User profile: ${currentUser.name}, ${currentUser.designation}`}
            aria-expanded={profileDropdownOpen}
          >
            <div className="mobile-topbar__profile-avatar">
              <span>{currentUser.shortName}</span>
            </div>
          </button>
          {profileDropdownOpen && (
            <UserProfileDropdown
              onClose={() => setProfileDropdownOpen(false)}
              onSignOut={onSignOut}
            />
          )}
        </div>
      </div>
    </header>
  );
}