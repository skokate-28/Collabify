import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FolderKanban, Briefcase, Calendar, AlertTriangle, Plus, 
  ArrowRight, FileText, ChevronRight 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import Button from '../components/common/Button';
import SkeletonLoader from '../components/common/SkeletonLoader';
import Badge from '../components/common/Badge';
import { formatFriendlyDate } from '../utils/formatDate';
import api from '../services/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { workspaces, setCurrentWorkspace } = useWorkspaceStore();

  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Time-based greeting helper
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, tasksRes] = await Promise.all([
        api.get('/users/dashboard-stats'),
        api.get('/tasks/my-tasks?limit=5'),
      ]);
      setStats(statsRes.data.data);
      setRecentTasks(tasksRes.data.data);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSelectWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
    navigate(`/dashboard/workspace/${workspace._id}/boards`);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
        <SkeletonLoader variant="text" count={2} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <SkeletonLoader variant="card" count={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Greeting Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-sora font-extrabold text-white">
          {getGreeting()}, {user?.name.split(' ')[0]}!
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Here is what's happening across your collaborative workspaces today.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Workspaces */}
        <div className="bg-darkSurface border border-darkBorder rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total Workspaces</span>
            <span className="text-2xl font-sora font-bold text-white">{stats?.totalWorkspaces || 0}</span>
          </div>
          <div className="p-3 bg-indigoAccent/10 rounded-xl text-indigoAccent">
            <Briefcase size={20} />
          </div>
        </div>

        {/* Assigned Tasks */}
        <div className="bg-darkSurface border border-darkBorder rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">My Tasks</span>
            <span className="text-2xl font-sora font-bold text-white">{stats?.totalTasksAssigned || 0}</span>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
            <FolderKanban size={20} />
          </div>
        </div>

        {/* Tasks Due Today */}
        <div className="bg-darkSurface border border-darkBorder rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Due Today</span>
            <span className="text-2xl font-sora font-bold text-white">{stats?.tasksDueToday || 0}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Calendar size={20} />
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-darkSurface border border-darkBorder rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Overdue Tasks</span>
            <span className="text-2xl font-sora font-bold text-white">{stats?.overdueTasks || 0}</span>
          </div>
          <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Main Grid: Workspaces and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workspaces list */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Your Workspaces</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {workspaces.map((ws) => (
              <div
                key={ws._id}
                onClick={() => handleSelectWorkspace(ws)}
                className="bg-darkSurface border border-darkBorder hover:border-indigoAccent/50 transition-all rounded-xl p-5 cursor-pointer flex flex-col gap-3 group relative overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl bg-darkInput border border-darkBorder rounded-lg w-10 h-10 flex items-center justify-center">
                    {ws.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                      {ws.name}
                    </h4>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">
                      {ws.members.length} member{ws.members.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                </div>
                {ws.description && (
                  <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                    {ws.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white font-sora">Recent Tasks</h3>
            <span className="text-[10px] text-gray-500">Next 5 due</span>
          </div>

          <div className="bg-darkSurface border border-darkBorder rounded-xl p-4 flex flex-col gap-3">
            {recentTasks.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                <p className="text-xs text-gray-500 font-medium">No tasks assigned to you</p>
                <p className="text-[10px] text-gray-600">Enjoy your clean board!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 divide-y divide-darkBorder">
                {recentTasks.map((task, idx) => (
                  <div 
                    key={task._id} 
                    className={`flex flex-col gap-1.5 cursor-pointer group hover:text-indigo-400 transition-colors ${idx > 0 ? 'pt-3' : ''}`}
                    onClick={() => navigate(`/dashboard/workspace/${task.workspace}/boards/${task.board._id}`)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white truncate group-hover:text-indigoAccent">
                        {task.title}
                      </span>
                      <Badge variant={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'info'}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-gray-500 mt-1">
                      <span>Board: {task.board?.name}</span>
                      <span>{task.dueDate ? formatFriendlyDate(task.dueDate) : 'No due date'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
