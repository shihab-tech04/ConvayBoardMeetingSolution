import { useRef, useState, useEffect, startTransition } from "react";
import { Menu, ChevronDown, Bell, CircleHelp } from "lucide-react";
import { SearchField } from "../shared/SearchField";
import { AppSelectField } from "../forms/AppSelectField";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import type { AppDispatch } from "../../store/store";
import { useSettings } from "../../hooks/useSettings";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useNotificationsState } from "../../hooks/useNotificationsState";
import { useUIState } from "../../hooks/useUI";
import { setAssessmentYear } from "../../store/settingsSlice";
import { ASSESSMENT_YEARS } from "../../data/navigation";
import { AppearanceIconButton } from "../appearance/AppearanceIconButton";
import { AppearanceSettingsPanel } from "../appearance/AppearanceSettingsPanel";
import { NotificationDropdown } from "../dropdowns/NotificationDropdown";
import { UserProfileDropdown } from "../dropdowns/UserProfileDropdown";
import { useHelp } from "../../context/HelpContext";

interface TopbarProps {
  onMenuToggle: () => void;
  onSignOut: () => void;
}

export function Topbar({ onMenuToggle, onSignOut }: TopbarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { assessmentYear } = useSettings();
  const currentUser = useCurrentUser();
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationsState();
  const { isDesktop } = useUIState();

  const { openHelp } = useHelp();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [appearancePanelOpen, setAppearancePanelOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationPanelOpen(false);
      }
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setAppearancePanelOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    if (notificationPanelOpen || appearancePanelOpen || profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [notificationPanelOpen, appearancePanelOpen, profileDropdownOpen]);

  return (
    <header className="topbar">
      {/* Left: menu toggle, search, assessment year */}
      <div className="topbar__left">
        <button
          onClick={onMenuToggle}
          className="topbar__icon-button"
          aria-label="Toggle navigation"
        >
          <Menu size={18} strokeWidth={1.75} className="topbar__icon-button-icon" />
        </button>

        {/* Search — hidden until global search is ready */}
        {/* <SearchField
          label="Search meetings, agendas, documents, and people"
          placeholder={isHomePage ? "Search meetings, agendas, documents, and people" : "Search meetings, documents, decisions, and people"}
          className="topbar__search-field"
        /> */}

        <div className="topbar__assessment-year-wrapper">
          <AppSelectField
            id="topbar-assessment-year"
            label=""
            value={assessmentYear}
            onChange={(v) => dispatch(setAssessmentYear(v))}
            options={ASSESSMENT_YEARS.map(y => ({ value: y, label: `FY ${y}` }))}
            compact
          />
        </div>
      </div>

      {/* Right: notifications, appearance, user profile */}
      <div className="topbar__right">
        {/* Notification bell */}
        <div className="topbar__notification-wrapper" ref={notificationRef}>
          <button
            onClick={() => setNotificationPanelOpen((o) => !o)}
            className={`topbar__notification-button${unreadCount > 0 ? " topbar__notification-button--has-unread" : ""}`}
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread notifications`
                : "Notifications"
            }
          >
            <Bell size={17} strokeWidth={1.75} className="topbar__notification-button-icon" />
            {unreadCount > 0 &&
              (unreadCount > 9 ? (
                <span className="topbar__notification-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : (
                <span className="topbar__notification-dot" aria-hidden="true" />
              ))}
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
            />
          )}
        </div>

        {/* Help — hidden until User Guide is ready */}
        {/* <button
          onClick={openHelp}
          className="topbar__icon-button"
          aria-label="Help & User Guide"
          title="Help & User Guide"
        >
          <CircleHelp size={17} strokeWidth={1.75} className="topbar__icon-button-icon" />
        </button> */}

        {/* Appearance */}
        <div className="topbar__appearance-wrapper" ref={switcherRef}>
          <AppearanceIconButton
            onClick={() => setAppearancePanelOpen((o) => !o)}
            open={appearancePanelOpen}
          />
          {appearancePanelOpen && (
            <AppearanceSettingsPanel
              onClose={() => setAppearancePanelOpen(false)}
              isMobile={!isDesktop}
            />
          )}
        </div>

        <div className="topbar__divider" aria-hidden="true" />

        {/* User profile */}
        <div className="topbar__profile-wrapper" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen((o) => !o)}
            className="topbar__profile-button"
            aria-label={`User profile of ${currentUser.name}, ${currentUser.designation}`}
            aria-expanded={profileDropdownOpen}
          >
            <div className="topbar__profile-avatar" aria-hidden="true">
              <span>{currentUser.shortName}</span>
            </div>
            <div className="topbar__profile-info">
              <p className="topbar__profile-name">{currentUser.name}</p>
              <p className="topbar__profile-role">{currentUser.designation}</p>
            </div>
            <ChevronDown size={11} className="topbar__profile-chevron" aria-hidden="true" />
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
