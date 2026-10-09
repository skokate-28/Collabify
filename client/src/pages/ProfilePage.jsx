import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ExternalLink, Layers } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import Avatar from '../components/common/Avatar';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import SkeletonLoader from '../components/common/SkeletonLoader';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { workspaces, setWorkspaces } = useWorkspaceStore();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await api.get('/workspaces');
        setWorkspaces(res.data.data);
      } catch {
        toast.error('Failed to load workspaces');
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };
    fetchWorkspaces();
  }, [setWorkspaces]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.patch('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(res.data.data);
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.patch('/users/profile', { name, bio });
      setUser(res.data.data);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.patch('/users/change-password', { newPassword, confirmPassword });
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getUserRole = (workspace) => {
    const member = workspace.members?.find(
      (m) => (m.user?._id || m.user) === user?._id
    );
    return member?.role || 'member';
  };

  if (!user) {
    return (
      <div className="p-8 max-w-[680px] mx-auto">
        <SkeletonLoader variant="text" count={4} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[680px] mx-auto flex flex-col gap-8">
      {/* Section 1 — Avatar & Identity */}
      <section className="flex flex-col items-center text-center gap-4">
        <div className="relative group">
          <Avatar src={user.avatar} name={user.name} size="xl" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera size={20} className="text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <h1 className="text-2xl font-sora font-bold text-white">{user.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>
      </section>

      {/* Section 2 — Edit Profile */}
      <section className="bg-darkSurface border border-darkBorder rounded-2xl p-6">
        <h2 className="text-sm font-sora font-semibold text-white mb-4">Edit Profile</h2>
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-medium text-gray-400">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              maxLength={160}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-darkInput border border-darkBorder text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigoAccent text-sm resize-none"
              placeholder="Tell us about yourself..."
            />
            <span className="text-[10px] text-gray-500 text-right">{bio.length}/160</span>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </section>

      {/* Section 3 — My Workspaces */}
      <section className="bg-darkSurface border border-darkBorder rounded-2xl p-6">
        <h2 className="text-sm font-sora font-semibold text-white mb-4">My Workspaces</h2>
        {isLoadingWorkspaces ? (
          <SkeletonLoader variant="text" count={3} />
        ) : workspaces.length === 0 ? (
          <p className="text-xs text-gray-500">You are not a member of any workspaces yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces.map((ws) => (
              <div
                key={ws._id}
                className="flex items-center justify-between p-3 rounded-xl bg-darkInput border border-darkBorder"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Layers size={18} className="text-indigoAccent" />
                  <span className="text-sm text-white font-medium truncate">{ws.name}</span>
                  <Badge variant={getUserRole(ws) === 'admin' ? 'brand' : 'neutral'}>
                    {getUserRole(ws)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  className="text-xs"
                  onClick={() => navigate(`/dashboard/workspace/${ws._id}/boards`)}
                >
                  <ExternalLink size={12} />
                  Open
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 4 — Danger Zone */}
      <section className="bg-darkSurface border border-red-500/20 rounded-2xl p-6">
        <h2 className="text-sm font-sora font-semibold text-red-400 mb-4">Danger Zone</h2>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
          <div className="flex justify-end">
            <Button variant="danger" type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
