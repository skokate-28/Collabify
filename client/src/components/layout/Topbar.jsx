import React, { useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useNotifStore } from '../../store/notifStore';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../common/Avatar';
import NotificationPanel from '../notifications/NotificationPanel';
import { useOutsideClick } from '../../hooks/useOutsideClick';

export default function Topbar({ title, onMenuClick }) {
  const { user } = useAuthStore();
  const { unreadCount } = useNotifStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const notifRef = useOutsideClick(() => {
    setIsNotifOpen(false);
  });

  return (
    <header className="h-16 border-b border-darkBorder bg-darkSurface flex items-center justify-between px-6 z-10 sticky top-0">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-darkInput hover:text-white"
          >
            <Menu size={20} />
          </button>
        )}
        <h2 className="text-base font-semibold text-white tracking-wide">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-lg text-gray-400 hover:bg-darkInput hover:text-white transition-colors relative"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigoAccent ring-2 ring-darkSurface animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-darkBorder">
          <Avatar src={user?.avatar} name={user?.name || 'User'} size="sm" />
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold text-white">{user?.name}</span>
            <span className="text-[10px] text-gray-500">Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
