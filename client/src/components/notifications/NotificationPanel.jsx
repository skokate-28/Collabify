import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  MessageSquare,
  ClipboardList,
  AtSign,
  UserPlus,
  Clock,
  FileEdit,
  Trash2,
} from 'lucide-react';
import { useNotifStore } from '../../store/notifStore';
import { formatDistance } from '../../utils/formatDate';
import Avatar from '../common/Avatar';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function NotificationPanel({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead, setNotifications } = useNotifStore();

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      markAllRead();
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleReadNotification = async (notif) => {
    try {
      if (!notif.isRead) {
        await api.patch(`/notifications/${notif._id}/read`);
        markAsRead(notif._id);
      }
      onClose();
      if (notif.link) navigate(notif.link);
    } catch {
      toast.error('Failed to process notification');
    }
  };

  const handleDeleteNotification = async (e, notifId) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${notifId}`);
      const res = await api.get('/notifications');
      setNotifications(res.data.data.notifications);
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return <ClipboardList className="text-indigo-400" size={14} />;
      case 'comment_added':
        return <MessageSquare className="text-green-400" size={14} />;
      case 'mention':
        return <AtSign className="text-yellow-400" size={14} />;
      case 'workspace_invite':
        return <UserPlus className="text-blue-400" size={14} />;
      case 'due_soon':
        return <Clock className="text-orange-400" size={14} />;
      case 'doc_edited':
        return <FileEdit className="text-purple-400" size={14} />;
      default:
        return <Bell className="text-gray-400" size={14} />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-[380px] bg-darkSurface border border-darkBorder rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[520px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-darkBorder">
        <span className="font-sora font-semibold text-sm text-white">Notifications</span>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-indigoAccent hover:text-indigo-400 font-medium transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
            <Bell size={40} className="text-gray-600" />
            <p className="text-sm text-gray-400">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div>
            {notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => handleReadNotification(notif)}
                style={{ backgroundColor: notif.isRead ? '#16181D' : '#1E2028' }}
                className={`group relative p-4 flex gap-3 cursor-pointer hover:brightness-110 transition-all ${
                  !notif.isRead ? 'border-l-4 border-indigoAccent' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">{getIcon(notif.type)}</div>

                <Avatar
                  src={notif.sender?.avatar}
                  name={notif.sender?.name || 'System'}
                  size="sm"
                  className="!w-8 !h-8"
                />

                <div className="flex-1 flex flex-col pr-6 min-w-0">
                  <p className="text-xs text-gray-300 leading-relaxed">{notif.message}</p>
                  <span className="text-[10px] text-gray-500 mt-1">
                    {formatDistance(notif.createdAt)}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDeleteNotification(e, notif._id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
