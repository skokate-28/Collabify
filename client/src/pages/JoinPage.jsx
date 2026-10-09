import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/common/Button';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function JoinPage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error('Please sign in to join this workspace');
      navigate(`/login?redirect=/join/${inviteCode}`);
    }
  }, [isAuthenticated, isLoading, inviteCode, navigate]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const res = await api.post('/workspaces/join', { inviteCode });
      toast.success('Joined workspace successfully!');
      navigate(`/dashboard/workspace/${res.data.data._id}/boards`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join workspace');
      navigate('/dashboard');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigoAccent" />
      </div>
    );
  }

  return (
    <div className="bg-[#0D0E11] text-gray-200 min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-darkSurface border border-darkBorder rounded-2xl shadow-2xl p-8 text-center flex flex-col items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-indigoAccent/10 border border-indigoAccent/20 flex items-center justify-center text-indigoAccent text-xl font-bold">
          <Users size={22} />
        </div>
        <div>
          <h2 className="text-xl font-sora font-bold text-white">Join Workspace</h2>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            You have been invited to join a real-time collaborative workspace. Accept the invite to collaborate on boards and docs.
          </p>
        </div>
        
        <div className="w-full bg-darkInput border border-darkBorder rounded-lg p-3 text-xs font-mono text-gray-300">
          Invite Code: {inviteCode}
        </div>

        <Button variant="primary" className="w-full py-2.5" onClick={handleJoin} disabled={isJoining}>
          {isJoining ? 'Joining...' : 'Join Workspace'}
        </Button>

        <Link to="/dashboard" className="text-xs text-gray-500 hover:text-white transition-colors">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
