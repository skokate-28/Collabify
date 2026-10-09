import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, FolderKanban, FileText, Users, Settings, Plus, LogOut, User as UserIcon,
  MessageSquare,
  ChevronDown, Layers
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useMessageStore } from '../../store/messageStore';
import { useSocketStore } from '../../store/socketStore';
import Avatar from '../common/Avatar';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useOutsideClick } from '../../hooks/useOutsideClick';

export default function Sidebar({ collapsed = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { workspaces, currentWorkspace, setCurrentWorkspace, addWorkspace, setWorkspaces } = useWorkspaceStore();
  const unreadTotal = useMessageStore((state) => state.unreadTotal);
  const setUnreadTotal = useMessageStore((state) => state.setUnreadTotal);
  const socket = useSocketStore((state) => state.socket);
  
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false);
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  
  // New Workspace form state
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [wsErrors, setWsErrors] = useState({});

  const dropdownRef = useOutsideClick(() => setIsWorkspaceDropdownOpen(false));
  const popoverRef = useOutsideClick(() => setIsProfilePopoverOpen(false));

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/workspaces');
      setWorkspaces(res.data.data);
      if (res.data.data.length > 0 && !currentWorkspace) {
        // Find if current URL already points to a workspace, otherwise default to first
        const match = location.pathname.match(/\/workspace\/([a-f\d]{24})/i);
        if (match) {
          const matchedWs = res.data.data.find(w => w._id === match[1]);
          if (matchedWs) setCurrentWorkspace(matchedWs);
        } else {
          setCurrentWorkspace(res.data.data[0]);
        }
      }
    } catch (error) {
      toast.error('Failed to load workspaces');
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (!currentWorkspace?._id) return undefined;
    api.get(`/messages/conversations/workspace/${currentWorkspace._id}`)
      .then((res) => setUnreadTotal(res.data.data.unreadTotal || 0))
      .catch(() => {});
    if (!socket) return undefined;
    const handleNotification = (data) => {
      if (data.workspaceId === currentWorkspace._id) {
        setUnreadTotal(useMessageStore.getState().unreadTotal + 1);
      }
    };
    socket.on('dm:notification', handleNotification);
    return () => socket.off('dm:notification', handleNotification);
  }, [currentWorkspace?._id, socket, setUnreadTotal]);

  const handleSelectWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
    setIsWorkspaceDropdownOpen(false);
    // Navigate to boards of this workspace
    navigate(`/dashboard/workspace/${workspace._id}/boards`);
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    setWsErrors({});
    if (!wsName.trim()) {
      setWsErrors({ name: 'Workspace name is required' });
      return;
    }

    try {
      const res = await api.post('/workspaces', { name: wsName, description: wsDesc });
      addWorkspace(res.data.data);
      setCurrentWorkspace(res.data.data);
      setIsNewWorkspaceOpen(false);
      setWsName('');
      setWsDesc('');
      toast.success('Workspace created successfully');
      navigate(`/dashboard/workspace/${res.data.data._id}/boards`);
    } catch (error) {
      toast.error('Failed to create workspace');
    }
  };

  const menuItems = [
    { name: 'Home', icon: <Home size={18} />, path: '/dashboard' },
    { 
      name: 'Boards', 
      icon: <FolderKanban size={18} />, 
      path: currentWorkspace ? `/dashboard/workspace/${currentWorkspace._id}/boards` : '/dashboard' 
    },
    { 
      name: 'Docs', 
      icon: <FileText size={18} />, 
      path: currentWorkspace ? `/dashboard/workspace/${currentWorkspace._id}/docs` : '/dashboard' 
    },
    { 
      name: 'Members', 
      icon: <Users size={18} />, 
      path: currentWorkspace ? `/dashboard/workspace/${currentWorkspace._id}/members` : '/dashboard' 
    },
    { 
      name: 'Settings', 
      icon: <Settings size={18} />, 
      path: currentWorkspace ? `/dashboard/workspace/${currentWorkspace._id}/settings` : '/dashboard' 
    },
  ];

  return (
    <aside 
      className={`bg-darkSurface border-r border-darkBorder flex flex-col transition-all duration-300 h-screen overflow-hidden ${
        collapsed ? 'w-14' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`h-16 flex items-center border-b border-darkBorder px-4 gap-3 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-indigoAccent flex items-center justify-center text-white font-bold font-sora shadow-md shadow-indigoAccent/20 flex-shrink-0">
          C
        </div>
        {!collapsed && (
          <span className="font-sora font-bold text-white text-base tracking-wider select-none">
            Collabify
          </span>
        )}
      </div>

      {/* Workspace Switcher */}
      <div className={`p-3 border-b border-darkBorder relative ${collapsed ? 'flex justify-center' : ''}`} ref={dropdownRef}>
        {collapsed ? (
          <button 
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="w-8 h-8 rounded-lg bg-darkInput border border-darkBorder flex items-center justify-center text-sm"
            title="Switch Workspace"
          >
            <Layers size={16} />
          </button>
        ) : (
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-darkInput border border-darkBorder text-gray-200 hover:border-indigoAccent/50 transition-all text-sm font-medium"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Layers size={16} className="flex-shrink-0" />
              <span className="truncate text-left text-xs font-semibold text-white">
                {currentWorkspace?.name || 'Select Workspace'}
              </span>
            </div>
            <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          </button>
        )}

        {/* Workspace Switcher Dropdown */}
        {isWorkspaceDropdownOpen && (
          <div 
            className={`absolute mt-1 bg-darkSurface border border-darkBorder rounded-xl shadow-2xl z-40 overflow-hidden py-1 w-56 ${
    {
      name: 'Messages',
      icon: <MessageSquare size={18} />,
      path: currentWorkspace ? `/dashboard/workspace/${currentWorkspace._id}/messages` : '/dashboard',
    },
              collapsed ? 'left-12' : 'left-3 right-3'
            }`}
          >
            <div className="max-h-48 overflow-y-auto">
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  onClick={() => handleSelectWorkspace(ws)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-darkInput transition-colors ${
                    currentWorkspace?._id === ws._id ? 'text-indigo-400 bg-indigoAccent/5 font-semibold' : 'text-gray-400'
                  }`}
                >
                  <Layers size={15} />
                  <span className="truncate">{ws.name}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-darkBorder p-1.5">
              <button
                onClick={() => {
                  setIsWorkspaceDropdownOpen(false);
                  setIsNewWorkspaceOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-indigoAccent hover:bg-indigoAccent/5 border border-dashed border-indigoAccent/30 hover:border-indigoAccent/60 transition-all"
              >
                <Plus size={12} />
                New Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Menu Links */}
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-semibold select-none ${
                isActive 
                  ? 'bg-indigoAccent/10 text-indigoAccent border-l-2 border-indigoAccent font-bold' 
                  : 'text-gray-400 hover:bg-darkInput hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              title={item.name}
            >
              {item.icon}
              {!collapsed && <span className="flex-1">{item.name}</span>}
              {item.name === 'Messages' && unreadTotal > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-indigoAccent text-white text-[10px] flex items-center justify-center">
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile Details */}
      <div className={`p-3 border-t border-darkBorder relative ${collapsed ? 'flex justify-center' : ''}`} ref={popoverRef}>
        <button
          onClick={() => setIsProfilePopoverOpen(!isProfilePopoverOpen)}
          className="flex items-center gap-2.5 w-full p-1.5 rounded-lg hover:bg-darkInput transition-colors text-left focus:outline-none"
        >
          <Avatar src={user?.avatar} name={user?.name || 'User'} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0 flex flex-col pr-1">
              <span className="text-xs font-semibold text-white truncate">{user?.name}</span>
              <span className="text-[10px] text-gray-500 truncate">{user?.email}</span>
            </div>
          )}
        </button>

        {/* Profile Popover */}
        {isProfilePopoverOpen && (
          <div 
            className={`absolute bottom-14 bg-darkSurface border border-darkBorder rounded-xl shadow-2xl z-40 py-1 w-48 ${
              collapsed ? 'left-12' : 'left-3 right-3'
            }`}
          >
            <button
              onClick={() => {
                setIsProfilePopoverOpen(false);
                navigate('/dashboard/profile');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-300 hover:bg-darkInput transition-colors"
            >
              <UserIcon size={14} className="text-gray-400" />
              View Profile
            </button>
            <button
              onClick={() => {
                setIsProfilePopoverOpen(false);
                logout();
                navigate('/login');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-red-400 hover:bg-red-500/5 hover:text-red-300 border-t border-darkBorder transition-colors font-medium"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <Modal 
        isOpen={isNewWorkspaceOpen} 
        onClose={() => setIsNewWorkspaceOpen(false)} 
        title="Create Workspace"
      >
        <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Workspace Name"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                error={wsErrors.name}
                placeholder="e.g. Acme Corp Development"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-400">Description</label>
            <textarea
              value={wsDesc}
              onChange={(e) => setWsDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-darkInput border border-darkBorder text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigoAccent text-sm h-20 resize-none"
              placeholder="Describe your workspace goals..."
            />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" type="button" onClick={() => setIsNewWorkspaceOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </aside>
  );
}
