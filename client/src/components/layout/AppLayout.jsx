import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuthStore } from '../../store/authStore';
import { useNotifStore, playChime } from '../../store/notifStore';
import { useSocketStore } from '../../store/socketStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AppLayout() {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { setNotifications, addNotification } = useNotifStore();
  const socket = useSocketStore((state) => state.socket);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data.notifications);
    } catch (err) {
      console.warn('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated]);

  // Set up socket listener for notification:new
  useEffect(() => {
    if (!socket) return;

    socket.on('notification:new', (notif) => {
      addNotification(notif);
      playChime();
      toast((t) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs text-white">Alert</span>
          <span className="text-[11px] text-gray-400">{notif.message}</span>
        </div>
      ), {
        icon: '🔔',
        style: {
          background: '#16181D',
          border: '1px solid #2A2D35',
          color: '#fff',
        },
      });
    });

    return () => {
      socket.off('notification:new');
    };
  }, [socket, addNotification]);

  // Close mobile sidebar on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-darkBg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigoAccent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Determine if it is doc editor: e.g. /dashboard/workspace/:wId/docs/:docId
  const pathParts = location.pathname.split('/');
  const isDocEditor = pathParts.includes('docs') && pathParts.length > 5;

  const getPageTitle = () => {
    if (location.pathname.includes('/boards')) return 'Boards';
    if (location.pathname.includes('/docs')) return 'Documents';
    if (location.pathname.includes('/messages')) return 'Messages';
    if (location.pathname.includes('/members')) return 'Workspace Members';
    if (location.pathname.includes('/settings')) return 'Workspace Settings';
    if (location.pathname.includes('/profile')) return 'Profile Settings';
    return 'Home';
  };

  return (
    <div className="flex h-screen bg-darkBg text-gray-200 overflow-hidden font-dmsans">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar collapsed={isDocEditor} />
      </div>

      {/* Sidebar - Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="relative z-10 w-64 h-full bg-darkSurface flex">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!isDocEditor && (
          <Topbar title={getPageTitle()} onMenuClick={() => setMobileMenuOpen(true)} />
        )}
        <main className={`flex-1 bg-darkBg relative ${isDocEditor ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
