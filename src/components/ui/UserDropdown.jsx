// client/src/components/ui/UserDropdown.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Bell, BellOff } from 'lucide-react';
import Avatar from './Avatar';
import Switch from './Switch';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationSound } from '../../context/NotificationSoundContext';
import { usePermissions } from '../../context/PermissionContext';
import { useToast } from './Toast';

export default function UserDropdown({ workspaceId, className = '', align = 'right', showThemeToggle = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logoutUser } = useAuth();
  const { enabled: soundEnabled, setEnabled: setSoundEnabled } = useNotificationSound();
  const { hasPermission } = usePermissions();
  const toast = useToast();
  const navigate = useNavigate();

  const canManageSound = hasPermission('notification.manage_own');

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleProfileClick = () => {
    setIsOpen(false);
    if (workspaceId) {
      navigate(`/w/${workspaceId}/profile`);
    } else {
      navigate('/profile');
    }
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    if (workspaceId) {
      navigate(`/w/${workspaceId}/account`);
    } else {
      navigate('/account');
    }
  };

  const handleLogoutClick = async () => {
    setIsOpen(false);
    await logoutUser();
  };

  const handleSoundToggle = async (checked) => {
    try {
      await setSoundEnabled(checked);
    } catch (err) {
      toast.show(err.message || 'Failed to update sound setting', 'error');
    }
  };

  const alignClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={`relative inline-flex items-center gap-2 text-left select-none ${className}`} ref={dropdownRef}>
      {showThemeToggle && (
        <ThemeToggle className="w-10 h-10 rounded-full border border-border/80 bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors shadow-2xs" />
      )}

      {/* Avatar Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
        title={user?.name ? `${user.name} (Account Menu)` : 'Account Menu'}
        className={`relative inline-flex items-center justify-center w-11 h-11 rounded-full border-0 bg-transparent p-0 shrink-0 transition-all cursor-pointer focus:outline-none ${
          isOpen
            ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-xs'
            : 'hover:ring-2 hover:ring-border hover:ring-offset-1 hover:ring-offset-surface'
        }`}
      >
        <Avatar
          name={user?.name || 'User'}
          src={user?.avatar_url || user?.avatar}
          user={user}
          size="md"
          status="online"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${alignClass} top-full mt-2 w-60 sm:w-64 bg-surface border border-border/80 rounded-2xl shadow-xl z-50 p-1.5 animate-sassy-dropdown text-left`}
        >
          {/* User Info Header */}
          <div className="px-3 py-2.5 bg-surface-muted/50 rounded-xl mb-1 border border-border/40">
            <p className="text-xs font-bold text-text-primary truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-[11px] text-text-muted truncate mt-0.5">
              {user?.email || ''}
            </p>
          </div>

          <div className="py-0.5 space-y-0.5">
            {/* Option 1: Profile */}
            <button
              type="button"
              role="menuitem"
              onClick={handleProfileClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-primary hover:text-primary hover:bg-surface-muted transition-colors cursor-pointer group text-left"
            >
              <User className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors shrink-0" />
              <span>My Profile</span>
            </button>

            {/* Option 2: Notification Sound Switch (follows notification.manage_own) */}
            {canManageSound && (
              <div
                role="menuitem"
                title={soundEnabled ? 'Notification sound enabled' : 'Notification sound disabled'}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {soundEnabled ? (
                    <Bell className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <BellOff className="w-4 h-4 text-text-muted shrink-0" />
                  )}
                  <span className="truncate">Notification sound</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold ${soundEnabled ? 'text-primary' : 'text-text-muted'}`}>
                    {soundEnabled ? 'ON' : 'OFF'}
                  </span>
                  <Switch
                    checked={soundEnabled}
                    onChange={handleSoundToggle}
                    aria-label="Toggle notification sound"
                  />
                </div>
              </div>
            )}

            {/* Option 3: Settings */}
            <button
              type="button"
              role="menuitem"
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-primary hover:text-primary hover:bg-surface-muted transition-colors cursor-pointer group text-left"
            >
              <Settings className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors shrink-0" />
              <span>Settings</span>
            </button>

            {/* Option 4: Logout */}
            <button
              type="button"
              role="menuitem"
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-danger hover:bg-danger-tint transition-colors cursor-pointer group text-left"
            >
              <LogOut className="w-4 h-4 text-danger shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
